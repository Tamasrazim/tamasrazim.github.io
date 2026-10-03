
/* ============================================================
   MotionExport — the deterministic renderer.
   It never reads a clock to decide which frame comes next.
   frame -> exact timestamp -> evaluate -> capture -> encode.
   ============================================================ */
var MotionExport = (function () {
'use strict';

function pad6(n) { return ('000000' + n).slice(-6); }
function now() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function checksumOf(env, src, comp, thumb) {
  var w = 64, h = Math.max(1, Math.round(64 * comp.height / comp.width));
  if (!thumb.canvas || thumb.canvas.width !== w || thumb.canvas.height !== h) {
    thumb.set(env.makeCanvas(w, h));
  }
  thumb.ctx.setTransform(1, 0, 0, 1, 0, 0);
  thumb.ctx.clearRect(0, 0, w, h);
  thumb.ctx.drawImage(src, 0, 0, w, h);
  var d = thumb.ctx.getImageData(0, 0, w, h).data;
  return env.enc.fnv1a(d);
}

/* Renders every frame in [from, to) and hands each one to sink(frameIndex).
   Nothing in here can skip a frame: the loop index is the only clock. */
function runFrames(cfg) {
  var env = cfg.env, rt = cfg.rt, comp = cfg.comp, out = cfg.canvas;
  var thumbHolder = { canvas: null, ctx: null, set: function (o) { this.canvas = o.canvas; this.ctx = o.ctx; } };
  var checksums = [], durations = [];
  var i = cfg.from, started = now(), lastPost = 0;

  function step() {
    if (i >= cfg.to) return Promise.resolve({ ok: true });
    if (cfg.isCancelled()) return Promise.resolve({ ok: false, cancelled: true });
    var t0 = now();
    var r = rt.renderInto(out.ctx, i, { isExport: true });
    if (!r.ok) return Promise.resolve({ ok: false, error: r.error, atFrame: i });
    if (cfg.checksums) checksums.push(checksumOf(env, out.canvas, comp, thumbHolder));
    durations.push(now() - t0);
    return Promise.resolve(cfg.sink(i, out.canvas)).then(function (sr) {
      if (sr && sr.error) return { ok: false, error: sr.error, atFrame: i };
      var done = i - cfg.from + 1;
      var el = now() - started;
      if (el - lastPost > 120 || i === cfg.to - 1) {
        lastPost = el;
        cfg.onProgress({
          frame: i, done: done + cfg.skipped, total: cfg.total,
          elapsedMs: el, renderFps: done / (el / 1000),
          msPerFrame: el / done, bytes: cfg.bytes()
        });
      }
      i++;
      /* yield so cancellation, progress and (on the fallback path) the UI can breathe */
      return sleep(0).then(step);
    });
  }
  return step().then(function (res) {
    res.checksums = checksums;
    res.durations = durations;
    res.elapsedMs = now() - started;
    return res;
  });
}

function analyseDurations(d) {
  if (!d.length) return { avg: 0, min: 0, max: 0, total: 0 };
  var t = 0, mn = Infinity, mx = 0;
  for (var i = 0; i < d.length; i++) { t += d[i]; if (d[i] < mn) mn = d[i]; if (d[i] > mx) mx = d[i]; }
  return { avg: t / d.length, min: mn, max: mx, total: t };
}
function dupRuns(cs) {
  var n = 0;
  for (var i = 1; i < cs.length; i++) if (cs[i] === cs[i - 1]) n++;
  return n;
}

/* ---------------- WebM ---------------- */
function exportWebM(cfg) {
  var env = cfg.env, enc = env.enc, comp = cfg.comp, job = cfg.job;
  if (typeof VideoEncoder === 'undefined') {
    return Promise.resolve({ ok: false, error: { name: 'CapabilityError', message: 'WebCodecs VideoEncoder is not available in this browser, so no WebM can be produced here.', detail: 'Render a PNG sequence instead, or use a browser with WebCodecs.' } });
  }
  if (comp.width % 2 || comp.height % 2) {
    return Promise.resolve({ ok: false, error: { name: 'CompositionError', message: 'VP8/VP9 need even pixel dimensions. Current composition is ' + comp.width + '×' + comp.height + '.', detail: 'Round the width and height to even numbers in the Composition panel.' } });
  }
  return enc.probeEncoders(comp.width, comp.height, comp.fps, job.bitrate).then(function (probe) {
    if (!probe.available) return { ok: false, error: { name: 'CapabilityError', message: probe.reason, detail: 'Render a PNG sequence instead.' } };
    var codec = probe.supported[0];
    var scale = job.timebase === 'exact' ? Math.round(1e9 / comp.fps) : 1000000;
    var mux = new enc.WebMMuxer({
      width: comp.width, height: comp.height, fps: comp.fps, codecId: codec.container,
      timecodeScale: scale, title: job.metadata.title, tags: job.tags,
      muxingApp: job.metadata.software, writingApp: job.metadata.software, trackName: job.metadata.composition
    });
    mux.start();
    var out = env.makeCanvas(comp.width, comp.height);
    var encodedBytes = 0, outputs = 0, hardError = null, seenTs = [];
    var encoder = new VideoEncoder({
      output: function (chunk) {
        var buf = new Uint8Array(chunk.byteLength);
        chunk.copyTo(buf);
        var idx = Math.round(chunk.timestamp * comp.fps / 1e6);
        seenTs.push(chunk.timestamp);
        mux.addFrame(buf, idx, chunk.type === 'key');
        encodedBytes += buf.length;
        outputs++;
      },
      error: function (e) { hardError = e; }
    });
    var gop = Math.max(1, Math.round(comp.fps * 2));
    encoder.configure({
      codec: codec.id, width: comp.width, height: comp.height,
      bitrate: enc.sanitiseBitrate(job.bitrate, comp.width, comp.height, comp.fps),
      framerate: comp.fps, latencyMode: 'quality'
    });
    cfg.onLog('encoder configured: ' + codec.label + ' (' + codec.id + ') @ ' + Math.round(enc.sanitiseBitrate(job.bitrate, comp.width, comp.height, comp.fps) / 1000) + ' kbps');

    function drain(limit) {
      if (hardError) return Promise.reject(hardError);
      if (encoder.encodeQueueSize <= limit) return Promise.resolve();
      return sleep(4).then(function () { return drain(limit); });
    }
    return runFrames({
      env: env, rt: cfg.rt, comp: comp, canvas: out, from: cfg.from, to: comp.frameCount,
      total: comp.frameCount, skipped: 0, checksums: job.checksums,
      isCancelled: cfg.isCancelled, onProgress: cfg.onProgress,
      bytes: function () { return encodedBytes; },
      sink: function (i, canvas) {
        if (hardError) return { error: { name: 'EncoderError', message: String(hardError.message || hardError), detail: 'The browser video encoder rejected the stream at frame ' + i + '.' } };
        var vf = new VideoFrame(canvas, { timestamp: Math.round(i * 1e6 / comp.fps), duration: Math.round(1e6 / comp.fps) });
        try { encoder.encode(vf, { keyFrame: (i % gop) === 0 }); }
        finally { vf.close(); }
        return drain(3).catch(function (e) { return { error: { name: 'EncoderError', message: String(e.message || e) } }; });
      }
    }).then(function (res) {
      if (!res.ok) { try { encoder.close(); } catch (e) { } return res; }
      cfg.onLog('flushing encoder');
      return encoder.flush().then(function () {
        try { encoder.close(); } catch (e) { }
        if (hardError) throw hardError;
        var fin = mux.finish(comp.frameCount);
        cfg.onLog('muxed ' + fin.frames + ' blocks into ' + (fin.blob.size / 1048576).toFixed(2) + ' MB');
        return { ok: true, blob: fin.blob, muxed: fin, encodedOutputs: outputs, res: res, codec: codec };
      }).catch(function (e) {
        return { ok: false, error: { name: 'EncoderError', message: String(e.message || e), detail: 'The encoder failed while finishing the stream. No file was produced.' } };
      });
    });
  });
}

/* ---------------- MP4 / H.264 — the direct video path ----------------
   Frames come from the renderer's own export canvas (the render target),
   never from a DOM node: VideoFrame is constructed from that canvas only.
   Timestamps are derived from the frame index, not from a clock.
   -------------------------------------------------------------------- */
function exportMP4(cfg) {
  var env = cfg.env, enc = env.enc, comp = cfg.comp, job = cfg.job;
  function fail(layer, name, message, detail) {
    return Promise.resolve({ ok: false, stage: layer, error: { name: name, message: message, detail: detail, layer: layer } });
  }
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    return fail('h264', 'H264 ENCODER ERROR',
      'WebCodecs is not implemented in this browser: ' +
      (typeof VideoEncoder === 'undefined' ? 'VideoEncoder' : 'VideoFrame') + ' is missing.',
      'No H.264 can be produced here. Export the PNG sequence and mux it with ffmpeg, or use a browser with WebCodecs.');
  }
  if (comp.width % 2 || comp.height % 2) {
    return fail('canvas', 'CANVAS ERROR',
      'H.264 needs even pixel dimensions. The composition is ' + comp.width + '×' + comp.height + '.',
      'Round the width and height to even numbers in the Composition panel.');
  }
  var wanted = enc.sanitiseBitrate(job.bitrate || enc.bitrateFor(comp.width, comp.height, comp.fps, job.quality), comp.width, comp.height, comp.fps);
  return enc.probeH264(comp.width, comp.height, comp.fps, wanted).then(function (probe) {
    if (!probe.available) {
      return {
        ok: false, stage: 'h264', probe: probe,
        error: {
          name: 'H264 ENCODER ERROR', layer: 'h264',
          message: 'Browser rejected: ' + comp.width + '×' + comp.height + ' / ' + comp.fps + ' FPS / ' + Math.round(wanted / 1000) + ' kbps',
          detail: probe.reason + ' Tried ' + probe.tried.length + ' profile/level combinations: ' +
            probe.tried.map(function (t) { return t.id; }).join(', ') +
            '. Pick a resolution or frame rate the probe accepts, or export the PNG sequence instead.'
        }
      };
    }
    var sel = probe.selected;
    var mux = new enc.MP4Muxer({
      width: comp.width, height: comp.height, fps: comp.fps,
      codecString: sel.id, metadata: job.metadata, tags: job.tags
    });
    var out = (env.makeExportCanvas || env.makeCanvas)(comp.width, comp.height);
    function release() { if (env.releaseExportCanvas) { try { env.releaseExportCanvas(out); } catch (e) { } } }

    var encodedBytes = 0, outputs = 0, hardError = null, muxError = null, gotDesc = false;
    var encoder = new VideoEncoder({
      output: function (chunk, metadata) {
        try {
          if (!gotDesc && metadata && metadata.decoderConfig && metadata.decoderConfig.description) {
            mux.setDescription(metadata.decoderConfig.description);
            gotDesc = true;
          }
          var buf = new Uint8Array(chunk.byteLength);
          chunk.copyTo(buf);
          mux.addSample(buf, chunk.type === 'key', chunk.timestamp);
          encodedBytes += buf.length;
          outputs++;
        } catch (e) { muxError = e; }
      },
      error: function (e) { hardError = e; }
    });
    try { encoder.configure(sel.config); }
    catch (e) {
      release();
      return {
        ok: false, stage: 'h264',
        error: {
          name: 'H264 ENCODER ERROR', layer: 'h264',
          message: 'The encoder accepted the probe but refused the real configuration: ' + comp.width + '×' + comp.height + ' / ' + comp.fps + ' FPS / ' + sel.id,
          detail: String(e && e.message || e)
        }
      };
    }
    cfg.onLog('encoder configured: ' + sel.label + ' (' + sel.id + ') @ ' + Math.round(sel.config.bitrate / 1000) + ' kbps, avc format');
    cfg.onLog('render target: ' + comp.width + '×' + comp.height + ' canvas owned by the export path');

    var gop = Math.max(1, Math.round(comp.fps * 2));
    function drain(limit) {
      if (hardError) return Promise.reject(hardError);
      if (encoder.encodeQueueSize <= limit) return Promise.resolve();
      return sleep(4).then(function () { return drain(limit); });
    }
    return runFrames({
      env: env, rt: cfg.rt, comp: comp, canvas: out, from: cfg.from, to: comp.frameCount,
      total: comp.frameCount, skipped: 0, checksums: job.checksums,
      isCancelled: cfg.isCancelled, onProgress: cfg.onProgress,
      bytes: function () { return encodedBytes; },
      sink: function (i, canvas) {
        if (hardError) return { error: { name: 'H264 ENCODER ERROR', layer: 'h264', message: String(hardError.message || hardError), detail: 'The browser H.264 encoder rejected the stream at frame ' + i + '.' } };
        if (muxError) return { error: { name: 'MP4 MUXER ERROR', layer: 'mux', message: String(muxError.message || muxError), detail: 'The muxer failed while taking the encoded sample for frame ' + i + '.' } };
        var vf;
        try {
          vf = new VideoFrame(canvas, {
            timestamp: Math.round(i * 1e6 / comp.fps),
            duration: Math.round(1e6 / comp.fps)
          });
        } catch (e) {
          return { error: { name: 'FRAME GENERATION ERROR', layer: 'frame', message: 'A VideoFrame could not be built from the render canvas at frame ' + i + '.', detail: String(e && e.message || e) } };
        }
        try { encoder.encode(vf, { keyFrame: (i % gop) === 0 }); }
        catch (e) { vf.close(); return { error: { name: 'H264 ENCODER ERROR', layer: 'h264', message: 'encode() threw at frame ' + i + '.', detail: String(e && e.message || e) } }; }
        vf.close();
        return drain(3).catch(function (e) {
          return { error: { name: 'H264 ENCODER ERROR', layer: 'h264', message: String(e && e.message || e), detail: 'The encoder reported a fatal error while frames were queued.' } };
        });
      }
    }).then(function (res) {
      if (!res.ok) {
        try { encoder.close(); } catch (e) { }
        release();
        return res;
      }
      cfg.onLog('flushing H.264 encoder (' + encoder.encodeQueueSize + ' frames still queued)');
      return encoder.flush().then(function () {
        try { encoder.close(); } catch (e) { }
        release();
        if (hardError) throw hardError;
        if (muxError) {
          return { ok: false, stage: 'mux', error: { name: 'MP4 MUXER ERROR', layer: 'mux', message: String(muxError.message || muxError), detail: 'A sample could not be added to the MP4.' } };
        }
        if (outputs !== comp.frameCount) {
          return {
            ok: false, stage: 'h264',
            error: {
              name: 'H264 ENCODER ERROR', layer: 'h264',
              message: 'The encoder returned ' + outputs + ' encoded frames for ' + comp.frameCount + ' rendered frames.',
              detail: 'A file with the wrong number of samples would be silently wrong, so none was written.'
            }
          };
        }
        var fin = mux.finish();
        if (!fin.ok) {
          return { ok: false, stage: 'mux', error: { name: 'MP4 MUXER ERROR', layer: 'mux', message: fin.reason, detail: 'The H.264 stream was produced but could not be described in an MP4 sample table, so no file was written.' } };
        }
        cfg.onLog('muxed ' + fin.samples + ' AVC samples into ftyp + mdat + moov — ' + (fin.blob.size / 1048576).toFixed(2) + ' MB');
        return {
          ok: true, blob: fin.blob, muxed: fin, encodedOutputs: outputs, res: res,
          codec: { label: sel.label, id: sel.id }, bitrate: sel.config.bitrate, probe: probe
        };
      }).catch(function (e) {
        try { encoder.close(); } catch (e2) { }
        release();
        return { ok: false, stage: 'finalise', error: { name: 'FINALIZATION ERROR', layer: 'finalise', message: String(e && e.message || e), detail: 'The encoder failed while finishing the stream. No file was produced.' } };
      });
    });
  });
}

/* ---------------- PNG sequence ---------------- */
function exportPNG(cfg) {
  var env = cfg.env, enc = env.enc, comp = cfg.comp, job = cfg.job;
  var out = env.makeCanvas(comp.width, comp.height);
  var zip = job.target === 'dir' ? null : new enc.ZipWriter();
  var written = 0, bytes = 0, files = [], skipped = 0, existing = cfg.existing || null;
  var prefix = (job.metadata.slug || 'frame') + '_';

  function writeOne(i, canvas) {
    var name = prefix + pad6(i) + '.png';
    if (existing && existing[name]) { skipped++; files.push({ name: name, skipped: true }); return Promise.resolve(); }
    return env.toBlob(canvas, 'image/png').then(function (blob) {
      if (job.target === 'dir') {
        bytes += blob.size; written++; files.push({ name: name, size: blob.size });
        return cfg.writeFile(name, blob);
      }
      return blob.arrayBuffer().then(function (ab) {
        var u8 = new Uint8Array(ab);
        var crc = enc.crc32Final(enc.crc32(u8));
        try { zip.add(name, blob, crc, u8.length); }
        catch (e) { return { error: { name: 'SizeError', message: e.message, detail: 'Choose "PNG frames to a folder" instead, or lower the resolution.' } }; }
        bytes += blob.size; written++; files.push({ name: name, size: u8.length, crc: crc });
      });
    });
  }
  return runFrames({
    env: env, rt: cfg.rt, comp: comp, canvas: out, from: cfg.from, to: comp.frameCount,
    total: comp.frameCount, skipped: 0, checksums: job.checksums,
    isCancelled: cfg.isCancelled, onProgress: cfg.onProgress,
    bytes: function () { return bytes; },
    sink: writeOne
  }).then(function (res) {
    if (!res.ok) return res;
    var manifest = JSON.stringify({
      software: job.metadata.software, creator: job.metadata.creator, title: job.metadata.title,
      description: job.metadata.description, renderedAt: new Date().toISOString(),
      composition: comp, loop: { enabled: comp.loop, duration: comp.loopDuration },
      timeModel: { rate: comp.speed, reverse: comp.reverse, frameTime: 'frame / fps' },
      sourceSha256: job.metadata.sourceHash, jobId: job.id,
      frameCount: comp.frameCount, naming: prefix + '%06d.png',
      frameChecksums: job.checksums ? res.checksums : 'disabled'
    }, null, 2);
    if (zip) {
      zip.addBytes('manifest.json', enc.utf8(manifest));
      zip.addBytes('README.txt', enc.utf8(
        job.metadata.title + '\r\n' + job.metadata.software + '\r\n\r\n' +
        comp.width + 'x' + comp.height + ' @ ' + comp.fps + ' fps, ' + comp.frameCount + ' frames (' + comp.duration.toFixed(3) + ' s).\r\n' +
        'Frames are numbered from 0. Frame N is the animation evaluated at t = N / fps' + (comp.speed !== 1 ? ' x ' + comp.speed : '') + '.\r\n' +
        'Assemble with e.g.: ffmpeg -framerate ' + comp.fps + ' -i ' + prefix + '%06d.png -c:v libx264 -crf 16 out.mp4\r\n' +
        'manifest.json carries the full composition, metadata and per-frame checksums.\r\n'));
      return { ok: true, blob: zip.finish(), files: files, written: written, skipped: skipped, res: res };
    }
    return cfg.writeFile('manifest.json', new Blob([manifest])).then(function () {
      return { ok: true, dir: true, files: files, written: written, skipped: skipped, res: res, bytes: bytes };
    });
  });
}

/* ---------------- entry point ---------------- */
function run(cfg) {
  var env = cfg.env, core = env.core, job = cfg.job;
  var comp = core.composition(job.composition);
  var rt = core.createRuntime();
  rt.setComposition(comp);
  if (cfg.assets) rt.setAssets(cfg.assets);
  var c = rt.compile(job.code);
  if (!c.ok) return Promise.resolve({ ok: false, stage: 'validate', error: c.error });
  cfg.onLog('contract valid; renderFrame accepts ' + c.arity + ' argument' + (c.arity === 1 ? '' : 's'));
  var probe = rt.renderInto(env.makeCanvas(8, 8).ctx, cfg.from || 0, { isExport: true, rasterScale: 8 / comp.width });
  if (!probe.ok) return Promise.resolve({ ok: false, stage: 'validate', error: probe.error });
  cfg.onLog('frame ' + (cfg.from || 0) + ' evaluated without error');

  var sub = { env: env, rt: rt, comp: comp, job: job, from: cfg.from || 0, onLog: cfg.onLog, onProgress: cfg.onProgress, isCancelled: cfg.isCancelled, writeFile: cfg.writeFile, existing: cfg.existing };
  var started = Date.now();
  var task = job.format === 'webm' ? exportWebM(sub)
    : job.format === 'mp4' ? exportMP4(sub)
    : exportPNG(sub);

  return task.then(function (r) {
    if (!r.ok) return r;
    var stats = analyseDurations(r.res.durations);
    var base = {
      ok: true, stage: 'complete', blob: r.blob || null, dir: !!r.dir,
      wallMs: Date.now() - started,
      stats: {
        framesRequested: comp.frameCount,
        framesGenerated: (r.res.durations.length + (r.skipped || 0)),
        skippedExisting: r.skipped || 0,
        renderMs: stats, totalRenderMs: r.res.elapsedMs,
        avgProcessFps: r.res.durations.length / (r.res.elapsedMs / 1000),
        bytes: r.blob ? r.blob.size : (r.bytes || 0),
        checksums: r.res.checksums,
        duplicateNeighbours: dupRuns(r.res.checksums),
        framesEncoded: (r.encodedOutputs === undefined ? null : r.encodedOutputs),
        bitrate: r.bitrate || null,
        codecId: r.codec ? r.codec.id : null,
        codec: r.codec ? r.codec.label : 'PNG (canvas encoder)'
      }
    };
    /* verification: re-read what was actually written */
    if (job.format === 'mp4' && r.blob) {
      return env.enc.parseMP4(r.blob).then(function (v) {
        base.verify = buildVerdict(comp, base.stats, v, 'mp4', r);
        base.parsed = v;
        return base;
      });
    }
    if (job.format === 'webm' && r.blob) {
      return env.enc.parseWebM(r.blob).then(function (v) {
        base.verify = buildVerdict(comp, base.stats, v, 'webm', r);
        return base;
      });
    }
    if (r.blob) {
      return env.enc.parseZip(r.blob).then(function (v) {
        base.verify = buildVerdict(comp, base.stats, v, 'zip', r);
        return base;
      });
    }
    base.verify = {
      status: 'PARTIAL', container: 'folder',
      lines: [
        ['Frames requested', comp.frameCount],
        ['Frames written', r.written],
        ['Frames already present (resumed)', r.skipped],
        ['Container check', 'not applicable — individual files']
      ],
      problems: (r.written + r.skipped === comp.frameCount) ? [] : ['Only ' + (r.written + r.skipped) + ' of ' + comp.frameCount + ' frames reached the folder.']
    };
    return base;
  });
}

function buildVerdict(comp, stats, v, kind, r) {
  var problems = [], lines = [];
  var countIn = kind === 'webm' ? v.frames
    : kind === 'mp4' ? v.samples
      : (v.files ? v.files.filter(function (f) { return /\.png$/.test(f.name); }).length : 0);
  lines.push(['Frames requested', comp.frameCount]);
  lines.push(['Frames generated', stats.framesGenerated]);
  if (stats.framesEncoded !== null && stats.framesEncoded !== undefined) lines.push(['Frames encoded', stats.framesEncoded]);
  lines.push([kind === 'webm' ? 'Blocks found in container'
    : kind === 'mp4' ? 'Samples found in container' : 'PNG entries in archive', countIn]);
  lines.push(['Frames missing', Math.max(0, comp.frameCount - countIn)]);
  lines.push(['Identical neighbouring frames', stats.duplicateNeighbours + (stats.checksums.length ? '' : ' (checksums off)')]);
  if (kind === 'mp4') {
    lines.push(['ftyp', v.hasFtyp ? 'present · ' + v.brands.slice(0, 4).join(' ') : 'MISSING']);
    lines.push(['moov', v.hasMoov ? 'present' : 'MISSING']);
    lines.push(['mdat', v.hasMdat ? 'present · ' + (v.mdatBytes / 1048576).toFixed(2) + ' MB' : 'MISSING']);
    lines.push(['Video track', v.codec ? v.codec + (v.avcC ? ' with avcC (' + v.avcC + ' bytes)' : ' WITHOUT avcC') : 'none found']);
    if (v.profile) lines.push(['Codec in file', v.profile]);
    lines.push(['Container dimensions', v.width + ' × ' + v.height]);
    lines.push(['Sample sizes listed', v.sizeEntries]);
    lines.push(['Chunk offsets listed', v.offsetEntries + ' (' + (v.offsetTable || 'none') + ')']);
    lines.push(['Sample bytes described', (v.sampleBytes / 1048576).toFixed(2) + ' MB']);
    lines.push(['Media timescale', v.timescale + ' ticks/s']);
    lines.push(['Declared duration', v.durationSec ? v.durationSec.toFixed(3) + ' s' : 'unknown']);
    lines.push(['Frame duration', v.samples && v.timescale ? (v.durationTicks / v.samples / v.timescale * 1000).toFixed(4) + ' ms' : 'unknown']);
    lines.push(['Sample deltas positive', v.deltasPositive ? 'yes' : 'no']);
    lines.push(['Offsets ascending', v.offsetsOrdered ? 'yes' : 'no']);
    lines.push(['Offsets inside mdat', v.offsetsInsideMdat ? 'yes' : 'no']);
    lines.push(['Keyframes', v.syncSamples + (v.firstIsSync ? ' (first sample is a keyframe)' : ' — FIRST SAMPLE IS NOT A KEYFRAME')]);
    if (!v.hasFtyp) problems.push('The file has no ftyp box, so it is not a valid ISO base media file.');
    if (!v.hasMoov) problems.push('The file has no moov box, so no player can find the track.');
    if (!v.hasMdat) problems.push('The file has no mdat box, so it contains no sample data.');
    if (v.codec !== 'avc1' && v.codec !== 'avc3') problems.push('The sample description is "' + (v.codec || 'missing') + '" rather than an H.264/AVC entry.');
    if (!v.avcC) problems.push('The video sample entry carries no avcC record, so a decoder cannot be initialised.');
    if (v.width !== comp.width || v.height !== comp.height) problems.push('The container reports ' + v.width + '×' + v.height + ' but the composition is ' + comp.width + '×' + comp.height + '.');
    if (v.sizeEntries !== countIn) problems.push('The sample size table lists ' + v.sizeEntries + ' entries for ' + countIn + ' samples.');
    if (v.offsetEntries !== countIn) problems.push('The chunk offset table lists ' + v.offsetEntries + ' entries for ' + countIn + ' samples.');
    if (v.sampleBytes > v.mdatBytes) problems.push('The sample table describes ' + v.sampleBytes + ' bytes but mdat only holds ' + v.mdatBytes + '.');
    if (!v.offsetsInsideMdat) problems.push('At least one sample offset points outside the mdat box.');
    if (!v.offsetsOrdered) problems.push('Sample offsets are not in ascending order.');
    if (!v.deltasPositive) problems.push('A sample duration in the time-to-sample table is zero or negative.');
    if (!v.firstIsSync) problems.push('The first sample is not marked as a keyframe, so seeking to the start may fail.');
    if (r && r.muxed && !r.muxed.monotonic) problems.push('The encoder returned timestamps that did not strictly increase.');
    var wantMp4 = comp.frameCount / comp.fps;
    if (v.durationSec && Math.abs(v.durationSec - wantMp4) > 0.002) problems.push('Declared duration ' + v.durationSec.toFixed(3) + ' s differs from the expected ' + wantMp4.toFixed(3) + ' s.');
    if (stats.framesEncoded !== null && stats.framesEncoded !== undefined && stats.framesEncoded !== comp.frameCount) problems.push('The encoder produced ' + stats.framesEncoded + ' samples for ' + comp.frameCount + ' rendered frames.');
    (v.errors || []).forEach(function (e) { problems.push(e); });
  } else if (kind === 'webm') {
    lines.push(['Container dimensions', v.width + ' × ' + v.height]);
    lines.push(['Codec', v.codec]);
    lines.push(['Declared duration', v.durationSec ? v.durationSec.toFixed(3) + ' s' : 'unknown']);
    lines.push(['Frame duration', v.defaultDurationNs ? (v.defaultDurationNs / 1e6).toFixed(4) + ' ms' : 'unknown']);
    lines.push(['Timestamps in order', v.timestampsMonotonic ? 'yes' : 'no']);
    lines.push(['Keyframes', v.keyframes]);
    if (v.width !== comp.width || v.height !== comp.height) problems.push('The container reports ' + v.width + '×' + v.height + ' but the composition is ' + comp.width + '×' + comp.height + '.');
    if (!v.timestampsMonotonic) problems.push('Block timestamps are not monotonic.');
    var expect = comp.frameCount / comp.fps;
    if (v.durationSec && Math.abs(v.durationSec - expect) > 0.002) problems.push('Declared duration ' + v.durationSec.toFixed(3) + ' s differs from the expected ' + expect.toFixed(3) + ' s.');
  } else {
    lines.push(['Archive entries', v.entries]);
    lines.push(['Central directory', v.ok ? 'consistent' : 'inconsistent']);
    if (!v.ok) problems.push('The ZIP central directory did not parse cleanly.');
  }
  lines.push(['Output size', (v.bytes / 1048576).toFixed(2) + ' MB']);
  if (countIn !== comp.frameCount) problems.push('Container holds ' + countIn + ' frames; ' + comp.frameCount + ' were requested.');
  if (stats.framesGenerated !== comp.frameCount) problems.push('The renderer generated ' + stats.framesGenerated + ' frames; ' + comp.frameCount + ' were requested.');
  if (!v.bytes) problems.push('The output file is empty.');
  (v.notes || []).forEach(function (n) { problems.push(n); });
  return { status: problems.length ? 'INVALID' : 'VALID', container: kind, lines: lines, problems: problems };
}

function sampleTiming(env, job, frames) {
  var comp = env.core.composition(job.composition);
  var rt = env.core.createRuntime();
  rt.setComposition(comp);
  var c = rt.compile(job.code);
  if (!c.ok) return Promise.resolve({ ok: false, error: c.error });
  var out = env.makeCanvas(comp.width, comp.height);
  var picks = [], n = Math.min(frames, comp.frameCount);
  for (var i = 0; i < n; i++) picks.push(Math.floor(i * (comp.frameCount - 1) / Math.max(1, n - 1)));
  var times = [], k = 0;
  function step() {
    if (k >= picks.length) return Promise.resolve({ ok: true, times: times, sampled: picks.length });
    var t0 = now();
    var r = rt.renderInto(out.ctx, picks[k], { isExport: true });
    if (!r.ok) return Promise.resolve({ ok: false, error: r.error });
    times.push(now() - t0); k++;
    return sleep(0).then(step);
  }
  return step().then(function (res) {
    if (!res.ok) return res;
    var s = analyseDurations(times);
    res.avgMs = s.avg; res.minMs = s.min; res.maxMs = s.max;
    return res;
  });
}

/* Compare the first frame with the frame one loop-length later. */
function loopSeam(env, job) {
  var comp = env.core.composition(job.composition);
  var rt = env.core.createRuntime();
  rt.setComposition(comp);
  var c = rt.compile(job.code);
  if (!c.ok) return Promise.resolve({ ok: false, error: c.error });
  var w = 160, h = Math.max(1, Math.round(160 * comp.height / comp.width));
  var s = w / comp.width;
  var a = env.makeCanvas(w, h), b = env.makeCanvas(w, h);
  var loopFrames = Math.round(comp.loopDuration * comp.fps / comp.speed);
  var wrapFrame = comp.loop ? loopFrames : comp.frameCount;
  var r1 = rt.renderInto(a.ctx, 0, { isExport: true, rasterScale: s });
  if (!r1.ok) return Promise.resolve({ ok: false, error: r1.error });
  var d1 = a.ctx.getImageData(0, 0, w, h).data;
  var r2 = rt.renderInto(b.ctx, wrapFrame, { isExport: true, rasterScale: s });
  if (!r2.ok) return Promise.resolve({ ok: false, error: r2.error });
  var d2 = b.ctx.getImageData(0, 0, w, h).data;
  var r3 = rt.renderInto(b.ctx, Math.max(0, wrapFrame - 1), { isExport: true, rasterScale: s });
  var d3 = r3.ok ? b.ctx.getImageData(0, 0, w, h).data : null;
  function diff(p, q) {
    var t = 0;
    for (var i = 0; i < p.length; i += 4) t += Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) + Math.abs(p[i + 3] - q[i + 3]);
    return t / (p.length / 4 * 4 * 255);
  }
  var seam = diff(d1, d2);
  var step = d3 ? diff(d3, d1) : null;
  return Promise.resolve({
    ok: true, wrapFrame: wrapFrame, loopFrames: loopFrames,
    seamDiff: seam, neighbourDiff: step,
    verdict: seam < 0.002 ? 'MATCH' : seam < 0.02 ? 'CLOSE' : 'MISMATCH'
  });
}

return { run: run, sampleTiming: sampleTiming, loopSeam: loopSeam, pad6: pad6 };
})();

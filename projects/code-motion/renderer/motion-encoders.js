
/* ============================================================
   MotionEncoders — container writing and independent verification.
   Nothing here trusts the renderer: the verifier re-reads the bytes
   that were actually produced.
   ============================================================ */
var MotionEncoders = (function () {
'use strict';

/* ---------------- byte utilities ---------------- */
var TE = (typeof TextEncoder !== 'undefined') ? new TextEncoder() : null;
function utf8(s) {
  if (TE) return TE.encode(s);
  var a = []; for (var i = 0; i < s.length; i++) a.push(s.charCodeAt(i) & 0xff);
  return new Uint8Array(a);
}
function concat(list) {
  var n = 0, i;
  for (i = 0; i < list.length; i++) n += list[i].length;
  var out = new Uint8Array(n), o = 0;
  for (i = 0; i < list.length; i++) { out.set(list[i], o); o += list[i].length; }
  return out;
}
function uintBytes(v, width) {
  var b = new Uint8Array(width);
  for (var i = width - 1; i >= 0; i--) { b[i] = v % 256; v = Math.floor(v / 256); }
  return b;
}
function f64Bytes(v) { var b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, v, false); return b; }
function vint(n, width) {
  var w = width || 0;
  if (!w) { w = 1; while (n >= Math.pow(2, 7 * w) - 1 && w < 8) w++; }
  var b = uintBytes(n, w);
  b[0] |= (1 << (8 - w));
  return b;
}
function idBytes(hex) {
  var n = hex.length / 2, b = new Uint8Array(n);
  for (var i = 0; i < n; i++) b[i] = parseInt(hex.substr(i * 2, 2), 16);
  return b;
}
function el(idHex, data) { var id = idBytes(idHex); return concat([id, vint(data.length), data]); }
function elUint(idHex, v, width) { return el(idHex, uintBytes(v, width || Math.max(1, Math.ceil((Math.max(1, v)).toString(2).length / 8)))); }
function elFloat(idHex, v) { return el(idHex, f64Bytes(v)); }
function elStr(idHex, s) { return el(idHex, utf8(String(s))); }

/* ---------------- CRC-32 (for ZIP) ---------------- */
var CRC_TABLE = (function () {
  var t = new Uint32Array(256);
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf, seed) {
  var c = (seed === undefined ? 0xFFFFFFFF : seed);
  for (var i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return c >>> 0;
}
function crc32Final(c) { return (c ^ 0xFFFFFFFF) >>> 0; }

/* ---------------- frame fingerprint ---------------- */
function fnv1a(bytes) {
  var h = 0x811c9dc5;
  for (var i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return ('00000000' + h.toString(16)).slice(-8);
}

/* ============================================================
   WebM (Matroska) muxer
   ============================================================ */
function WebMMuxer(o) {
  var timecodeScale = o.timecodeScale || 1000000;            /* ns per tick */
  var nsPerFrame = 1e9 / o.fps;
  var tickOfFrame = function (f) { return Math.round(f * nsPerFrame / timecodeScale); };

  var trackUid = 0x544D5A01;
  var headerBytes = null, headerLen = 0;
  var clusterBlobs = [], clusterBytes = 0, cues = [];
  var cur = null;     /* { timecode, blocks:[], bytes } */
  var count = 0, firstTick = 0, lastTick = 0, totalPayload = 0;

  function buildInfo(durationTicks) {
    return el('1549A966', concat([
      el('2AD7B1', uintBytes(timecodeScale, 4)),
      elStr('4D80', o.muxingApp || 'Code -> Motion'),
      elStr('5741', o.writingApp || 'Code -> Motion'),
      elStr('7BA9', (o.title || 'Untitled').slice(0, 120)),
      elFloat('4489', durationTicks)
    ]));
  }
  function buildTracks() {
    var video = el('E0', concat([
      elUint('B0', o.width, 4), elUint('BA', o.height, 4),
      elUint('54B0', o.width, 4), elUint('54BA', o.height, 4)
    ]));
    var entry = el('AE', concat([
      elUint('D7', 1, 1), el('73C5', uintBytes(trackUid, 4)), elUint('83', 1, 1),
      elUint('9C', 0, 1), elUint('88', 1, 1),
      elStr('536E', o.trackName || 'Code -> Motion'),
      elStr('22B59C', 'und'),
      elStr('86', o.codecId || 'V_VP9'),
      el('23E383', uintBytes(Math.round(nsPerFrame), 4)),
      video
    ]));
    return el('1654AE6B', entry);
  }
  function buildTags() {
    var tags = o.tags || [];
    if (!tags.length) return new Uint8Array(0);
    var simple = tags.map(function (t) {
      return el('67C8', concat([elStr('45A3', t.name), elStr('447A', 'und'), elUint('4484', 1, 1), elStr('4487', String(t.value))]));
    });
    return el('1254C367', el('7373', concat([el('63C0', elUint('68CA', 50, 1))].concat(simple))));
  }

  function openCluster(tick) { cur = { timecode: tick, blocks: [], bytes: 0 }; }
  function closeCluster() {
    if (!cur || !cur.blocks.length) { cur = null; return; }
    var body = concat([elUint('E7', cur.timecode, 4)].concat(cur.blocks));
    var bytes = el('1F43B675', body);
    cues.push({ time: cur.timecode, pos: headerLen + clusterBytes });
    clusterBytes += bytes.length;
    clusterBlobs.push(new Blob([bytes]));
    cur = null;
  }

  this.start = function () {
    var ebml = el('1A45DFA3', concat([
      elUint('4286', 1, 1), elUint('42F7', 1, 1), elUint('42F2', 4, 1), elUint('42F3', 8, 1),
      elStr('4282', 'webm'), elUint('4287', 2, 1), elUint('4285', 2, 1)
    ]));
    var info = buildInfo(0);
    var tracks = buildTracks();
    var tags = buildTags();
    headerBytes = { ebml: ebml, infoLen: info.length, tracks: tracks, tags: tags };
    headerLen = info.length + tracks.length + tags.length;
  };

  this.addFrame = function (data, frameIndex, isKey) {
    var tick = tickOfFrame(frameIndex);
    if (!count) firstTick = tick;
    if (!cur) openCluster(tick);
    else if ((isKey && cur.blocks.length) || (tick - cur.timecode) > 30000) { closeCluster(); openCluster(tick); }
    var rel = tick - cur.timecode;
    var head = new Uint8Array(4);
    head[0] = 0x81;                       /* track 1, vint */
    head[1] = (rel >> 8) & 0xff; head[2] = rel & 0xff;
    head[3] = isKey ? 0x80 : 0x00;
    var block = el('A3', concat([head, data]));
    cur.blocks.push(block);
    cur.bytes += block.length;
    totalPayload += data.length;
    lastTick = tick;
    count++;
    if (cur.bytes > 4 * 1024 * 1024) closeCluster();
  };

  this.finish = function (framesWritten) {
    closeCluster();
    var n = framesWritten === undefined ? count : framesWritten;
    var durationTicks = n * nsPerFrame / timecodeScale;
    var info = buildInfo(durationTicks);
    if (info.length !== headerBytes.infoLen) throw new Error('Info element length changed between start and finish (' + headerBytes.infoLen + ' -> ' + info.length + ')');
    var cuePoints = cues.map(function (c) {
      return el('BB', concat([elUint('B3', c.time, 4), el('B7', concat([elUint('F7', 1, 1), elUint('F1', c.pos, 6)]))]));
    });
    var cuesEl = cuePoints.length ? el('1C53BB6B', concat(cuePoints)) : new Uint8Array(0);
    var segSize = headerLen + clusterBytes + cuesEl.length;
    var segHead = concat([idBytes('18538067'), vint(segSize, 8)]);
    var parts = [headerBytes.ebml, segHead, info, headerBytes.tracks, headerBytes.tags].concat(clusterBlobs).concat([cuesEl]);
    return {
      blob: new Blob(parts, { type: 'video/webm' }),
      frames: count, payloadBytes: totalPayload,
      firstTick: firstTick, lastTick: lastTick, timecodeScale: timecodeScale
    };
  };
  this.frameCount = function () { return count; };
}

/* ============================================================
   Independent EBML reader used for verification
   ============================================================ */
function BlobReader(blob) {
  this.blob = blob; this.buf = null; this.base = -1;
}
BlobReader.prototype.at = function (pos, len) {
  var self = this;
  if (self.base >= 0 && pos >= self.base && pos + len <= self.base + self.buf.length) {
    return Promise.resolve(self.buf.subarray(pos - self.base, pos - self.base + len));
  }
  var want = Math.max(len, 65536);
  var end = Math.min(self.blob.size, pos + want);
  return self.blob.slice(pos, end).arrayBuffer().then(function (ab) {
    self.buf = new Uint8Array(ab); self.base = pos;
    return self.buf.subarray(0, Math.min(len, self.buf.length));
  });
};
function readIdLen(b0) { return b0 >= 0x80 ? 1 : b0 >= 0x40 ? 2 : b0 >= 0x20 ? 3 : 4; }
function readSizeAt(bytes, i) {
  var b0 = bytes[i], w = 1;
  while (w <= 8 && !(b0 & (1 << (8 - w)))) w++;
  if (w > 8) return { size: 0, len: 1, unknown: true };
  var v = b0 & (0xff >> w), all = (b0 & (0xff >> w)) === (0xff >> w);
  for (var k = 1; k < w; k++) { v = v * 256 + bytes[i + k]; if (bytes[i + k] !== 0xff) all = false; }
  return { size: v, len: w, unknown: all };
}
function hexOf(bytes, i, n) {
  var s = '';
  for (var k = 0; k < n; k++) s += ('0' + bytes[i + k].toString(16)).slice(-2);
  return s.toUpperCase();
}
function uintOf(bytes, i, n) { var v = 0; for (var k = 0; k < n; k++) v = v * 256 + bytes[i + k]; return v; }

function parseWebM(blob) {
  var rd = new BlobReader(blob);
  var out = {
    ok: false, container: 'webm', bytes: blob.size, frames: 0, clusters: 0,
    width: 0, height: 0, codec: '', durationSec: 0, timecodeScale: 0,
    defaultDurationNs: 0, timestampsMonotonic: true, keyframes: 0, notes: []
  };
  function head(pos) {
    return rd.at(pos, 16).then(function (b) {
      if (!b || b.length < 2) return null;
      var il = readIdLen(b[0]);
      var id = hexOf(b, 0, il);
      var sz = readSizeAt(b, il);
      return { id: id, dataStart: pos + il + sz.len, size: sz.size, unknown: sz.unknown, end: pos + il + sz.len + sz.size };
    });
  }
  function walkSegment(pos, end) {
    if (pos >= end) return Promise.resolve();
    return head(pos).then(function (h) {
      if (!h) return;
      var next = h.unknown ? end : h.end;
      if (h.id === '1549A966' || h.id === '1654AE6B') {
        return blob.slice(h.dataStart, h.dataStart + h.size).arrayBuffer().then(function (ab) {
          scanLeaves(new Uint8Array(ab));
          return walkSegment(next, end);
        });
      }
      if (h.id === '1F43B675') {
        out.clusters++;
        if (h.size > 96 * 1024 * 1024) { out.notes.push('cluster at ' + pos + ' too large to verify in memory'); return walkSegment(next, end); }
        return blob.slice(h.dataStart, h.dataStart + h.size).arrayBuffer().then(function (ab) {
          scanCluster(new Uint8Array(ab));
          return walkSegment(next, end);
        });
      }
      return walkSegment(next, end);
    });
  }
  var lastTs = -Infinity;
  function scanCluster(b) {
    var i = 0, base = 0;
    while (i < b.length - 3) {
      var il = readIdLen(b[i]);
      var id = hexOf(b, i, il);
      var sz = readSizeAt(b, i + il);
      var ds = i + il + sz.len;
      if (id === 'E7') base = uintOf(b, ds, sz.size);
      else if (id === 'A3' || id === 'A0') {
        var p = ds;
        if (id === 'A0') { /* BlockGroup: find Block */
          var q = ds, stop = ds + sz.size;
          while (q < stop - 2) {
            var il2 = readIdLen(b[q]), id2 = hexOf(b, q, il2), s2 = readSizeAt(b, q + il2);
            if (id2 === 'A1') { p = q + il2 + s2.len; break; }
            q = q + il2 + s2.len + s2.size;
          }
        }
        var tw = readSizeAt(b, p).len;
        var rel = (b[p + tw] << 8) | b[p + tw + 1];
        if (rel & 0x8000) rel = rel - 0x10000;
        var flags = b[p + tw + 2];
        var ts = base + rel;
        if (ts < lastTs) out.timestampsMonotonic = false;
        lastTs = ts;
        if (flags & 0x80) out.keyframes++;
        out.frames++;
      }
      i = ds + sz.size;
    }
  }
  function scanLeaves(b) {
    var i = 0;
    while (i < b.length - 2) {
      var il = readIdLen(b[i]);
      var id = hexOf(b, i, il);
      var sz = readSizeAt(b, i + il);
      var ds = i + il + sz.len;
      if (id === 'B0') out.width = uintOf(b, ds, sz.size);
      else if (id === 'BA') out.height = uintOf(b, ds, sz.size);
      else if (id === '86') out.codec = String.fromCharCode.apply(null, b.subarray(ds, ds + sz.size));
      else if (id === '2AD7B1') out.timecodeScale = uintOf(b, ds, sz.size);
      else if (id === '23E383') out.defaultDurationNs = uintOf(b, ds, sz.size);
      else if (id === '4489') {
        var dvv = new DataView(b.buffer, b.byteOffset + ds, sz.size);
        out.durationTicks = sz.size === 4 ? dvv.getFloat32(0, false) : dvv.getFloat64(0, false);
      }
      var container = (id === '1654AE6B' || id === 'AE' || id === 'E0' || id === '1549A966');
      i = container ? ds : ds + sz.size;
    }
  }
  return head(0).then(function (h) {
    if (!h || h.id !== '1A45DFA3') { out.notes.push('EBML header not found'); return out; }
    return head(h.end).then(function (seg) {
      if (!seg || seg.id !== '18538067') { out.notes.push('Segment element not found'); return out; }
      var end = seg.unknown ? blob.size : Math.min(seg.end, blob.size);
      return walkSegment(seg.dataStart, end).then(function () {
        if (out.timecodeScale && out.durationTicks !== undefined) out.durationSec = out.durationTicks * out.timecodeScale / 1e9;
        out.ok = out.frames > 0 && out.width > 0 && out.height > 0;
        return out;
      });
    });
  }).catch(function (e) { out.notes.push('parse failed: ' + e.message); return out; });
}

/* ============================================================
   ZIP (store, no compression) — streaming-friendly
   ============================================================ */
function ZipWriter() {
  this.parts = []; this.entries = []; this.offset = 0; this.limit = 4290000000;
}
ZipWriter.prototype.add = function (name, blob, crc, size) {
  if (this.offset + size + 200 > this.limit) {
    var e = new Error('ZIP would exceed the 4 GB limit of the classic ZIP format at "' + name + '".');
    e.code = 'ZIP_LIMIT'; throw e;
  }
  var nb = utf8(name);
  var h = new Uint8Array(30 + nb.length);
  var dv = new DataView(h.buffer);
  dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true);
  dv.setUint16(8, 0, true); dv.setUint16(10, 0, true); dv.setUint16(12, 0x2821, true);
  dv.setUint32(14, crc, true); dv.setUint32(18, size, true); dv.setUint32(22, size, true);
  dv.setUint16(26, nb.length, true); dv.setUint16(28, 0, true);
  h.set(nb, 30);
  this.entries.push({ name: nb, crc: crc, size: size, offset: this.offset });
  this.parts.push(h, blob);
  this.offset += h.length + size;
};
ZipWriter.prototype.addBytes = function (name, bytes) {
  this.add(name, new Blob([bytes]), crc32Final(crc32(bytes)), bytes.length);
};
ZipWriter.prototype.finish = function () {
  var cd = [], cdSize = 0, self = this;
  this.entries.forEach(function (e) {
    var b = new Uint8Array(46 + e.name.length);
    var dv = new DataView(b.buffer);
    dv.setUint32(0, 0x02014b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 20, true);
    dv.setUint16(8, 0x0800, true); dv.setUint16(10, 0, true);
    dv.setUint16(12, 0, true); dv.setUint16(14, 0x2821, true);
    dv.setUint32(16, e.crc, true); dv.setUint32(20, e.size, true); dv.setUint32(24, e.size, true);
    dv.setUint16(28, e.name.length, true);
    dv.setUint32(42, e.offset, true);
    b.set(e.name, 46);
    cd.push(b); cdSize += b.length;
  });
  var eocd = new Uint8Array(22), dv2 = new DataView(eocd.buffer);
  dv2.setUint32(0, 0x06054b50, true);
  dv2.setUint16(8, this.entries.length, true); dv2.setUint16(10, this.entries.length, true);
  dv2.setUint32(12, cdSize, true); dv2.setUint32(16, this.offset, true);
  return new Blob(this.parts.concat(cd).concat([eocd]), { type: 'application/zip' });
};

function parseZip(blob) {
  var tailLen = Math.min(blob.size, 66000);
  return blob.slice(blob.size - tailLen).arrayBuffer().then(function (ab) {
    var b = new Uint8Array(ab), dv = new DataView(ab), pos = -1;
    for (var i = b.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50) { pos = i; break; }
    if (pos < 0) return { ok: false, notes: ['end of central directory not found'] };
    var n = dv.getUint16(pos + 10, true), cdSize = dv.getUint32(pos + 12, true), cdOff = dv.getUint32(pos + 16, true);
    return blob.slice(cdOff, cdOff + cdSize).arrayBuffer().then(function (ab2) {
      var c = new Uint8Array(ab2), d = new DataView(ab2), p = 0, files = [], ok = true;
      for (var k = 0; k < n; k++) {
        if (d.getUint32(p, true) !== 0x02014b50) { ok = false; break; }
        var nl = d.getUint16(p + 28, true), xl = d.getUint16(p + 30, true), cl = d.getUint16(p + 32, true);
        files.push({
          name: String.fromCharCode.apply(null, c.subarray(p + 46, p + 46 + nl)),
          crc: d.getUint32(p + 16, true) >>> 0, size: d.getUint32(p + 24, true)
        });
        p += 46 + nl + xl + cl;
      }
      return { ok: ok && files.length === n, container: 'zip', entries: n, files: files, bytes: blob.size, notes: [] };
    });
  }).catch(function (e) { return { ok: false, notes: ['parse failed: ' + e.message] }; });
}

/* ============================================================
   WebCodecs capability probing
   ============================================================ */
/* ============================================================
   ISO-BMFF / MP4 — real muxer for H.264 (AVC) elementary samples
   ------------------------------------------------------------
   Samples arrive from WebCodecs already in AVCC form (length-prefixed
   NAL units) because the encoder is configured with avc.format = 'avc'.
   The AVCDecoderConfigurationRecord handed back in the first chunk's
   metadata is written verbatim as the avcC payload, so the sample
   description and the sample data cannot disagree.
   ============================================================ */
function u8b(n) { return new Uint8Array([n & 255]); }
function u16b(n) { return new Uint8Array([(n >>> 8) & 255, n & 255]); }
function u32b(n) { return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]); }
function u64b(n) {
  var hi = Math.floor(n / 4294967296), lo = n - hi * 4294967296;
  return concat([u32b(hi), u32b(lo)]);
}
function fcc(s) { var b = new Uint8Array(4); for (var i = 0; i < 4; i++) b[i] = s.charCodeAt(i) & 255; return b; }
function mbox(type, list) { var body = concat(list); return concat([u32b(body.length + 8), fcc(type), body]); }
function fbox(type, version, flags, list) {
  var body = concat(list);
  return concat([u32b(body.length + 12), fcc(type),
  new Uint8Array([version & 255, (flags >>> 16) & 255, (flags >>> 8) & 255, flags & 255]), body]);
}
function fixed1616(n) { return u32b(Math.round(n * 65536) >>> 0); }
var MP4_MATRIX = concat([
  u32b(0x00010000), u32b(0), u32b(0),
  u32b(0), u32b(0x00010000), u32b(0),
  u32b(0), u32b(0), u32b(0x40000000)
]);

function MP4Muxer(o) {
  this.width = Math.max(2, o.width | 0);
  this.height = Math.max(2, o.height | 0);
  this.fps = o.fps;
  /* 1/fps lands exactly on an integer tick, so no rounded milliseconds
     are ever accumulated: timescale = fps*1000, every delta = 1000. */
  this.timescale = Math.max(1, Math.round(o.fps * 1000));
  this.delta = 1000;
  this.movieTimescale = 1000;
  this.codecString = o.codecString || '';
  this.meta = o.metadata || {};
  this.tags = o.tags || [];
  this.description = null;
  this.samples = [];
  this.parts = [];
  this.pending = [];
  this.pendingBytes = 0;
  this.mdatBytes = 0;
  this.lastTs = -Infinity;
  this.monotonic = true;
}
MP4Muxer.prototype.setDescription = function (desc) {
  if (this.description || !desc) return;
  var v = (desc instanceof ArrayBuffer) ? new Uint8Array(desc) : new Uint8Array(desc.buffer, desc.byteOffset, desc.byteLength);
  this.description = new Uint8Array(v);
};
MP4Muxer.prototype.addSample = function (bytes, isKey, timestampUs) {
  if (timestampUs <= this.lastTs) this.monotonic = false;
  this.lastTs = timestampUs;
  this.samples.push({ size: bytes.length, sync: !!isKey, offset: this.mdatBytes, ts: timestampUs });
  this.mdatBytes += bytes.length;
  this.pending.push(bytes);
  this.pendingBytes += bytes.length;
  if (this.pendingBytes >= 4194304) this.flushPart();
};
MP4Muxer.prototype.flushPart = function () {
  if (!this.pending.length) return;
  this.parts.push(new Blob(this.pending));
  this.pending = [];
  this.pendingBytes = 0;
};
MP4Muxer.prototype.itemBoxes = function () {
  var self = this, m = this.meta, items = [];
  function text(type, value) {
    if (value === undefined || value === null || String(value) === '') return;
    items.push(mbox(type, [mbox('data', [u32b(1), u32b(0), utf8(String(value))])]));
  }
  function free(key, value) {
    if (value === undefined || value === null || String(value) === '') return;
    items.push(mbox('----', [
      mbox('mean', [u32b(0), utf8('com.apple.iTunes')]),
      mbox('name', [u32b(0), utf8(String(key))]),
      mbox('data', [u32b(1), u32b(0), utf8(String(value))])
    ]));
  }
  text('\u00A9nam', m.title);
  text('\u00A9ART', m.creator);
  text('\u00A9cmt', m.description);
  text('\u00A9too', (m.software || '') + (m.softwareVersion ? ' ' + m.softwareVersion : ''));
  text('\u00A9day', new Date().toISOString().slice(0, 10));
  this.tags.forEach(function (t) {
    if (/^(TITLE|ARTIST|DESCRIPTION|ENCODER)$/.test(t.name)) return;
    free(t.name, t.value);
  });
  free('CODEC', self.codecString);
  return items;
};
MP4Muxer.prototype.buildMoov = function (base) {
  var n = this.samples.length, self = this;
  var mediaDuration = n * this.delta;
  var movieDuration = Math.round(n / this.fps * this.movieTimescale);
  var creation = 0;

  var name = 'AVC Coding';
  var comp = new Uint8Array(32);
  comp[0] = name.length;
  for (var i = 0; i < name.length; i++) comp[i + 1] = name.charCodeAt(i) & 255;

  var avcC = mbox('avcC', [this.description]);
  var pasp = mbox('pasp', [u32b(1), u32b(1)]);
  var avc1 = mbox('avc1', [
    new Uint8Array(6), u16b(1),
    u16b(0), u16b(0), u32b(0), u32b(0), u32b(0),
    u16b(this.width), u16b(this.height),
    u32b(0x00480000), u32b(0x00480000),
    u32b(0), u16b(1), comp, u16b(0x0018), u16b(0xFFFF),
    avcC, pasp
  ]);
  var stsd = fbox('stsd', 0, 0, [u32b(1), avc1]);
  var stts = fbox('stts', 0, 0, [u32b(1), u32b(n), u32b(this.delta)]);

  var syncs = [];
  for (i = 0; i < n; i++) if (this.samples[i].sync) syncs.push(i + 1);
  var stssBody = [u32b(syncs.length)];
  for (i = 0; i < syncs.length; i++) stssBody.push(u32b(syncs[i]));
  var stss = fbox('stss', 0, 0, stssBody);

  /* one sample per chunk: every offset is written out and can be checked */
  var stsc = fbox('stsc', 0, 0, [u32b(1), u32b(1), u32b(1), u32b(1)]);

  var stszBody = [u32b(0), u32b(n)];
  for (i = 0; i < n; i++) stszBody.push(u32b(this.samples[i].size));
  var stsz = fbox('stsz', 0, 0, stszBody);

  var lastEnd = base + this.mdatBytes;
  var stco;
  if (lastEnd > 4294967295) {
    var co64Body = [u32b(n)];
    for (i = 0; i < n; i++) co64Body.push(u64b(base + this.samples[i].offset));
    stco = fbox('co64', 0, 0, co64Body);
  } else {
    var stcoBody = [u32b(n)];
    for (i = 0; i < n; i++) stcoBody.push(u32b(base + this.samples[i].offset));
    stco = fbox('stco', 0, 0, stcoBody);
  }

  var stbl = mbox('stbl', [stsd, stts, stss, stsc, stsz, stco]);
  var vmhd = fbox('vmhd', 0, 1, [u16b(0), u16b(0), u16b(0), u16b(0)]);
  var dref = fbox('dref', 0, 0, [u32b(1), fbox('url ', 0, 1, [])]);
  var dinf = mbox('dinf', [dref]);
  var minf = mbox('minf', [vmhd, dinf, stbl]);
  var hdlr = fbox('hdlr', 0, 0, [u32b(0), fcc('vide'), u32b(0), u32b(0), u32b(0), utf8('VideoHandler'), u8b(0)]);
  var mdhd = fbox('mdhd', 0, 0, [u32b(creation), u32b(creation), u32b(this.timescale), u32b(mediaDuration), u16b(0x55C4), u16b(0)]);
  var mdia = mbox('mdia', [mdhd, hdlr, minf]);
  var tkhd = fbox('tkhd', 0, 3, [
    u32b(creation), u32b(creation), u32b(1), u32b(0), u32b(movieDuration),
    u32b(0), u32b(0), u16b(0), u16b(0), u16b(0), u16b(0),
    MP4_MATRIX, fixed1616(this.width), fixed1616(this.height)
  ]);
  var trak = mbox('trak', [tkhd, mdia]);
  var mvhd = fbox('mvhd', 0, 0, [
    u32b(creation), u32b(creation), u32b(this.movieTimescale), u32b(movieDuration),
    u32b(0x00010000), u16b(0x0100), u16b(0), u32b(0), u32b(0),
    MP4_MATRIX, u32b(0), u32b(0), u32b(0), u32b(0), u32b(0), u32b(0), u32b(2)
  ]);
  var ilst = mbox('ilst', this.itemBoxes());
  var metaHdlr = fbox('hdlr', 0, 0, [u32b(0), fcc('mdir'), fcc('appl'), u32b(0), u32b(0), u8b(0)]);
  var meta = fbox('meta', 0, 0, [metaHdlr, ilst]);
  var udta = mbox('udta', [meta]);
  return mbox('moov', [mvhd, trak, udta]);
};
MP4Muxer.prototype.finish = function () {
  if (!this.description) {
    return {
      ok: false,
      reason: 'The H.264 encoder never handed back an AVC decoder configuration, so there is nothing to write into the sample description. No MP4 was produced.'
    };
  }
  if (!this.samples.length) return { ok: false, reason: 'No encoded samples reached the muxer.' };
  this.flushPart();
  var ftyp = mbox('ftyp', [fcc('isom'), u32b(512), fcc('isom'), fcc('iso2'), fcc('avc1'), fcc('mp41')]);
  var large = (this.mdatBytes + 8) > 4294967295;
  var mdatHeader = large
    ? concat([u32b(1), fcc('mdat'), u64b(this.mdatBytes + 16)])
    : concat([u32b(this.mdatBytes + 8), fcc('mdat')]);
  var base = ftyp.length + mdatHeader.length;
  var moov = this.buildMoov(base);
  var blob = new Blob([ftyp, mdatHeader].concat(this.parts).concat([moov]), { type: 'video/mp4' });
  return {
    ok: true, blob: blob, samples: this.samples.length, mdatBytes: this.mdatBytes,
    moovBytes: moov.length, timescale: this.timescale, delta: this.delta,
    durationTicks: this.samples.length * this.delta, monotonic: this.monotonic, dataBase: base
  };
};

/* ---------------- MP4 reader, used only to verify what was written ---------------- */
function strOf(bytes, i, n) { var s = ''; for (var k = 0; k < n; k++) s += String.fromCharCode(bytes[i + k]); return s; }
function walkBoxes(bytes, start, end, fn) {
  var p = start;
  while (p + 8 <= end) {
    var size = uintOf(bytes, p, 4), type = strOf(bytes, p + 4, 4), hdr = 8;
    if (size === 1) { if (p + 16 > end) break; size = uintOf(bytes, p + 8, 8); hdr = 16; }
    else if (size === 0) size = end - p;
    if (size < hdr || p + size > end) break;
    fn(type, p + hdr, p + size);
    p += size;
  }
}
function parseMP4(blob) {
  var rd = new BlobReader(blob);
  var out = {
    ok: false, container: 'mp4', bytes: blob.size, brands: [],
    hasFtyp: false, hasMoov: false, hasMdat: false, mdatStart: 0, mdatBytes: 0,
    width: 0, height: 0, codec: '', avcC: 0, profile: '',
    samples: 0, syncSamples: 0, firstIsSync: false,
    timescale: 0, durationTicks: 0, durationSec: 0, movieDurationSec: 0,
    sizeEntries: 0, offsetEntries: 0, sampleBytes: 0, offsetTable: '',
    deltasPositive: true, offsetsOrdered: true, offsetsInsideMdat: true,
    errors: []
  };
  var pos = 0, moovAt = -1, moovSize = 0;

  function top() {
    if (pos + 8 > blob.size) return Promise.resolve();
    return rd.at(pos, 16).then(function (h) {
      if (h.length < 8) return;
      var size = uintOf(h, 0, 4), type = strOf(h, 4, 4), hdr = 8;
      if (size === 1) { size = uintOf(h, 8, 8); hdr = 16; }
      else if (size === 0) size = blob.size - pos;
      if (size < hdr || pos + size > blob.size) { out.errors.push('Box "' + type + '" at byte ' + pos + ' declares a length that runs past the end of the file.'); return; }
      if (type === 'ftyp') {
        out.hasFtyp = true;
        return rd.at(pos + hdr, Math.min(size - hdr, 64)).then(function (b) {
          out.brands.push(strOf(b, 0, 4));
          for (var i = 8; i + 4 <= b.length; i += 4) out.brands.push(strOf(b, i, 4));
          pos += size; return top();
        });
      }
      if (type === 'mdat') { out.hasMdat = true; out.mdatStart = pos + hdr; out.mdatBytes = size - hdr; }
      if (type === 'moov') { out.hasMoov = true; moovAt = pos; moovSize = size; }
      pos += size;
      return top();
    });
  }

  return top().then(function () {
    if (!out.hasMoov) { out.errors.push('No moov box was found, so the file has no track metadata.'); return out; }
    if (moovSize > 33554432) { out.errors.push('The moov box is implausibly large (' + moovSize + ' bytes).'); return out; }
    return blob.slice(moovAt, moovAt + moovSize).arrayBuffer().then(function (ab) {
      var m = new Uint8Array(ab);
      var stblRange = null, mdhd = null, tkhd = null, hdlrType = '';
      walkBoxes(m, 0, m.length, function (t, s, e) {
        if (t !== 'moov') return;
        walkBoxes(m, s, e, function (t2, s2, e2) {
          if (t2 === 'mvhd') out.movieDurationSec = uintOf(m, s2 + 12, 4) ? uintOf(m, s2 + 16, 4) / uintOf(m, s2 + 12, 4) : 0;
          if (t2 !== 'trak') return;
          walkBoxes(m, s2, e2, function (t3, s3, e3) {
            if (t3 === 'tkhd') tkhd = { w: uintOf(m, e3 - 8, 4) / 65536, h: uintOf(m, e3 - 4, 4) / 65536 };
            if (t3 !== 'mdia') return;
            walkBoxes(m, s3, e3, function (t4, s4, e4) {
              if (t4 === 'mdhd') mdhd = { timescale: uintOf(m, s4 + 12, 4), duration: uintOf(m, s4 + 16, 4) };
              if (t4 === 'hdlr') hdlrType = strOf(m, s4 + 8, 4);
              if (t4 !== 'minf') return;
              walkBoxes(m, s4, e4, function (t5, s5, e5) {
                if (t5 === 'stbl') stblRange = [s5, e5];
              });
            });
          });
        });
      });
      if (!stblRange) { out.errors.push('The track has no sample table (stbl), so no frames can be located.'); return out; }
      if (hdlrType !== 'vide') out.errors.push('The track handler is "' + hdlrType + '" rather than a video handler.');
      if (mdhd) { out.timescale = mdhd.timescale; out.durationTicks = mdhd.duration; out.durationSec = mdhd.timescale ? mdhd.duration / mdhd.timescale : 0; }
      if (tkhd) { out.width = Math.round(tkhd.w); out.height = Math.round(tkhd.h); }

      var sizes = [], offsets = [];
      walkBoxes(m, stblRange[0], stblRange[1], function (t, s, e) {
        var i, n;
        if (t === 'stsd') {
          walkBoxes(m, s + 8, e, function (t2, s2, e2) {
            out.codec = t2;
            if (t2 === 'avc1' || t2 === 'avc3') {
              out.width = out.width || uintOf(m, s2 + 24, 2);
              out.height = out.height || uintOf(m, s2 + 26, 2);
              walkBoxes(m, s2 + 78, e2, function (t3, s3, e3) {
                if (t3 === 'avcC') {
                  out.avcC = e3 - s3;
                  out.profile = 'avc1.' + hexOf(m, s3 + 1, 3).toLowerCase();
                }
              });
            }
          });
        } else if (t === 'stts') {
          n = uintOf(m, s + 4, 4);
          var total = 0;
          for (i = 0; i < n; i++) {
            var cnt = uintOf(m, s + 8 + i * 8, 4), dl = uintOf(m, s + 12 + i * 8, 4);
            if (dl <= 0) out.deltasPositive = false;
            total += cnt;
          }
          out.samples = total;
        } else if (t === 'stss') {
          n = uintOf(m, s + 4, 4);
          out.syncSamples = n;
          if (n) out.firstIsSync = uintOf(m, s + 8, 4) === 1;
        } else if (t === 'stsz') {
          var fixed = uintOf(m, s + 4, 4);
          n = uintOf(m, s + 8, 4);
          out.sizeEntries = n;
          for (i = 0; i < n; i++) sizes.push(fixed || uintOf(m, s + 12 + i * 4, 4));
        } else if (t === 'stco' || t === 'co64') {
          n = uintOf(m, s + 4, 4);
          out.offsetEntries = n;
          out.offsetTable = t;
          for (i = 0; i < n; i++) offsets.push(t === 'stco' ? uintOf(m, s + 8 + i * 4, 4) : uintOf(m, s + 8 + i * 8, 8));
        }
      });
      for (var k = 0; k < sizes.length; k++) out.sampleBytes += sizes[k];
      for (k = 1; k < offsets.length; k++) if (offsets[k] <= offsets[k - 1]) out.offsetsOrdered = false;
      var mdatEnd = out.mdatStart + out.mdatBytes;
      for (k = 0; k < offsets.length; k++) {
        var sz = sizes.length === offsets.length ? sizes[k] : 0;
        if (offsets[k] < out.mdatStart || offsets[k] + sz > mdatEnd) { out.offsetsInsideMdat = false; break; }
      }
      out.ok = out.hasFtyp && out.hasMoov && out.hasMdat && out.samples > 0 && out.errors.length === 0;
      return out;
    });
  }).catch(function (e) {
    out.errors.push('The MP4 could not be parsed: ' + (e.message || e));
    return out;
  });
}

/* ---------------- H.264 capability probe ---------------- */
var H264_CANDIDATES = [
  { id: 'avc1.640034', label: 'H.264 High @ 5.2' },
  { id: 'avc1.64003E', label: 'H.264 High @ 6.2' },
  { id: 'avc1.640033', label: 'H.264 High @ 5.1' },
  { id: 'avc1.64002A', label: 'H.264 High @ 4.2' },
  { id: 'avc1.640028', label: 'H.264 High @ 4.0' },
  { id: 'avc1.4D0034', label: 'H.264 Main @ 5.2' },
  { id: 'avc1.4D0033', label: 'H.264 Main @ 5.1' },
  { id: 'avc1.4D002A', label: 'H.264 Main @ 4.2' },
  { id: 'avc1.4D0028', label: 'H.264 Main @ 4.0' },
  { id: 'avc1.42003E', label: 'H.264 Constrained Baseline @ 6.2' },
  { id: 'avc1.420034', label: 'H.264 Constrained Baseline @ 5.2' },
  { id: 'avc1.42002A', label: 'H.264 Constrained Baseline @ 4.2' },
  { id: 'avc1.42001F', label: 'H.264 Constrained Baseline @ 3.1' }
];
/* Probes the real width, height, frame rate and bitrate. Nothing is assumed
   supported: the first configuration the browser actually accepts is the one
   the exporter uses, and its exact string is reported. */
/* Conservative H.264 Level 6.2 reference ceilings used only to explain
   impossible requests. Browser support is still probed independently. */
var H264_L62_MAX_MBPS = 16711680;
var H264_L62_MAX_BITRATE = 800000000;
function h264LimitNote(width, height, fps, bitrate) {
  var mbpf = Math.ceil(width / 16) * Math.ceil(height / 16);
  var mbps = mbpf * fps;
  var notes = [];
  if (mbps > H264_L62_MAX_MBPS) {
    notes.push('The frame size × frame rate is above the H.264 Level 6.2 processing ceiling (' +
      Math.round(mbps).toLocaleString() + ' macroblocks/s requested vs ' +
      H264_L62_MAX_MBPS.toLocaleString() + ' allowed).');
  }
  if (bitrate > H264_L62_MAX_BITRATE) {
    notes.push('The requested bitrate is above the H.264 Level 6.2 ceiling of ' +
      Math.round(H264_L62_MAX_BITRATE / 1000000) + ' Mbps.');
  }
  return notes.join(' ');
}
function probeH264(width, height, fps, bitrate) {
  var out = { available: false, supported: [], selected: null, reason: '', tried: [], width: 0, height: 0, fps: fps, bitrate: 0 };
  if (typeof VideoEncoder === 'undefined' || !VideoEncoder.isConfigSupported || typeof VideoFrame === 'undefined') {
    out.reason = 'WebCodecs VideoEncoder / VideoFrame are not implemented in this browser, so H.264 cannot be encoded here.';
    return Promise.resolve(out);
  }
  var w = Math.max(2, width - (width % 2)), h = Math.max(2, height - (height % 2));
  var br = sanitiseBitrate(bitrate, w, h, fps);
  out.width = w; out.height = h; out.bitrate = br;
  if (width % 2 || height % 2) {
    out.reason = 'H.264 needs even pixel dimensions. The composition is ' + width + '×' + height + '.';
    return Promise.resolve(out);
  }
  var i = 0;
  function next() {
    if (i >= H264_CANDIDATES.length) {
      out.available = out.supported.length > 0;
      if (!out.available) {
        var limit = h264LimitNote(w, h, fps, br);
        out.reason = 'No H.264 configuration was accepted at ' + w + '×' + h + ' / ' + fps + ' fps / ' + Math.round(br / 1000) + ' kbps. ' +
          H264_CANDIDATES.length + ' profile and level combinations were tried.' +
          (limit ? ' ' + limit : '');
      }
      return out;
    }
    var c = H264_CANDIDATES[i++];
    var cfg = {
      codec: c.id, width: w, height: h, bitrate: br, framerate: fps,
      latencyMode: 'quality', avc: { format: 'avc' }
    };
    return VideoEncoder.isConfigSupported(cfg).then(function (r) {
      var ok = !!(r && r.supported);
      out.tried.push({ id: c.id, label: c.label, supported: ok });
      if (ok) {
        var conf = (r.config && r.config.codec) ? r.config : cfg;
        out.supported.push({ id: conf.codec || c.id, label: c.label, config: cfg });
        if (!out.selected) out.selected = { id: conf.codec || c.id, label: c.label, config: cfg };
      }
      return next();
    }).catch(function (e) {
      out.tried.push({ id: c.id, label: c.label, supported: false, error: String(e && e.message || e) });
      return next();
    });
  }
  return Promise.resolve().then(next);
}
/* A bitrate that reaches VideoEncoder must be a finite, sane, positive integer. */
function sanitiseBitrate(v, width, height, fps) {
  var n = Number(v);
  if (!isFinite(n) || n <= 0) n = bitrateFor(width, height, fps, 'standard');
  n = Math.round(n);
  if (n < 100000) n = 100000;
  if (n > 2000000000) n = 2000000000;
  return n;
}

var CODECS = [
  { id: 'vp09.00.10.08', container: 'V_VP9', label: 'VP9 profile 0' },
  { id: 'vp8', container: 'V_VP8', label: 'VP8' }
];
function probeEncoders(width, height, fps, bitrate) {
  if (typeof VideoEncoder === 'undefined' || !VideoEncoder.isConfigSupported) {
    return Promise.resolve({ available: false, reason: 'VideoEncoder (WebCodecs) is not implemented in this browser.', supported: [] });
  }
  var w = Math.max(2, width - (width % 2)), h = Math.max(2, height - (height % 2));
  var probeBitrate = sanitiseBitrate(bitrate === undefined ? 6000000 : bitrate, w, h, fps);
  var tests = CODECS.map(function (c) {
    return VideoEncoder.isConfigSupported({
      codec: c.id, width: w, height: h, bitrate: probeBitrate,
      framerate: fps, latencyMode: 'quality'
    }).then(function (r) { return { codec: c, supported: !!r.supported }; })
      .catch(function () { return { codec: c, supported: false }; });
  });
  return Promise.all(tests).then(function (rs) {
    var sup = rs.filter(function (r) { return r.supported; }).map(function (r) { return r.codec; });
    return { available: sup.length > 0, supported: sup, reason: sup.length ? '' : 'No VP8/VP9 encoder configuration was accepted at ' + w + '×' + h + '.' };
  });
}
function bitrateFor(width, height, fps, quality) {
  var f = { draft: .035, standard: .085, high: .17, max: .32 }[quality] || .085;
  return Math.round(Math.min(120e6, Math.max(500e3, width * height * fps * f)));
}

return {
  WebMMuxer: WebMMuxer, parseWebM: parseWebM,
  ZipWriter: ZipWriter, parseZip: parseZip,
  crc32: crc32, crc32Final: crc32Final, fnv1a: fnv1a, utf8: utf8,
  probeEncoders: probeEncoders, bitrateFor: bitrateFor, CODECS: CODECS,
  MP4Muxer: MP4Muxer, parseMP4: parseMP4, probeH264: probeH264,
  sanitiseBitrate: sanitiseBitrate, H264_CANDIDATES: H264_CANDIDATES
};
})();

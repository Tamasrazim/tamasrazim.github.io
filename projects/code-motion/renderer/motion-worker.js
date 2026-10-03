importScripts('./motion-runtime.js','./motion-encoders.js','./motion-export.js');

/* ============================================================
   Worker shell — the isolated execution + render path.
   Animation code never sees the page: no DOM, and the network and
   storage globals are shadowed inside the animation scope.
   ============================================================ */
(function () {
'use strict';
var cancelled = false;
var previewCanvas = null, previewCtx = null;
var rt = MotionCore.createRuntime();
var assets = {};

function mk(w, h) {
  var c = new OffscreenCanvas(w, h);
  return { canvas: c, ctx: c.getContext('2d', { alpha: true, willReadFrequently: false }) };
}
/* The export render target. There is no DOM in here, so it is an
   OffscreenCanvas rather than <canvas id="render-target">; it is still a real
   canvas and it is the only surface VideoFrame is ever built from. */
function mkExport(w, h) {
  var o = mk(w, h);
  o.role = 'render-target';
  return o;
}
var ENV = {
  core: MotionCore, enc: MotionEncoders, makeCanvas: mk, makeExportCanvas: mkExport,
  toBlob: function (canvas, type) { return canvas.convertToBlob({ type: type }); }
};
function send(m, transfer) { self.postMessage(m, transfer || []); }

self.onmessage = function (ev) {
  var m = ev.data, id = m.id;
  try {
    switch (m.type) {
      case 'ping': send({ type: 'pong', id: id, version: MotionCore.VERSION }); break;

      case 'assets':
        Promise.all((m.assets || []).map(function (a) {
          return createImageBitmap(a.blob).then(function (bm) { return { name: a.name, bm: bm }; })
            .catch(function () { return null; });
        })).then(function (list) {
          assets = {};
          list.forEach(function (x) { if (x) assets[x.name] = x.bm; });
          rt.setAssets(assets);
          send({ type: 'assets', id: id, count: Object.keys(assets).length });
        });
        break;

      case 'compile':
        rt.setComposition(m.composition);
        rt.setAssets(assets);
        send({ type: 'compile', id: id, result: rt.compile(m.code) });
        break;

      case 'composition':
        rt.setComposition(m.composition);
        send({ type: 'composition', id: id, ok: true });
        break;

      case 'preview': {
        var w = m.rasterW, h = m.rasterH;
        if (!previewCanvas || previewCanvas.width !== w || previewCanvas.height !== h) {
          previewCanvas = new OffscreenCanvas(w, h);
          previewCtx = previewCanvas.getContext('2d', { alpha: true });
        }
        var r = rt.renderInto(previewCtx, m.frame, { rasterScale: m.scale });
        if (!r.ok) { send({ type: 'preview', id: id, ok: false, error: r.error, frame: m.frame }); break; }
        var bmp = previewCanvas.transferToImageBitmap();
        send({ type: 'preview', id: id, ok: true, frame: m.frame, ms: r.ms, bitmap: bmp }, [bmp]);
        break;
      }

      case 'renderOne': {
        var o = mk(m.width, m.height);
        var rr = rt.renderInto(o.ctx, m.frame, { isExport: true, rasterScale: m.width / rt.comp.width });
        if (!rr.ok) { send({ type: 'renderOne', id: id, ok: false, error: rr.error }); break; }
        var b2 = o.canvas.transferToImageBitmap();
        send({ type: 'renderOne', id: id, ok: true, ms: rr.ms, bitmap: b2 }, [b2]);
        break;
      }

      case 'timing':
        MotionExport.sampleTiming(ENV, m.job, m.frames || 6).then(function (r) { send({ type: 'timing', id: id, result: r }); });
        break;

      case 'loopSeam':
        MotionExport.loopSeam(ENV, m.job).then(function (r) { send({ type: 'loopSeam', id: id, result: r }); });
        break;

      case 'cancel': cancelled = true; break;

      case 'export': {
        cancelled = false;
        var dir = m.dirHandle || null;
        var writeFile = dir ? function (name, blob) {
          return dir.getFileHandle(name, { create: true })
            .then(function (fh) { return fh.createWritable(); })
            .then(function (ws) { return ws.write(blob).then(function () { return ws.close(); }); });
        } : null;
        var existing = m.existing || null;
        MotionExport.run({
          env: ENV, job: m.job, from: m.from || 0, assets: assets, existing: existing, writeFile: writeFile,
          isCancelled: function () { return cancelled; },
          onLog: function (msg) { send({ type: 'log', id: id, message: msg }); },
          onProgress: function (p) { send({ type: 'progress', id: id, progress: p }); }
        }).then(function (r) {
          if (r.blob) send({ type: 'done', id: id, result: r });
          else send({ type: 'done', id: id, result: r });
        }).catch(function (e) {
          send({ type: 'done', id: id, result: { ok: false, stage: 'crash', error: { name: e.name || 'Error', message: String(e.message || e), detail: 'The render worker threw before finishing. Nothing was written.' } } });
        });
        break;
      }
    }
  } catch (e) {
    send({ type: 'fail', id: id, error: { name: e.name || 'Error', message: String(e.message || e), stack: String(e.stack || '') } });
  }
};
send({ type: 'ready', version: MotionCore.VERSION });
})();

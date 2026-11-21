import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (name) => readFile(path.join(root, name), 'utf8');
const [html, sample, helper, serviceWorker] = await Promise.all([
  read('index.html'),
  read('examples/singularity-protocol-webgpu.js'),
  read('webgpu-renderer.js'),
  read('sw.js')
]);

function sourceBlock(id) {
  const marker = 'id="' + id + '"';
  const at = html.indexOf(marker);
  assert.notEqual(at, -1, 'Missing source block: ' + id);
  const openEnd = html.indexOf('>', at);
  const close = html.indexOf('</script>', openEnd);
  assert.ok(openEnd > at && close > openEnd, 'Malformed source block: ' + id);
  return html.slice(openEnd + 1, close);
}

const runtimeSource = sourceBlock('src-runtime');
const workerSource = sourceBlock('src-worker');
const directPreviewGate = workerSource.match(/function canUseDirectGPUPreview\(runtime\) \{[\s\S]*?\n\}/);
assert.ok(directPreviewGate, 'Missing direct GPU preview safety gate');
const canUseDirectGPUPreview = new Function(
  directPreviewGate[0] + '\nreturn canUseDirectGPUPreview;'
)();
assert.equal(canUseDirectGPUPreview({
  gpu: {}, comp: { transparent: true }, layers: [], vectorEdits: {}
}), true, 'Transparent GPU-only compositions can skip the Canvas 2D compositor');
assert.equal(canUseDirectGPUPreview({
  gpu: { opaque: true }, comp: { transparent: false }, layers: [], vectorEdits: {}
}), true, 'Explicitly opaque GPU-only compositions can use direct preview');
assert.equal(canUseDirectGPUPreview({
  gpu: {}, comp: { transparent: false }, layers: [], vectorEdits: {}
}), false, 'A non-transparent composition needs its background compositor unless the shader is opaque');
assert.equal(canUseDirectGPUPreview({
  gpu: { opaque: true }, comp: { transparent: false },
  layers: [{ visible: true }], vectorEdits: {}
}), false, 'Visible media layers must retain the mixed-layer compositor');
assert.equal(canUseDirectGPUPreview({
  gpu: { opaque: true }, comp: { transparent: false },
  layers: [{ visible: false }], vectorEdits: { vector1: { x: 0 } }
}), false, 'Vector edits must retain the mixed-layer compositor');
assert.equal(canUseDirectGPUPreview({
  gpu: { opaque: true }, comp: { transparent: false },
  layers: [{ visible: false }], vectorEdits: {}
}), true, 'Hidden media layers do not block direct preview');
assert.equal(canUseDirectGPUPreview({
  comp: { transparent: true }, layers: [], vectorEdits: {}
}), false, 'Canvas-only projects must use the existing compositor');
assert.match(workerSource, /var directGPUPreview = canUseDirectGPUPreview\(rt\)/);
assert.match(workerSource, /if \(directGPUPreview && gpuBitmap\)/);
assert.match(workerSource, /directGPUPreview: true/);
assert.match(workerSource, /frameSource: 'WebGPU ImageBitmap → main-thread preview'/);
assert.match(workerSource, /previewCanvas\.transferToImageBitmap\(\)/,
  'Mixed layers and Canvas fallback must keep the existing compositor path');
const core = new Function(runtimeSource + String.fromCharCode(10) + 'return MotionCore;')();
const runtime = core.createRuntime();
runtime.setComposition(core.composition({
  width: 640, height: 360, fps: 60, duration: 8,
  loop: true, loopDuration: 8
}));
const recorderContext = { self: { navigator: {} } };
vm.runInNewContext(helper, recorderContext);
const simpleRuntime = core.createRuntime();
simpleRuntime.setComposition(core.composition({ width: 320, height: 180, fps: 30, duration: 2 }));
const simpleCompile = simpleRuntime.compile("function renderFrame(time, frame, fps, ctx, width, height) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height); ctx.beginPath(); ctx.arc(width / 2, height / 2, 30, 0, Math.PI * 2); ctx.fill(); }");
assert.equal(simpleCompile.ok, true);
const simpleCapture = simpleRuntime.captureCanvas2D(0, {}, recorderContext.self.TRILYVAWebGPU.createCanvas2DRecorder(320, 180));
assert.equal(simpleCapture.ok, true);
assert.equal(simpleCapture.supported, true);
assert.ok(simpleCapture.count >= 3, 'Runtime capture should emit background, rectangle, and circle geometry through the GPU recorder');
const textRuntime = core.createRuntime();
textRuntime.setComposition(core.composition({ width: 320, height: 180, fps: 30, duration: 2 }));
assert.equal(textRuntime.compile("function renderFrame(time, frame, fps, ctx) { ctx.fillText('fallback', 5, 20); }").ok, true);
const textRecorder = recorderContext.self.TRILYVAWebGPU.createCanvas2DRecorder(320, 180);
const textCapture = textRuntime.captureCanvas2D(0, {}, textRecorder);
assert.equal(textCapture.ok, true);
assert.equal(textCapture.supported, false, 'Unsupported Canvas 2D calls must be classified for CPU fallback');
const compile = runtime.compile(sample);
assert.equal(compile.ok, true, compile.error && compile.error.message);
assert.equal(compile.hasGPU, true);
assert.equal(runtime.gpu.opaque, true, 'The stress sample declares its fully opaque fragment output for direct preview');
assert.equal(typeof runtime.gpu.wgsl, 'string');
assert.match(runtime.gpu.wgsl, /@vertex\s+fn vsMain/);
assert.match(runtime.gpu.wgsl, /@fragment\s+fn fsMain/);

// GPU compositor should use the ImageBitmap instead of invoking CPU fallback.
const draws = [];
const ctx = {
  setTransform() {}, clearRect() {}, fillRect() {}, save() {}, beginPath() {},
  rect() {}, clip() {}, restore() {},
  drawImage(bitmap, x, y, w, h) { draws.push({ bitmap, x, y, w, h }); }
};
const fakeBitmap = { tag: 'GPU frame' };
const rendered = runtime.renderInto(ctx, 0, { gpuBitmap: fakeBitmap });
assert.equal(rendered.ok, true);
assert.equal(draws.length, 1);
assert.equal(draws[0].bitmap, fakeBitmap);

// The helper must load when WebGPU is unavailable and report inactive honestly.
new Function(helper);
const noGPUContext = { self: { navigator: {} } };
vm.runInNewContext(helper, noGPUContext);
const noGPURenderer = noGPUContext.self.TRILYVAWebGPU.createRenderer();
assert.equal(noGPURenderer.status().active, false);
assert.equal(typeof noGPURenderer.prepare, 'function');
assert.equal(typeof noGPURenderer.render, 'function');

// Automatic Canvas 2D recorder: supported commands become typed GPU primitives.
const recorder = recorderContext.self.TRILYVAWebGPU.createCanvas2DRecorder(640, 360);
recorder.context.fillStyle = '#ff8040';
recorder.context.globalAlpha = 0.75;
recorder.context.fillRect(10, 20, 120, 80);
recorder.context.save();
recorder.context.translate(200, 120);
recorder.context.strokeStyle = 'rgba(255,255,255,0.9)';
recorder.context.lineWidth = 4;
recorder.context.beginPath();
recorder.context.arc(0, 0, 40, 0, Math.PI * 2);
recorder.context.stroke();
recorder.context.restore();
const recorded = recorder.finish();
assert.equal(recorded.supported, true);
assert.ok(recorded.count > 1);
assert.equal(recorded.commands.length, recorded.count * 20);
assert.equal(recorded.commands[0], 0, 'fillRect is stored as a GPU rectangle command');
assert.equal(recorded.commands[20], 5, 'Path strokes are stored as GPU line commands');
const unsupportedRecorder = recorderContext.self.TRILYVAWebGPU.createCanvas2DRecorder(10, 10);
void unsupportedRecorder.context.fillText;
assert.equal(unsupportedRecorder.finish().supported, false,
  'Text must use the native Canvas 2D fallback rather than claim GPU rendering');

// Deterministic mock adapter covers pipeline creation, uniforms, submission,
// serialized frame rendering, and ImageBitmap handoff.
const fakeDevice = {
  limits: { maxTextureDimension2D: 8192 },
  lost: new Promise(() => {}),
  queue: {
    writeBuffer(buffer, offset, data) { assert.ok(data.byteLength === 48 || data.byteLength === 16 || data.byteLength >= 80); },
    submit(commands) { assert.equal(commands.length, 1); },
    onSubmittedWorkDone() { return Promise.resolve(); }
  },
  createShaderModule() { return { getCompilationInfo: async () => ({ messages: [] }) }; },
  createRenderPipelineAsync: async () => ({ getBindGroupLayout() { return {}; } }),
  createBuffer() { return { destroy() {} }; },
  createBindGroup() { return {}; },
  createCommandEncoder() {
    return {
      beginRenderPass() {
        return { setPipeline() {}, setBindGroup() {}, draw(n) { assert.ok(n === 3 || n === 6); }, end() {} };
      },
      finish() { return {}; }
    };
  },
  destroy() {}
};
class FakeOffscreenCanvas {
  constructor(width, height) { this.width = width; this.height = height; }
  getContext(kind) {
    assert.equal(kind, 'webgpu');
    return { configure() {}, getCurrentTexture() { return { createView() { return {}; } }; } };
  }
  transferToImageBitmap() { return { width: this.width, height: this.height, close() {} }; }
}
const gpuContext = {
  self: {
    navigator: {
      gpu: {
        async requestAdapter() {
          return {
            info: { vendor: 'test', architecture: 'stub', device: 'fake adapter' },
            async requestDevice() { return fakeDevice; }
          };
        },
        getPreferredCanvasFormat() { return 'rgba8unorm'; }
      }
    }
  },
  OffscreenCanvas: FakeOffscreenCanvas,
  GPUBufferUsage: { UNIFORM: 64, COPY_DST: 8, STORAGE: 128 }
};
vm.runInNewContext(helper, gpuContext);
const gpuRenderer = gpuContext.self.TRILYVAWebGPU.createRenderer();
const gpuInfo = await gpuRenderer.prepare(runtime.gpu);
assert.equal(gpuInfo.active, true);
const gpuBitmap = await gpuRenderer.render(runtime.gpu, {
  time: 0, frame: 0, fps: 60, duration: 8, frameCount: 480,
  seed: 1, loopDuration: 8, loop: true, speed: 1, reverse: false
}, 640, 360);
assert.equal(gpuBitmap.width, 640);
assert.equal(gpuBitmap.height, 360);
const gpuCanvas2DBitmap = await gpuRenderer.renderCanvas2D(recorded.commands, recorded.count, 640, 360, 1);
assert.equal(gpuCanvas2DBitmap.width, 640);
assert.equal(gpuCanvas2DBitmap.height, 360);
assert.equal(gpuRenderer.status().canvas2DAuto, true);
gpuRenderer.dispose();

// Parse the regular page scripts and all embedded runtime/worker modules.
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const type = (match[1].match(/type=["']([^"']+)["']/i) || [])[1] || '';
  if (/text\/plain|application\/ld\+json|text\/json/i.test(type)) continue;
  if (match[2].trim()) new Function(match[2]);
}
assert.match(html, /id="diagGPU"/, 'Diagnostics has a dedicated GPU rendering section');
assert.match(html, /case 'gpuStatus'/, 'Diagnostics can query renderer-owned GPU state');
assert.match(html, /function gpuStatusSnapshot\(\)/, 'worker reports WGSL and automatic Canvas 2D GPU routing separately');
assert.match(html, /Automatic Canvas 2D → WebGPU/, 'Diagnostics labels the automatic Canvas 2D GPU compatibility path');
assert.match(html, /function mainGpuStatus\(\)/, 'main-thread fallback is explicitly identified as Canvas 2D');
assert.match(html, /importScripts\(/);
assert.match(html, /renderGPUFrame\(/);
assert.match(html, /gpuBitmap/);
assert.match(serviceWorker, /tamasrazim-trilyva-pwa-v171-live-gpu-diagnostics/);
assert.match(serviceWorker, /\.\/webgpu-renderer\.js/);
assert.match(serviceWorker, /\.\/examples\/singularity-protocol-webgpu\.js/);

console.log('TRILYVA live WebGPU renderer contract: PASS');

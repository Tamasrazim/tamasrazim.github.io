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
const core = new Function(runtimeSource + String.fromCharCode(10) + 'return MotionCore;')();
const runtime = core.createRuntime();
runtime.setComposition(core.composition({
  width: 640, height: 360, fps: 60, duration: 8,
  loop: true, loopDuration: 8
}));
const compile = runtime.compile(sample);
assert.equal(compile.ok, true, compile.error && compile.error.message);
assert.equal(compile.hasGPU, true);
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

// Deterministic mock adapter covers pipeline creation, uniforms, submission,
// serialized frame rendering, and ImageBitmap handoff.
const fakeDevice = {
  limits: { maxTextureDimension2D: 8192 },
  lost: new Promise(() => {}),
  queue: {
    writeBuffer(buffer, offset, data) { assert.equal(data.byteLength, 48); },
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
        return { setPipeline() {}, setBindGroup() {}, draw(n) { assert.equal(n, 3); }, end() {} };
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
  GPUBufferUsage: { UNIFORM: 64, COPY_DST: 8 }
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
gpuRenderer.dispose();

// Parse the regular page scripts and all embedded runtime/worker modules.
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const type = (match[1].match(/type=["']([^"']+)["']/i) || [])[1] || '';
  if (/text\/plain|application\/ld\+json|text\/json/i.test(type)) continue;
  if (match[2].trim()) new Function(match[2]);
}
assert.match(html, /importScripts\(/);
assert.match(html, /renderGPUFrame\(/);
assert.match(html, /gpuBitmap/);
assert.match(serviceWorker, /tamasrazim-trilyva-pwa-v164-webgpu/);
assert.match(serviceWorker, /\.\/webgpu-renderer\.js/);
assert.match(serviceWorker, /\.\/examples\/singularity-protocol-webgpu\.js/);

console.log('TRILYVA live WebGPU renderer contract: PASS');

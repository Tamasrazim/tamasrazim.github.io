/* TRILYVA WebGPU frame backend.
   Loaded inside the dedicated render worker. User animation code never receives
   the GPUDevice; it only supplies a WGSL fragment shader through the GPU contract. */
(function (root) {
  'use strict';

  function createRenderer() {
    var adapter = null;
    var device = null;
    var canvas = null;
    var context = null;
    var format = null;
    var pipeline = null;
    var shaderText = '';
    var uniformBuffer = null;
    var bindGroup = null;
    var width = 0;
    var height = 0;
    var ready = false;
    var lost = null;
    var adapterLabel = 'WebGPU adapter';
    var activeLabel = '';

    function gpuError(message) {
      var error = new Error(message);
      error.name = 'WebGPUBackendError';
      return error;
    }

    async function ensureDevice() {
      if (device && !lost) return device;
      if (!root.navigator || !root.navigator.gpu) {
        throw gpuError('WebGPU is not exposed in this rendering worker. The Canvas 2D fallback remains available.');
      }
      adapter = await root.navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) {
        throw gpuError('The browser did not provide a high-performance WebGPU adapter.');
      }
      var info = null;
      try { info = adapter.info || (adapter.requestAdapterInfo ? await adapter.requestAdapterInfo() : null); } catch (_) {}
      if (info) {
        adapterLabel = [info.vendor, info.architecture, info.device].filter(Boolean).join(' · ') || adapterLabel;
      }
      device = await adapter.requestDevice();
      lost = null;
      device.lost.then(function (reason) {
        lost = reason && reason.message ? reason.message : 'The WebGPU device was lost.';
        ready = false;
        pipeline = null;
        bindGroup = null;
        uniformBuffer = null;
        context = null;
        canvas = null;
        width = 0;
        height = 0;
        device = null;
      }).catch(function () {});
      format = root.navigator.gpu.getPreferredCanvasFormat();
      return device;
    }

    async function buildPipeline(source) {
      var d = await ensureDevice();
      if (typeof source !== 'string' || !source.trim()) {
        throw gpuError('The GPU renderer did not receive a WGSL shader string.');
      }
      if (source === shaderText && pipeline && uniformBuffer && bindGroup) return;
      var module = d.createShaderModule({ code: source });
      if (module.getCompilationInfo) {
        var compilation = await module.getCompilationInfo();
        var errors = (compilation.messages || []).filter(function (m) { return m.type === 'error'; });
        if (errors.length) {
          throw gpuError('WGSL compilation failed: ' + errors.slice(0, 4).map(function (m) {
            return (m.lineNum ? 'line ' + m.lineNum + ': ' : '') + m.message;
          }).join(' | '));
        }
      }
      var descriptor = {
        label: 'TRILYVA WGSL frame pipeline',
        layout: 'auto',
        vertex: { module: module, entryPoint: 'vsMain' },
        fragment: {
          module: module,
          entryPoint: 'fsMain',
          targets: [{ format: format }]
        },
        primitive: { topology: 'triangle-list' }
      };
      var nextPipeline = d.createRenderPipelineAsync
        ? await d.createRenderPipelineAsync(descriptor)
        : d.createRenderPipeline(descriptor);
      var nextUniform = d.createBuffer({
        label: 'TRILYVA frame uniforms',
        size: 48,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });
      var nextBindGroup = d.createBindGroup({
        layout: nextPipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: nextUniform } }]
      });
      if (uniformBuffer) {
        try { uniformBuffer.destroy(); } catch (_) {}
      }
      shaderText = source;
      pipeline = nextPipeline;
      uniformBuffer = nextUniform;
      bindGroup = nextBindGroup;
      ready = true;
    }

    async function prepare(descriptor) {
      if (!descriptor || typeof descriptor.wgsl !== 'string') {
        throw gpuError('GPU source must be an object with a WGSL string in its wgsl property.');
      }
      await buildPipeline(descriptor.wgsl);
      activeLabel = String(descriptor.label || 'Custom WGSL animation');
      return {
        active: true,
        backend: 'WebGPU',
        adapter: adapterLabel,
        format: format,
        label: activeLabel
      };
    }

    var renderQueue = Promise.resolve();

    async function renderNow(descriptor, frame, outputWidth, outputHeight) {
      var w = Math.floor(Number(outputWidth));
      var h = Math.floor(Number(outputHeight));
      if (!(w > 0) || !(h > 0)) throw gpuError('WebGPU output dimensions must be positive integers.');
      await prepare(descriptor);
      var d = await ensureDevice();
      var max = d.limits.maxTextureDimension2D || 8192;
      if (w > max || h > max) {
        throw gpuError('Requested GPU frame ' + w + '×' + h + ' exceeds this adapter texture limit of ' + max + ' pixels per edge. No resize was applied.');
      }

      if (!canvas) {
        canvas = new OffscreenCanvas(w, h);
        context = canvas.getContext('webgpu');
        if (!context) throw gpuError('OffscreenCanvas could not create a WebGPU context in the render worker.');
      }
      if (canvas.width !== w || canvas.height !== h || width !== w || height !== h) {
        canvas.width = w;
        canvas.height = h;
        context.configure({
          device: d,
          format: format,
          alphaMode: 'premultiplied'
        });
        width = w;
        height = h;
      }

      var uniforms = new Float32Array([
        w, h,
        Number(frame.time) || 0,
        Number(frame.frame) || 0,
        Number(frame.fps) || 60,
        Number(frame.duration) || 1,
        Number(frame.frameCount) || 1,
        Number(frame.seed) || 0,
        Number(frame.loopDuration) || Number(frame.duration) || 1,
        frame.loop ? 1 : 0,
        Number(frame.speed) || 1,
        frame.reverse ? 1 : 0
      ]);
      d.queue.writeBuffer(uniformBuffer, 0, uniforms);

      var encoder = d.createCommandEncoder({ label: 'TRILYVA frame ' + frame.frame });
      var pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store'
        }]
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3, 1, 0, 0);
      pass.end();
      d.queue.submit([encoder.finish()]);
      if (d.queue.onSubmittedWorkDone) await d.queue.onSubmittedWorkDone();
      return canvas.transferToImageBitmap();
    }

    function render(descriptor, frame, outputWidth, outputHeight) {
      var task = renderQueue.then(function () {
        return renderNow(descriptor, frame, outputWidth, outputHeight);
      });
      renderQueue = task.then(function () { return undefined; }, function () { return undefined; });
      return task;
    }

    function status() {
      return {
        active: !!(ready && device && !lost),
        backend: 'WebGPU',
        adapter: adapterLabel,
        label: activeLabel,
        error: lost || null
      };
    }

    function dispose() {
      ready = false;
      if (uniformBuffer) { try { uniformBuffer.destroy(); } catch (_) {} }
      if (device) { try { device.destroy(); } catch (_) {} }
      uniformBuffer = null;
      bindGroup = null;
      pipeline = null;
      device = null;
      adapter = null;
      canvas = null;
      context = null;
      width = 0;
      height = 0;
      shaderText = '';
    }

    return { prepare: prepare, render: render, status: status, dispose: dispose };
  }

  root.TRILYVAWebGPU = { createRenderer: createRenderer, version: '1.0.0' };
})(self);

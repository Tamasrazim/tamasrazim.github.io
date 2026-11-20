/* TRILYVA WebGPU frame backend.
   Runs only in the dedicated render worker. Animation code supplies WGSL;
   the GPUDevice and all WebGPU objects remain private to this module.

   Modes:
   - fragment (default): one fullscreen fragment pass.
   - compute: an 8×8 compute dispatch writes rgba8unorm pixels, then a
     fullscreen pass copies that texture to the worker's output surface.
*/
(function (root) {
  'use strict';

  var BLIT_SHADER = [
    '@group(0) @binding(0) var sourceFrame: texture_2d<f32>;',
    'struct VertexOut { @builtin(position) position: vec4<f32>, };',
    '@vertex fn vsMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOut {',
    '  var positions = array<vec2<f32>, 3>(',
    '    vec2<f32>(-1.0, -1.0),',
    '    vec2<f32>( 3.0, -1.0),',
    '    vec2<f32>(-1.0,  3.0)',
    '  );',
    '  var output: VertexOut;',
    '  output.position = vec4<f32>(positions[vertexIndex], 0.0, 1.0);',
    '  return output;',
    '}',
    '@fragment fn fsMain(@builtin(position) pixel: vec4<f32>) -> @location(0) vec4<f32> {',
    '  return textureLoad(sourceFrame, vec2<i32>(pixel.xy), 0);',
    '}'
  ].join('\n');

  var COMPUTE_TEXTURE_FORMAT = 'rgba8unorm';
  var COMPUTE_WORKGROUP_X = 8;
  var COMPUTE_WORKGROUP_Y = 8;

  function createRenderer() {
    var adapter = null;
    var device = null;
    var canvas = null;
    var context = null;
    var format = null;
    var pipeline = null;
    var computePipeline = null;
    var blitPipeline = null;
    var shaderText = '';
    var shaderMode = '';
    var uniformBuffer = null;
    var bindGroup = null;
    var computeTexture = null;
    var computeBindGroup = null;
    var blitBindGroup = null;
    var width = 0;
    var height = 0;
    var computeWidth = 0;
    var computeHeight = 0;
    var ready = false;
    var lost = null;
    var adapterLabel = 'WebGPU adapter';
    var activeLabel = '';
    var activeMode = 'fragment';

    function gpuError(message) {
      var error = new Error(message);
      error.name = 'WebGPUBackendError';
      return error;
    }

    function clearComputeTarget() {
      if (computeTexture) {
        try { computeTexture.destroy(); } catch (_) {}
      }
      computeTexture = null;
      computeBindGroup = null;
      blitBindGroup = null;
      computeWidth = 0;
      computeHeight = 0;
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
      try {
        info = adapter.info || (adapter.requestAdapterInfo ? await adapter.requestAdapterInfo() : null);
      } catch (_) {}
      if (info) {
        adapterLabel = [info.vendor, info.architecture, info.device].filter(Boolean).join(' · ') || adapterLabel;
      }

      device = await adapter.requestDevice();
      lost = null;
      device.lost.then(function (reason) {
        lost = reason && reason.message ? reason.message : 'The WebGPU device was lost.';
        ready = false;
        pipeline = null;
        computePipeline = null;
        blitPipeline = null;
        bindGroup = null;
        computeBindGroup = null;
        blitBindGroup = null;
        uniformBuffer = null;
        computeTexture = null;
        context = null;
        canvas = null;
        width = 0;
        height = 0;
        computeWidth = 0;
        computeHeight = 0;
        device = null;
      }).catch(function () {});

      format = root.navigator.gpu.getPreferredCanvasFormat();
      return device;
    }

    async function createPipeline(module, descriptor) {
      return descriptor.createRenderPipelineAsync
        ? descriptor.createRenderPipelineAsync(module)
        : descriptor.createRenderPipeline(module);
    }

    async function buildPipeline(descriptor) {
      var d = await ensureDevice();
      var source = descriptor.wgsl;
      var mode = descriptor.mode === 'compute' ? 'compute' : 'fragment';

      if (typeof source !== 'string' || !source.trim()) {
        throw gpuError('The GPU renderer did not receive a WGSL shader string.');
      }

      var alreadyBuilt = source === shaderText && mode === shaderMode && uniformBuffer &&
        (mode === 'compute' ? !!(computePipeline && blitPipeline) : !!pipeline);
      if (alreadyBuilt) return;

      var module = d.createShaderModule({ code: source });
      if (module.getCompilationInfo) {
        var compilation = await module.getCompilationInfo();
        var errors = (compilation.messages || []).filter(function (message) {
          return message.type === 'error';
        });
        if (errors.length) {
          throw gpuError('WGSL compilation failed: ' + errors.slice(0, 5).map(function (message) {
            return (message.lineNum ? 'line ' + message.lineNum + ': ' : '') + message.message;
          }).join(' | '));
        }
      }

      var nextPipeline = null;
      var nextComputePipeline = null;
      var nextBlitPipeline = null;

      if (mode === 'compute') {
        var computeDescriptor = {
          label: 'TRILYVA WGSL compute frame pipeline',
          layout: 'auto',
          compute: {
            module: module,
            entryPoint: String(descriptor.computeEntryPoint || 'computeMain')
          }
        };
        nextComputePipeline = d.createComputePipelineAsync
          ? await d.createComputePipelineAsync(computeDescriptor)
          : d.createComputePipeline(computeDescriptor);

        var blitModule = d.createShaderModule({ code: BLIT_SHADER });
        var blitDescriptor = {
          label: 'TRILYVA compute output blit pipeline',
          layout: 'auto',
          vertex: { module: blitModule, entryPoint: 'vsMain' },
          fragment: {
            module: blitModule,
            entryPoint: 'fsMain',
            targets: [{ format: format }]
          },
          primitive: { topology: 'triangle-list' }
        };
        nextBlitPipeline = d.createRenderPipelineAsync
          ? await d.createRenderPipelineAsync(blitDescriptor)
          : d.createRenderPipeline(blitDescriptor);
      } else {
        var renderDescriptor = {
          label: 'TRILYVA WGSL frame pipeline',
          layout: 'auto',
          vertex: {
            module: module,
            entryPoint: String(descriptor.vertexEntryPoint || 'vsMain')
          },
          fragment: {
            module: module,
            entryPoint: String(descriptor.fragmentEntryPoint || 'fsMain'),
            targets: [{ format: format }]
          },
          primitive: { topology: 'triangle-list' }
        };
        nextPipeline = d.createRenderPipelineAsync
          ? await d.createRenderPipelineAsync(renderDescriptor)
          : d.createRenderPipeline(renderDescriptor);
      }

      var nextUniform = d.createBuffer({
        label: 'TRILYVA frame uniforms',
        size: 48,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });

      if (uniformBuffer) {
        try { uniformBuffer.destroy(); } catch (_) {}
      }
      clearComputeTarget();

      shaderText = source;
      shaderMode = mode;
      pipeline = nextPipeline;
      computePipeline = nextComputePipeline;
      blitPipeline = nextBlitPipeline;
      uniformBuffer = nextUniform;
      bindGroup = mode === 'fragment'
        ? d.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
          })
        : null;
      activeMode = mode;
      ready = true;
    }

    function ensureComputeTarget(d, w, h) {
      if (computeTexture && computeWidth === w && computeHeight === h &&
          computeBindGroup && blitBindGroup) return;

      clearComputeTarget();
      computeTexture = d.createTexture({
        label: 'TRILYVA compute frame output',
        size: [w, h, 1],
        format: COMPUTE_TEXTURE_FORMAT,
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
      });
      computeWidth = w;
      computeHeight = h;

      var view = computeTexture.createView();
      computeBindGroup = d.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: view }
        ]
      });
      blitBindGroup = d.createBindGroup({
        layout: blitPipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: view }]
      });
    }

    async function prepare(descriptor) {
      if (!descriptor || typeof descriptor.wgsl !== 'string') {
        throw gpuError('GPU source must be an object with a WGSL string in its wgsl property.');
      }
      await buildPipeline(descriptor);
      activeLabel = String(descriptor.label || 'Custom WGSL animation');
      return {
        active: true,
        backend: 'WebGPU',
        mode: activeMode,
        modes: ['fragment', 'compute'],
        adapter: adapterLabel,
        format: format,
        label: activeLabel
      };
    }

    function updateUniforms(d, frame, w, h) {
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
    }

    async function renderNow(descriptor, frame, outputWidth, outputHeight) {
      var w = Math.floor(Number(outputWidth));
      var h = Math.floor(Number(outputHeight));
      if (!(w > 0) || !(h > 0)) {
        throw gpuError('WebGPU output dimensions must be positive integers.');
      }

      await prepare(descriptor);
      var d = await ensureDevice();
      var max = d.limits.maxTextureDimension2D || 8192;
      if (w > max || h > max) {
        throw gpuError('Requested GPU frame ' + w + '×' + h +
          ' exceeds this adapter texture limit of ' + max +
          ' pixels per edge. No resize was applied.');
      }

      if (!canvas) {
        canvas = new OffscreenCanvas(w, h);
        context = canvas.getContext('webgpu');
        if (!context) {
          throw gpuError('OffscreenCanvas could not create a WebGPU context in the render worker.');
        }
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

      updateUniforms(d, frame, w, h);
      var encoder = d.createCommandEncoder({ label: 'TRILYVA frame ' + frame.frame });

      if (activeMode === 'compute') {
        ensureComputeTarget(d, w, h);
        var computePass = encoder.beginComputePass({ label: 'TRILYVA compute dispatch' });
        computePass.setPipeline(computePipeline);
        computePass.setBindGroup(0, computeBindGroup);
        computePass.dispatchWorkgroups(
          Math.ceil(w / COMPUTE_WORKGROUP_X),
          Math.ceil(h / COMPUTE_WORKGROUP_Y),
          1
        );
        computePass.end();

        var blitPass = encoder.beginRenderPass({
          colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store'
          }]
        });
        blitPass.setPipeline(blitPipeline);
        blitPass.setBindGroup(0, blitBindGroup);
        blitPass.draw(3, 1, 0, 0);
        blitPass.end();
      } else {
        var renderPass = encoder.beginRenderPass({
          colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store'
          }]
        });
        renderPass.setPipeline(pipeline);
        renderPass.setBindGroup(0, bindGroup);
        renderPass.draw(3, 1, 0, 0);
        renderPass.end();
      }

      d.queue.submit([encoder.finish()]);
      if (d.queue.onSubmittedWorkDone) await d.queue.onSubmittedWorkDone();
      return canvas.transferToImageBitmap();
    }

    var renderQueue = Promise.resolve();

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
        mode: activeMode,
        adapter: adapterLabel,
        label: activeLabel,
        error: lost || null
      };
    }

    function dispose() {
      ready = false;
      if (uniformBuffer) { try { uniformBuffer.destroy(); } catch (_) {} }
      clearComputeTarget();
      if (device) { try { device.destroy(); } catch (_) {} }
      uniformBuffer = null;
      bindGroup = null;
      pipeline = null;
      computePipeline = null;
      blitPipeline = null;
      device = null;
      adapter = null;
      canvas = null;
      context = null;
      width = 0;
      height = 0;
      shaderText = '';
      shaderMode = '';
      activeLabel = '';
      activeMode = 'fragment';
    }

    return {
      prepare: prepare,
      render: render,
      status: status,
      dispose: dispose
    };
  }

  root.TRILYVAWebGPU = {
    createRenderer: createRenderer,
    version: '1.1.0',
    modes: ['fragment', 'compute']
  };
})(self);

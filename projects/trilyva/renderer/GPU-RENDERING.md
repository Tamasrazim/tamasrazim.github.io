# TRILYVA WebGPU rendering

TRILYVA keeps its existing JavaScript `renderFrame(time, frame, fps, ctx, width, height)` contract. Ordinary Canvas 2D projects continue to use the worker's Canvas 2D path. GPU rendering is opt-in: the animation source must provide a WGSL descriptor as `window.renderFrameGPU`.

The WebGPU device is created inside the dedicated render worker. The animation sandbox receives no `GPUDevice`, adapter, command encoder, or DOM access. It supplies shader source only.

## Pipeline modes

### Fragment mode

Omit `mode` or set it to `'fragment'`. TRILYVA compiles the WGSL module with a fullscreen vertex entry point (`vsMain`) and fragment entry point (`fsMain`). The fragment stage writes directly to the WebGPU OffscreenCanvas.

The module receives one uniform buffer at group 0, binding 0. Its WGSL structure must preserve this field order and alignment:

```wgsl
struct FrameUniforms {
  resolution: vec2<f32>,
  time: f32,
  frame: f32,
  fps: f32,
  duration: f32,
  frameCount: f32,
  seed: f32,
  loopDuration: f32,
  loopEnabled: f32,
  speed: f32,
  reverse: f32,
};

@group(0) @binding(0) var<uniform> u: FrameUniforms;
```

The vertex entry point is `vsMain` and the fragment entry point is `fsMain` by default. Optional descriptor fields `vertexEntryPoint` and `fragmentEntryPoint` select different names.

### Compute mode

Set `mode: 'compute'`. The shader must declare the same uniform buffer at binding 0 and a write-only `rgba8unorm` storage texture at binding 1. The default compute entry point is `computeMain`.

```wgsl
@group(0) @binding(0) var<uniform> u: FrameUniforms;
@group(0) @binding(1) var outputFrame: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8, 1)
fn computeMain(@builtin(global_invocation_id) id: vec3<u32>) {
  let dimensions = textureDimensions(outputFrame);
  if (id.x >= dimensions.x || id.y >= dimensions.y) {
    return;
  }

  // Calculate one output pixel for this invocation.
  let uv = (vec2<f32>(id.xy) + vec2<f32>(0.5)) / vec2<f32>(dimensions);
  let color = vec3<f32>(uv.x, uv.y, 0.2);
  textureStore(outputFrame, vec2<i32>(id.xy), vec4<f32>(color, 1.0));
}
```

The host dispatches 8×8 workgroups using ceiling division over the requested output dimensions. Each invocation must bounds-check its global ID and write its pixel. TRILYVA then runs a fullscreen blit pass to move the storage-texture result to the WebGPU canvas.

The compute output target is currently `rgba8unorm`. Tone-map HDR values in the shader before writing. For transparency, write premultiplied RGB values because the canvas is configured with premultiplied alpha. The sample `examples/compute-interference-webgpu.js` demonstrates this contract.

## Source contract

A GPU project still needs the normal `window.renderFrame` function. It is the fallback when WebGPU is unavailable or a shader cannot be compiled. A descriptor looks like this:

```js
window.renderFrameGPU = {
  mode: 'compute',
  label: 'My compute animation',
  wgsl: String.raw`
    // WGSL module with FrameUniforms, bindings 0 and 1,
    // and @compute @workgroup_size(8, 8, 1) fn computeMain(...)
  `
};

window.renderFrame = function (time, frame, fps, ctx, width, height) {
  // Deterministic Canvas 2D fallback.
};
```

The shader receives the frame time, frame index, composition FPS, dimensions, duration, frame count, seed, loop duration, loop flag, speed, and reverse flag through the uniform buffer. It should derive each output frame from these values rather than depending on hidden mutable state.

## Execution and limits

- Rendering is performed in a dedicated worker using `OffscreenCanvas`. WebGPU requests a high-performance adapter; the browser and operating system decide which available adapter is selected.
- GPU frame requests are serialized. The renderer waits for submitted GPU work before returning the frame bitmap, preserving frame order for export.
- The existing media-layer and output-encoding stages remain in place after the GPU frame is returned.
- TRILYVA does not automatically translate arbitrary JavaScript Canvas 2D code into WGSL. A `renderFrame` project without the optional GPU descriptor remains a CPU-side Canvas 2D animation, even though that work runs in a worker.
- If WebGPU, the adapter, the shader, or the requested texture dimensions are unsupported, TRILYVA reports the reason and falls back to the regular Canvas 2D frame function. It does not silently lower resolution.
- The adapter's maximum 2D texture dimension still applies. A 16K export is not guaranteed to fit every browser/adapter, even where the encoder accepts the dimensions.
- Compute mode uses an 8×8 workgroup and a single `rgba8unorm` output texture in this version. It is intended for per-pixel parallel work; the fragment mode remains the simpler option for fullscreen raymarching and shading.

WebGPU can substantially accelerate shader workloads, but it does not expose native-level control over every GPU, memory pool, device queue, or driver scheduling decision. It also does not automatically use multiple GPUs.

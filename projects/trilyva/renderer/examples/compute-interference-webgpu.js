/*
 * COMPUTE INTERFERENCE — TRILYVA WebGPU compute-path verification scene.
 *
 * Every output pixel is produced by an 8×8 WGSL compute dispatch. The compute
 * shader writes to a storage texture; TRILYVA then blits that texture to the
 * render surface before the normal export pipeline continues.
 *
 * This is a deterministic GPU capability demo, not a physical simulation.
 */
window.renderFrameGPU = {
  mode: "compute",
  label: "COMPUTE INTERFERENCE / 8×8 storage-texture dispatch",
  wgsl: [
    'struct FrameUniforms {',
    '  resolution: vec2<f32>,',
    '  time: f32,',
    '  frame: f32,',
    '  fps: f32,',
    '  duration: f32,',
    '  frameCount: f32,',
    '  seed: f32,',
    '  loopDuration: f32,',
    '  loopEnabled: f32,',
    '  speed: f32,',
    '  reverse: f32,',
    '};',
    '',
    '@group(0) @binding(0) var<uniform> u: FrameUniforms;',
    '@group(0) @binding(1) var outputFrame: texture_storage_2d<rgba8unorm, write>;',
    '',
    'fn hash21(p: vec2<f32>) -> f32 {',
    '  let q = vec3<f32>(p, u.seed + 0.125);',
    '  return fract(sin(dot(q, vec3<f32>(127.1, 311.7, 74.7))) * 43758.5453);',
    '}',
    '',
    'fn aces(color: vec3<f32>) -> vec3<f32> {',
    '  let x = max(color, vec3<f32>(0.0));',
    '  let mapped = (x * (2.51 * x + vec3<f32>(0.03))) /',
    '               (x * (2.43 * x + vec3<f32>(0.59)) + vec3<f32>(0.14));',
    '  return pow(clamp(mapped, vec3<f32>(0.0), vec3<f32>(1.0)), vec3<f32>(1.0 / 2.2));',
    '}',
    '',
    '@compute @workgroup_size(8, 8, 1)',
    'fn computeMain(@builtin(global_invocation_id) id: vec3<u32>) {',
    '  let dimensions = textureDimensions(outputFrame);',
    '  if (id.x >= dimensions.x || id.y >= dimensions.y) {',
    '    return;',
    '  }',
    '',
    '  let resolution = vec2<f32>(dimensions);',
    '  let uv = (vec2<f32>(id.xy) + vec2<f32>(0.5)) / resolution;',
    '  var p = uv * 2.0 - vec2<f32>(1.0);',
    '  p.x *= resolution.x / resolution.y;',
    '',
    '  let duration = select(max(u.duration, 0.001), max(u.loopDuration, 0.001), u.loopEnabled > 0.5);',
    '  let phase = fract(u.time / duration) * 6.28318530718;',
    '  let orbit = vec2<f32>(cos(phase) * 0.31, sin(phase) * 0.16);',
    '  let centerA = orbit;',
    '  let centerB = -orbit;',
    '',
    '  let deltaA = p - centerA;',
    '  let deltaB = p - centerB;',
    '  let radiusA = length(deltaA);',
    '  let radiusB = length(deltaB);',
    '',
    '  let waveA = sin(radiusA * 48.0 - phase * 5.0);',
    '  let waveB = sin(radiusB * 42.0 + phase * 4.0);',
    '  let crossWave = sin((radiusA + radiusB) * 27.0 - phase * 2.0);',
    '  let ringA = exp(-abs(waveA) * 8.0) * exp(-radiusA * 0.42);',
    '  let ringB = exp(-abs(waveB) * 8.0) * exp(-radiusB * 0.42);',
    '  let interference = 0.5 + 0.5 * sin(waveA * 2.7 + waveB * 2.3 + crossWave);',
    '',
    '  let lensA = deltaA / (radiusA * radiusA + 0.018) * 0.006;',
    '  let lensB = deltaB / (radiusB * radiusB + 0.018) * 0.006;',
    '  let warped = p + lensA + lensB;',
    '  let filament = 0.5 + 0.5 * sin((warped.x * 13.0 + warped.y * 9.0) + phase * 1.5);',
    '',
    '  let cell = floor((uv + vec2<f32>(hash21(vec2<f32>(u.seed, 2.0)) * 0.01)) * vec2<f32>(210.0, 120.0));',
    '  let star = select(0.0, 1.0, hash21(cell) > 0.9975) *',
    '             (0.25 + 0.75 * hash21(cell + vec2<f32>(4.0, 9.0)));',
    '',
    '  var hdr = vec3<f32>(0.006, 0.009, 0.020);',
    '  hdr += vec3<f32>(0.12, 0.42, 0.95) * ringA * 1.65;',
    '  hdr += vec3<f32>(0.95, 0.28, 0.075) * ringB * 1.35;',
    '  hdr += vec3<f32>(0.22, 0.48, 0.88) * interference * abs(crossWave) * 0.085;',
    '  hdr += vec3<f32>(0.42, 0.62, 1.0) * filament * (ringA + ringB) * 0.18;',
    '  hdr += vec3<f32>(star);',
    '  hdr += vec3<f32>(0.10, 0.14, 0.25) * exp(-length(p) * 1.5);',
    '',
    '  let horizonA = 1.0 - smoothstep(0.045, 0.061, radiusA);',
    '  let horizonB = 1.0 - smoothstep(0.045, 0.061, radiusB);',
    '  hdr = mix(hdr, vec3<f32>(0.001, 0.0015, 0.004), max(horizonA, horizonB));',
    '',
    '  let vignette = 1.0 - smoothstep(0.75, 1.8, length(p)) * 0.42;',
    '  let color = aces(hdr * vignette);',
    '  textureStore(outputFrame, vec2<i32>(id.xy), vec4<f32>(color, 1.0));',
    '}'
  ].join('\n')
};

window.renderFrame = function (time, frame, fps, ctx, width, height) {
  const t = time * 0.42;
  const s = Math.min(width / 1920, height / 1080);
  const cx = width * 0.5;
  const cy = height * 0.5;
  ctx.fillStyle = "#05070e";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 2; i++) {
    const a = t + i * Math.PI;
    const x = Math.cos(a) * 0.31 * width * 0.45;
    const y = Math.sin(a) * 0.16 * height * 0.45;
    const r = Math.min(width, height) * 0.04;
    ctx.strokeStyle = i ? "rgba(255,132,75,.7)" : "rgba(70,155,255,.8)";
    ctx.lineWidth = Math.max(1, 2 * s);
    for (let ring = 0; ring < 6; ring++) {
      ctx.beginPath();
      ctx.arc(x, y, r * (1 + ring * 0.24), 0, Math.PI * 2);
      ctx.stroke();
    }
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "#000");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

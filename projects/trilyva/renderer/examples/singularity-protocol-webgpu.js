/*
 * SINGULARITY PROTOCOL — TRILYVA WebGPU stress scene
 *
 * Paste the complete file into Animation Source, or open this file and copy it.
 * The GPU path is an explicit WGSL renderer. The Canvas 2D function below is a
 * deliberately lightweight fallback for browsers without a working WebGPU
 * device. Existing Canvas 2D-only animations are unchanged.
 */
window.renderFrameGPU = {
  label: "SINGULARITY PROTOCOL / Mandelbulb + gyroscopic sanctuary",
  wgsl: String.raw`
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

struct VertexOut {
  @builtin(position) position: vec4<f32>,
};

struct Field {
  d: f32,
  material: f32,
  trap: f32,
  vein: f32,
};

struct RayHit {
  found: f32,
  t: f32,
  material: f32,
  trap: f32,
  vein: f32,
  glow: f32,
  pos: vec3<f32>,
};

struct MaterialData {
  albedo: vec3<f32>,
  emission: vec3<f32>,
  reflection: f32,
};

const PI: f32 = 3.141592653589793;
const TAU: f32 = 6.283185307179586;

@vertex
fn vsMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOut {
  var positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0)
  );
  var output: VertexOut;
  output.position = vec4<f32>(positions[vertexIndex], 0.0, 1.0);
  return output;
}

fn rotateX(p: vec3<f32>, angle: f32) -> vec3<f32> {
  let c = cos(angle);
  let s = sin(angle);
  return vec3<f32>(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
}

fn rotateY(p: vec3<f32>, angle: f32) -> vec3<f32> {
  let c = cos(angle);
  let s = sin(angle);
  return vec3<f32>(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
}

fn rotateZ(p: vec3<f32>, angle: f32) -> vec3<f32> {
  let c = cos(angle);
  let s = sin(angle);
  return vec3<f32>(p.x * c - p.y * s, p.x * s + p.y * c, p.z);
}

fn gyroid(p: vec3<f32>, scale: f32) -> f32 {
  let q = p * scale;
  return sin(q.x) * cos(q.y) +
         sin(q.y) * cos(q.z) +
         sin(q.z) * cos(q.x);
}

fn sdTorusY(p: vec3<f32>, radius: f32, thickness: f32) -> f32 {
  return length(vec2<f32>(length(p.xz) - radius, p.y)) - thickness;
}

fn sdTorusX(p: vec3<f32>, radius: f32, thickness: f32) -> f32 {
  return length(vec2<f32>(length(p.yz) - radius, p.x)) - thickness;
}

fn sdTorusZ(p: vec3<f32>, radius: f32, thickness: f32) -> f32 {
  return length(vec2<f32>(length(p.xy) - radius, p.z)) - thickness;
}

fn sdBox(p: vec3<f32>, bounds: vec3<f32>) -> f32 {
  let q = abs(p) - bounds;
  return length(max(q, vec3<f32>(0.0))) +
         min(max(q.x, max(q.y, q.z)), 0.0);
}

fn chooseField(a: Field, b: Field) -> Field {
  if (b.d < a.d) {
    return b;
  }
  return a;
}

fn mandelbulbField(p: vec3<f32>, phase: f32) -> Field {
  let twist = cos(phase) * 0.34;
  let c = cos(twist * p.y);
  let s = sin(twist * p.y);
  let base = vec3<f32>(
    p.x * c - p.z * s,
    p.y,
    p.x * s + p.z * c
  );

  let boundRadius = length(base);
  if (boundRadius > 3.35) {
    return Field(boundRadius - 2.48, 1.0, 1000.0, 1000.0);
  }

  let power = 7.75 + sin(phase) * 0.58;
  var z = base;
  var derivative = 1.0;
  var radius = 0.0;
  var trap = 1000.0;
  var vein = 1000.0;

  for (var i = 0u; i < 9u; i = i + 1u) {
    radius = length(z);
    if (radius > 2.4) {
      break;
    }

    trap = min(trap, radius);
    vein = min(vein, abs(z.x * z.y) + abs(z.z) * 0.24);

    let theta = acos(clamp(z.y / max(radius, 0.00001), -1.0, 1.0));
    let phi = atan2(z.z, z.x);
    let radialPower = pow(max(radius, 0.00001), power - 1.0);

    derivative = radialPower * power * derivative + 1.0;

    let poweredRadius = radialPower * radius;
    let nextTheta = theta * power;
    let nextPhi = phi * power;
    let sinTheta = sin(nextTheta);

    z = vec3<f32>(
      poweredRadius * sinTheta * cos(nextPhi),
      poweredRadius * cos(nextTheta),
      poweredRadius * sinTheta * sin(nextPhi)
    ) + base;
  }

  var distance = 0.5 * log(max(radius, 0.00001)) *
                 radius / max(derivative, 0.00001);

  if (distance < 0.11) {
    distance += gyroid(base, 27.0) * 0.0032 +
                gyroid(base, 63.0) * 0.0010;
  }

  return Field(distance, 1.0, trap, vein);
}

fn sceneField(p: vec3<f32>, phase: f32) -> Field {
  var result = mandelbulbField(p, phase);

  // Three independently rotated metallic gyroscope rings.
  let ringA = rotateY(p, phase * 0.5);
  let grooveA = sin(atan2(ringA.z, ringA.x) * 18.0 + phase * 2.0) * 0.010;
  result = chooseField(result, Field(
    sdTorusY(ringA, 2.56, 0.068 + grooveA),
    2.0, 0.0, 0.0
  ));

  let ringB = rotateX(p, 0.63 + 0.10 * sin(phase));
  let grooveB = sin(atan2(ringB.y, ringB.z) * 22.0 - phase) * 0.007;
  result = chooseField(result, Field(
    sdTorusX(ringB, 2.43, 0.052 + grooveB),
    2.0, 0.0, 0.0
  ));

  let ringC = rotateZ(p, -0.46 + 0.12 * cos(phase));
  result = chooseField(result, Field(
    sdTorusZ(ringC, 2.31, 0.046),
    2.0, 0.0, 0.0
  ));

  // Eight-fold fluted dark-titanium columns.
  let angle = atan2(p.z, p.x);
  let sector = TAU / 8.0;
  let folded = angle - round(angle / sector) * sector;
  let radial = length(p.xz);
  let q = vec3<f32>(
    radial - 4.12,
    p.y,
    folded * radial
  );
  let flute = sin(atan2(q.z, q.x) * 12.0 + p.y * 3.4) * 0.010;
  let pillar = sdBox(q, vec3<f32>(0.215, 1.58, 0.19)) + flute;
  result = chooseField(result, Field(pillar, 3.0, 0.0, 0.0));

  // Basalt floor with a subtle tiled displacement.
  let tile = sin(p.x * 6.0) * sin(p.z * 6.0) * 0.0045;
  let floorDistance = p.y + 1.72 + tile;
  result = chooseField(result, Field(floorDistance, 4.0, 0.0, 0.0));

  return result;
}

fn traceRay(origin: vec3<f32>, direction: vec3<f32>, phase: f32, maxSteps: u32) -> RayHit {
  var hit = RayHit(
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0, vec3<f32>(0.0)
  );
  var travel = 0.0;

  for (var i = 0u; i < 88u; i = i + 1u) {
    if (i >= maxSteps || travel > 13.0) {
      break;
    }

    let position = origin + direction * travel;
    let field = sceneField(position, phase);

    hit.glow += exp(-max(field.d, 0.0) * 21.0) * 0.010;

    if (field.d < 0.0010) {
      hit.found = 1.0;
      hit.t = travel;
      hit.material = field.material;
      hit.trap = field.trap;
      hit.vein = field.vein;
      hit.pos = position;
      return hit;
    }

    travel += max(field.d * 0.78, 0.0012);
  }

  hit.t = travel;
  return hit;
}

fn surfaceNormal(p: vec3<f32>, phase: f32) -> vec3<f32> {
  let e = 0.0010;
  let nx = sceneField(p + vec3<f32>(e, 0.0, 0.0), phase).d -
           sceneField(p - vec3<f32>(e, 0.0, 0.0), phase).d;
  let ny = sceneField(p + vec3<f32>(0.0, e, 0.0), phase).d -
           sceneField(p - vec3<f32>(0.0, e, 0.0), phase).d;
  let nz = sceneField(p + vec3<f32>(0.0, 0.0, e), phase).d -
           sceneField(p - vec3<f32>(0.0, 0.0, e), phase).d;
  return normalize(vec3<f32>(nx, ny, nz));
}

fn softShadow(origin: vec3<f32>, direction: vec3<f32>, maxDistance: f32, phase: f32) -> f32 {
  var visibility = 1.0;
  var travel = 0.018;

  for (var i = 0u; i < 20u; i = i + 1u) {
    if (travel > maxDistance) {
      break;
    }
    let d = sceneField(origin + direction * travel, phase).d;
    if (d < 0.0008) {
      return 0.055;
    }
    visibility = min(visibility, 11.0 * d / travel);
    travel += clamp(d, 0.018, 0.42);
  }

  return clamp(visibility, 0.055, 1.0);
}

fn ambientOcclusion(p: vec3<f32>, normal: vec3<f32>, phase: f32) -> f32 {
  var occlusion = 0.0;
  var weight = 1.0;

  for (var i = 1u; i <= 5u; i = i + 1u) {
    let h = 0.022 * f32(i);
    let d = sceneField(p + normal * h, phase).d;
    occlusion += (h - d) * weight;
    weight *= 0.70;
  }

  return clamp(1.0 - 2.6 * occlusion, 0.0, 1.0);
}

fn surfaceMaterial(hit: RayHit, phase: f32) -> MaterialData {
  let grain = 0.90 + 0.10 * gyroid(hit.pos, 41.0);
  var material = MaterialData(
    vec3<f32>(0.12, 0.14, 0.18),
    vec3<f32>(0.0),
    0.0
  );

  if (hit.material < 1.5) {
    let palette = hit.trap * 7.1 + phase;
    let gold = 0.5 + 0.5 * sin(palette);
    material.albedo = vec3<f32>(
      mix(0.12, 1.04, gold),
      mix(0.09, 0.76, gold),
      mix(0.26, 0.23, gold)
    ) * grain;
    material.reflection = 0.38 + 0.30 * gold;

    let veinGlow = exp(-hit.vein * 25.0) *
      (0.68 + 0.32 * sin(phase * 3.0 + hit.trap * 9.0));
    material.emission = vec3<f32>(1.28, 0.16, 0.96) * veinGlow;
  } else if (hit.material < 2.5) {
    let band = 0.5 + 0.5 * sin(
      atan2(hit.pos.z, hit.pos.x) * 23.0 +
      hit.pos.y * 8.0 + phase * 2.0
    );
    material.albedo = vec3<f32>(
      0.17 + band * 0.62,
      0.25 + band * 0.66,
      0.34 + band * 0.76
    ) * grain;
    material.reflection = 0.80;
  } else if (hit.material < 3.5) {
    let goldBand = select(0.0, 1.0, abs(sin(hit.pos.y * 15.0)) > 0.93);
    material.albedo = vec3<f32>(
      0.075 + goldBand * 0.88,
      0.090 + goldBand * 0.62,
      0.135 + goldBand * 0.24
    ) * grain;
    material.reflection = 0.68;
  } else {
    let tileX = abs(fract(hit.pos.x * 1.5) - 0.5);
    let tileZ = abs(fract(hit.pos.z * 1.5) - 0.5);
    let inlay = select(0.0, 1.0, tileX > 0.465 || tileZ > 0.465);
    let stone = 0.035 + 0.024 * gyroid(vec3<f32>(hit.pos.x, 0.2, hit.pos.z), 18.0);
    material.albedo = vec3<f32>(
      stone + inlay * 0.72,
      stone * 1.05 + inlay * 0.52,
      stone * 1.32 + inlay * 0.20
    );
    material.reflection = 0.34 + inlay * 0.28;
  }

  return material;
}

fn skyColor(direction: vec3<f32>, glow: f32) -> vec3<f32> {
  let horizon = max(direction.y, 0.0);
  return vec3<f32>(
    0.012 + horizon * 0.035 + glow * 0.55,
    0.017 + horizon * 0.060 + glow * 0.32,
    0.040 + horizon * 0.150 + glow * 0.82
  );
}

fn simpleSurfaceShade(hit: RayHit, viewDirection: vec3<f32>, phase: f32) -> vec3<f32> {
  let normal = surfaceNormal(hit.pos, phase);
  let material = surfaceMaterial(hit, phase);
  let lightPosition = vec3<f32>(
    cos(phase * 2.0) * 3.7,
    4.0 + sin(phase) * 0.5,
    sin(phase * 2.0) * 3.7
  );
  let lightDirection = normalize(lightPosition - hit.pos);
  let diffuse = max(dot(normal, lightDirection), 0.0);
  let rimDirection = normalize(vec3<f32>(-lightDirection.x * 0.7, 0.55, -lightDirection.z * 0.7));
  let rim = max(dot(normal, rimDirection), 0.0);
  let halfVector = normalize(lightDirection - viewDirection);
  let specular = pow(max(dot(normal, halfVector), 0.0), 64.0);
  let fresnel = pow(1.0 - max(dot(normal, -viewDirection), 0.0), 5.0);
  return material.albedo * (0.10 + diffuse * 1.15 + rim * 0.32) +
         vec3<f32>(specular * 0.9) +
         material.emission +
         vec3<f32>(0.22, 0.42, 0.78) * fresnel;
}

fn shadeHit(hit: RayHit, rayDirection: vec3<f32>, phase: f32) -> vec3<f32> {
  let normal = surfaceNormal(hit.pos, phase);
  let material = surfaceMaterial(hit, phase);

  let lightPosition = vec3<f32>(
    cos(phase * 2.0) * 3.7,
    4.0 + sin(phase) * 0.5,
    sin(phase * 2.0) * 3.7
  );
  let toLight = lightPosition - hit.pos;
  let lightDistance = length(toLight);
  let lightDirection = toLight / max(lightDistance, 0.0001);

  let shadow = softShadow(
    hit.pos + normal * 0.004,
    lightDirection,
    lightDistance,
    phase
  );
  let ao = ambientOcclusion(hit.pos, normal, phase);
  let diffuse = max(dot(normal, lightDirection), 0.0) * shadow;

  let rimDirection = normalize(vec3<f32>(
    -lightDirection.x * 0.72,
    0.55,
    -lightDirection.z * 0.72
  ));
  let rim = max(dot(normal, rimDirection), 0.0) * ao;

  let halfVector = normalize(lightDirection - rayDirection);
  let specular = pow(max(dot(normal, halfVector), 0.0), 64.0) * shadow;
  let nDotV = max(dot(normal, -rayDirection), 0.0);
  let fresnel = pow(1.0 - nDotV, 5.0);

  var color = material.albedo * (
    vec3<f32>(0.10) * ao +
    vec3<f32>(diffuse * 1.30) +
    vec3<f32>(rim * 0.34)
  );
  color += vec3<f32>(specular * 1.05);
  color += material.emission;
  color += vec3<f32>(0.24, 0.44, 0.86) * fresnel;
  color += vec3<f32>(0.62, 0.82, 1.0) * hit.glow * 0.30;

  // One bounded metallic reflection ray. The secondary hit is shaded once;
  // it does not recurse, keeping the workload finite and predictable.
  if (material.reflection > 0.05) {
    let reflectedDirection = reflect(rayDirection, normal);
    let reflectedHit = traceRay(
      hit.pos + normal * 0.006,
      reflectedDirection,
      phase,
      48u
    );

    var reflectedColor = skyColor(reflectedDirection, reflectedHit.glow);
    if (reflectedHit.found > 0.5) {
      reflectedColor = simpleSurfaceShade(reflectedHit, reflectedDirection, phase);
    }

    let reflectance = min(0.88, material.reflection * (0.52 + 0.48 * fresnel));
    color = mix(color, reflectedColor * (vec3<f32>(0.42) + material.albedo * 0.58), reflectance);
  }

  let fog = exp(-hit.t * 0.115);
  return mix(vec3<f32>(0.018, 0.026, 0.055), color, fog);
}

fn acesToneMap(color: vec3<f32>) -> vec3<f32> {
  let mapped = (color * (2.51 * color + vec3<f32>(0.03))) /
               (color * (2.43 * color + vec3<f32>(0.59)) + vec3<f32>(0.14));
  return pow(clamp(mapped, vec3<f32>(0.0), vec3<f32>(1.0)), vec3<f32>(1.0 / 2.2));
}

@fragment
fn fsMain(@builtin(position) fragmentPosition: vec4<f32>) -> @location(0) vec4<f32> {
  let resolution = max(u.resolution, vec2<f32>(1.0));
  let cycleLength = select(
    max(u.duration, 0.001),
    max(u.loopDuration, 0.001),
    u.loopEnabled > 0.5
  );
  let phase = fract(u.time / cycleLength) * TAU;

  let cameraDistance = 7.35 + cos(phase * 2.0) * 0.18;
  let cameraOrigin = vec3<f32>(
    sin(phase) * cameraDistance,
    2.42 + sin(phase * 2.0) * 0.24,
    cos(phase) * cameraDistance
  );

  let target = vec3<f32>(0.0, -0.12, 0.0);
  let forward = normalize(target - cameraOrigin);
  let right = normalize(cross(forward, vec3<f32>(0.0, 1.0, 0.0)));
  let up = normalize(cross(right, forward));

  let pixel = fragmentPosition.xy;
  var uv = (pixel / resolution) * 2.0 - 1.0;
  uv.x *= resolution.x / resolution.y;
  uv.y = -uv.y;

  let fovScale = tan(46.0 * PI / 360.0);
  let rayDirection = normalize(
    forward +
    right * uv.x * fovScale +
    up * uv.y * fovScale
  );

  let hit = traceRay(cameraOrigin, rayDirection, phase, 88u);
  var hdr = skyColor(rayDirection, hit.glow);

  if (hit.found > 0.5) {
    hdr = shadeHit(hit, rayDirection, phase);
  }

  // A subtle radial vignette keeps the bright fractal silhouette readable.
  let radial = length(uv * vec2<f32>(0.78, 1.0));
  hdr *= 1.0 - smoothstep(0.72, 1.55, radial) * 0.20;

  return vec4<f32>(acesToneMap(hdr), 1.0);
}
`
};

/* Low-cost deterministic fallback. The GPU scene above is the intended path. */
window.renderFrame = function (time, frame, fps, ctx, width, height) {
  const loop = 8.0;
  const t = ((time % loop) + loop) % loop;
  const a = t / loop * Math.PI * 2;
  const w = width;
  const h = height;
  const s = Math.min(w / 1920, h / 1080);

  ctx.fillStyle = "#050609";
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.51;

  const glow = ctx.createRadialGradient(cx, cy, 8 * s, cx, cy, 470 * s);
  glow.addColorStop(0, "rgba(95,105,160,0.28)");
  glow.addColorStop(0.45, "rgba(46,55,93,0.13)");
  glow.addColorStop(1, "rgba(5,6,9,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(a * 0.08);

  for (let ring = 0; ring < 3; ring++) {
    ctx.save();
    ctx.rotate(ring * Math.PI / 3 + Math.sin(a + ring) * 0.12);
    ctx.strokeStyle = [
      "rgba(198,214,255,0.72)",
      "rgba(208,167,92,0.70)",
      "rgba(135,170,220,0.62)"
    ][ring];
    ctx.lineWidth = (ring === 0 ? 5 : 3) * s;
    ctx.beginPath();
    ctx.ellipse(0, 0, (255 - ring * 26) * s, (112 + ring * 16) * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const core = ctx.createRadialGradient(-24 * s, -30 * s, 4 * s, 0, 0, 170 * s);
  core.addColorStop(0, "#fff4dc");
  core.addColorStop(0.16, "#d5b16f");
  core.addColorStop(0.48, "#65527f");
  core.addColorStop(0.76, "#171c32");
  core.addColorStop(1, "rgba(8,10,18,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, 170 * s, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 8; i++) {
    const q = i * Math.PI / 4 + a * 0.05;
    const px = Math.cos(q) * 340 * s;
    const py = Math.sin(q) * 180 * s;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-q + Math.PI / 2);
    ctx.fillStyle = "#171b26";
    ctx.strokeStyle = "rgba(216,190,136,0.78)";
    ctx.lineWidth = 3 * s;
    ctx.fillRect(-17 * s, -82 * s, 34 * s, 164 * s);
    ctx.strokeRect(-17 * s, -82 * s, 34 * s, 164 * s);
    ctx.restore();
  }

  ctx.restore();

  const vignette = ctx.createRadialGradient(cx, cy, 220 * s, cx, cy, Math.max(w, h) * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
};

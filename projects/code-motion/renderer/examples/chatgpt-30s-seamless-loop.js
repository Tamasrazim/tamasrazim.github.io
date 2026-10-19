// CHATGPT — 30-second seamless motion loop for TRILYVA.
// What this does: draws an original, monochrome AI-inspired emblem and motion-design layout.
// No external images, fonts, libraries, random state, or runtime dependencies.
// Contract: renderFrame(time, frame, fps, ctx, width, height).
// Loop rule: every moving element is periodic over exactly 30 seconds.

function renderFrame(time, frame, fps, ctx, width, height) {
  "use strict";

  var LOOP_SECONDS = 30;
  var TAU = Math.PI * 2;
  var W = 1920;
  var H = 1080;
  var safeFps = Math.max(1, Number(fps) || 60);
  var rawTime = Number.isFinite(time) ? time : (Number(frame) || 0) / safeFps;
  var t = ((rawTime % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;
  var p = t / LOOP_SECONDS;
  var a = TAU * p;
  var scale = Math.min(width / W, height / H);
  var ox = (width - W * scale) * 0.5;
  var oy = (height - H * scale) * 0.5;

  // Reset the drawing state so the composition stays deterministic between frames.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, width, height);
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // The backdrop has a soft centre glow and a very fine studio grid.
  var bg = ctx.createRadialGradient(960, 435, 40, 960, 435, 900);
  bg.addColorStop(0, "#151519");
  bg.addColorStop(0.48, "#09090c");
  bg.addColorStop(1, "#030304");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  for (var gx = 0; gx <= W; gx += 80) {
    ctx.beginPath();
    ctx.moveTo(gx + 0.5, 0);
    ctx.lineTo(gx + 0.5, H);
    ctx.stroke();
  }
  for (var gy = 0; gy <= H; gy += 80) {
    ctx.beginPath();
    ctx.moveTo(0, gy + 0.5);
    ctx.lineTo(W, gy + 0.5);
    ctx.stroke();
  }
  ctx.restore();

  // A looping scanner sweeps through the field without a hard reset at the seam.
  var scanX = 960 + Math.sin(a) * 720;
  var scan = ctx.createLinearGradient(scanX - 180, 0, scanX + 180, 0);
  scan.addColorStop(0, "rgba(255,255,255,0)");
  scan.addColorStop(0.5, "rgba(255,255,255,0.045)");
  scan.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = scan;
  ctx.fillRect(scanX - 180, 0, 360, H);

  // The large orbital field turns in complete cycles over the 30-second duration.
  var cx = 960;
  var cy = 410;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(a * 0.12);
  ctx.strokeStyle = "rgba(255,255,255,0.105)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 326, 194, 0, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 286, 232, Math.PI / 3, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([2, 11]);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 365, 265, Math.PI / 6, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Orbiting points use seeded positions and periodic trigonometry, never Math.random().
  for (var n = 0; n < 12; n++) {
    var orbitAngle = a * (n % 3 === 0 ? 1 : (n % 3 === 1 ? -2 : 2)) + n * TAU / 12;
    var radiusX = 320 + (n % 4) * 15;
    var radiusY = 205 + (n % 3) * 17;
    var px = cx + Math.cos(orbitAngle) * radiusX;
    var py = cy + Math.sin(orbitAngle) * radiusY;
    var pr = 2.2 + (1 + Math.sin(a * 3 + n)) * 1.45;
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255," + (0.24 + 0.34 * (1 + Math.sin(a * 2 + n * 0.7)) * 0.5) + ")";
    ctx.arc(px, py, pr, 0, TAU);
    ctx.fill();
  }

  // An original six-loop woven mark: a visual metaphor, not a copied logo asset.
  // Small oscillations stay periodic so the first and wrap frames agree.
  var emblemScale = 1 + 0.018 * Math.sin(a * 2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.035 * Math.sin(a));
  ctx.scale(emblemScale, emblemScale);

  // Soft halo behind the linework.
  var halo = ctx.createRadialGradient(0, 0, 8, 0, 0, 255);
  halo.addColorStop(0, "rgba(255,255,255,0.13)");
  halo.addColorStop(0.42, "rgba(255,255,255,0.045)");
  halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, 255, 0, TAU);
  ctx.fill();

  // The six elliptical ribbons form a persistent interlaced silhouette.
  for (var k = 0; k < 6; k++) {
    var turn = k * TAU / 6 + 0.026 * Math.sin(a + k * 0.82);
    var ribbon = ctx.createLinearGradient(-150, -80, 150, 80);
    ribbon.addColorStop(0, "#777780");
    ribbon.addColorStop(0.45, "#ffffff");
    ribbon.addColorStop(1, "#aaaab2");
    ctx.save();
    ctx.rotate(turn);
    ctx.beginPath();
    ctx.ellipse(0, 0, 142, 75, 0, 0, TAU);
    ctx.strokeStyle = "rgba(0,0,0,0.62)";
    ctx.lineWidth = 20;
    ctx.stroke();
    ctx.strokeStyle = ribbon;
    ctx.lineWidth = 11;
    ctx.shadowColor = "rgba(255,255,255,0.23)";
    ctx.shadowBlur = 15 + 5 * (1 + Math.sin(a * 2 + k)) * 0.5;
    ctx.stroke();
    ctx.restore();
  }
  ctx.shadowBlur = 0;

  // Bright orbit nodes anchor the mark while circling once or twice per loop.
  for (var q = 0; q < 6; q++) {
    var nodeAngle = -Math.PI / 2 + q * TAU / 6 - a * (q % 2 === 0 ? 1 : 0.5);
    var nx = Math.cos(nodeAngle) * 188;
    var ny = Math.sin(nodeAngle) * 188;
    ctx.beginPath();
    ctx.fillStyle = "#f7f7fa";
    ctx.arc(nx, ny, 3.2 + 1.3 * (1 + Math.sin(a * 3 + q)) * 0.5, 0, TAU);
    ctx.fill();
  }

  // A restrained centre core gives the composition a clear visual anchor.
  var core = ctx.createRadialGradient(-8, -10, 2, 0, 0, 34);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.56, "#bfc0c7");
  core.addColorStop(1, "#51515a");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, 23 + 1.5 * Math.sin(a * 2), 0, TAU);
  ctx.fill();
  ctx.restore();

  // A slim pulse crosses the title baseline once per loop.
  var baselineX = 960 + Math.sin(a) * 390;
  var baseline = ctx.createLinearGradient(baselineX - 120, 0, baselineX + 120, 0);
  baseline.addColorStop(0, "rgba(255,255,255,0)");
  baseline.addColorStop(0.5, "rgba(255,255,255,0.88)");
  baseline.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(555, 690, 810, 1);
  ctx.fillStyle = baseline;
  ctx.fillRect(baselineX - 120, 689, 240, 2);

  // The typography stays calm so the procedural emblem remains the hero.
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "600 14px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.fillText("A MOTION STUDY IN ARTIFICIAL INTELLIGENCE", 960, 741);

  ctx.fillStyle = "#f5f5f7";
  ctx.font = "500 76px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("ChatGPT", 960, 812);

  ctx.fillStyle = "rgba(255,255,255,0.50)";
  ctx.font = "500 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.fillText("THINK  /  MAKE  /  DISCOVER", 960, 864);

  // Corner readouts make the piece feel like a tiny creative workstation.
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "600 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.fillText("TRILYVA  /  MOTION STUDY 001", 72, 62);
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.fillText("PROCEDURAL · FRAME-DRIVEN", 72, 84);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "600 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.fillText("30.00s  /  SEAMLESS LOOP", 1848, 62);
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.fillText("1920 × 1080  ·  60 FPS TARGET", 1848, 84);

  // The bottom waveform is built from periodic bars, with no frame-to-frame randomness.
  ctx.save();
  var waveBase = 968;
  for (var b = 0; b < 90; b++) {
    var bx = 600 + b * 8.1;
    var wave = 0.5 + 0.22 * Math.sin(a + b * 0.14) + 0.15 * Math.sin(a * 2 - b * 0.08);
    var bh = 4 + 22 * Math.max(0.08, Math.min(1, wave));
    ctx.fillStyle = "rgba(255,255,255," + (0.10 + wave * 0.24) + ")";
    ctx.fillRect(bx, waveBase - bh * 0.5, 2, bh);
  }
  ctx.restore();

  // Footer guides and a pulsing centre index complete the frame.
  ctx.strokeStyle = "rgba(255,255,255,0.13)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(72, 1010);
  ctx.lineTo(1848, 1010);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.fillText("ORIGINAL PROCEDURAL ARTWORK", 72, 1037);
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255," + (0.45 + 0.22 * (1 + Math.sin(a * 2)) * 0.5) + ")";
  ctx.fillText("LOOP  /  001", 960, 1037);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.fillText("CODE → PREVIEW → RENDER", 1848, 1037);

  ctx.restore();
}

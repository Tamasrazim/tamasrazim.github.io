/* HOLLOW Texture Lab — layered material renderer.
 * Human-readable layers: base artwork, broad wear, material-specific marks, and micrograin.
 * Each surface has its own hand-tuned profile; this is not one preset copied across every material.
 */
(() => {
  "use strict";

  const BASE_WIDTH = 1024;
  const BASE_HEIGHT = 512;

  // Every material has a different grain direction, contrast, wear and stain character.
  const MATERIALS = {
    brick:     { seed: 173, grain: "mineral", grainSize: 1.00, noise: 17, wear: 0.38, streak: 0.20, scratch: 0.22, tint: [1.05, 0.94, 0.84] },
    concrete:  { seed: 297, grain: "aggregate", grainSize: 1.20, noise: 23, wear: 0.68, streak: 0.57, scratch: 0.38, tint: [0.96, 0.98, 0.94] },
    wood:      { seed: 419, grain: "linear", grainSize: 0.62, noise: 13, wear: 0.43, streak: 0.37, scratch: 0.40, tint: [1.07, 0.94, 0.78] },
    metal:     { seed: 523, grain: "brushed", grainSize: 0.48, noise: 16, wear: 0.60, streak: 0.35, scratch: 0.78, tint: [0.96, 0.98, 0.96] },
    tile:      { seed: 631, grain: "glaze", grainSize: 0.76, noise: 12, wear: 0.34, streak: 0.23, scratch: 0.29, tint: [1.02, 1.01, 0.94] },
    wallpaper: { seed: 751, grain: "paper", grainSize: 0.82, noise: 15, wear: 0.61, streak: 0.66, scratch: 0.35, tint: [1.02, 0.99, 0.88] },
    plaster:   { seed: 863, grain: "chalk", grainSize: 1.12, noise: 24, wear: 0.74, streak: 0.71, scratch: 0.32, tint: [0.99, 0.98, 0.91] },
    carpet:    { seed: 977, grain: "woven", grainSize: 0.52, noise: 18, wear: 0.57, streak: 0.18, scratch: 0.33, tint: [1.02, 0.91, 0.78] }
  };

  const $ = id => document.getElementById(id);
  const preview = $("layeredPreview");
  if (!preview) return;
  const ctx = preview.getContext("2d", { alpha: false });
  let activeMaterial = "brick";
  let renderTicket = 0;

  // Small deterministic hash: the material grain is stable between renders.
  function hash2(x, y, seed) {
    let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967295;
  }

  function makeRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function enabled(id) { return $(id).checked; }
  function amount() { return Number($("detailAmount").value) / 100; }
  function outputMode() { return $("layerOutput").value; }

  async function loadArtwork(id) {
    const paths = {
      brick: "assets/brick-wall-aged.svg",
      concrete: "assets/concrete-pitted-wall.svg",
      wood: "assets/aged-pine-planks.svg",
      metal: "assets/rusted-sheet-metal.svg",
      tile: "assets/cracked-ceramic-tile.svg",
      wallpaper: "assets/peeling-wallpaper.svg",
      plaster: "assets/damp-plaster.svg",
      carpet: "assets/worn-corridor-carpet.svg"
    };
    const response = await fetch(paths[id]);
    if (!response.ok) throw new Error("Could not load the authored master: " + paths[id]);
    const source = await response.text();
    const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("The SVG master could not be decoded."));
        image.src = url;
      });
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // A value-noise layer gives broad material variation without moving or replacing the hand-authored features.
  function broadNoise(x, y, seed, grid) {
    const gx = x / grid, gy = y / grid;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const fx = gx - x0, fy = gy - y0;
    const smoothX = fx * fx * (3 - 2 * fx);
    const smoothY = fy * fy * (3 - 2 * fy);
    const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed);
    const c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
    const top = a + (b - a) * smoothX;
    const bottom = c + (d - c) * smoothX;
    return top + (bottom - top) * smoothY;
  }

  function drawAuthoredLayer(context, id, w, h, profile, strength) {
    if (!enabled("layerWear") && !enabled("layerStreaks") && !enabled("layerScratches")) return;
    const random = makeRandom(profile.seed + 91);
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";

    // Surface-specific layer marks, each drawn with a material-appropriate direction and scale.
    if (enabled("layerWear")) {
      context.globalCompositeOperation = "multiply";
      const count = Math.round((id === "carpet" ? 110 : id === "concrete" ? 170 : 125) * strength);
      for (let i = 0; i < count; i++) {
        const x = random() * w, y = random() * h;
        const rx = (5 + random() * (id === "concrete" ? 54 : 32)) * (w / BASE_WIDTH);
        const ry = (2 + random() * (id === "concrete" ? 21 : 10)) * (h / BASE_HEIGHT);
        const alpha = 0.025 + random() * profile.wear * 0.12;
        context.fillStyle = id === "metal" ? "rgba(36,25,19," + alpha + ")" :
          id === "wood" ? "rgba(28,20,13," + alpha + ")" :
          id === "carpet" ? "rgba(15,17,14," + alpha + ")" :
          "rgba(35,34,29," + alpha + ")";
        context.beginPath();
        context.ellipse(x, y, rx, ry, (random() - 0.5) * 0.32, 0, Math.PI * 2);
        context.fill();
      }
    }

    if (enabled("layerStreaks")) {
      const streakCount = Math.round((id === "wood" ? 190 : id === "metal" ? 95 : 55) * strength);
      context.globalCompositeOperation = id === "wood" ? "soft-light" : "multiply";
      for (let i = 0; i < streakCount; i++) {
        const x = random() * w;
        const y = random() * h;
        const length = (id === "wood" ? 20 + random() * 220 : 12 + random() * 110) * (w / BASE_WIDTH);
        const drift = (random() - 0.5) * 12 * (h / BASE_HEIGHT);
        const alpha = 0.035 + random() * 0.10 * profile.streak;
        context.strokeStyle = random() > 0.48
          ? "rgba(20,20,17," + alpha + ")" : "rgba(211,201,179," + (alpha * 0.8) + ")";
        context.lineWidth = (0.35 + random() * 1.25) * (w / BASE_WIDTH);
        context.beginPath();
        if (id === "wood" || id === "metal" || id === "carpet") {
          context.moveTo(x, y);
          context.bezierCurveTo(x + length * 0.25, y + drift, x + length * 0.66, y - drift, x + length, y + drift * 0.15);
        } else {
          const downward = random() * (h * 0.45);
          context.moveTo(x, y);
          context.bezierCurveTo(x + drift, y + downward * 0.3, x - drift * 0.5, y + downward * 0.74, x + drift * 0.2, y + downward);
        }
        context.stroke();
      }
    }

    if (enabled("layerScratches")) {
      const cuts = Math.round((id === "metal" ? 380 : id === "tile" ? 165 : 120) * strength);
      context.globalCompositeOperation = "screen";
      for (let i = 0; i < cuts; i++) {
        const x = random() * w, y = random() * h;
        const len = (2 + random() * (id === "metal" ? 42 : 21)) * (w / BASE_WIDTH);
        const alpha = 0.05 + random() * 0.18 * profile.scratch;
        context.strokeStyle = random() > 0.55
          ? "rgba(224,219,204," + alpha + ")" : "rgba(28,27,23," + (alpha * 0.85) + ")";
        context.lineWidth = (0.3 + random() * 0.85) * (w / BASE_WIDTH);
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + len, y + (random() - 0.5) * len * 0.16);
        context.stroke();
      }
    }
    context.restore();
  }

  function applyMicrograin(context, width, height, id, profile, strength, mode) {
    if (!enabled("layerMicrograin") || strength <= 0) return;
    const frame = context.getImageData(0, 0, width, height);
    const pixels = frame.data;
    const intensity = profile.noise * strength;
    const gridSize = Math.max(7, Math.round(21 * profile.grainSize * width / BASE_WIDTH));
    const seed = profile.seed;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const high = hash2(x, y, seed) - 0.5;
        const mid = broadNoise(x, y, seed + 7, gridSize) - 0.5;
        const broad = broadNoise(x, y, seed + 19, gridSize * 5) - 0.5;
        let grain = high * intensity * 0.62 + mid * intensity * 0.88 + broad * intensity * 0.90;

        if (profile.grain === "linear") {
          grain += (broadNoise(x, Math.round(y / 3), seed + 31, gridSize * 2) - 0.5) * intensity * 0.36;
        } else if (profile.grain === "brushed") {
          grain += (hash2(x, Math.round(y / 2), seed + 37) - 0.5) * intensity * 0.42;
        } else if (profile.grain === "woven") {
          const cross = (x % 3 === 0 ? 1.4 : x % 3 === 1 ? -0.35 : -0.8) + (y % 3 === 0 ? 0.7 : -0.15);
          grain += cross * intensity * 0.28;
        } else if (profile.grain === "aggregate") {
          grain += (hash2(Math.round(x / 2), Math.round(y / 2), seed + 43) - 0.5) * intensity * 0.48;
        } else if (profile.grain === "paper" || profile.grain === "chalk") {
          const fleck = hash2(Math.round(x / 1.4), Math.round(y / 1.4), seed + 53);
          grain += (fleck > 0.86 ? (fleck - 0.86) * intensity * 3.1 : 0);
        }

        if (mode === "height") {
          const center = (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
          const h = Math.max(0, Math.min(255, center + grain * 1.65 + (mid * 27 * strength)));
          pixels[i] = pixels[i + 1] = pixels[i + 2] = h;
        } else if (mode === "roughness") {
          const center = 150 + Math.abs(high) * 35 + Math.abs(mid) * 56 + Math.abs(broad) * 28;
          const materialBias = id === "metal" ? -23 : id === "tile" ? -14 : id === "carpet" ? 28 : id === "concrete" || id === "plaster" ? 24 : 0;
          const value = Math.max(12, Math.min(245, center + materialBias + grain * 1.6));
          pixels[i] = pixels[i + 1] = pixels[i + 2] = value;
        } else {
          const tint = profile.tint;
          pixels[i] = Math.max(0, Math.min(255, pixels[i] + grain * tint[0]));
          pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + grain * tint[1]));
          pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + grain * tint[2]));
        }
      }
    }
    context.putImageData(frame, 0, 0);
  }

  async function render(id, width, height, mode) {
    const mine = ++renderTicket;
    const profile = MATERIALS[id] || MATERIALS.brick;
    const strength = amount();
    $("layerStatus").textContent = "Building the individual layer stack…";
    const image = await loadArtwork(id);
    if (mine !== renderTicket) return;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const surface = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    surface.drawImage(image, 0, 0, width, height);

    // Non-color maps are artistic previews only. They are not captured PBR scans.
    if (mode === "height" || mode === "roughness") {
      const source = surface.getImageData(0, 0, width, height);
      const p = source.data;
      for (let i = 0; i < p.length; i += 4) {
        const lum = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
        const v = mode === "height" ? lum : Math.max(20, Math.min(235, 155 + (128 - lum) * 0.24));
        p[i] = p[i + 1] = p[i + 2] = v;
      }
      surface.putImageData(source, 0, 0);
    }

    drawAuthoredLayer(surface, id, width, height, profile, strength);
    applyMicrograin(surface, width, height, id, profile, strength, mode);
    if (mine !== renderTicket) return;

    // Draw at preview size after computing full export-sized maps.
    ctx.clearRect(0, 0, preview.width, preview.height);
    ctx.drawImage(canvas, 0, 0, preview.width, preview.height);
    $("layerStatus").textContent = mode === "color"
      ? "Preview updated · authored surface + selected detail layers."
      : "Map preview updated · artistic " + (mode === "height" ? "height" : "roughness") + " approximation, not scan-derived.";
    return canvas;
  }

  async function updatePreview() {
    try {
      await render(activeMaterial, BASE_WIDTH, BASE_HEIGHT, outputMode());
    } catch (error) {
      $("layerStatus").textContent = "Preview error: " + error.message;
    }
  }

  window.addEventListener("surface-selected", event => {
    activeMaterial = event.detail && event.detail.id in MATERIALS ? event.detail.id : "brick";
    updatePreview();
  });

  ["layerMicrograin", "layerWear", "layerStreaks", "layerScratches", "layerOutput", "detailAmount"]
    .forEach(id => $(id).addEventListener("change", updatePreview));
  $("detailAmount").addEventListener("input", () => { $("detailReadout").textContent = $("detailAmount").value + "%"; });
  $("layerRender").addEventListener("click", updatePreview);

  $("layerExport").addEventListener("click", async () => {
    const button = $("layerExport");
    const width = Number($("resolution").value);
    const height = Math.round(width / 2);
    button.disabled = true;
    try {
      $("layerStatus").textContent = "Rendering " + width + " × " + height + "… higher resolutions use more memory.";
      const result = await render(activeMaterial, width, height, outputMode());
      if (!result) return;
      const blob = await new Promise((resolve, reject) => result.toBlob(
        value => value ? resolve(value) : reject(new Error("PNG encoding failed; try a smaller resolution.")),
        "image/png"
      ));
      const link = document.createElement("a");
      const mapName = outputMode() === "height" ? "height-preview" : outputMode() === "roughness" ? "roughness-preview" : "layered-base-color";
      link.href = URL.createObjectURL(blob);
      link.download = activeMaterial + "-" + mapName + "-" + width + "x" + height + ".png";
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 3000);
      $("layerStatus").textContent = "Exported " + width + " × " + height + " PNG. " +
        (outputMode() === "color" ? "This uses the selected layered art and grain settings." : "This is an artistic map approximation, not a scanned physical map.");
    } catch (error) {
      $("layerStatus").textContent = "Export failed: " + error.message;
    } finally {
      button.disabled = false;
    }
  });

  // First material can render before a gallery button is clicked.
  updatePreview();
})();
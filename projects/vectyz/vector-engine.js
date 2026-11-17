/* Deterministic browser-side raster-to-vector engine. No network or server dependencies. */
const TRANSPARENT = 65535;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function colorKey(r, g, b) {
  return ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
}

function makePalette(data, threshold, maxColors) {
  const histogram = new Map();
  const pixels = data.length / 4;
  const stride = Math.max(1, Math.floor(pixels / 90000));
  for (let i = 0; i < pixels; i += stride) {
    const offset = i * 4;
    if (data[offset + 3] <= threshold) continue;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const key = colorKey(r, g, b);
    let bin = histogram.get(key);
    if (!bin) {
      bin = { r: 0, g: 0, b: 0, count: 0 };
      histogram.set(key, bin);
    }
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bin.count += 1;
  }
  const bins = Array.from(histogram.values()).map(function (bin) {
    return {
      r: bin.r / bin.count,
      g: bin.g / bin.count,
      b: bin.b / bin.count,
      count: bin.count,
    };
  });
  if (!bins.length) return [];

  const boxes = [bins];
  while (boxes.length < maxColors) {
    let selected = -1;
    let selectedScore = -1;
    let selectedAxis = 0;
    for (let i = 0; i < boxes.length; i += 1) {
      const box = boxes[i];
      if (box.length < 2) continue;
      const ranges = [0, 1, 2].map(function (axis) {
        const key = axis === 0 ? 'r' : axis === 1 ? 'g' : 'b';
        let low = 255;
        let high = 0;
        for (const item of box) {
          low = Math.min(low, item[key]);
          high = Math.max(high, item[key]);
        }
        return high - low;
      });
      const axis = ranges.indexOf(Math.max.apply(null, ranges));
      const population = box.reduce((sum, item) => sum + item.count, 0);
      const score = ranges[axis] * population;
      if (score > selectedScore) {
        selected = i;
        selectedScore = score;
        selectedAxis = axis;
      }
    }
    if (selected < 0 || selectedScore <= 0) break;
    const key = selectedAxis === 0 ? 'r' : selectedAxis === 1 ? 'g' : 'b';
    const box = boxes[selected].slice().sort((a, b) => a[key] - b[key]);
    const total = box.reduce((sum, item) => sum + item.count, 0);
    let cumulative = 0;
    let split = 1;
    for (; split < box.length; split += 1) {
      cumulative += box[split - 1].count;
      if (cumulative >= total / 2) break;
    }
    boxes.splice(selected, 1, box.slice(0, split), box.slice(split));
  }

  return boxes.map(function (box) {
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (const item of box) {
      r += item.r * item.count;
      g += item.g * item.count;
      b += item.b * item.count;
      count += item.count;
    }
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
  });
}

function makeLookup(palette) {
  const lookup = new Uint8Array(32768);
  for (let key = 0; key < 32768; key += 1) {
    const r = (((key >> 10) & 31) << 3) + 4;
    const g = (((key >> 5) & 31) << 3) + 4;
    const b = ((key & 31) << 3) + 4;
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < palette.length; i += 1) {
      const dr = r - palette[i][0];
      const dg = g - palette[i][1];
      const db = b - palette[i][2];
      const distance = dr * dr + dg * dg + db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    lookup[key] = best;
  }
  return lookup;
}

function quantize(data, threshold, maxColors, alphaBins) {
  const palette = makePalette(data, threshold, maxColors);
  if (!palette.length) {
    return {
      classes: new Uint16Array(data.length / 4).fill(TRANSPARENT),
      palette,
      alphaSums: new Float64Array(0),
      counts: new Uint32Array(0),
    };
  }
  const lookup = makeLookup(palette);
  const pixels = data.length / 4;
  const classes = new Uint16Array(pixels);
  const counts = new Uint32Array(palette.length * alphaBins);
  const alphaSums = new Float64Array(palette.length * alphaBins);
  for (let i = 0; i < pixels; i += 1) {
    const offset = i * 4;
    const alpha = data[offset + 3];
    if (alpha <= threshold) {
      classes[i] = TRANSPARENT;
      continue;
    }
    const paletteIndex = lookup[colorKey(data[offset], data[offset + 1], data[offset + 2])];
    const alphaBin = Math.min(alphaBins - 1, Math.floor((alpha * alphaBins) / 256));
    const classIndex = paletteIndex * alphaBins + alphaBin;
    classes[i] = classIndex;
    counts[classIndex] += 1;
    alphaSums[classIndex] += alpha;
  }
  return { classes, palette, counts, alphaSums };
}

function edgeEnd(start, direction, stride) {
  if (direction === 0) return start + 1;
  if (direction === 1) return start + stride;
  if (direction === 2) return start - 1;
  return start - stride;
}

function rdp(points, epsilon) {
  if (points.length <= 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  const epsilonSquared = epsilon * epsilon;
  while (stack.length) {
    const range = stack.pop();
    const first = points[range[0]];
    const last = points[range[1]];
    const dx = last[0] - first[0];
    const dy = last[1] - first[1];
    const lengthSquared = dx * dx + dy * dy;
    let maximum = epsilonSquared;
    let selected = -1;
    for (let i = range[0] + 1; i < range[1]; i += 1) {
      const point = points[i];
      let distance;
      if (lengthSquared === 0) {
        const px = point[0] - first[0];
        const py = point[1] - first[1];
        distance = px * px + py * py;
      } else {
        const t = clamp(((point[0] - first[0]) * dx + (point[1] - first[1]) * dy) / lengthSquared, 0, 1);
        const px = point[0] - (first[0] + t * dx);
        const py = point[1] - (first[1] + t * dy);
        distance = px * px + py * py;
      }
      if (distance > maximum) {
        maximum = distance;
        selected = i;
      }
    }
    if (selected >= 0) {
      keep[selected] = 1;
      stack.push([range[0], selected], [selected, range[1]]);
    }
  }
  return points.filter((_, index) => keep[index]);
}

function simplifyClosed(points, epsilon) {
  if (points.length <= 4) return points;
  let farthest = 1;
  let maximum = -1;
  const origin = points[0];
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i][0] - origin[0];
    const dy = points[i][1] - origin[1];
    const distance = dx * dx + dy * dy;
    if (distance > maximum) {
      maximum = distance;
      farthest = i;
    }
  }
  const first = points.slice(0, farthest + 1);
  const second = points.slice(farthest).concat([points[0]]);
  const a = rdp(first, epsilon);
  const b = rdp(second, epsilon);
  const merged = a.slice(0, -1).concat(b.slice(0, -1));
  return merged.length >= 3 ? merged : points;
}

function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const next = points[(i + 1) % points.length];
    area += points[i][0] * next[1] - next[0] * points[i][1];
  }
  return Math.abs(area) * 0.5;
}

function turnAngle(previous, current, following) {
  const ax = current[0] - previous[0];
  const ay = current[1] - previous[1];
  const bx = following[0] - current[0];
  const by = following[1] - current[1];
  const al = Math.hypot(ax, ay);
  const bl = Math.hypot(bx, by);
  if (al < 1e-9 || bl < 1e-9) return 180;
  return Math.acos(clamp((ax * bx + ay * by) / (al * bl), -1, 1)) * 180 / Math.PI;
}

function fmt(value) {
  const rounded = Math.round(value * 100) / 100;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function contourPath(rawPoints, settings) {
  if (rawPoints.length < 3) return null;
  let perimeter = 0;
  for (let i = 0; i < rawPoints.length; i += 1) {
    const next = rawPoints[(i + 1) % rawPoints.length];
    perimeter += Math.hypot(next[0] - rawPoints[i][0], next[1] - rawPoints[i][1]);
  }
  const epsilon = Math.max(0.35, perimeter * settings.detail / 1000);
  const points = simplifyClosed(rawPoints, epsilon);
  if (points.length < 3) return null;
  const commands = ['M ' + fmt(points[0][0]) + ' ' + fmt(points[0][1])];
  const corners = [];
  const tangents = [];
  for (let i = 0; i < points.length; i += 1) {
    const previous = points[(i - 1 + points.length) % points.length];
    const current = points[i];
    const following = points[(i + 1) % points.length];
    corners.push(turnAngle(previous, current, following) >= settings.cornerAngle);
    let tx = following[0] - previous[0];
    let ty = following[1] - previous[1];
    const length = Math.hypot(tx, ty);
    if (length > 1e-9) { tx /= length; ty /= length; }
    else { tx = 0; ty = 0; }
    tangents.push([tx, ty]);
  }
  for (let i = 0; i < points.length; i += 1) {
    const nextIndex = (i + 1) % points.length;
    const start = points[i];
    const end = points[nextIndex];
    const chord = Math.hypot(end[0] - start[0], end[1] - start[1]);
    if (settings.curve === 'smooth' && !corners[i] && !corners[nextIndex] && chord > 1e-6) {
      const previous = points[(i - 1 + points.length) % points.length];
      const following = points[(nextIndex + 1) % points.length];
      const h1 = Math.min(chord / 3, Math.hypot(start[0] - previous[0], start[1] - previous[1]) / 2);
      const h2 = Math.min(chord / 3, Math.hypot(following[0] - end[0], following[1] - end[1]) / 2);
      const c1 = [start[0] + tangents[i][0] * h1, start[1] + tangents[i][1] * h1];
      const c2 = [end[0] - tangents[nextIndex][0] * h2, end[1] - tangents[nextIndex][1] * h2];
      commands.push('C ' + fmt(c1[0]) + ' ' + fmt(c1[1]) + ' ' + fmt(c2[0]) + ' ' + fmt(c2[1]) + ' ' + fmt(end[0]) + ' ' + fmt(end[1]));
    } else {
      commands.push('L ' + fmt(end[0]) + ' ' + fmt(end[1]));
    }
  }
  commands.push('Z');
  return commands.join(' ');
}

function traceClass(classes, width, height, targetClass, settings) {
  const stride = width + 1;
  const vertexCount = stride * (height + 1);
  const head = new Int32Array(vertexCount);
  head.fill(-1);
  let capacity = Math.max(1024, Math.min(classes.length, 262144));
  let starts = new Uint32Array(capacity);
  let directions = new Uint8Array(capacity);
  let next = new Int32Array(capacity);
  let edgeCount = 0;

  function addEdge(x, y, direction) {
    if (edgeCount === capacity) {
      if (capacity >= 12000000) throw new Error('This image creates too many boundary segments. Reduce image dimensions or color count.');
      const grown = Math.min(12000000, capacity * 2);
      const newStarts = new Uint32Array(grown);
      const newDirections = new Uint8Array(grown);
      const newNext = new Int32Array(grown);
      newStarts.set(starts);
      newDirections.set(directions);
      newNext.set(next);
      starts = newStarts;
      directions = newDirections;
      next = newNext;
      capacity = grown;
    }
    const vertex = y * stride + x;
    starts[edgeCount] = vertex;
    directions[edgeCount] = direction;
    next[edgeCount] = head[vertex];
    head[vertex] = edgeCount;
    edgeCount += 1;
  }

  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      const index = row + x;
      if (classes[index] !== targetClass) continue;
      if (y === 0 || classes[index - width] !== targetClass) addEdge(x, y, 0);
      if (x === width - 1 || classes[index + 1] !== targetClass) addEdge(x + 1, y, 1);
      if (y === height - 1 || classes[index + width] !== targetClass) addEdge(x + 1, y + 1, 2);
      if (x === 0 || classes[index - 1] !== targetClass) addEdge(x, y + 1, 3);
    }
  }
  if (!edgeCount) return { paths: [], removed: 0 };

  const used = new Uint8Array(edgeCount);
  const paths = [];
  let removed = 0;
  for (let seed = 0; seed < edgeCount; seed += 1) {
    if (used[seed]) continue;
    const points = [];
    let edge = seed;
    let previousDirection = -1;
    let closed = false;
    for (let steps = 0; steps <= edgeCount; steps += 1) {
      if (used[edge]) { closed = edge === seed; break; }
      used[edge] = 1;
      const direction = directions[edge];
      const vertex = starts[edge];
      if (previousDirection === -1 || direction !== previousDirection) {
        points.push([vertex % stride, Math.floor(vertex / stride)]);
      }
      const endVertex = edgeEnd(vertex, direction, stride);
      const priorities = [(direction + 1) & 3, direction, (direction + 3) & 3, (direction + 2) & 3];
      let chosen = -1;
      for (const wanted of priorities) {
        for (let candidate = head[endVertex]; candidate !== -1; candidate = next[candidate]) {
          if (candidate === seed) { chosen = seed; break; }
          if (!used[candidate] && directions[candidate] === wanted) { chosen = candidate; break; }
        }
        if (chosen !== -1) break;
      }
      previousDirection = direction;
      if (chosen === seed) { closed = true; break; }
      if (chosen === -1) break;
      edge = chosen;
    }
    if (!closed || points.length < 3) continue;
    const area = polygonArea(points);
    if (area < settings.minArea) { removed += 1; continue; }
    const path = contourPath(points, settings);
    if (path) paths.push(path);
    else removed += 1;
  }
  return { paths, removed };
}

export function vectorizeImageData(imageData, inputSettings = {}, onProgress = function () {}) {
  const width = imageData.width;
  const height = imageData.height;
  const settings = {
    colors: clamp(Math.round(inputSettings.colors ?? 16), 2, 64),
    detail: clamp(Number(inputSettings.detail ?? 1), 0.05, 20),
    minArea: Math.max(0, Number(inputSettings.minArea ?? 2)),
    curve: inputSettings.curve === 'polygon' ? 'polygon' : 'smooth',
    cornerAngle: clamp(Number(inputSettings.cornerAngle ?? 65), 10, 170),
    alphaBins: clamp(Math.round(inputSettings.alphaBins ?? 1), 1, 8),
    transparentThreshold: clamp(Math.round(inputSettings.transparentThreshold ?? 4), 0, 254),
  };
  const started = performance.now();
  onProgress({ phase: 'Learning palette', progress: 0.12 });
  const quantized = quantize(imageData.data, settings.transparentThreshold, settings.colors, settings.alphaBins);
  const classIds = [];
  for (let i = 0; i < quantized.counts.length; i += 1) if (quantized.counts[i]) classIds.push(i);
  const grouped = new Map();
  let removed = 0;
  for (let i = 0; i < classIds.length; i += 1) {
    const classId = classIds[i];
    onProgress({ phase: 'Tracing regions', progress: 0.16 + 0.78 * (i / Math.max(1, classIds.length)), current: i + 1, total: classIds.length });
    const traced = traceClass(quantized.classes, width, height, classId, settings);
    removed += traced.removed;
    if (!traced.paths.length) continue;
    const paletteIndex = Math.floor(classId / settings.alphaBins);
    const opacity = quantized.alphaSums[classId] / (quantized.counts[classId] * 255);
    const color = quantized.palette[paletteIndex];
    const key = color.join(',') + ':' + opacity.toFixed(5);
    if (!grouped.has(key)) grouped.set(key, { color, opacity, paths: [] });
    grouped.get(key).paths.push.apply(grouped.get(key).paths, traced.paths);
  }
  const body = [];
  let pathCount = 0;
  for (const item of grouped.values()) {
    pathCount += item.paths.length;
    const color = '#' + item.color.map((part) => part.toString(16).padStart(2, '0')).join('');
    body.push('<path d="' + item.paths.join(' ') + '" fill="' + color + '" fill-opacity="' + item.opacity.toFixed(5) + '" fill-rule="evenodd"/>');
  }
  const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + 'px" height="' + height + 'px" viewBox="0 0 ' + width + ' ' + height + '" shape-rendering="geometricPrecision">\n' +
    body.join('\n') + '\n</svg>\n';
  onProgress({ phase: 'Finishing SVG', progress: 0.98 });
  return {
    svg,
    stats: {
      width,
      height,
      colorsUsed: new Set(Array.from(grouped.values(), (item) => item.color.join(','))).size,
      paths: pathCount,
      componentsRemoved: removed,
      elapsedMs: Math.round((performance.now() - started) * 1000) / 1000,
    },
  };
}
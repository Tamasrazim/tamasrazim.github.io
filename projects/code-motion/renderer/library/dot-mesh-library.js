// What this does: Supplies 50 original, deterministic, seamless dot-mesh studies for TRILYVA.
// Every item has editable Canvas renderer code, an animated vector SVG export, and downloadable JSON metadata.
// No external dependencies, fonts, images, APIs, or runtime libraries are required.

const TAU = Math.PI * 2;
const DESIGN_DEFINITIONS = [
  ["Meridian Wave Grid", "wave", "Wave Fields"],
  ["Ripple Lattice", "contour", "Wave Fields"],
  ["Diagonal Tide", "diagonal", "Wave Fields"],
  ["Interference Field", "moire", "Wave Fields"],
  ["Cellular Drift", "fold", "Wave Fields"],
  ["Helix Columns", "spiral", "Spiral Forms"],
  ["Twin Spiral Array", "spiral", "Spiral Forms"],
  ["Orbit Rosette", "radial", "Radial Systems"],
  ["Polar Burst Mesh", "radial", "Radial Systems"],
  ["Saturn Rings", "orbit", "Radial Systems"],
  ["Hex Current", "hex", "Lattice Geometries"],
  ["Honeycomb Pulse", "hex", "Lattice Geometries"],
  ["Offset Crystal Field", "hex", "Lattice Geometries"],
  ["Triangular Mesh", "diagonal", "Lattice Geometries"],
  ["Isometric Cascade", "terrain", "Lattice Geometries"],
  ["Diamond Envelope", "diagonal", "Lattice Geometries"],
  ["Folded Grid", "fold", "Lattice Geometries"],
  ["Wave Crest Matrix", "wave", "Wave Fields"],
  ["Checker Sine", "moire", "Interference Studies"],
  ["Ribbon Undulation", "wave", "Interference Studies"],
  ["Vortex Field", "vortex", "Vortex Studies"],
  ["Double Vortex", "vortex", "Vortex Studies"],
  ["Turbine Dots", "radial", "Vortex Studies"],
  ["Eddy Network", "vortex", "Vortex Studies"],
  ["Gravity Well", "contour", "Vortex Studies"],
  ["Lissajous Cage", "lissajous", "Harmonic Forms"],
  ["Harmonic Loop", "lissajous", "Harmonic Forms"],
  ["Mobius Mesh", "fold", "Harmonic Forms"],
  ["Knotline Points", "lissajous", "Harmonic Forms"],
  ["Flower of Harmonics", "harmonic", "Harmonic Forms"],
  ["Radial Contour", "contour", "Radial Systems"],
  ["Orbit Bands", "orbit", "Radial Systems"],
  ["Eclipse Mesh", "orbit", "Radial Systems"],
  ["Nested Spheres", "sphere", "Spherical Systems"],
  ["Perspective Tunnel", "tunnel", "Perspective Fields"],
  ["Horizon Convergence", "tunnel", "Perspective Fields"],
  ["Vanishing-Point Grid", "tunnel", "Perspective Fields"],
  ["Folding Corridor", "tunnel", "Perspective Fields"],
  ["Parallax Columns", "tunnel", "Perspective Fields"],
  ["Terrain Contour", "terrain", "Terrain Studies"],
  ["Ridgefield", "terrain", "Terrain Studies"],
  ["Mountain Mesh", "terrain", "Terrain Studies"],
  ["Valley Scan", "terrain", "Terrain Studies"],
  ["Seismic Surface", "terrain", "Terrain Studies"],
  ["Dot Sphere", "sphere", "Spherical Systems"],
  ["Spherical Lattice", "sphere", "Spherical Systems"],
  ["Breathing Orb", "sphere", "Spherical Systems"],
  ["Orbital Shell", "sphere", "Spherical Systems"],
  ["Geodesic Halo", "sphere", "Spherical Systems"],
  ["Pinwheel Coordinates", "pinwheel", "Radial Systems"]
];

function meshPoint(s, row, col, a, cols, rows) {
  var u = (col / Math.max(1, cols - 1)) * 2 - 1;
  var v = (row / Math.max(1, rows - 1)) * 2 - 1;
  var x = u, y = v, z = 0;
  var r = Math.sqrt(u * u + v * v);
  var theta = Math.atan2(v, u);
  var amp = s.amplitude, f = s.frequency, phase = s.phase;
  var rr, ang, lat, lon, depth, perspective, h, rot;
  switch (s.family) {
    case "wave":
      x = u + amp * 0.34 * Math.sin(v * Math.PI * f + a + phase);
      y = v + amp * Math.sin(u * Math.PI * f + phase) * Math.cos(v * Math.PI * 0.6 - a);
      break;
    case "contour":
      rr = r + amp * 0.42 * Math.sin(r * TAU * f - a + phase);
      ang = theta + amp * 0.2 * Math.sin(r * TAU * (f + 1) + a);
      x = rr * Math.cos(ang);
      y = rr * Math.sin(ang);
      break;
    case "diagonal":
      rot = s.rotation + 0.22 * Math.sin(a);
      x = u * Math.cos(rot) - v * Math.sin(rot) + amp * 0.24 * Math.sin(v * TAU * f + a);
      y = u * Math.sin(rot) + v * Math.cos(rot) + amp * 0.24 * Math.sin(u * TAU * f - a);
      break;
    case "moire":
      x = u + amp * 0.58 * Math.sin(v * Math.PI * f + a + phase);
      y = v + amp * 0.52 * Math.sin((u + v) * Math.PI * f - 2 * a + phase);
      x += amp * 0.14 * Math.sin(u * Math.PI * (f + 2) + 3 * a);
      break;
    case "fold":
      x = u + amp * 0.35 * Math.sin(v * Math.PI * f + a);
      y = v + amp * Math.sin(u * Math.PI * f + phase + a) * Math.cos(v * Math.PI * 0.5);
      y += amp * 0.22 * Math.sin((u - v) * Math.PI * (f + 1) - a);
      break;
    case "spiral":
      rr = 0.035 + 0.91 * (row / Math.max(1, rows - 1));
      ang = (col / Math.max(1, cols - 1)) * TAU * s.turns + (row / Math.max(1, rows - 1)) * s.twist * TAU + a;
      rr += amp * 0.23 * Math.sin(ang * f - a + phase);
      x = rr * Math.cos(ang);
      y = rr * Math.sin(ang);
      break;
    case "radial":
      rr = 0.03 + 0.94 * (row / Math.max(1, rows - 1));
      ang = (col / Math.max(1, cols - 1)) * TAU + s.rotation + amp * 0.15 * Math.sin(a);
      rr += amp * 0.32 * Math.sin(rr * TAU * f - a + phase);
      x = rr * Math.cos(ang) * (1 + amp * 0.16 * Math.cos(ang * s.turns + a));
      y = rr * Math.sin(ang) * (1 + amp * 0.16 * Math.cos(ang * s.turns + a));
      break;
    case "orbit":
      rr = 0.12 + 0.79 * (row / Math.max(1, rows - 1));
      ang = (col / Math.max(1, cols - 1)) * TAU + s.rotation + a;
      rr += amp * 0.3 * Math.sin(ang * f - a + phase);
      x = rr * Math.cos(ang) * (0.92 + 0.11 * Math.sin(a + phase));
      y = rr * Math.sin(ang) * (0.52 + 0.12 * Math.cos(a + phase));
      break;
    case "hex":
      u += (row % 2 ? 1 : 0) / Math.max(1, cols - 1);
      x = u + amp * 0.2 * Math.sin(v * TAU * f + a);
      y = v + amp * 0.33 * Math.sin(u * TAU * f + phase - a);
      break;
    case "vortex":
      ang = theta + s.twist * Math.exp(-r * 1.45) * Math.sin(a + phase);
      rr = r + amp * 0.42 * Math.sin(r * TAU * f - a + phase);
      x = rr * Math.cos(ang);
      y = rr * Math.sin(ang);
      break;
    case "lissajous":
      x = u + amp * 0.7 * Math.sin(v * Math.PI * f + phase + 2 * a);
      y = v + amp * 0.67 * Math.sin(u * Math.PI * (f + 1) - phase + 3 * a);
      x += amp * 0.15 * Math.sin((u + v) * TAU + a);
      break;
    case "harmonic":
      ang = theta + amp * 0.24 * Math.sin(r * TAU * f + a);
      rr = r * (0.78 + 0.2 * Math.cos(theta * s.turns + a + phase));
      rr += amp * 0.2 * Math.sin(theta * s.turns - 2 * a + phase);
      x = rr * Math.cos(ang);
      y = rr * Math.sin(ang);
      break;
    case "tunnel":
      depth = row / Math.max(1, rows - 1);
      perspective = 0.055 + depth * 0.94;
      x = u * perspective + amp * 0.08 * Math.sin(depth * TAU * f - a + phase);
      y = v * perspective + amp * 0.06 * Math.sin(u * Math.PI * f + a) * perspective;
      z = depth * 2 - 1;
      break;
    case "terrain":
      h = 0.28 * (Math.sin((u + phase) * Math.PI * f + a) * Math.cos(v * Math.PI * f - a) +
        0.55 * Math.sin((u - v) * Math.PI * (f + 1) + 2 * a));
      h += amp * 0.38 * Math.cos((u * u + v * v) * TAU * f - a + phase);
      x = (u - v) * 0.71;
      y = (u + v) * 0.34 - h;
      z = h;
      break;
    case "sphere":
      lat = v * Math.PI * 0.49;
      lon = (col / Math.max(1, cols - 1)) * TAU + s.rotation + a;
      rr = 0.88 + amp * 0.12 * Math.sin(lat * f * 2 + a + phase);
      x = Math.cos(lat) * Math.sin(lon) * rr;
      y = Math.sin(lat) * rr;
      z = Math.cos(lat) * Math.cos(lon);
      y += amp * 0.08 * Math.sin(lon * f - a) * Math.cos(lat);
      break;
    case "pinwheel":
      rr = 0.12 + 0.78 * (col / Math.max(1, cols - 1));
      ang = (row / Math.max(1, rows - 1)) * TAU + rr * s.twist * 3 + a;
      rr += amp * 0.22 * Math.sin(ang * f - 2 * a + phase);
      x = rr * Math.cos(ang);
      y = rr * Math.sin(ang) * 0.82;
      break;
    default:
      y = v + amp * Math.sin(u * Math.PI * f + a + phase);
  }
  return { x: x, y: y, z: z };
}

function escXml(value) {
  return String(value).replace(/[&<>"']/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c];
  });
}
function number(n) {
  return Number(n).toFixed(2).replace(/\.?0+$/, "");
}
function svgPoint(spec, row, col, a, cols, rows, width, height) {
  var p = meshPoint(spec, row, col, a, cols, rows);
  return { x: width * 0.5 + p.x * width * 0.455, y: height * 0.5 + p.y * height * 0.435, z: p.z };
}
function pathFor(spec, axis, index, a, cols, rows, width, height) {
  var pts = [];
  var count = axis === "row" ? cols : rows;
  for (var k = 0; k < count; k++) {
    var p = axis === "row"
      ? svgPoint(spec, index, k, a, cols, rows, width, height)
      : svgPoint(spec, k, index, a, cols, rows, width, height);
    pts.push((k ? "L" : "M") + number(p.x) + " " + number(p.y));
  }
  return pts.join(" ");
}
function buildSvg(spec, thumbnail, animated) {
  var width = thumbnail ? 480 : 1920;
  var height = thumbnail ? 270 : 1080;
  var cols = thumbnail ? 18 : spec.columns;
  var rows = thumbnail ? 10 : spec.rows;
  var samples = [0, 0.25, 0.5, 0.75, 1];
  var bgStroke = thumbnail ? "#a8a8b2" : "#bfc0c8";
  var lineOpacity = thumbnail ? "0.38" : "0.28";
  var dotRadius = thumbnail ? 2.05 : 3.1;
  var out = [];
  out.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height +
    '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-labelledby="title desc">');
  out.push('<title id="title">' + escXml(spec.title) + '</title>');
  out.push('<desc id="desc">' + escXml(spec.description) + ' Transparent animated dot mesh; twelve-second seamless loop.</desc>');
  if (!thumbnail) {
    out.push('<metadata>' + escXml(JSON.stringify({
      id: spec.id, title: spec.title, creator: "Tamasrazim", software: "TRILYVA",
      durationSeconds: 12, fps: 60, loop: true, seamless: true, background: "transparent",
      designFamily: spec.family, category: spec.category, tags: spec.tags
    })) + '</metadata>');
  }
  out.push('<g fill="none" stroke="' + bgStroke + '" stroke-opacity="' + lineOpacity + '" stroke-width="' + (thumbnail ? "0.85" : "1.25") + '">');
  for (var r = 0; r < rows; r++) {
    var rowValues = [];
    for (var si = 0; si < samples.length; si++) {
      rowValues.push(pathFor(spec, "row", r, samples[si] * TAU, cols, rows, width, height));
    }
    out.push('<path d="' + rowValues[0] + '">');
    if (animated && !thumbnail) {
      out.push('<animate attributeName="d" values="' + rowValues.join(";") + '" dur="12s" repeatCount="indefinite" calcMode="linear"/>');
    }
    out.push('</path>');
  }
  for (var c = 0; c < cols; c++) {
    var colValues = [];
    for (var sj = 0; sj < samples.length; sj++) {
      colValues.push(pathFor(spec, "col", c, samples[sj] * TAU, cols, rows, width, height));
    }
    out.push('<path d="' + colValues[0] + '">');
    if (animated && !thumbnail) {
      out.push('<animate attributeName="d" values="' + colValues.join(";") + '" dur="12s" repeatCount="indefinite" calcMode="linear"/>');
    }
    out.push('</path>');
  }
  out.push('</g><g fill="#ffffff">');
  for (var rr = 0; rr < rows; rr++) {
    for (var cc = 0; cc < cols; cc++) {
      var pointSamples = [];
      for (var st = 0; st < samples.length; st++) {
        pointSamples.push(svgPoint(spec, rr, cc, samples[st] * TAU, cols, rows, width, height));
      }
      var p0 = pointSamples[0];
      var opacity = Math.max(0.3, Math.min(0.95, 0.62 + p0.z * 0.18));
      var radius = dotRadius * (0.8 + ((rr * 7 + cc * 11 + spec.seed) % 5) * 0.075);
      out.push('<circle cx="' + number(p0.x) + '" cy="' + number(p0.y) + '" r="' + number(radius) +
        '" fill-opacity="' + number(opacity) + '">');
      if (animated && !thumbnail) {
        out.push('<animate attributeName="cx" values="' + pointSamples.map(function (p) { return number(p.x); }).join(";") + '" dur="12s" repeatCount="indefinite" calcMode="linear"/>');
        out.push('<animate attributeName="cy" values="' + pointSamples.map(function (p) { return number(p.y); }).join(";") + '" dur="12s" repeatCount="indefinite" calcMode="linear"/>');
      }
      out.push('</circle>');
    }
  }
  out.push('</g></svg>');
  return out.join("");
}

function sourceFor(spec) {
  var clean = {
    id: spec.id, title: spec.title, family: spec.family, seed: spec.seed,
    columns: spec.columns, rows: spec.rows, amplitude: spec.amplitude,
    frequency: spec.frequency, turns: spec.turns, twist: spec.twist,
    phase: spec.phase, rotation: spec.rotation
  };
  return [
    "// TRILYVA DOT MESH — " + spec.title + " | original 12-second seamless loop.",
    "// Transparent canvas; deterministic time-from-frame; editable source.",
    "var DOT_SPEC = " + JSON.stringify(clean) + ";",
    "var TAU = Math.PI * 2; var DOT_TAU = TAU;",
    meshPoint.toString().replace(/^function meshPoint/, "function dotMeshPoint") + ";",
    "function renderFrame(time, frame, fps, ctx, width, height, motion) {",
    "  var frameCount = Math.max(1, Math.round((Number(fps) || 60) * 12));",
    "  var p = motion && Number.isFinite(motion.loopProgress) ? motion.loopProgress : (((Number(frame) || 0) % frameCount) + frameCount) % frameCount / frameCount;",
    "  p = ((p % 1) + 1) % 1;",
    "  var a = p * DOT_TAU, cols = DOT_SPEC.columns, rows = DOT_SPEC.rows;",
    "  var points = new Array(rows), scaleX = width * 0.455, scaleY = height * 0.435;",
    "  ctx.clearRect(0, 0, width, height);",
    "  for (var r = 0; r < rows; r++) {",
    "    points[r] = new Array(cols);",
    "    for (var c = 0; c < cols; c++) {",
    "      var q = dotMeshPoint(DOT_SPEC, r, c, a, cols, rows);",
    "      points[r][c] = { x: width * 0.5 + q.x * scaleX, y: height * 0.5 + q.y * scaleY, z: q.z, r: r, c: c };",
    "    }",
    "  }",
    "  ctx.lineWidth = Math.max(0.55, Math.min(width, height) / 1080 * 0.82);",
    "  ctx.lineCap = 'round'; ctx.lineJoin = 'round';",
    "  ctx.strokeStyle = 'rgba(210,210,220,' + (0.16 + (DOT_SPEC.seed % 4) * 0.025) + ')';",
    "  for (var ry = 0; ry < rows; ry++) {",
    "    ctx.beginPath();",
    "    for (var cx = 0; cx < cols; cx++) { var pt = points[ry][cx]; if (!cx) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y); }",
    "    ctx.stroke();",
    "  }",
    "  for (var cx2 = 0; cx2 < cols; cx2++) {",
    "    ctx.beginPath();",
    "    for (var ry2 = 0; ry2 < rows; ry2++) { var pv = points[ry2][cx2]; if (!ry2) ctx.moveTo(pv.x, pv.y); else ctx.lineTo(pv.x, pv.y); }",
    "    ctx.stroke();",
    "  }",
    "  var unit = Math.max(0.65, Math.min(2.6, Math.min(width, height) / 1080));",
    "  for (var dy = 0; dy < rows; dy++) for (var dx = 0; dx < cols; dx++) {",
    "    var dot = points[dy][dx], depth = 0.58 + Math.max(-1, Math.min(1, dot.z)) * 0.18;",
    "    var radius = unit * (1.05 + ((dy * 7 + dx * 11 + DOT_SPEC.seed) % 5) * 0.42);",
    "    ctx.globalAlpha = Math.max(0.26, Math.min(0.98, depth));",
    "    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(dot.x, dot.y, radius, 0, DOT_TAU); ctx.fill();",
    "  }",
    "  ctx.globalAlpha = 1;",
    "}"
  ].join("\n");
}

function makeDefinition(definition, index) {
  var seed = index + 17;
  var family = definition[1];
  var amp = 0.055 + (index % 5) * 0.014;
  var freq = 1.65 + (index % 4) * 0.83;
  var turns = 2 + (index % 5);
  var twist = 0.42 + (index % 6) * 0.31;
  var phase = ((index * 47) % 360) * Math.PI / 180;
  var rotation = ((index * 29) % 180) * Math.PI / 180;
  var columns = family === "sphere" || family === "radial" || family === "spiral" || family === "orbit" || family === "pinwheel" ? 38 : 34;
  var rows = family === "sphere" || family === "radial" || family === "spiral" || family === "orbit" || family === "pinwheel" ? 20 : 18;
  var title = definition[0];
  var id = "dotmesh-" + String(index + 1).padStart(3, "0");
  var description = title + " uses a " + family.replace(/-/g, " ") +
    " coordinate system with a distinct animated point field and connected vector mesh.";
  var tags = ["dot mesh", "point field", "animated vector", "procedural", "seamless loop", family.replace(/-/g, " "), "TRILYVA"];
  var spec = {
    id: id, title: title, category: definition[2], family: family, seed: seed,
    columns: columns, rows: rows, amplitude: Number(amp.toFixed(4)),
    frequency: Number(freq.toFixed(3)), turns: turns, twist: Number(twist.toFixed(3)),
    phase: Number(phase.toFixed(6)), rotation: Number(rotation.toFixed(6)),
    description: description, tags: tags
  };
  var metadata = {
    schema: "trilyva.dot-mesh/1.0",
    id: id,
    title: title,
    description: description,
    creator: "Tamasrazim",
    software: "TRILYVA",
    assetType: "Animated dot-mesh vector design",
    category: definition[2],
    designFamily: family,
    durationSeconds: 12,
    fps: 60,
    loop: true,
    seamless: true,
    background: "transparent",
    vectorFormat: "SVG with native SMIL animation",
    renderer: "Canvas 2D renderFrame(time, frame, fps, ctx, width, height, motion)",
    nominalResolution: { width: 1920, height: 1080 },
    grid: { columns: columns, rows: rows, connectedAxes: ["rows", "columns"] },
    tags: tags
  };
  return {
    id: id, title: title, category: definition[2], description: description,
    duration: 12, loop: true, loopDuration: 12, fps: 60,
    width: 1920, height: 1080, transparent: true, seed: seed,
    code: sourceFor(spec),
    svg: function () { return buildSvg(spec, false, true); },
    metadata: metadata,
    thumbnail: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(buildSvg(spec, true, false))
  };
}
var items = DESIGN_DEFINITIONS.map(makeDefinition);

function csvCell(value) {
  var text = Array.isArray(value) ? value.join("; ") : String(value == null ? "" : value);
  return '"' + text.replace(/"/g, '""') + '"';
}
function catalogCsv() {
  var rows = [["id", "title", "description", "category", "design_family", "duration_seconds", "fps", "loop", "seamless", "background", "creator"]];
  items.forEach(function (item) {
    rows.push([item.id, item.title, item.description, item.category, item.metadata.designFamily, 12, 60, "true", "true", "transparent", "Tamasrazim"]);
  });
  return "\uFEFF" + rows.map(function (row) { return row.map(csvCell).join(","); }).join("\r\n") + "\r\n";
}

export default {
  id: "dot-mesh",
  title: "DOT MESH · 50",
  description: "50 distinct seamless dot-mesh animations. Load editable renderer code, export animated SVG, or download JSON metadata and the complete CSV catalog.",
  async load() { return items.slice(); },
  catalogCsv: catalogCsv
};

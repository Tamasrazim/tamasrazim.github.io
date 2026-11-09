// What this does: Supplies 50 original, deterministic, seamless dot-mesh studies for TRILYVA.
// Every item has editable Canvas renderer code, an animated vector SVG export, and downloadable JSON metadata.
// No external dependencies, fonts, images, APIs, or runtime libraries are required.

const TAU = Math.PI * 2;
function makeShutterstockDescription(internalTitle) {
  return "White dots and fine lines form the " + internalTitle +
    " on a dark background. This seamless monochrome loop creates a geometric abstract backdrop for digital design and motion graphics.";
}
const SHUTTERSTOCK_CATEGORIES = {
  wave:["Backgrounds/Textures","Technology"], contour:["Backgrounds/Textures","Science"],
  diagonal:["Backgrounds/Textures","Technology"], moire:["Backgrounds/Textures","Technology"],
  fold:["Backgrounds/Textures","Technology"], spiral:["Backgrounds/Textures","Science"],
  radial:["Backgrounds/Textures","Science"], orbit:["Backgrounds/Textures","Science"],
  hex:["Backgrounds/Textures","Technology"], terrain:["Backgrounds/Textures","Science"],
  vortex:["Backgrounds/Textures","Science"], lissajous:["Backgrounds/Textures","Science"],
  harmonic:["Backgrounds/Textures","Science"], sphere:["Backgrounds/Textures","Science"],
  tunnel:["Backgrounds/Textures","Technology"], pinwheel:["Backgrounds/Textures","Technology"]
};
const SHUTTERSTOCK_COMMON = [
  "abstract background","animated background","seamless loop","looping animation",
  "motion graphics","geometric pattern","monochrome","dark background",
  "white dots","connected dots","dot grid","digital background",
  "abstract motion","moving pattern","black and white"
];
const SHUTTERSTOCK_FAMILY = {
 wave:["flowing wave","wave pattern","wave grid","undulating surface","curved lines","ripple effect","fluid motion","sine wave","contour wave","mesh surface","flowing mesh","organic geometry","abstract waves","point network","moving lattice","wave motion","rolling surface","rippled grid"],
 contour:["concentric circles","ripple rings","contour lines","circular pattern","expanding rings","radial contours","circular motion","topographic pattern","line field","concentric pattern","radial wave","pulse effect","curved grid","circular mesh","ring animation","nested circles","contour geometry","ripple motion"],
 diagonal:["diagonal geometry","angled grid","linear mesh","slanted pattern","geometric lattice","grid distortion","flowing lines","repeating grid","point matrix","connected lattice","abstract geometry","wireframe pattern","line structure","angular mesh","diagonal lines","bent grid","linear pattern","triangular forms"],
 moire:["interference pattern","moire effect","optical pattern","repeating texture","overlapping waves","visual interference","fine line texture","wave interference","optical geometry","pattern distortion","grid texture","frequency pattern","digital interference","line matrix","geometric overlay","checker pattern","optical illusion","interference lines"],
 fold:["folded surface","folding geometry","warped grid","curved lattice","layered surface","surface topology","point connections","fluid lattice","deformed surface","geometric waves","mesh deformation","network surface","rippled structure","moving folds","folded lines","bending surface","curved mesh","layered geometry"],
 spiral:["spiral geometry","twisting form","rotating curves","coiled structure","helical motion","curved strands","intertwined lines","winding pattern","circular paths","rotating mesh","looped geometry","mathematical curves","spiral motion","twisted paths","curved network","helix form","turning strands","coiling lines"],
 radial:["radial geometry","circular symmetry","curved spokes","radial pattern","orbiting points","centered design","circular network","spoke pattern","radial motion","symmetrical design","circular arrangement","radial lines","flower geometry","rotational form","point arrangement","radial structure","radiating lines","spoke arrangement"],
 orbit:["orbital paths","elliptical rings","celestial pattern","space concept","orbiting dots","planetary motion","astronomy visual","circular revolution","layered orbit","orbital motion","ring system","cosmic design","planetary rings","space background","celestial geometry","ellipse pattern","orbital bands","rotating rings"],
 hex:["hexagonal grid","hexagon pattern","honeycomb geometry","staggered lattice","hexagonal mesh","geometric tiling","connected lattice","cellular grid","network geometry","modular pattern","point matrix","geometric network","lattice surface","repeating cells","six sided grid","hexagon cells","cell structure","geometric tessellation"],
 terrain:["topographic lines","rolling terrain","elevation pattern","contour surface","geographic map","height field","landform geometry","terrain visualization","surface relief","mapping concept","landscape pattern","geoscience visual","contour map","digital terrain","elevation lines","mountain contours","ridge pattern","valley form"],
 vortex:["swirling field","spiral flow","rotating points","central whirl","curved flow","twisting mesh","circular motion","whirlpool pattern","rotational geometry","flow lines","swirl effect","converging paths","dynamic spiral","energy flow","vortex motion","eddy currents","rotating field","curved streams"],
 lissajous:["harmonic curves","intersecting curves","mathematical pattern","frequency curves","oscillation paths","wave geometry","curve network","mathematical forms","crossing lines","harmonic motion","complex curves","periodic motion","abstract mathematics","looping curves","lissajous curve","frequency design","curved lattice","math visualization"],
 harmonic:["harmonic pattern","periodic motion","oscillating lines","wave loop","frequency pattern","mathematical curves","loop geometry","curved path","repeating motion","sine curve","continuous motion","mathematics visual","abstract curve","flower geometry","radial symmetry","harmonic form","repeating curves","cyclic motion"],
 sphere:["spherical geometry","rotating globe","geometric orb","round structure","connected lattice","spatial object","globe pattern","rotational motion","sphere surface","digital globe","network sphere","three dimensional form","curved surface","point structure","geometric shell","spherical mesh","round lattice","spherical form"],
 tunnel:["perspective grid","vanishing point","receding lines","depth illusion","tunnel geometry","converging lines","spatial perspective","digital corridor","futuristic passage","central perspective","depth field","linear perspective","geometric depth","virtual space","perspective motion","receding grid","converging points","infinite corridor"],
 pinwheel:["radial pinwheel","rotating spokes","central axis","curved spokes","spinning geometry","radial sweep","circular pattern","rotational symmetry","pinwheel motion","geometric rotation","moving spokes","radial design","abstract movement","curved paths","spoke geometry","turning pattern","circular motion","centered rotation"]
};
const SHUTTERSTOCK_EXTRA = [
  "particle field","point pattern","line art","wireframe","digital art",
  "abstract design","visual texture","geometric motion","animated pattern",
  "minimal background","fine lines","connected mesh","repeating pattern",
  "futuristic design","spatial geometry","visual effect"
];
function shutterstockKeywords(family, stockTitle) {
  var words = String(stockTitle || "").toLowerCase().replace(/^abstract\\s+/, "")
    .replace(/\\bof\\b|\\bmade\\b|\\bconnected\\b|\\bwhite\\b|\\bdots?\\b|\\bpattern\\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ").trim().split(/\\s+/).filter(Boolean);
  var titleTerms = [];
  for (var i=0; i<words.length-1 && titleTerms.length<8; i++) {
    var phrase = words[i] + " " + words[i+1];
    if (titleTerms.indexOf(phrase)<0) titleTerms.push(phrase);
  }
  var pool = SHUTTERSTOCK_COMMON.concat(SHUTTERSTOCK_FAMILY[family] || [])
    .concat(titleTerms).concat(SHUTTERSTOCK_EXTRA);
  var result=[];
  pool.forEach(function(word){
    word=String(word||"").trim().toLowerCase();
    if(word && result.indexOf(word)<0 && result.length<50) result.push(word);
  });
  return result;
}

const DESIGN_DEFINITIONS = [
  ["Meridian Wave Grid", "wave", "Wave Fields", "Abstract Flowing Wave Grid of Connected White Dots", "An abstract field of white points forms a broad flowing wave, with connected lines bending across the surface. This seamless monochrome motion suits technology visuals, title backgrounds and."],
  ["Ripple Lattice", "contour", "Wave Fields", "Abstract Concentric Ripple Pattern of Connected White Dots", "Concentric rings of connected white dots ripple outward in a softly undulating pattern. This minimal abstract loop creates expanding motion for technology backgrounds, transitions and motion graphics."],
  ["Diagonal Tide", "diagonal", "Wave Fields", "Diagonal Flowing Geometric Wave Grid of White Dots", "Rows of white dots form a diagonal geometric grid that shifts into flowing wave-like bends. The clean monochrome animation works as an abstract backdrop for presentations, interfaces and modern."],
  ["Interference Field", "moire", "Wave Fields", "Abstract Moire Interference Pattern of Connected Dots", "Overlapping wave patterns create a fine moire-like field of connected white dots. The shifting geometric interference adds visual rhythm to technology themes, motion design, digital backgrounds."],
  ["Cellular Drift", "fold", "Wave Fields", "Abstract Cellular Wave Surface of Connected White Dots", "A flexible grid of white points folds into a softly rippling cellular surface. Connected lines reveal a fluid abstract structure suited to science visuals, technology presentations and motion."],
  ["Helix Columns", "spiral", "Spiral Forms", "Abstract Twisting Helix Columns Made of White Dots", "White dots trace tall twisting helix columns that wind around one another in a repeating spiral arrangement. The abstract monochrome loop evokes molecular forms, data structures and scientific."],
  ["Twin Spiral Array", "spiral", "Spiral Forms", "Abstract Twin Spiral Motion of Connected White Dots", "Two spiral systems of connected white points rotate through a shared abstract field. Their intertwined paths create balanced geometric motion for science themes, technology presentations and."],
  ["Orbit Rosette", "radial", "Radial Systems", "Abstract Radial Orbit Rosette of White Dots", "A radial arrangement of white dots forms a delicate rosette of orbiting curved paths. The symmetrical abstract motion is suitable for science graphics, technology concepts and monochrome transitions."],
  ["Polar Burst Mesh", "radial", "Radial Systems", "Abstract Radial Burst Pattern of Connected White Dots", "White points spread from a central area into a radiating burst of connected geometric lines. This high-contrast abstract loop adds energy to technology backgrounds, title sequences and motion."],
  ["Saturn Rings", "orbit", "Radial Systems", "Abstract Saturn Ring Orbit Pattern Made of White Dots", "Elliptical rings of white dots circle a central space in a layered orbital arrangement. The monochrome animation suggests planetary motion and works for astronomy themes, science presentations and."],
  ["Hex Current", "hex", "Lattice Geometries", "Abstract Hexagonal Flowing Dot Grid Pattern", "A staggered hexagonal grid of white dots flows across the frame in a repeating geometric wave. Its precise lattice structure suits technology visuals, data presentations and abstract digital."],
  ["Honeycomb Pulse", "hex", "Lattice Geometries", "Abstract Pulsating Honeycomb Grid of White Dots", "A connected honeycomb field of white dots gently expands and contracts in a rhythmic pulse. The clean geometric loop fits science and technology themes, interface backgrounds and modern motion."],
  ["Offset Crystal Field", "hex", "Lattice Geometries", "Abstract Geometric Crystal Grid of Connected Dots", "An offset hexagonal arrangement creates a crystalline field of connected white points. Subtle movement across the geometric lattice gives this abstract loop a refined look for technology and."],
  ["Triangular Mesh", "diagonal", "Lattice Geometries", "Abstract Triangular Geometric Dot Mesh Pattern", "White dots form a repeating triangular mesh whose connected lines shift in a geometric wave. The structured monochrome animation works for engineering concepts, digital presentations and abstract."],
  ["Isometric Cascade", "terrain", "Lattice Geometries", "Abstract Isometric Cascading Dot Grid Landscape", "An isometric field of connected white dots rises and falls like a cascading geometric landscape. The abstract grid brings depth to technology presentations, data visualization and digital motion."],
  ["Diamond Envelope", "diagonal", "Lattice Geometries", "Abstract Diamond Shaped Wave Grid of White Dots", "A diamond-shaped arrangement of connected white dots bends into a flowing geometric envelope. The minimal monochrome loop suits technology titles, abstract transitions and presentation backgrounds."],
  ["Folded Grid", "fold", "Lattice Geometries", "Abstract Folding Geometric Grid of Connected Dots", "A connected grid of white points bends and folds into layered geometric waves. The shifting surface creates a clean abstract motion backdrop for digital products, technology presentations and."],
  ["Wave Crest Matrix", "wave", "Wave Fields", "Abstract Flowing Crest Wave Matrix of White Dots", "Curved rows of white dots form a flowing crest that travels across a connected mesh. The abstract wave animation provides a restrained monochrome background for technology visuals and motion design."],
  ["Checker Sine", "moire", "Interference Studies", "Abstract Checkerboard Moire Pattern of White Dots", "A checkerboard-like field of connected white dots creates a shifting moire effect. Repeating geometric interference gives this monochrome loop texture for digital backgrounds, titles and."],
  ["Ribbon Undulation", "wave", "Interference Studies", "Abstract Undulating Ribbon Waves Made of Dots", "Several flowing ribbon-like waves emerge from rows of connected white dots. Their layered undulation creates an abstract monochrome motion texture for technology visuals, transitions and."],
  ["Vortex Field", "vortex", "Vortex Studies", "Abstract Swirling Vortex Field of Connected White Dots", "A connected field of white points twists into a swirling vortex around a central region. The flowing monochrome pattern suggests motion and energy for science themes, technology backgrounds and."],
  ["Double Vortex", "vortex", "Vortex Studies", "Abstract Double Vortex Spiral Pattern of White Dots", "Two connected vortex forms turn through a shared field of white dots, creating a balanced double-spiral composition. This abstract loop suits science graphics, technology presentations and motion."],
  ["Turbine Dots", "radial", "Vortex Studies", "Abstract Radial Turbine Motion Made of White Dots", "White dots form a radial turbine-like arrangement with curved spokes around a central point. The rotating geometric pattern adds movement to engineering concepts, technology backgrounds and."],
  ["Eddy Network", "vortex", "Vortex Studies", "Abstract Flowing Eddy Network of Connected Dots", "Connected white points drift through a network of curved eddies and flowing turns. The fluid monochrome field works as an abstract background for science visuals, technology themes and motion."],
  ["Gravity Well", "contour", "Vortex Studies", "Abstract Gravitational Well Ripple Pattern of White Dots", "Concentric dotted contours bend around a central well, creating the impression of a deep gravitational field. The abstract monochrome loop suits physics concepts, space themes and scientific."],
  ["Lissajous Cage", "lissajous", "Harmonic Forms", "Abstract Lissajous Harmonic Cage of Connected Dots", "A dense cage of connected white points forms intersecting harmonic curves across the frame. The precise abstract geometry is suitable for mathematics, science presentations and futuristic backgrounds."],
  ["Harmonic Loop", "lissajous", "Harmonic Forms", "Abstract Flowing Harmonic Loop Pattern of White Dots", "A continuous harmonic curve travels through a connected field of white dots, forming a flowing loop. The minimal monochrome animation complements mathematics themes, technology visuals and."],
  ["Mobius Mesh", "fold", "Harmonic Forms", "Abstract Twisted Mobius Strip Dot Mesh", "A connected dotted surface twists into a folded strip with a continuous looping form. Its abstract geometric motion is suited to mathematics and science themes, modern presentations and digital."],
  ["Knotline Points", "lissajous", "Harmonic Forms", "Abstract Lissajous Knot Pattern of Connected White Dots", "Interlaced harmonic paths create a knot-like pattern traced by connected white dots. The intricate monochrome loop offers a mathematical abstract visual for science content, technology."],
  ["Flower of Harmonics", "harmonic", "Harmonic Forms", "Abstract Harmonic Flower Pattern Made of White Dots", "White points trace a flower-like radial arrangement of repeating harmonic curves. The symmetrical abstract animation brings a scientific geometric feel to digital backgrounds and presentation visuals."],
  ["Radial Contour", "contour", "Radial Systems", "Abstract Radial Contour Rings of Connected White Dots", "Layered rings of connected white dots create a radial contour pattern that expands and contracts. The clean monochrome motion suits scientific diagrams, technology backgrounds and abstract title."],
  ["Orbit Bands", "orbit", "Radial Systems", "Abstract Concentric Orbit Bands Made of White Dots", "Multiple elliptical bands of white points form a layered orbital composition around an open center. This abstract space-inspired loop works for astronomy visuals, science presentations and."],
  ["Eclipse Mesh", "orbit", "Radial Systems", "Abstract Eclipse Orbit Pattern of Connected White Dots", "Overlapping orbital paths of connected white dots create an eclipse-inspired arrangement. The restrained monochrome animation is suitable for astronomy themes, science content and technology."],
  ["Nested Spheres", "sphere", "Spherical Systems", "Abstract Nested Spherical Rings of White Dots", "Nested spherical rings made from connected white dots create a layered three-dimensional form. The abstract monochrome loop works for astronomy, science and technology visuals or digital backgrounds."],
  ["Perspective Tunnel", "tunnel", "Perspective Fields", "Abstract Futuristic Perspective Tunnel of White Dots", "A field of white dots recedes toward a central vanishing point, forming a deep geometric tunnel. This futuristic monochrome loop suits technology presentations, sci-fi backgrounds and digital."],
  ["Horizon Convergence", "tunnel", "Perspective Fields", "Abstract Converging Horizon Grid of Connected Dots", "Connected white points converge toward a distant horizon, creating a perspective grid with a sense of depth. The abstract animation fits technology visuals, digital environments and presentation."],
  ["Vanishing-Point Grid", "tunnel", "Perspective Fields", "Abstract Vanishing Point Perspective Dot Grid", "A geometric grid of white dots narrows toward a central vanishing point to create a perspective illusion. The minimal monochrome motion suits futuristic scenes, technology themes and abstract."],
  ["Folding Corridor", "tunnel", "Perspective Fields", "Abstract Folding Geometric Corridor of White Dots", "Rows of connected white dots fold inward to form a geometric corridor with shifting perspective. This abstract monochrome loop provides depth for digital environments, technology presentations and."],
  ["Parallax Columns", "tunnel", "Perspective Fields", "Abstract Parallax Perspective Columns Made of Dots", "Vertical columns of white points recede through a layered perspective field, creating a subtle parallax effect. The futuristic monochrome animation suits interface visuals, technology backgrounds."],
  ["Terrain Contour", "terrain", "Terrain Studies", "Abstract Flowing Terrain Contour Lines of White Dots", "Flowing contour lines made from connected white dots shape a rolling abstract terrain. The monochrome surface suggests elevation and movement for topographic themes, data visualization and science."],
  ["Ridgefield", "terrain", "Terrain Studies", "Abstract Mountain Ridge Contour Dot Landscape", "White points trace layered mountain-like ridges across an abstract contour landscape. The clean geometric animation is suited to mapping concepts, topographic visuals, science content and digital."],
  ["Mountain Mesh", "terrain", "Terrain Studies", "Abstract Animated Mountain Mesh of Connected White Dots", "A connected mesh of white dots rises into a moving mountain-like surface with visible peaks and valleys. The abstract monochrome loop fits terrain visualization, scientific presentations and."],
  ["Valley Scan", "terrain", "Terrain Studies", "Abstract Valley Contour Scan Made of White Dots", "Curved rows of white points descend into a valley-shaped contour pattern. Subtle motion across the connected surface makes an abstract visual for mapping, geography, science and digital presentations."],
  ["Seismic Surface", "terrain", "Terrain Studies", "Abstract Seismic Wave Surface of Connected White Dots", "A connected field of white dots moves across a terrain-like surface in seismic wave patterns. The abstract monochrome animation suits geoscience topics, data visualization and scientific."],
  ["Dot Sphere", "sphere", "Spherical Systems", "Abstract Rotating Three Dimensional Dot Sphere", "A three-dimensional sphere formed from connected white dots rotates as a clean geometric object. The monochrome loop is suitable for astronomy, science, technology presentations and abstract."],
  ["Spherical Lattice", "sphere", "Spherical Systems", "Abstract Spherical Lattice Grid of Connected White Dots", "A spherical lattice of connected white points creates a precise geometric shell with visible depth. This minimal monochrome animation works for science concepts, network visuals and futuristic."],
  ["Breathing Orb", "sphere", "Spherical Systems", "Abstract Breathing Orb Made of Connected White Dots", "A connected dotted sphere gently expands and contracts, creating a breathing orbital form. The restrained abstract loop suits wellness technology, science presentations and minimal digital."],
  ["Orbital Shell", "sphere", "Spherical Systems", "Abstract Orbital Shell Pattern of White Dots", "Layered orbital shells of white dots wrap around a central spherical form. The abstract monochrome animation evokes scientific structures and works for astronomy themes, technology visuals and."],
  ["Geodesic Halo", "sphere", "Spherical Systems", "Abstract Geodesic Halo Sphere Made of White Dots", "A geodesic spherical halo is traced by connected white dots in a balanced geometric arrangement. The seamless monochrome loop suits science and space themes, technology presentations and motion."],
  ["Pinwheel Coordinates", "pinwheel", "Radial Systems", "Abstract Radial Pinwheel Pattern of Connected White Dots", "White dots sweep around a central axis in a radial pinwheel arrangement, forming curved connected spokes. The abstract monochrome loop adds motion to technology backgrounds, digital titles and."]
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
function buildSvg(spec, thumbnail, animated, ultraHd) {
  var width = thumbnail ? 480 : (ultraHd ? 3840 : 1920);
  var height = thumbnail ? 270 : (ultraHd ? 2160 : 1080);
  var cols = thumbnail ? 18 : spec.columns;
  var rows = thumbnail ? 10 : spec.rows;
  var samples = [0, 0.25, 0.5, 0.75, 1];
  var bgStroke = thumbnail ? "#a8a8b2" : "#bfc0c8";
  var lineOpacity = thumbnail ? "0.38" : "0.28";
  var dotRadius = thumbnail ? 2.05 : (ultraHd ? 6.2 : 3.1);
  var out = [];
  out.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height +
    '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-labelledby="title desc">');
  out.push('<title id="title">' + escXml(spec.title) + '</title>');
  out.push('<desc id="desc">' + escXml(spec.description) + (animated ? ' Transparent animated dot mesh; twelve-second seamless loop.' : ' Static transparent vector still at frame zero from a twelve-second seamless-loop design.') + '</desc>');
  if (!thumbnail) {
    out.push('<metadata>' + escXml(JSON.stringify({
      id: spec.id, title: spec.title, creator: "Tamasrazim", software: "TRILYVA",
      durationSeconds: 12, fps: 60, loop: true, seamless: true, animated: !!animated, background: "transparent",
      width: width, height: height, designFamily: spec.family, category: spec.category, tags: spec.tags
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
  var stockTitle = definition[3] || title;
  var id = "dotmesh-" + String(index + 1).padStart(3, "0");
  var description = makeShutterstockDescription(title);
  var tags = shutterstockKeywords(family, stockTitle);
  var stockCategories = SHUTTERSTOCK_CATEGORIES[family] || ["Backgrounds/Textures"];
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
    title: stockTitle,
    internalName: title,
    description: description,
    creator: "Tamasrazim",
    software: "TRILYVA",
    assetType: "Procedural dot-mesh design",
    category: stockCategories[0],
    categories: stockCategories,
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
    id: id, title: title, stockTitle: stockTitle, category: definition[2], description: description,
    tags: tags, categories: stockCategories,
    duration: 12, loop: true, loopDuration: 12, fps: 60,
    width: 1920, height: 1080, transparent: true, seed: seed,
    code: sourceFor(spec),
    svg: function () { return buildSvg(spec, false, true, false); },
    staticSvg: function () { return buildSvg(spec, false, false, true); },
    metadata: metadata,
    thumbnail: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(buildSvg(spec, true, false))
  };
}
var items = DESIGN_DEFINITIONS.map(makeDefinition);

function csvCell(value) {
  var text = Array.isArray(value) ? value.join(", ") : String(value == null ? "" : value);
  return '"' + text.replace(/"/g, '""') + '"';
}
function catalogCsv() {
  var rows = [["Filename", "Description", "Keywords", "Categories"]];
  items.forEach(function (item) {
    rows.push([
      (item.stockTitle || item.metadata.title || item.title) + ".mp4",
      item.description,
      (item.metadata.tags || item.tags || []).join(", "),
      (item.metadata.categories || item.categories || ["Backgrounds/Textures"]).join(", ")
    ]);
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

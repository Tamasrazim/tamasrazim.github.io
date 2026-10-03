
/* ============================================================
   MotionCore — animation runtime + canonical composition model.
   Runs identically on the main thread and inside a worker.
   ============================================================ */
var MotionCore = (function () {
'use strict';

var VERSION = '1.1.0';
var TAU = Math.PI * 2;
/* new Function wraps the body as: function anonymous(args\n) {\n<body>\n} */
var LINE_OFFSET = 3;

/* ---------------- math helpers ---------------- */
function clamp(v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function map(v, a, b, c, d, cl) { if (b === a) return c; var t = (v - a) / (b - a); if (cl) t = clamp(t, 0, 1); return c + (d - c) * t; }
function smoothstep(a, b, t) { t = clamp((t - a) / ((b - a) || 1e-12), 0, 1); return t * t * (3 - 2 * t); }
function smootherstep(a, b, t) { t = clamp((t - a) / ((b - a) || 1e-12), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); }
function wrap(v, n) { return ((v % n) + n) % n; }
function pingpong(v, n) { var m = wrap(v, n * 2); return m > n ? n * 2 - m : m; }
function mix(a, b, t) { return a + (b - a) * t; }

var easings = (function () {
  function flip(f) { return function (t) { return 1 - f(1 - t); }; }
  function both(fi) { return function (t) { return t < .5 ? fi(t * 2) / 2 : 1 - fi(2 - t * 2) / 2; }; }
  var e = {};
  e.linear = function (t) { return t; };
  var pow = { quad: 2, cubic: 3, quart: 4, quint: 5 };
  Object.keys(pow).forEach(function (k) {
    var p = pow[k];
    e['in' + k[0].toUpperCase() + k.slice(1)] = function (t) { return Math.pow(t, p); };
  });
  e.inSine = function (t) { return 1 - Math.cos(t * Math.PI / 2); };
  e.inExpo = function (t) { return t <= 0 ? 0 : Math.pow(2, 10 * t - 10); };
  e.inCirc = function (t) { return 1 - Math.sqrt(1 - t * t); };
  e.inBack = function (t) { return 2.70158 * t * t * t - 1.70158 * t * t; };
  e.inElastic = function (t) { return t <= 0 ? 0 : t >= 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (TAU / 3)); };
  e.inBounce = function (t) { return 1 - e.outBounce(1 - t); };
  e.outBounce = function (t) {
    var n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) { t -= 1.5 / d; return n * t * t + .75; }
    if (t < 2.5 / d) { t -= 2.25 / d; return n * t * t + .9375; }
    t -= 2.625 / d; return n * t * t + .984375;
  };
  ['Quad', 'Cubic', 'Quart', 'Quint', 'Sine', 'Expo', 'Circ', 'Back', 'Elastic'].forEach(function (k) {
    e['out' + k] = flip(e['in' + k]);
  });
  ['Quad', 'Cubic', 'Quart', 'Quint', 'Sine', 'Expo', 'Circ', 'Back', 'Elastic', 'Bounce'].forEach(function (k) {
    e['inOut' + k] = both(e['in' + k]);
  });
  return e;
})();
function ease(name, t) {
  var f = easings[name];
  if (!f) throw new Error('Unknown easing "' + name + '". Available: ' + Object.keys(easings).join(', '));
  return f(clamp(t, 0, 1));
}
/* analytic damped oscillator, stateless and therefore deterministic */
function spring(t, freq, damping) {
  freq = freq === undefined ? 4 : freq; damping = damping === undefined ? 4 : damping;
  if (t <= 0) return 0;
  var w = freq * TAU * .5;
  return 1 - Math.exp(-damping * t) * (Math.cos(w * t) + (damping / (w || 1e-6)) * Math.sin(w * t));
}

/* ---------------- deterministic randomness ---------------- */
function mulberry32(a) {
  a = a | 0;
  return function () {
    a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashInts(x, y, z, s) {
  var n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1442695041) + Math.imul(s | 0, 1274126177)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
/* 3-D value noise, -1..1, no internal state */
function makeNoise(seed) {
  function n3(x, y, z) {
    y = y || 0; z = z || 0;
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    var xf = x - xi, yf = y - yi, zf = z - zi;
    var u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    var v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    var w = zf * zf * zf * (zf * (zf * 6 - 15) + 10);
    var c000 = hashInts(xi, yi, zi, seed), c100 = hashInts(xi + 1, yi, zi, seed);
    var c010 = hashInts(xi, yi + 1, zi, seed), c110 = hashInts(xi + 1, yi + 1, zi, seed);
    var c001 = hashInts(xi, yi, zi + 1, seed), c101 = hashInts(xi + 1, yi, zi + 1, seed);
    var c011 = hashInts(xi, yi + 1, zi + 1, seed), c111 = hashInts(xi + 1, yi + 1, zi + 1, seed);
    var x00 = mix(c000, c100, u), x10 = mix(c010, c110, u);
    var x01 = mix(c001, c101, u), x11 = mix(c011, c111, u);
    return (mix(mix(x00, x10, v), mix(x01, x11, v), w) * 2 - 1);
  }
  n3.fbm = function (x, y, z, oct, lac, gain) {
    oct = oct || 4; lac = lac || 2; gain = gain === undefined ? .5 : gain;
    var a = 1, f = 1, sum = 0, norm = 0;
    for (var i = 0; i < oct; i++) { sum += a * n3(x * f, (y || 0) * f, (z || 0) * f); norm += a; a *= gain; f *= lac; }
    return sum / (norm || 1);
  };
  return n3;
}

/* ---------------- canonical composition ---------------- */
var COMP_DEFAULTS = {
  width: 1920, height: 1080, fps: 60, duration: 10,
  background: '#000000', transparent: false, seed: 12345,
  loop: false, loopDuration: 10, speed: 1, reverse: false,
  colorSpace: 'srgb', pixelAspect: 1
};
/* frameCount = round(duration * fps); frames are 0 .. frameCount-1; time = frame / fps.
   The wrap frame (index frameCount) is deliberately excluded so a loop never
   duplicates its first frame at the end. */
function composition(p) {
  var c = {}; var k;
  for (k in COMP_DEFAULTS) c[k] = COMP_DEFAULTS[k];
  if (p) for (k in p) if (p[k] !== undefined && p[k] !== null) c[k] = p[k];
  c.width = Math.max(2, Math.round(c.width));
  c.height = Math.max(2, Math.round(c.height));
  c.fps = Math.max(1, Math.round(c.fps));
  c.duration = Math.max(1 / c.fps, +c.duration);
  c.frameCount = Math.max(1, Math.round(c.duration * c.fps));
  c.duration = c.frameCount / c.fps;
  c.loopDuration = Math.max(1 / c.fps, +c.loopDuration || c.duration);
  c.speed = +c.speed > 0 ? +c.speed : 1;
  c.aspect = c.width / c.height;
  return c;
}
function frameToSourceTime(c, frame) {
  var f = c.reverse ? (c.frameCount - 1 - frame) : frame;
  return f / c.fps;
}
function frameToTime(c, frame) { return frameToSourceTime(c, frame) * c.speed; }

/* ---------------- error description ---------------- */
function mapLine(n) { var v = n - LINE_OFFSET; return v >= 1 ? v : null; }
function describeError(e, stage) {
  var out = {
    stage: stage, name: (e && e.name) || 'Error',
    message: (e && e.message) ? String(e.message) : String(e),
    line: null, column: null, stack: (e && e.stack) ? String(e.stack).split('\n').slice(0, 6).join('\n') : ''
  };
  var pats = [/<anonymous>:(\d+):(\d+)/, /Function:(\d+):(\d+)/, /eval:(\d+):(\d+)/];
  for (var i = 0; i < pats.length; i++) {
    var m = out.stack.match(pats[i]);
    if (m) { out.line = mapLine(+m[1]); out.column = +m[2]; break; }
  }
  return out;
}
/* V8 reports no position for `new Function` syntax errors, so find the first
   structurally suspicious line instead of inventing one. */
function scanBalance(code) {
  var lines = code.split('\n'), stack = [], open = { '(': ')', '[': ']', '{': '}' };
  var inBlock = false;
  for (var i = 0; i < lines.length; i++) {
    var L = lines[i], q = null, j = 0;
    for (; j < L.length; j++) {
      var ch = L[j], nx = L[j + 1];
      if (inBlock) { if (ch === '*' && nx === '/') { inBlock = false; j++; } continue; }
      if (q) {
        if (ch === '\\') { j++; continue; }
        if (ch === q) q = null;
        continue;
      }
      if (ch === '/' && nx === '/') break;
      if (ch === '/' && nx === '*') { inBlock = true; j++; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { q = ch; continue; }
      if (open[ch]) stack.push({ ch: ch, line: i + 1 });
      else if (ch === ')' || ch === ']' || ch === '}') {
        var top = stack.pop();
        if (!top) return { line: i + 1, why: 'a closing "' + ch + '" with nothing open' };
        if (open[top.ch] !== ch) return { line: top.line, why: '"' + top.ch + '" opened here is closed by "' + ch + '" on line ' + (i + 1) };
      }
    }
    if (q && q !== '`') return { line: i + 1, why: 'unterminated ' + (q === '"' ? 'string' : 'string') };
  }
  if (stack.length) return { line: stack[stack.length - 1].line, why: 'unclosed "' + stack[stack.length - 1].ch + '"' };
  return null;
}

/* ---------------- sandbox scope ----------------
   Every name below is shadowed inside the animation scope. Network and storage
   globals resolve to undefined, so animation code cannot phone home or touch
   site data. This is scope shadowing, not an OS sandbox — see the docs. */
var SCOPE = [
  'motion', 'window', 'self', 'globalThis', 'document', 'parent', 'top', 'frames',
  'lerp', 'clamp', 'map', 'mix', 'smoothstep', 'smootherstep', 'ease', 'easings', 'spring',
  'noise', 'fbm', 'random', 'randomRange', 'randomInt', 'pick', 'wrap', 'pingpong', 'TAU', 'PI',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'postMessage',
  'indexedDB', 'localStorage', 'sessionStorage', 'caches', 'Worker', 'SharedWorker',
  'close', 'open', 'location', 'history'
];

function createRuntime() {
  var rt = {
    compiled: null, fn: null, setupFn: null, code: '', hash: '',
    comp: composition({}), rng: mulberry32(1), noise: makeNoise(1),
    sims: {}, assets: {}, motion: null, lastError: null, generation: 0
  };

  function buildMotion() {
    var m = {
      time: 0, frame: 0, fps: 60, width: 0, height: 0, duration: 0, frameCount: 0,
      progress: 0, sourceTime: 0, loop: false, loopDuration: 0, loopProgress: 0,
      seed: 0, scale: 1, aspect: 1, isExport: false, quality: 'preview',
      random: function () { return rt.rng(); },
      randomRange: function (a, b) { return a + rt.rng() * (b - a); },
      randomInt: function (a, b) { return Math.floor(a + rt.rng() * (b - a + 1)); },
      pick: function (arr) { return arr[Math.floor(rt.rng() * arr.length)]; },
      gaussian: function (mu, sd) {
        var u = 1 - rt.rng(), v = rt.rng();
        return (mu || 0) + (sd === undefined ? 1 : sd) * Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
      },
      noise: function (x, y, z) { return rt.noise(x, y, z); },
      fbm: function (x, y, z, o, l, g) { return rt.noise.fbm(x, y, z, o, l, g); },
      setSeed: function (s) { rt.comp.seed = s | 0; rt.noise = makeNoise(s | 0); rt.rng = mulberry32(seedForFrame(m.frame)); },
      lerp: lerp, clamp: clamp, map: map, mix: mix, smoothstep: smoothstep, smootherstep: smootherstep,
      ease: ease, easings: easings, spring: spring, wrap: wrap, pingpong: pingpong, TAU: TAU,
      asset: function (name) { return rt.assets[name] || null; },
      assets: rt.assets,
      simulation: simulation
    };
    return m;
  }
  function seedForFrame() { return (rt.comp.seed | 0); }

  /* Fixed-step simulation. State is rebuilt from frame 0 whenever the caller
     moves backwards, so scrubbing and sequential export agree exactly. */
  function simulation(key, spec) {
    if (typeof key === 'object') { spec = key; key = spec.key || 'default'; }
    var target = rt.motion.frame;
    var s = rt.sims[key];
    if (!s || s.gen !== rt.generation || s.frame > target) {
      var save = rt.rng;
      rt.rng = mulberry32(rt.comp.seed | 0);
      s = { state: spec.init ? spec.init(rt.motion) : {}, frame: -1, gen: rt.generation };
      rt.rng = save;
      rt.sims[key] = s;
    }
    var sub = Math.max(1, spec.substeps || 1);
    var dt = (rt.comp.speed / rt.comp.fps) / sub;
    var budget = 400000;
    while (s.frame < target) {
      s.frame++;
      var savedRng = rt.rng;
      rt.rng = mulberry32(((rt.comp.seed | 0) ^ Math.imul(s.frame + 1, 2654435761)) | 0);
      for (var i = 0; i < sub; i++) {
        spec.step(s.state, dt, s.frame, rt.motion);
        if (--budget <= 0) { rt.rng = savedRng; throw new Error('simulation("' + key + '") exceeded 400000 steps while catching up to frame ' + target); }
      }
      rt.rng = savedRng;
    }
    return s.state;
  }

  rt.motion = buildMotion();

  rt.setComposition = function (c) { rt.comp = composition(c); rt.noise = makeNoise(rt.comp.seed | 0); rt.sims = {}; };
  rt.setAssets = function (a) { rt.assets = a || {}; rt.motion.assets = rt.assets; };

  rt.compile = function (code) {
    rt.generation++;
    rt.sims = {};
    rt.fn = null; rt.setupFn = null; rt.lastError = null; rt.code = code;
    rt.noise = makeNoise(rt.comp.seed | 0);
    var win = {};
    var body = '"use strict";\n' + code +
      '\n;return {r:(typeof renderFrame==="function")?renderFrame:null,s:(typeof setup==="function")?setup:null};';
    var factory;
    try {
      factory = Function.apply(null, SCOPE.concat([body]));
    } catch (e) {
      var d = describeError(e, 'compile');
      if (d.line === null) {
        var b = scanBalance(code);
        if (b) { d.line = b.line; d.hint = 'The engine does not report a position for this error. First structural problem found: ' + b.why + '.'; }
      }
      rt.lastError = d; return { ok: false, error: d };
    }
    var m = rt.motion;
    var args = SCOPE.map(function (n) {
      switch (n) {
        case 'motion': return m;
        case 'window': return win;
        case 'lerp': return lerp; case 'clamp': return clamp; case 'map': return map; case 'mix': return mix;
        case 'smoothstep': return smoothstep; case 'smootherstep': return smootherstep;
        case 'ease': return ease; case 'easings': return easings; case 'spring': return spring;
        case 'noise': return m.noise; case 'fbm': return m.fbm;
        case 'random': return m.random; case 'randomRange': return m.randomRange; case 'randomInt': return m.randomInt;
        case 'pick': return m.pick; case 'wrap': return wrap; case 'pingpong': return pingpong;
        case 'TAU': return TAU; case 'PI': return Math.PI;
        default: return undefined;
      }
    });
    var out;
    try { out = factory.apply(null, args); }
    catch (e2) { var d2 = describeError(e2, 'compile'); rt.lastError = d2; return { ok: false, error: d2 }; }
    var fn = (out && out.r) || win.renderFrame || null;
    if (typeof fn !== 'function') {
      var d3 = {
        stage: 'contract', name: 'ContractError',
        message: 'No renderFrame function was found.',
        detail: 'Declare `function renderFrame(time, frame, fps, ctx, width, height) { ... }` at the top level of the file, or assign `window.renderFrame = ...`.',
        line: null
      };
      rt.lastError = d3; return { ok: false, error: d3 };
    }
    rt.fn = fn;
    rt.setupFn = (out && out.s) || win.setup || null;
    if (rt.setupFn) {
      try { rt.rng = mulberry32(rt.comp.seed | 0); rt.setupFn(rt.motion); }
      catch (e3) { var d4 = describeError(e3, 'setup'); rt.lastError = d4; return { ok: false, error: d4 }; }
    }
    return { ok: true, arity: fn.length, hasSetup: !!rt.setupFn };
  };

  /* Draw one frame. rasterScale lets the preview rasterise smaller while the
     animation still receives composition-space dimensions, so preview and
     export are the same picture at different sample densities. */
  rt.renderInto = function (ctx, frame, opts) {
    opts = opts || {};
    var c = rt.comp, s = opts.rasterScale || 1, m = rt.motion;
    if (!rt.fn) return { ok: false, error: rt.lastError || { name: 'ContractError', message: 'Nothing compiled yet.', stage: 'contract' } };
    var t = frameToTime(c, frame);
    m.time = t; m.frame = frame; m.fps = c.fps; m.width = c.width; m.height = c.height;
    m.duration = c.duration; m.frameCount = c.frameCount; m.progress = frame / c.frameCount;
    m.sourceTime = frameToSourceTime(c, frame);
    m.loop = !!c.loop; m.loopDuration = c.loopDuration;
    m.loopProgress = c.loop ? wrap(t / c.loopDuration, 1) : clamp(t / c.duration, 0, 1);
    m.seed = c.seed | 0; m.aspect = c.aspect; m.scale = c.height / 1080;
    m.isExport = !!opts.isExport; m.quality = opts.isExport ? 'export' : 'preview';
    rt.rng = mulberry32(seedForFrame(frame));

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.clearRect(0, 0, c.width * s + 2, c.height * s + 2);
    if (!c.transparent) {
      ctx.fillStyle = c.background || '#000';
      ctx.fillRect(0, 0, c.width * s + 2, c.height * s + 2);
    }
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, c.width, c.height);
    ctx.clip();
    var t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    try {
      rt.fn(t, frame, c.fps, ctx, c.width, c.height);
    } catch (e) {
      ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      var d = describeError(e, opts.isExport ? 'render' : 'preview');
      d.frame = frame; d.time = t;
      rt.lastError = d;
      return { ok: false, error: d };
    }
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return { ok: true, ms: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0 };
  };

  return rt;
}

return {
  VERSION: VERSION, TAU: TAU,
  createRuntime: createRuntime, composition: composition, COMP_DEFAULTS: COMP_DEFAULTS,
  frameToTime: frameToTime, frameToSourceTime: frameToSourceTime,
  helpers: { clamp: clamp, lerp: lerp, map: map, smoothstep: smoothstep, smootherstep: smootherstep, wrap: wrap, pingpong: pingpong, ease: ease, easings: easings, spring: spring },
  mulberry32: mulberry32, makeNoise: makeNoise, scanBalance: scanBalance, SCOPE: SCOPE
};
})();

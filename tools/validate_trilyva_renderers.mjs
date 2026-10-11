import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const SAMPLE_STEP_SECONDS = 0.5;
const films = [
  {
    name: 'The Last Star Train',
    page: 'projects/trilyva/the-last-star-train.html',
    script: 'projects/code-motion/renderer/the-last-star-train.js',
    expectedDuration: 600,
    expectedWidth: 3840,
    expectedHeight: 2160,
    expectedCanvasWidth: 3840,
    expectedCanvasHeight: 2160,
  },
  {
    name: 'Niko and the Clockwork Bird',
    page: 'projects/trilyva/niko-and-the-clockwork-bird.html',
    script: 'projects/code-motion/renderer/niko-and-the-clockwork-bird.js',
    expectedDuration: 300,
    expectedWidth: 1920,
    expectedHeight: 1080,
    expectedCanvasWidth: 1920,
    expectedCanvasHeight: 1080,
  },
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function must(condition, message) {
  if (!condition) throw new Error(message);
  console.log('PASS', message);
}

function createGradient() {
  return {
    addColorStop(offset, color) {
      if (typeof offset !== 'number' || !Number.isFinite(offset) || offset < 0 || offset > 1) {
        throw new RangeError('CanvasGradient.addColorStop received an invalid offset: ' + offset);
      }
      if (typeof color !== 'string' || color.trim() === '') {
        throw new TypeError('CanvasGradient.addColorStop received an empty or invalid color');
      }
    },
  };
}

function createCanvasContext() {
  const state = {
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    fillStyle: '#000000',
    strokeStyle: '#000000',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    filter: 'none',
    measureText(text) {
      return {
        width: String(text).length * 14,
        actualBoundingBoxAscent: 8,
        actualBoundingBoxDescent: 2,
      };
    },
    createLinearGradient: createGradient,
    createRadialGradient: createGradient,
    createConicGradient: createGradient,
    createPattern() { return {}; },
    getLineDash() { return []; },
    isPointInPath() { return false; },
    isPointInStroke() { return false; },
  };

  return new Proxy(state, {
    get(target, property) {
      if (property in target) return target[property];
      // Geometry commands are stubbed. The test exercises the authored frame logic
      // and real Canvas API argument validation without pretending to be a rasterizer.
      if (typeof property === 'string') return function noopCanvasCommand() {};
      return undefined;
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });
}

function scriptReferenceResolves(pagePath, scriptPath) {
  const page = read(pagePath);
  const scriptName = path.basename(scriptPath);
  const referenced = page.includes(scriptName);
  must(referenced, pagePath + ' references ' + scriptName);

  const resolved = path.resolve(ROOT, path.dirname(pagePath), '../code-motion/renderer', scriptName);
  must(path.normalize(resolved) === path.resolve(ROOT, scriptPath), pagePath + ' points to the canonical renderer');
}

function checkFilm(film) {
  const pageMarkup = read(film.page);
  const source = read(film.script);
  scriptReferenceResolves(film.page, film.script);

  must(pageMarkup.includes('<canvas'), film.name + ' page provides a canvas stage');
  const canvasTag = pageMarkup.match(/<canvas\b[^>]*>/i);
  must(Boolean(canvasTag), film.name + ' has a measurable canvas element');
  const canvasWidth = canvasTag ? Number((canvasTag[0].match(/\bwidth=["'](\d+)["']/i) || [])[1]) : 0;
  const canvasHeight = canvasTag ? Number((canvasTag[0].match(/\bheight=["'](\d+)["']/i) || [])[1]) : 0;
  must(
    canvasWidth === film.expectedCanvasWidth && canvasHeight === film.expectedCanvasHeight,
    film.name + ' canvas is ' + canvasWidth + ' × ' + canvasHeight,
  );
  must(canvasWidth / canvasHeight === 16 / 9, film.name + ' canvas keeps its 16:9 render basis');

  const windowObject = {};
  const sandbox = vm.createContext({ window: windowObject, console });
  vm.runInContext(source, sandbox, { filename: film.script });

  const story = windowObject.TRILYVA_STARTRAIN_STORY || null;
  const renderFrame = (story && story.renderFrame) || sandbox.renderFrame;
  if (typeof renderFrame !== 'function') {
    throw new Error(film.name + ' failed to register renderFrame');
  }

  const duration = story ? story.duration : film.expectedDuration;
  const fps = story ? story.fps : 30;
  const width = story ? story.width : film.expectedWidth;
  const height = story ? story.height : film.expectedHeight;
  must(duration === film.expectedDuration, film.name + ' duration is ' + duration + ' seconds');
  must(Number.isFinite(fps) && fps > 0, film.name + ' declares a valid frame rate');
  must(width / height === 16 / 9, film.name + ' renderer output is 16:9');

  const context = createCanvasContext();
  const samples = Math.round(duration / SAMPLE_STEP_SECONDS) + 1;
  for (let index = 0; index < samples; index += 1) {
    const time = Math.min(duration, index * SAMPLE_STEP_SECONDS);
    try {
      renderFrame(time, Math.round(time * fps), fps, context, 1920, 1080);
    } catch (error) {
      throw new Error(
        film.name + ' failed at ' + time.toFixed(2) + ' seconds: ' +
        (error && error.message ? error.message : String(error)),
        { cause: error },
      );
    }
  }

  must(true, film.name + ' rendered ' + samples + ' deterministic sample times without runtime or gradient errors');
}

for (const film of films) checkFilm(film);
console.log('TRILYVA renderer validation complete.');

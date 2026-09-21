import fs from 'node:fs';

const must = (ok, msg) => {
  if (!ok) throw new Error(msg);
  console.log('PASS', msg);
};

const renderer = fs.readFileSync('code-motion-tamasrazim.html', 'utf8');
const project = fs.readFileSync('projects/code-motion/index.html', 'utf8');
const media = fs.readFileSync('projects/code-motion/media-stack.js', 'utf8');

must(renderer.includes('<title>Code → Motion — Tamasrazim</title>'), 'current Code Motion title exists');
must(renderer.includes('function encodeRange'), 'deterministic export function exists');
must(renderer.includes('VideoEncoder'), 'WebCodecs encoder path exists');
must(renderer.includes('VideoFrame'), 'VideoFrame path exists');
must(renderer.includes('function webmMux'), 'WebM muxer exists');
must(renderer.includes('function muxMP4'), 'MP4 muxer exists');
must(renderer.includes('function buildSource'), 'isolated source builder exists');
must(renderer.includes('INIT_EXPORT'), 'export runtime handshake exists');
must(renderer.includes("type:'FRAME'"), 'explicit frame message exists');
must(renderer.includes('Render Test'), 'render test control exists');
must(renderer.includes('Loop Inspector'), 'loop inspector control exists');
must(renderer.includes('4K UHD'), '4K preset exists');
must(/<option[^>]*>120<\/option>/.test(renderer), '120 FPS preset exists');
must(!/<script[^>]+\bsrc=/i.test(renderer), 'renderer has no external script dependency');
must(!/<link[^>]+\bhref=[^>]+\.css/i.test(renderer), 'renderer has no external stylesheet dependency');

const scripts = [...renderer.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
must(scripts.length === 1, 'renderer keeps one executable script block');
try {
  new Function(scripts[0][2]);
  console.log('PASS renderer JavaScript parses');
} catch (error) {
  throw new Error('renderer JavaScript syntax: ' + error.message);
}

must(project.includes('../../code-motion-tamasrazim.html'), 'project page points to canonical renderer');
must(!project.includes('Mediabunny'), 'project page has no stale Mediabunny claim');
must(!media.includes('Mediabunny'), 'media descriptor has no stale Mediabunny dependency');
try {
  new Function(media);
  console.log('PASS media descriptor JavaScript parses');
} catch (error) {
  throw new Error('media descriptor syntax: ' + error.message);
}


must(renderer.includes('<title>Code → Motion — Tamasrazim</title>'), 'current Code Motion title exists');
for (const token of [
  'function renderFrame(',
  'function createRuntime(',
  'function buildMotion(',
  'function runFrames(',
  'function exportWebM(',
  'function exportMP4(',
  'WebMMuxer',
  'MP4Muxer',
  'new VideoFrame',
  'VideoEncoder',
  'MediaRecorder',
  'render-target',
  'INIT_EXPORT'
]) must(renderer.includes(token), 'renderer contract: ' + token);

must(renderer.includes("value: '3840x2160'"), '4K preset exists');
must(renderer.includes('var FPS_PRESETS = [24, 30, 60, 90, 120]'), '120 FPS preset exists');

must(!/<script[^>]+\\bsrc=/i.test(renderer), 'renderer has no external script dependency');
must(!/<link[^>]+\\bhref=[^>]+\\.css/i.test(renderer), 'renderer has no external stylesheet dependency');

const jsSources = [...renderer.matchAll(/<script[^>]*type="text\\/js-source"[^>]*>([\\s\\S]*?)<\\/script>/gi)];
must(jsSources.length === 4, 'renderer has four isolated source blocks');
for (const [i, match] of jsSources.entries()) {
  try { new Function(match[1]); console.log('PASS source block parses: ' + (i + 1)); }
  catch (error) { throw new Error('source block ' + (i + 1) + ' syntax: ' + error.message); }
}

const samples = [...renderer.matchAll(/<script[^>]*type="text\\/plain"[^>]*>([\\s\\S]*?)<\\/script>/gi)];
must(samples.length >= 10, 'renderer keeps its built-in sample library');

const appScripts = [...renderer.matchAll(/<script(?![^>]*type="text\\/)([^>]*)>([\\s\\S]*?)<\\/script>/gi)];
must(appScripts.length === 1, 'renderer has one executable application block');
try {
  new Function(appScripts[0][2]);
  console.log('PASS renderer application JavaScript parses');
} catch (error) {
  throw new Error('renderer application JavaScript syntax: ' + error.message);
}

must(project.includes('../../code-motion-tamasrazim.html'), 'project page points to canonical renderer');
must(!project.includes('Mediabunny'), 'project page has no stale Mediabunny claim');
must(!media.includes('Mediabunny'), 'media descriptor has no stale Mediabunny dependency');
must(media.includes("containers: ['mp4', 'webm']"), 'media descriptor exposes current containers');
must(media.includes("videoCodecs: ['avc', 'vp9', 'vp8']"), 'media descriptor exposes current codec layers');
try {
  new Function(media);
  console.log('PASS media descriptor JavaScript parses');
} catch (error) {
  throw new Error('media descriptor syntax: ' + error.message);
}

console.log('Code → Motion V2 validation complete.');\n
import fs from 'node:fs';

const must = (ok, msg) => {
  if (!ok) throw new Error(msg);
  console.log('PASS', msg);
};

const renderer = fs.readFileSync('code-motion-tamasrazim.html', 'utf8');
const project = fs.readFileSync('projects/code-motion/index.html', 'utf8');
const media = fs.readFileSync('projects/code-motion/media-stack.js', 'utf8');

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
]) {
  must(renderer.includes(token), 'renderer contract: ' + token);
}

must(renderer.includes("value: '3840x2160'"), '4K preset exists');
must(renderer.includes('var FPS_PRESETS = [24, 30, 60, 90, 120]'), '120 FPS preset exists');

const scripts = [...renderer.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
const externalScripts = scripts.filter(([_, attrs]) => /\bsrc\s*=/.test(attrs));
must(externalScripts.length === 0, 'renderer has no external script dependency');
must(!/<link[^>]+\bhref\s*=\s*["'][^"']+\.css/i.test(renderer), 'renderer has no external stylesheet dependency');

const jsSources = scripts.filter(([_, attrs]) => /\btype=["']text\/js-source["']/i.test(attrs));
must(jsSources.length === 4, 'renderer has four source blocks');
for (const [i, match] of jsSources.entries()) {
  try {
    new Function(match[2]);
    console.log('PASS source block parses: ' + (i + 1));
  } catch (error) {
    throw new Error('source block ' + (i + 1) + ' syntax: ' + error.message);
  }
}

const samples = scripts.filter(([_, attrs]) => /\btype=["']text\/plain["']/i.test(attrs));
must(samples.length >= 10, 'renderer keeps its built-in sample library');

const executable = scripts.filter(([_, attrs]) => attrs.trim() === '');
must(executable.length === 1, 'renderer has one executable application block');
try {
  new Function(executable[0][2]);
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

console.log('Code → Motion V2 validation complete.');

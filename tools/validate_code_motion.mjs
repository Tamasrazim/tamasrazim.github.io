// What this does: Checks the Code Motion renderer and its modules for missing files or broken connections.

import fs from 'node:fs';

const must = (ok, msg) => {
  if (!ok) throw new Error(msg);
  console.log('PASS', msg);
};

const renderer = fs.readFileSync('projects/code-motion/renderer/index.html', 'utf8');
const project = fs.readFileSync('projects/code-motion/index.html', 'utf8');
const media = fs.readFileSync('projects/code-motion/renderer/media-stack.js', 'utf8');

must(renderer.includes('<title>TRILYVA — Tamasrazim</title>'), 'current TRILYVA title exists');

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
  'render-target'
]) {
  must(renderer.includes(token), 'renderer contract: ' + token);
}

must(renderer.includes("value: '3840x2160'"), '4K preset exists');
must(/var FPS_PRESETS = \[[^\]]*\b120\b[^\]]*\]/.test(renderer), '120 FPS preset exists');

const scripts = [...renderer.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
const externalScripts = scripts.filter(([_, attrs]) => {
  if (!/\bsrc\s*=/.test(attrs)) return false;
  const src = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] || '';
  const absolute = /^(?:https?:)?\/\//i.test(src);
  const sameOrigin = /^(?:https?:)?\/\/tamasrazim\.github\.io\//i.test(src);
  return absolute && !sameOrigin && !src.includes('googletagmanager.com/gtag/js');
});
must(externalScripts.length === 0, 'renderer has no external runtime script dependency');
const stylesheetLinks = [...renderer.matchAll(/<link[^>]+\bhref\s*=\s*["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi)];
const externalStylesheets = stylesheetLinks.filter(([, href]) =>
  /^(?:https?:)?\/\//i.test(href) &&
  !/^(?:https?:)?\/\/tamasrazim\.github\.io\//i.test(href)
);
must(externalStylesheets.length === 0, 'renderer has no external stylesheet dependency');

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
const applicationBlocks = executable.filter(([, , source]) =>
  source.includes("var SOFTWARE = 'TRILYVA — Tamasrazim';") &&
  source.includes('function loadProtectedLibraryModule()') &&
  source.includes('var APP_VERSION =')
);
must(applicationBlocks.length === 1, 'renderer has one executable TRILYVA application block');
try {
  new Function(applicationBlocks[0][2]);
  console.log('PASS renderer application JavaScript parses');
} catch (error) {
  throw new Error('renderer application JavaScript syntax: ' + error.message);
}

must(project.includes('https://tamasrazim.github.io/projects/trilyva/') && project.includes('target="/projects/trilyva/"'), 'legacy Code Motion route redirects to the official TRILYVA page');
must(!project.includes('Mediabunny'), 'project page has no stale Mediabunny claim');
must(!media.includes('Mediabunny'), 'media descriptor has no stale Mediabunny dependency');
must(media.includes("containers: ['mp4', 'webm']"), 'media descriptor exposes current containers');
must(media.includes("videoCodecs: ['avc', 'vp9', 'vp8']"), 'media descriptor exposes current codec layers');
must(!media.includes('installBatchLink')&&!media.includes('FLOWER BATCH'),'media descriptor does not inject the removed Flower Batch tab');
must(renderer.includes("const PRISM_LIBRARY_URL='../../code-to-eps/prism-library.json'")&&renderer.includes("const TRILYVA_PRISM_LIBRARY_URL='../../code-to-eps/prism-library.json'"),'both TRILYVA Prism loaders use the existing shared dataset');
const prismData = fs.readFileSync(path.join(root, 'projects/code-motion/renderer/library/prism-data.js'), 'utf8');
must(prismData.includes('../../../code-to-eps/prism-library.json')&&prismData.includes('export default data;'),'the protected Prism module exports its shared dataset');

try {
  new Function(media);
  console.log('PASS media descriptor JavaScript parses');
} catch (error) {
  throw new Error('media descriptor syntax: ' + error.message);
}

console.log('TRILYVA validation complete.');
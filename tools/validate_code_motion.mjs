import fs from 'node:fs';

const must = (ok, msg) => {
  if (!ok) throw new Error(msg);
  console.log('PASS', msg);
};

const renderer = fs.readFileSync('code-motion-tamasrazim.html', 'utf8');
const project = fs.readFileSync('projects/code-motion/index.html', 'utf8');
const media = fs.readFileSync('projects/code-motion/media-stack.js', 'utf8');

must(renderer.includes('<title>Animation Renderer — Tamasrazim</title>'), 'V2 title exists');
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
must(renderer.includes('<option value="120">120</option>'), '120 FPS preset exists');
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

console.log('Code → Motion V2 validation complete.');

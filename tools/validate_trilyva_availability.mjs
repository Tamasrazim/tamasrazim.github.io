// What this does: Confirms TRILYVA is out of maintenance, its routes are open, and the renderer can use its normal offline cache.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const must = (ok, message) => {
  if (!ok) throw new Error(message);
  console.log('PASS', message);
};

const routes = [
  'projects/trilyva/index.html',
  'projects/trilyva/tutorial.html',
  'projects/trilyva/updates/index.html',
  'projects/code-motion/index.html',
  'projects/code-motion/renderer/index.html',
  'projects/code-motion/batch/index.html',
  'projects/code-motion/legacy-renderer.html',
  'renderer/index.html',
  'code-motion-tamasrazim.html',
  'code-motion-tamasrazim2.html'
];

for (const file of routes) {
  const html = read(file);
  must(!html.includes('TRILYVA scheduled maintenance gate'), file + ' is open (no maintenance gate)');
  must(!/location\\.replace\\(["']\\/maintenance\\//.test(html), file + ' does not redirect to maintenance');
}

const renderer = read('projects/code-motion/renderer/index.html');
must(renderer.includes('<title>Trilyva — JavaScript Animation Renderer</title>') ||
     renderer.includes('<title>TRILYVA — Tamasrazim</title>') ||
     renderer.includes('<title>Trilyva — JavaScript Animation Renderer</title>'),
     'canonical renderer title is present');
must(renderer.includes('function renderFrame('), 'renderer keeps its frame-rendering contract');

const worker = read('projects/code-motion/renderer/sw.js');
must(/const CACHE = 'tamasrazim-trilyva-pwa-v156'/.test(worker), 'offline cache version is refreshed');
must(!worker.includes('MAINTENANCE_ENDS_AT') && !worker.includes("'/maintenance/"), 'service worker no longer forces maintenance navigation');
new Function(worker);
must(true, 'service worker JavaScript parses');

const maintenance = read('maintenance/index.html');
must(maintenance.includes('location.replace("/projects/trilyva/")'), 'old maintenance URL redirects to the live TRILYVA page');

const siteValidation = spawnSync(process.execPath, ['tools/validate_site.mjs'], {
  cwd: root,
  stdio: 'inherit'
});
if (siteValidation.error) throw siteValidation.error;
if (siteValidation.status !== 0) process.exit(siteValidation.status ?? 1);

console.log('TRILYVA availability validation complete.');

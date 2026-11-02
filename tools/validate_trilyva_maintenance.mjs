// What this does: Validates the temporary TRILYVA maintenance experience and automatically restores the full renderer checks after the scheduled window.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const must = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log('PASS', message);
};

const END_ISO = '2026-11-05T05:28:00+06:00';
const END_AT = Date.parse(END_ISO);

if (Date.now() < END_AT) {
  const maintenance = read('maintenance/index.html');
  const startMatch = maintenance.match(/var START_AT = Date\\.parse\\("([^"]+)"\\)/);
  const endMatch = maintenance.match(/var END_AT = Date\\.parse\\("([^"]+)"\\)/);
  must(Boolean(startMatch && endMatch), 'maintenance page declares its scheduled start and end');
  const startAt = Date.parse(startMatch[1]);
  const endAt = Date.parse(endMatch[1]);

  must(endMatch[1] === END_ISO, 'maintenance countdown uses the scheduled Bangladesh return time');
  must(endAt - startAt === 48 * 60 * 60 * 1000, 'maintenance duration is exactly 48 hours');
  must(maintenance.includes('clock-wrap') && maintenance.includes('clockTicks') && maintenance.includes('clockNumbers'), 'maintenance page contains the large analog clock face');
  must(maintenance.includes('TIME UNTIL NORMAL ACCESS RETURNS') && maintenance.includes('progressRing'), 'maintenance page contains the live countdown and progress ring');
  must(maintenance.includes('Asia/Dhaka') && maintenance.includes('DHAKA / UTC+06'), 'clock displays Bangladesh local time');
  must(maintenance.includes('NORMAL ACCESS RESUMES AUTOMATICALLY'), 'maintenance page explains automatic restoration');

  const pageScripts = [...maintenance.matchAll(/<script>([\\s\\S]*?)<\\/script>/gi)].map(match => match[1]);
  must(pageScripts.length > 0, 'maintenance page has its live clock script');
  for (const [index, source] of pageScripts.entries()) {
    new Function(source);
    must(true, 'maintenance page script parses: ' + (index + 1));
  }

  const routeFiles = [
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

  for (const file of routeFiles) {
    const html = read(file);
    const marker = '<!-- TRILYVA scheduled maintenance gate';
    const markerIndex = html.indexOf(marker);
    must(markerIndex >= 0 && markerIndex < html.indexOf('</head>'), file + ' blocks the route before page content loads');
    must(html.includes(END_ISO), file + ' uses the same maintenance expiry');

    const gateScript = html.slice(markerIndex).match(/<script>([\\s\\S]*?)<\\/script>/i)?.[1];
    must(Boolean(gateScript), file + ' includes its route guard script');
    new Function(gateScript);
    must(true, file + ' route guard JavaScript parses');
  }

  const serviceWorker = read('projects/code-motion/renderer/sw.js');
  must(/const CACHE = 'tamasrazim-trilyva-pwa-v\\d+'/.test(serviceWorker), 'renderer service worker cache version is refreshed');
  must(serviceWorker.includes(END_ISO) && serviceWorker.includes('client.navigate(destination)'), 'service worker redirects existing renderer tabs during maintenance');
  new Function(serviceWorker);
  must(true, 'renderer service worker JavaScript parses');

  const home = read('index.html');
  must(!home.includes('TRILYVA scheduled maintenance gate'), 'main Tamasrazim homepage remains available');
  console.log('TRILYVA maintenance validation complete.');
  process.exit(0);
}

for (const validator of ['tools/validate_site.mjs', 'tools/validate_code_motion.mjs', 'tools/validate_trilyva_renderers.mjs']) {
  const result = spawnSync(process.execPath, [validator], { cwd: ROOT, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('Full TRILYVA validation resumed after maintenance.');

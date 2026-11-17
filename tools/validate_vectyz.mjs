import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'projects', 'vectyz');
function read(name) {
  const file = join(root, name);
  if (!existsSync(file)) throw new Error('Missing Vectyz asset: ' + name);
  return readFileSync(file, 'utf8');
}
function must(condition, message) {
  if (!condition) throw new Error(message);
  console.log('PASS', message);
}

const html = read('index.html');
const css = read('styles.css');
const app = read('app.js');
const db = read('db.js');
const engine = read('vector-engine.js');
const worker = read('vector-worker.js');
const sw = read('sw.js');
const manifest = JSON.parse(read('manifest.webmanifest'));

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
must(duplicateIds.length === 0, 'Vectyz workspace has unique DOM ids');

for (const id of [
  'open-button', 'file-input', 'dropzone', 'preview-panel', 'preview-stage',
  'preview-image', 'compare-image', 'compare-range', 'compare-divider',
  'zoom-level', 'cancel-process', 'preset-select', 'vector-settings',
  'raster-settings', 'library-panel', 'app-status',
]) {
  must(ids.includes(id), 'Vectyz workspace exposes #' + id);
}

must(html.includes('data-view="compare"') && html.includes('data-preview-action="one-to-one"'),
  'Vectyz exposes comparison and native-pixel preview controls');
must(html.includes('id="compare-control"') && html.includes('id="compare-range"'),
  'Vectyz includes an adjustable before/after reveal');
must(app.includes('function updateCompareReveal()') && app.includes('function cancelVectorization()'),
  'Vectyz wires comparison and cancellation interactions');
must(app.includes('preset-select') && app.includes('photo:') && app.includes('illustration:'),
  'Vectyz provides editable reconstruction presets');
must(app.includes("new Worker(new URL('./vector-worker.js'") && worker.includes('vectorizeImageData'),
  'Vectyz processes vectorization in a background worker');
must(db.includes('indexedDB.open') && db.includes("createObjectStore('projects'"),
  'Vectyz persists projects in IndexedDB');
must(engine.includes('Indexing color regions') && engine.includes('function traceClass'),
  'Vectyz uses the indexed browser contour engine');
must(css.includes('.preview-tools') && css.includes('.compare-control') && css.includes('@media(max-width:860px)'),
  'Vectyz styles comparison tools and responsive layouts');
must(sw.includes("const CACHE = 'vectyz-shell-v4'"),
  'Vectyz service worker uses the current offline cache version');
must(manifest.name && manifest.short_name, 'Vectyz PWA manifest is valid');

console.log('Vectyz browser workspace validation complete.');

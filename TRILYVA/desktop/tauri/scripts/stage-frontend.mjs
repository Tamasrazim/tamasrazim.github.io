// Stages the canonical TRILYVA renderer before the Tauri CLI validates frontendDist.
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const repositoryRoot = path.resolve(projectRoot, '../../..');
const rendererSource = path.join(repositoryRoot, 'projects', 'code-motion', 'renderer');
const frontendTarget = path.resolve(projectRoot, '../shell');
const requiredEntry = path.join(rendererSource, 'index.html');

if (!fs.existsSync(requiredEntry)) {
  throw new Error('Canonical TRILYVA renderer is missing: ' + requiredEntry);
}

fs.rmSync(frontendTarget, { recursive: true, force: true });
fs.mkdirSync(frontendTarget, { recursive: true });
fs.cpSync(rendererSource, frontendTarget, { recursive: true, force: true });

if (!fs.existsSync(path.join(frontendTarget, 'index.html'))) {
  throw new Error('Could not stage TRILYVA frontend at ' + frontendTarget);
}

console.log('Staged TRILYVA frontend: ' + frontendTarget);

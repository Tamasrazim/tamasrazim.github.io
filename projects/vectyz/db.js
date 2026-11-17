const DB_NAME = 'vectyz-local';
const DB_VERSION = 1;
let databasePromise;

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function () {
      const db = request.result;
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('results')) db.createObjectStore('results', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('presets')) db.createObjectStore('presets', { keyPath: 'name' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local project storage.'));
    request.onblocked = () => reject(new Error('Close other Vectyz tabs to finish the local database upgrade.'));
  });
  return databasePromise;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
  });
}

export async function saveProject(project, sourceBlob, resultBlob) {
  const db = await openDatabase();
  const transaction = db.transaction(['projects', 'assets', 'results'], 'readwrite');
  transaction.objectStore('projects').put(project);
  transaction.objectStore('assets').put({ key: project.id + ':source', blob: sourceBlob });
  if (resultBlob) transaction.objectStore('results').put({ key: project.id + ':result', blob: resultBlob });
  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('Could not save project.'));
    transaction.onabort = () => reject(transaction.error || new Error('Project save was cancelled.'));
  });
}

export async function listProjects() {
  const db = await openDatabase();
  const tx = db.transaction('projects', 'readonly');
  const projects = await requestResult(tx.objectStore('projects').getAll());
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id) {
  const db = await openDatabase();
  const tx = db.transaction(['projects', 'assets', 'results'], 'readonly');
  const [project, source, result] = await Promise.all([
    requestResult(tx.objectStore('projects').get(id)),
    requestResult(tx.objectStore('assets').get(id + ':source')),
    requestResult(tx.objectStore('results').get(id + ':result')),
  ]);
  if (!project || !source) return null;
  return { project, source: source.blob, result: result ? result.blob : null };
}

export async function deleteProject(id) {
  const db = await openDatabase();
  const tx = db.transaction(['projects', 'assets', 'results'], 'readwrite');
  tx.objectStore('projects').delete(id);
  tx.objectStore('assets').delete(id + ':source');
  tx.objectStore('results').delete(id + ':result');
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Could not delete project.'));
  });
}
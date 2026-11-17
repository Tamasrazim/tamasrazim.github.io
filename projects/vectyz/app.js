import { deleteProject, getProject, listProjects, saveProject } from './db.js';

const $ = (id) => document.getElementById(id);
const state = {
  mode: 'vectorize',
  file: null,
  sourceUrl: null,
  resultUrl: null,
  resultBlob: null,
  worker: null,
  jobId: 0,
  view: 'vector',
  projectId: null,
  rasterBlob: null,
};

const defaultSettings = {
  colors: 16,
  detail: 1,
  minArea: 2,
  curve: 'smooth',
  cornerAngle: 65,
  alphaBins: 1,
  transparentThreshold: 4,
};

function readSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem('vectyz-settings') || '{}') };
  } catch {
    return { ...defaultSettings };
  }
}

function getSettings() {
  return {
    colors: Number($('colors').value),
    detail: Number($('detail').value),
    minArea: Number($('min-area').value),
    curve: $('curve').value,
    cornerAngle: Number($('corner-angle').value),
    alphaBins: Number($('alpha-bins').value),
    transparentThreshold: Number($('threshold').value),
  };
}

function applySettings(settings) {
  $('colors').value = settings.colors;
  $('detail').value = settings.detail;
  $('min-area').value = settings.minArea;
  $('curve').value = settings.curve;
  $('corner-angle').value = settings.cornerAngle;
  $('alpha-bins').value = settings.alphaBins;
  $('threshold').value = settings.transparentThreshold;
  updateSettingLabels();
}

function updateSettingLabels() {
  $('colors-value').textContent = $('colors').value;
  $('detail-value').textContent = Number($('detail').value).toFixed(2);
  $('min-area-value').textContent = $('min-area').value + ' px²';
  $('corner-angle-value').textContent = $('corner-angle').value + '°';
  $('alpha-bins-value').textContent = $('alpha-bins').value;
  $('threshold-value').textContent = $('threshold').value;
  localStorage.setItem('vectyz-settings', JSON.stringify(getSettings()));
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}

function notify(message, type = 'info') {
  const element = $('message');
  element.textContent = message;
  element.className = type === 'error' ? 'message error' : 'message';
  element.hidden = false;
}

function clearMessage() {
  $('message').hidden = true;
  $('message').textContent = '';
}

function revokePreviewUrls() {
  if (state.sourceUrl) URL.revokeObjectURL(state.sourceUrl);
  if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
  state.sourceUrl = null;
  state.resultUrl = null;
}

function resetWorkspace() {
  state.jobId += 1;
  revokePreviewUrls();
  if (state.worker) state.worker.terminate();
  state.worker = null;
  state.file = null;
  state.resultBlob = null;
  state.rasterBlob = null;
  state.projectId = null;
  $('file-input').value = '';
  $('dropzone').hidden = false;
  $('preview-panel').hidden = true;
  $('progress-panel').hidden = true;
  $('stats-panel').hidden = true;
  $('process-button').disabled = true;
  $('download-button').disabled = true;
  $('rasterize-button').disabled = true;
  $('raster-download-button').disabled = true;
  $('preview-image').removeAttribute('src');
  $('preview-image').style.maxWidth = '';
  $('library-panel').hidden = true;
  $('library-toggle').classList.remove('active');
  clearMessage();
}

function updateModeUi() {
  const vector = state.mode === 'vectorize';
  document.querySelectorAll('.rail-item[data-mode]').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === state.mode);
  });
  $('mode-eyebrow').textContent = vector ? 'RASTER TO VECTOR' : 'VECTOR TO RASTER';
  $('page-title').textContent = vector ? 'Vectorize image' : 'Rasterize SVG';
  $('page-description').textContent = vector
    ? 'Convert pixels into editable paths. Processing stays on this device.'
    : 'Render an SVG into a bitmap. Scripts and external resources are stripped.';
  $('file-input').accept = vector
    ? 'image/png,image/jpeg,image/webp,image/gif,image/bmp,.png,.jpg,.jpeg,.webp,.gif,.bmp'
    : '.svg,image/svg+xml';
  $('drop-formats').textContent = vector ? 'PNG · JPEG · WEBP · GIF · BMP' : 'SVG';
  $('vector-settings').hidden = !vector;
  $('raster-settings').hidden = vector;
  $('settings-title').textContent = vector ? 'Vector settings' : 'Raster settings';
  $('vector-view-switch').hidden = !vector;
  $('raster-badge').hidden = vector;
  $('library-panel').hidden = true;
  $('library-toggle').classList.remove('active');
}

function setMode(mode) {
  if (!['vectorize', 'rasterize'].includes(mode)) return;
  if (state.mode !== mode || !$('library-panel').hidden) resetWorkspace();
  state.mode = mode;
  updateModeUi();
}

function setPreview(blob, view) {
  if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
  state.resultUrl = blob ? URL.createObjectURL(blob) : null;
  state.view = view;
  showPreviewView();
}

function showPreviewView() {
  if (state.mode === 'rasterize') {
    if (state.resultUrl) {
      $('preview-image').src = state.resultUrl;
      $('empty-result').hidden = true;
      $('preview-caption').textContent = 'Raster output';
    } else {
      $('preview-image').removeAttribute('src');
      $('empty-result').textContent = 'SVG source is stored locally and will be sanitized before rendering.';
      $('empty-result').hidden = false;
      $('preview-caption').textContent = 'SVG source';
    }
    $('vector-view-switch').hidden = true;
    return;
  }
  const useOriginal = state.view === 'original' || !state.resultUrl;
  $('empty-result').hidden = true;
  $('preview-image').src = useOriginal ? state.sourceUrl : state.resultUrl;
  $('preview-caption').textContent = useOriginal ? 'Original image' : 'Vector preview';
  document.querySelectorAll('.view-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === state.view);
  });
}

async function readDimensions(file) {
  const bitmap = await createImageBitmap(file);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

async function handleFile(file) {
  if (!file) return;
  clearMessage();
  const extension = file.name.toLowerCase().split('.').pop();
  const isSvg = file.type === 'image/svg+xml' || extension === 'svg';
  const supportedRaster = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(extension);
  if (state.mode === 'vectorize' && (isSvg || !supportedRaster || (file.type && !file.type.startsWith('image/') && file.type !== 'application/octet-stream'))) {
    notify('Choose a supported raster image: PNG, JPEG, WebP, GIF or BMP.', 'error');
    return;
  }
  if (file.size > 200 * 1024 * 1024) {
    notify('This file exceeds the 200 MB browser import limit.', 'error');
    return;
  }
  if (state.mode === 'rasterize' && !isSvg) {
    notify('Rasterize mode accepts SVG files only.', 'error');
    return;
  }
  resetWorkspace();
  state.file = file;
  state.sourceUrl = URL.createObjectURL(file);
  $('dropzone').hidden = true;
  $('preview-panel').hidden = false;
  $('asset-name').textContent = file.name;
  $('asset-meta').textContent = formatBytes(file.size);
  $('preview-dimensions').textContent = '';
  if (state.mode === 'vectorize') {
    $('preview-image').src = state.sourceUrl;
    $('preview-caption').textContent = 'Original image';
    try {
      const dimensions = await readDimensions(file);
      if (state.file !== file) return;
      $('asset-meta').textContent = dimensions.width + ' × ' + dimensions.height + ' · ' + formatBytes(file.size);
      $('preview-dimensions').textContent = dimensions.width + ' × ' + dimensions.height;
      if (dimensions.width * dimensions.height > 12000000) {
        notify('This build supports images up to 12 megapixels. Choose a smaller image before vectorizing.', 'error');
        resetWorkspace();
        return;
      }
    } catch (error) {
      notify('The browser could not decode this image: ' + error.message, 'error');
      resetWorkspace();
      return;
    }
    $('process-button').disabled = false;
  } else {
    $('preview-image').removeAttribute('src');
    $('empty-result').textContent = 'SVG source is stored locally and will be sanitized before rendering.';
    $('empty-result').hidden = false;
    $('preview-caption').textContent = 'SVG source';
    $('rasterize-button').disabled = false;
  }
}

function updateProgress(phase, progress) {
  $('progress-phase').textContent = phase;
  const value = Math.max(0, Math.min(100, Math.round(progress * 100)));
  $('progress-value').textContent = value + '%';
  $('progress-fill').style.width = value + '%';
}

function showStats(stats, blobSize) {
  $('stats-panel').hidden = false;
  $('stat-colors').textContent = stats.colorsUsed ?? '—';
  $('stat-paths').textContent = stats.paths ?? '—';
  $('stat-time').textContent = stats.elapsedMs != null ? stats.elapsedMs.toFixed(0) + ' ms' : '—';
  $('stat-size').textContent = formatBytes(blobSize);
}

async function saveCurrentProject(resultBlob, details) {
  const id = state.projectId || crypto.randomUUID();
  state.projectId = id;
  const now = Date.now();
  const previous = (await getProject(id))?.project;
  const project = {
    id,
    name: state.file.name,
    type: state.mode,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    sourceSize: state.file.size,
    resultSize: resultBlob.size,
    settings: state.mode === 'vectorize' ? getSettings() : null,
    details: details || null,
  };
  await saveProject(project, state.file, resultBlob);
  await renderLibrary();
  return project;
}

async function runVectorization() {
  if (!state.file || state.mode !== 'vectorize') return;
  clearMessage();
  $('process-button').disabled = true;
  $('download-button').disabled = true;
  $('progress-panel').hidden = false;
  $('stats-panel').hidden = true;
  updateProgress('Starting background worker', 0.02);
  const jobId = ++state.jobId;
  const worker = new Worker(new URL('./vector-worker.js', import.meta.url), { type: 'module' });
  state.worker = worker;
  worker.onmessage = async function (event) {
    const message = event.data || {};
    if (message.jobId !== jobId || jobId !== state.jobId) return;
    if (message.type === 'progress') {
      updateProgress(message.phase, message.progress);
      $('progress-note').textContent = message.total
        ? 'Tracing color region ' + message.current + ' of ' + message.total + '.'
        : 'Processing locally in a background worker.';
      return;
    }
    worker.terminate();
    state.worker = null;
    $('progress-panel').hidden = true;
    $('process-button').disabled = false;
    if (message.type === 'error') {
      notify(message.message, 'error');
      return;
    }
    const svgBlob = new Blob([message.result.svg], { type: 'image/svg+xml;charset=utf-8' });
    state.resultBlob = svgBlob;
    setPreview(svgBlob, 'vector');
    $('download-button').disabled = false;
    $('preview-panel').hidden = false;
    $('preview-dimensions').textContent = message.result.stats.width + ' × ' + message.result.stats.height;
    showStats(message.result.stats, svgBlob.size);
    try {
      await saveCurrentProject(svgBlob, message.result.stats);
      notify('Vectorization complete. The SVG and source image are saved in this browser.');
    } catch (error) {
      notify('Vectorization complete, but local project saving failed: ' + error.message, 'error');
    }
  };
  worker.onerror = function (event) {
    if (jobId !== state.jobId) return;
    worker.terminate();
    state.worker = null;
    $('progress-panel').hidden = true;
    $('process-button').disabled = false;
    notify(event.message || 'The vector worker stopped unexpectedly.', 'error');
  };
  worker.postMessage({ type: 'vectorize', jobId, file: state.file, settings: getSettings() });
}

function sanitizeSvgText(source) {
  const documentNode = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (documentNode.querySelector('parsererror')) throw new Error('The SVG file is malformed.');
  const root = documentNode.documentElement;
  if (!root || root.localName.toLowerCase() !== 'svg') throw new Error('The file does not contain an SVG root element.');
  documentNode.querySelectorAll('script,foreignObject,iframe,object,embed,link,style,image,audio,video,canvas,animate,animateMotion,animateTransform,set').forEach((node) => node.remove());
  for (const element of documentNode.querySelectorAll('*')) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith('on') || name === 'src' || name === 'xml:base') {
        element.removeAttribute(attribute.name);
      } else if ((name === 'href' || name.endsWith(':href')) && value && !value.startsWith('#')) {
        element.removeAttribute(attribute.name);
      } else {
        const urlReferences = Array.from(value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi));
        const externalUrl = urlReferences.some((match) => !match[2].trim().startsWith('#'));
        if (externalUrl || /@import|https?:\/\//i.test(value)) element.removeAttribute(attribute.name);
      }
    }
  }
  return new XMLSerializer().serializeToString(root);
}

function svgDimensions(svgText) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = doc.documentElement;
  const viewBox = (root.getAttribute('viewBox') || '').trim().split(/[ ,]+/).map(Number);
  const width = Number.parseFloat(root.getAttribute('width')) || (viewBox.length === 4 ? viewBox[2] : 1000);
  const height = Number.parseFloat(root.getAttribute('height')) || (viewBox.length === 4 ? viewBox[3] : 1000);
  return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
}

function blobFromCanvas(canvas, mimeType) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The browser could not encode the raster output.')), mimeType, 0.94);
  });
}

async function runRasterization() {
  if (!state.file || state.mode !== 'rasterize') return;
  clearMessage();
  $('rasterize-button').disabled = true;
  $('progress-panel').hidden = false;
  updateProgress('Reading SVG', 0.08);
  try {
    const svgText = sanitizeSvgText(await state.file.text());
    const dimensions = svgDimensions(svgText);
    const imageUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
    try {
      const image = new Image();
      image.decoding = 'async';
      image.src = imageUrl;
      await image.decode();
      let width = Number($('raster-width').value) || dimensions.width;
      let height = Number($('raster-height').value) || dimensions.height;
      if ($('keep-ratio').checked) height = Math.max(1, Math.round(width * (image.naturalHeight / image.naturalWidth)));
      if (width > 16000 || height > 16000 || width * height > 40000000) {
        throw new Error('Requested raster dimensions are too large. Keep the output below 40 megapixels and 16,000 pixels per side.');
      }
      $('raster-height').value = height;
      updateProgress('Rendering SVG', 0.52);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas rendering is unavailable in this browser.');
      if ($('raster-format').value === 'image/jpeg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(image, 0, 0, width, height);
      updateProgress('Encoding raster output', 0.84);
      const rasterBlob = await blobFromCanvas(canvas, $('raster-format').value);
      state.rasterBlob = rasterBlob;
      setPreview(rasterBlob, 'raster');
      $('raster-download-button').disabled = false;
      $('preview-panel').hidden = false;
      $('asset-meta').textContent = width + ' × ' + height + ' · ' + formatBytes(state.file.size);
      $('preview-dimensions').textContent = width + ' × ' + height;
      showStats({ colorsUsed: '—', paths: '—', elapsedMs: 0 }, rasterBlob.size);
      try {
        await saveCurrentProject(rasterBlob, { width, height, format: rasterBlob.type });
        notify('Rasterization complete. The output is saved in this browser.');
      } catch (error) {
        notify('Rasterization complete, but local project saving failed: ' + error.message, 'error');
      }
      canvas.width = 1;
      canvas.height = 1;
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  } catch (error) {
    notify(error.message || 'Rasterization failed.', 'error');
  } finally {
    $('progress-panel').hidden = true;
    $('rasterize-button').disabled = false;
  }
}

function downloadBlob(blob, filename) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function filenameWithExtension(name, extension) {
  const base = name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_');
  return (base || 'vectyz-output') + extension;
}

async function openProject(id) {
  try {
    const saved = await getProject(id);
    if (!saved) return;
    resetWorkspace();
    setMode(saved.project.type === 'rasterize' ? 'rasterize' : 'vectorize');
    state.projectId = id;
    state.file = new File([saved.source], saved.project.name, { type: saved.source.type || 'application/octet-stream' });
    state.sourceUrl = URL.createObjectURL(state.file);
    state.resultBlob = saved.result;
    state.rasterBlob = saved.project.type === 'rasterize' ? saved.result : null;
    $('dropzone').hidden = true;
    $('preview-panel').hidden = false;
    $('asset-name').textContent = saved.project.name;
    $('asset-meta').textContent = formatBytes(state.file.size);
    if (saved.project.type === 'vectorize') {
      applySettings(saved.project.settings || readSettings());
      $('process-button').disabled = false;
      $('download-button').disabled = !saved.result;
      if (saved.result) {
        state.resultUrl = URL.createObjectURL(saved.result);
        state.view = 'vector';
      } else {
        state.view = 'original';
      }
      showPreviewView();
      if (saved.project.details) {
        $('preview-dimensions').textContent = saved.project.details.width + ' × ' + saved.project.details.height;
        showStats(saved.project.details, saved.project.resultSize);
      }
    } else {
      $('rasterize-button').disabled = false;
      $('raster-download-button').disabled = !saved.result;
      if (saved.result) {
        state.resultUrl = URL.createObjectURL(saved.result);
        showPreviewView();
      } else {
        showPreviewView();
      }
    }
    $('library-panel').hidden = true;
    $('library-toggle').classList.remove('active');
    clearMessage();
  } catch (error) {
    notify('Could not open saved project: ' + error.message, 'error');
  }
}

async function renderLibrary() {
  const projects = await listProjects();
  $('library-count').textContent = projects.length + (projects.length === 1 ? ' project' : ' projects');
  const list = $('library-list');
  list.replaceChildren();
  if (!projects.length) {
    const empty = document.createElement('div');
    empty.className = 'library-empty';
    empty.textContent = 'No saved projects yet. Process an image to save it here.';
    list.append(empty);
    return;
  }
  for (const project of projects) {
    const row = document.createElement('div');
    row.className = 'library-row';
    const open = document.createElement('button');
    open.className = 'project-open';
    open.type = 'button';
    const name = document.createElement('span');
    name.className = 'project-name';
    name.textContent = project.name;
    const meta = document.createElement('span');
    meta.className = 'project-meta';
    meta.textContent = (project.type === 'rasterize' ? 'SVG rasterization' : 'Vectorization') + ' · ' + formatDate(project.updatedAt) + ' · ' + formatBytes(project.resultSize);
    open.append(name, meta);
    open.addEventListener('click', () => openProject(project.id));
    const remove = document.createElement('button');
    remove.className = 'project-delete';
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.addEventListener('click', async () => {
      await deleteProject(project.id);
      if (state.projectId === project.id) {
        resetWorkspace();
        showLibrary();
      } else {
        await renderLibrary();
      }
      await updateStorageLabel();
    });
    row.append(open, remove);
    list.append(row);
  }
}

async function updateStorageLabel() {
  if (!navigator.storage || !navigator.storage.estimate) return;
  try {
    const usage = await navigator.storage.estimate();
    $('storage-label').textContent = formatBytes(usage.usage || 0) + ' stored';
  } catch { /* Storage estimate is optional. */ }
}

async function enablePersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) {
    notify('Persistent storage is not available in this browser.', 'error');
    return;
  }
  const granted = await navigator.storage.persist();
  notify(granted ? 'The browser will protect Vectyz data from automatic storage cleanup.' : 'The browser did not grant persistent storage. Saved projects remain subject to browser storage policy.');
}

function showLibrary() {
  $('library-panel').hidden = false;
  $('dropzone').hidden = true;
  $('preview-panel').hidden = true;
  $('progress-panel').hidden = true;
  $('stats-panel').hidden = true;
  document.querySelectorAll('.rail-item[data-mode]').forEach((button) => button.classList.remove('active'));
  $('library-toggle').classList.add('active');
  renderLibrary();
}

function bindEvents() {
  $('browse-button').addEventListener('click', () => $('file-input').click());
  $('open-button').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', (event) => handleFile(event.target.files[0]));
  $('clear-button').addEventListener('click', resetWorkspace);
  $('process-button').addEventListener('click', runVectorization);
  $('download-button').addEventListener('click', () => downloadBlob(state.resultBlob, filenameWithExtension(state.file?.name || 'vectyz', '.svg')));
  $('rasterize-button').addEventListener('click', runRasterization);
  $('raster-download-button').addEventListener('click', () => downloadBlob(state.rasterBlob, filenameWithExtension(state.file?.name || 'vectyz', state.rasterBlob?.type === 'image/jpeg' ? '.jpg' : state.rasterBlob?.type === 'image/webp' ? '.webp' : '.png')));
  $('persist-button').addEventListener('click', enablePersistentStorage);
  $('reset-settings').addEventListener('click', () => applySettings(defaultSettings));
  $('library-toggle').addEventListener('click', showLibrary);
  document.querySelectorAll('.rail-item[data-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
  document.querySelectorAll('.view-button').forEach((button) => button.addEventListener('click', () => {
    state.view = button.dataset.view;
    showPreviewView();
  }));
  ['colors', 'detail', 'min-area', 'corner-angle', 'alpha-bins', 'threshold', 'curve'].forEach((id) => $(id).addEventListener('input', updateSettingLabels));
  $('keep-ratio').addEventListener('change', () => { $('raster-height').disabled = $('keep-ratio').checked; });
  $('raster-width').addEventListener('input', () => {
    if ($('keep-ratio').checked) $('raster-height').dataset.edited = 'false';
  });
  const dropzone = $('dropzone');
  ['dragenter', 'dragover'].forEach((name) => dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach((name) => dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
  }));
  dropzone.addEventListener('drop', (event) => handleFile(event.dataTransfer.files[0]));
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
      event.preventDefault();
      $('file-input').click();
    }
  });
}

async function initialize() {
  applySettings(readSettings());
  bindEvents();
  updateModeUi();
  $('raster-height').disabled = true;
  await renderLibrary();
  await updateStorageLabel();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

initialize().catch((error) => notify(error.message || 'Vectyz could not initialize local storage.', 'error'));
import { vectorizeImageData } from './vector-engine.js';

self.onmessage = async function (event) {
  const message = event.data || {};
  if (message.type !== 'vectorize') return;
  const jobId = message.jobId;
  let bitmap;
  try {
    bitmap = await createImageBitmap(message.file);
    const width = bitmap.width;
    const height = bitmap.height;
    const pixels = width * height;
    if (!Number.isSafeInteger(pixels) || pixels > 12000000) {
      throw new Error('This image is too large for the browser engine (maximum 12 megapixels in this build).');
    }
    self.postMessage({ type: 'progress', jobId, phase: 'Decoding image', progress: 0.04 });
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('OffscreenCanvas 2D rendering is unavailable in this browser.');
    context.drawImage(bitmap, 0, 0);
    const imageData = context.getImageData(0, 0, width, height);
    bitmap.close();
    bitmap = null;
    const result = vectorizeImageData(imageData, message.settings, function (progress) {
      self.postMessage({ type: 'progress', jobId, ...progress });
    });
    self.postMessage({ type: 'complete', jobId, result });
  } catch (error) {
    self.postMessage({ type: 'error', jobId, message: error && error.message ? error.message : String(error) });
  } finally {
    if (bitmap) bitmap.close();
  }
};
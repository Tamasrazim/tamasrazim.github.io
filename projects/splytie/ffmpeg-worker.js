/* Same-origin FFmpeg worker bridge for ffmpeg.wasm 0.12.x.
   The worker stays on the Splytie origin; the core module is loaded from jsDelivr. */
const TYPES = {
  LOAD:"LOAD", EXEC:"EXEC", FFPROBE:"FFPROBE", WRITE_FILE:"WRITE_FILE",
  READ_FILE:"READ_FILE", DELETE_FILE:"DELETE_FILE", RENAME:"RENAME",
  CREATE_DIR:"CREATE_DIR", LIST_DIR:"LIST_DIR", DELETE_DIR:"DELETE_DIR",
  ERROR:"ERROR", LOG:"LOG", PROGRESS:"PROGRESS", MOUNT:"MOUNT", UNMOUNT:"UNMOUNT"
};
let core = null;

function sendError(id, error) {
  self.postMessage({ id, type: TYPES.ERROR, data: error && error.toString ? error.toString() : String(error) });
}
async function loadCore(config) {
  const coreURL = config.coreURL;
  if (!coreURL) throw new Error("Missing FFmpeg core URL.");
  const wasmURL = config.wasmURL || coreURL.replace(/\.js(?:\?.*)?$/i, ".wasm");
  const workerURL = config.workerURL || coreURL.replace(/\.js(?:\?.*)?$/i, ".worker.js");
  const module = await import(coreURL);
  const factory = module.default || module.createFFmpegCore;
  if (typeof factory !== "function") throw new Error("FFmpeg core factory was not found.");
  core = await factory({ mainScriptUrlOrBlob: coreURL + "#" + btoa(JSON.stringify({ wasmURL, workerURL })) });
  core.setLogger((data) => self.postMessage({ type: TYPES.LOG, data }));
  core.setProgress((data) => self.postMessage({ type: TYPES.PROGRESS, data }));
  return true;
}
function execute(data, useProbe) {
  core.setTimeout(Number.isFinite(data.timeout) ? data.timeout : -1);
  if (useProbe) core.ffprobe(...data.args);
  else core.exec(...data.args);
  const result = core.ret;
  core.reset();
  return result;
}
async function onMessage(event) {
  const message = event.data || {}, id = message.id, type = message.type, data = message.data || {};
  let result;
  try {
    if (type !== TYPES.LOAD && !core) throw new Error("FFmpeg is not loaded.");
    switch (type) {
      case TYPES.LOAD: result = await loadCore(data); break;
      case TYPES.EXEC: result = execute(data, false); break;
      case TYPES.FFPROBE: result = execute(data, true); break;
      case TYPES.WRITE_FILE: core.FS.writeFile(data.path, data.data); result = true; break;
      case TYPES.READ_FILE: result = core.FS.readFile(data.path, data.encoding ? { encoding: data.encoding } : undefined); break;
      case TYPES.DELETE_FILE: core.FS.unlink(data.path); result = true; break;
      case TYPES.RENAME: core.FS.rename(data.oldPath, data.newPath); result = true; break;
      case TYPES.CREATE_DIR: core.FS.mkdir(data.path); result = true; break;
      case TYPES.LIST_DIR:
        result = core.FS.readdir(data.path).map((name) => {
          const stat = core.FS.stat(data.path.replace(/\/$/, "") + "/" + name);
          return { name, isDir: core.FS.isDir(stat.mode) };
        });
        break;
      case TYPES.DELETE_DIR: core.FS.rmdir(data.path); result = true; break;
      case TYPES.MOUNT: {
        const fs = core.FS.filesystems[data.fsType];
        if (!fs) throw new Error("Unsupported filesystem: " + data.fsType);
        core.FS.mount(fs, data.options, data.mountPoint); result = true; break;
      }
      case TYPES.UNMOUNT: core.FS.unmount(data.mountPoint); result = true; break;
      default: throw new Error("Unknown FFmpeg worker message: " + type);
    }
    const transfer = result instanceof Uint8Array ? [result.buffer] : [];
    self.postMessage({ id, type, data: result }, transfer);
  } catch (error) { sendError(id, error); }
}
self.onmessage = onMessage;

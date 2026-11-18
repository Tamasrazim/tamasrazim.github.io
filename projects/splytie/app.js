const $ = (selector) => document.querySelector(selector);

const state = {
  files: [], profiles: [30], mode: "fast", includeLast: true,
  running: false, cancelled: false, ffmpeg: null, JSZip: null,
  zipUrl: null, previewUrl: null, currentTask: 0, totalTasks: 0, taskProgress: 0
};

const els = {
  fileInput: $("#fileInput"), browseFiles: $("#browseFiles"), dropzone: $("#dropzone"),
  fileList: $("#fileList"), emptyQueue: $("#emptyQueue"), fileCount: $("#fileCount"),
  clearFiles: $("#clearFiles"), previewWrap: $("#previewWrap"), previewVideo: $("#previewVideo"),
  previewName: $("#previewName"), durationPresets: $("#durationPresets"),
  selectedProfiles: $("#selectedProfiles"), selectedCount: $("#selectedCount"),
  customMinutes: $("#customMinutes"), customSeconds: $("#customSeconds"),
  addDuration: $("#addDuration"), includeLast: $("#includeLast"), methodNote: $("#methodNote"),
  estimateCount: $("#estimateCount"), estimateDetail: $("#estimateDetail"),
  startSplit: $("#startSplit"), progressPanel: $("#progressPanel"),
  progressTitle: $("#progressTitle"), progressMessage: $("#progressMessage"),
  progressBar: $("#progressBar"), progressStage: $("#progressStage"),
  progressPercent: $("#progressPercent"), cancelSplit: $("#cancelSplit"),
  resultsPanel: $("#resultsPanel"), resultsTitle: $("#resultsTitle"),
  resultsDetail: $("#resultsDetail"), resultStats: $("#resultStats"),
  failureList: $("#failureList"), downloadZip: $("#downloadZip"), newBatch: $("#newBatch")
};

const FILE_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3.5h8l4 4V20H6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 3.5V8h4M9 12h6M9 15.5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return bytes + " B";
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2) + " " + units[unit];
}
function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "Duration unavailable";
  const whole = Math.floor(seconds), hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60), secs = whole % 60;
  return hours ? hours + ":" + String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0")
    : minutes + ":" + String(secs).padStart(2, "0");
}
function formatDuration(seconds) {
  if (seconds < 60) return seconds + " sec";
  if (seconds % 60 === 0) return seconds / 60 + " min";
  return Math.floor(seconds / 60) + "m " + seconds % 60 + "s";
}
function durationFolder(seconds) {
  if (seconds < 60) return seconds + "-seconds";
  if (seconds % 60 === 0) return seconds / 60 + "-minutes";
  return Math.floor(seconds / 60) + "-minutes-" + seconds % 60 + "-seconds";
}
function safeName(name) {
  return String(name).replace(/\.[^.]+$/, "").normalize("NFKD")
    .replace(/[^\w.-]+/g, "_").replace(/^[-_.]+|[-_.]+$/g, "").slice(0, 72) || "video";
}
function fileExtension(name) {
  const match = String(name).toLowerCase().match(/\.([a-z0-9]{1,8})$/);
  return match ? match[1] : "mp4";
}
function fastContainer(fileName) {
  const ext = fileExtension(fileName);
  const formats = {
    mp4: ["mp4", "mp4"], m4v: ["mp4", "mp4"], mov: ["mov", "mov"], qt: ["mov", "mov"],
    mkv: ["matroska", "mkv"], webm: ["webm", "webm"], avi: ["avi", "avi"],
    flv: ["flv", "flv"], ts: ["mpegts", "ts"], mts: ["mpegts", "ts"],
    m2ts: ["mpegts", "ts"], mpg: ["mpeg", "mpg"], mpeg: ["mpeg", "mpeg"], "3gp": ["3gp", "3gp"]
  };
  const choice = formats[ext] || ["matroska", "mkv"];
  return { format: choice[0], extension: choice[1] };
}

function updateControls() {
  const ready = state.files.length > 0 && state.profiles.length > 0 && !state.running;
  els.startSplit.disabled = !ready;
  els.clearFiles.disabled = state.files.length === 0 || state.running;
  els.fileInput.disabled = state.running;
  els.browseFiles.disabled = state.running;
  els.addDuration.disabled = state.running;
  els.selectedCount.textContent = state.profiles.length + " selected";
  els.startSplit.querySelector("span").textContent = state.running ? "Splitting…" : "Split videos";
}
function renderProfiles() {
  els.durationPresets.querySelectorAll("[data-seconds]").forEach((button) => {
    const active = state.profiles.includes(Number(button.dataset.seconds));
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  els.selectedProfiles.innerHTML = '<span class="profiles-label">Selected:</span>' +
    state.profiles.slice().sort((a, b) => a - b).map((seconds) =>
      '<span class="profile-tag">' + escapeHTML(formatDuration(seconds)) +
      '<button type="button" data-remove-duration="' + seconds + '" aria-label="Remove ' + seconds + ' seconds">×</button></span>'
    ).join("");
  updateControls();
  updateEstimate();
}
function renderQueue() {
  els.fileCount.textContent = state.files.length + (state.files.length === 1 ? " file" : " files");
  els.emptyQueue.hidden = state.files.length > 0;
  els.fileList.innerHTML = state.files.map((entry) => {
    const details = entry.duration !== null
      ? formatTime(entry.duration) + (entry.width && entry.height ? " · " + entry.width + " × " + entry.height : "")
      : entry.metadataState === "error" ? "Metadata unavailable · will probe during processing" : "Reading video details…";
    return '<div class="file-item" data-file-id="' + entry.id + '">' +
      '<div class="file-thumb">' + FILE_ICON + '</div><div class="file-details">' +
      '<div class="file-name" title="' + escapeHTML(entry.file.name) + '">' + escapeHTML(entry.file.name) + '</div>' +
      '<div class="file-meta"><span>' + formatBytes(entry.file.size) + '</span><span>' + escapeHTML(details) + '</span></div></div>' +
      '<button class="file-remove" type="button" data-remove-file="' + entry.id + '" aria-label="Remove ' + escapeHTML(entry.file.name) + '">×</button></div>';
  }).join("");
  updateControls();
  updateEstimate();
}
function updatePreview() {
  const first = state.files[0];
  if (state.previewUrl) { URL.revokeObjectURL(state.previewUrl); state.previewUrl = null; }
  if (!first) {
    els.previewWrap.hidden = true;
    els.previewVideo.removeAttribute("src");
    els.previewVideo.load();
    return;
  }
  state.previewUrl = URL.createObjectURL(first.file);
  els.previewVideo.src = state.previewUrl;
  els.previewName.textContent = first.file.name;
  els.previewWrap.hidden = false;
}
async function readMetadata(entry) {
  const url = URL.createObjectURL(entry.file), video = document.createElement("video");
  video.preload = "metadata";
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Metadata timeout")), 15000);
      video.onloadedmetadata = () => { clearTimeout(timer); resolve(); };
      video.onerror = () => { clearTimeout(timer); reject(new Error("Could not read metadata")); };
      video.src = url;
    });
    entry.duration = Number.isFinite(video.duration) ? video.duration : null;
    entry.width = video.videoWidth || null;
    entry.height = video.videoHeight || null;
    entry.metadataState = entry.duration ? "ready" : "error";
  } catch (_) { entry.metadataState = "error"; }
  finally {
    video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url);
  }
  renderQueue();
}
function addFiles(fileList) {
  const incoming = Array.from(fileList || []).filter((file) =>
    file.type.startsWith("video/") || /\.(mp4|m4v|mov|mkv|webm|avi|mts|m2ts|ts|mpg|mpeg|3gp|flv)$/i.test(file.name)
  );
  const added = [];
  for (const file of incoming) {
    const duplicate = state.files.some((entry) =>
      entry.file.name === file.name && entry.file.size === file.size && entry.file.lastModified === file.lastModified
    );
    if (duplicate) continue;
    const entry = {
      id: "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      file, duration: null, width: null, height: null, metadataState: "loading"
    };
    state.files.push(entry);
    added.push(entry);
  }
  renderQueue();
  updatePreview();
  added.forEach(readMetadata);
}
function updateEstimate() {
  if (!state.files.length) {
    els.estimateCount.textContent = "Ready for your videos";
    els.estimateDetail.textContent = "Add files to calculate the estimated number of clips.";
    return;
  }
  if (!state.profiles.length) {
    els.estimateCount.textContent = "Choose a duration";
    els.estimateDetail.textContent = "Select at least one clip duration to continue.";
    return;
  }
  let total = 0, known = 0, unknown = 0;
  for (const entry of state.files) {
    if (!Number.isFinite(entry.duration)) { unknown += 1; continue; }
    known += 1;
    for (const duration of state.profiles) {
      const count = state.includeLast ? Math.ceil(entry.duration / duration) : Math.floor(entry.duration / duration);
      total += Math.max(0, count);
    }
  }
  const tasks = state.files.length * state.profiles.length;
  els.estimateCount.textContent = total + (unknown ? "+ estimated clips" : " estimated clips");
  els.estimateDetail.textContent = unknown
    ? known + " of " + state.files.length + " video durations read · " + tasks + " split jobs"
    : state.files.length + " videos × " + state.profiles.length + " duration profiles";
}
function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".mode-option").forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  els.methodNote.innerHTML = mode === "fast"
    ? "<b>i</b><span>Fast split copies the original streams without re-encoding. Cuts happen at keyframes, so each clip can run past the selected duration.</span>"
    : "<b>i</b><span>Precise split re-encodes to H.264 MP4 and places cut points on frame boundaries. It takes longer and changes the original encoding.</span>";
  updateEstimate();
}
function setProgress(percent, stage, message) {
  const safe = Math.max(0, Math.min(100, Number(percent) || 0));
  els.progressBar.style.width = safe + "%";
  els.progressPercent.textContent = Math.round(safe) + "%";
  if (stage) els.progressStage.textContent = stage;
  if (message) els.progressMessage.textContent = message;
}
function showProgress(title, message) {
  els.progressPanel.hidden = false;
  els.progressTitle.textContent = title;
  els.progressMessage.textContent = message;
  setProgress(0, "Preparing", message);
  els.resultsPanel.hidden = true;
  els.progressPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function loadEngine() {
  if (state.ffmpeg && state.JSZip) return;
  els.progressTitle.textContent = "Loading video engine";
  els.progressMessage.textContent = "Downloading the browser processing engine. This is only needed once per session.";
  setProgress(1, "Loading engine", "Fetching the processing engine…");
  const [ffmpegModule, zipModule] = await Promise.all([
    import("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/esm/index.js"),
    import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm")
  ]);
  const FFmpeg = ffmpegModule.FFmpeg;
  state.JSZip = zipModule.default || zipModule;
  state.ffmpeg = new FFmpeg();
  state.ffmpeg.on("progress", ({ progress }) => {
    if (!state.running || !Number.isFinite(progress)) return;
    state.taskProgress = Math.max(0, Math.min(1, progress));
    const percent = ((state.currentTask + state.taskProgress) / Math.max(1, state.totalTasks)) * 94;
    setProgress(percent, "Splitting " + (state.currentTask + 1) + " of " + state.totalTasks, "Processing video segments in this browser…");
  });
  const coreBase = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
  await state.ffmpeg.load({
    classWorkerURL: new URL("./ffmpeg-worker.js", window.location.href).href,
    coreURL: coreBase + "/ffmpeg-core.js",
    wasmURL: coreBase + "/ffmpeg-core.wasm"
  });
}
async function probeDuration(ffmpeg, inputPath) {
  const path = "probe_duration.txt";
  try {
    await ffmpeg.ffprobe(["-v", "error", "-show_entries", "format=duration", "-of",
      "default=noprint_wrappers=1:nokey=1", inputPath, "-o", path]);
    const raw = await ffmpeg.readFile(path, "utf8");
    const duration = Number.parseFloat(String(raw).trim());
    await removeIfPresent(ffmpeg, path);
    return Number.isFinite(duration) && duration > 0 ? duration : null;
  } catch (_) {
    await removeIfPresent(ffmpeg, path);
    return null;
  }
}
async function removeIfPresent(ffmpeg, path) {
  try { await ffmpeg.deleteFile(path); } catch (_) {}
}
function buildCommand(inputPath, seconds, mode, includeLast, videoDuration, extension, format) {
  const args = ["-i", inputPath, "-map", "0:v:0", "-map", "0:a?"];
  if (mode === "fast") args.push("-c", "copy");
  else args.push(
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p",
    "-sc_threshold", "0", "-force_key_frames", "expr:gte(t,n_forced*" + String(seconds) + ")",
    "-c:a", "aac", "-b:a", "192k"
  );
  if (!includeLast) {
    const fullLength = Math.floor(videoDuration / seconds) * seconds;
    if (fullLength <= 0) return null;
    args.push("-t", String(fullLength));
  }
  args.push("-f", "segment", "-segment_time", String(seconds), "-reset_timestamps", "1", "-segment_format", format);
  if (mode === "precise") args.push("-segment_format_options", "movflags=+faststart");
  args.push("part_%03d." + extension);
  return args;
}
function getOutputNames(entries, extension) {
  return entries.filter((entry) => !entry.isDir && /^part_\d+\./i.test(entry.name) && entry.name.toLowerCase().endsWith("." + extension))
    .map((entry) => entry.name)
    .sort((a, b) => Number((a.match(/part_(\d+)/i) || [])[1] || 0) - Number((b.match(/part_(\d+)/i) || [])[1] || 0));
}
function friendlyError(error) {
  const message = String(error && error.message ? error.message : error || "Unknown error");
  if (/memory|allocate|out of bounds|abort\(\)/i.test(message))
    return "The browser ran out of working memory. Try fewer or smaller source videos, or split them in separate batches.";
  if (/network|fetch|load|import|worker|wasm|failed to compile/i.test(message))
    return "The video engine could not load. Check your connection and reload the page, then try again.";
  if (/codec|decoder|invalid data|could not find codec|not supported/i.test(message))
    return "This source uses a codec the browser engine could not read. Try another source format or re-encode it before splitting.";
  return message.length > 260 ? message.slice(0, 257) + "…" : message;
}

function updateTaskProgress(index, total, fileName, profile) {
  state.currentTask = index;
  state.taskProgress = 0;
  setProgress((index / Math.max(1, total)) * 94, "Split job " + (index + 1) + " of " + total,
    fileName + " · " + formatDuration(profile));
}

async function runBatch() {
  if (state.running || !state.files.length || !state.profiles.length) return;
  state.running = true;
  state.cancelled = false;
  state.totalTasks = state.files.length * state.profiles.length;
  state.currentTask = 0;
  state.taskProgress = 0;
  updateControls();
  els.cancelSplit.hidden = false;
  els.cancelSplit.disabled = false;
  els.cancelSplit.textContent = "Cancel";
  showProgress("Preparing your batch", "Initialising the browser video engine…");
  els.startSplit.disabled = true;

  const failures = [];
  let outputCount = 0, outputBytes = 0, completedTasks = 0;
  try {
    await loadEngine();
    const ffmpeg = state.ffmpeg;
    const zip = new state.JSZip();
    const profiles = state.profiles.slice().sort((a, b) => a - b);

    for (let fileIndex = 0; fileIndex < state.files.length; fileIndex += 1) {
      if (state.cancelled) throw new Error("Cancelled");
      const entry = state.files[fileIndex];
      const extension = fileExtension(entry.file.name);
      const inputPath = "input_" + fileIndex + "." + extension;
      els.progressTitle.textContent = "Splitting your videos";
      els.progressMessage.textContent = "Reading " + entry.file.name;
      setProgress((completedTasks / state.totalTasks) * 94, "Preparing source", entry.file.name);

      try {
        const buffer = await entry.file.arrayBuffer();
        await ffmpeg.writeFile(inputPath, new Uint8Array(buffer));
      } catch (error) {
        failures.push(entry.file.name + ": could not load this source file (" + error.message + ").");
        completedTasks += profiles.length;
        continue;
      }

      let duration = entry.duration;
      if (!Number.isFinite(duration) || duration <= 0) duration = await probeDuration(ffmpeg, inputPath);
      if (!Number.isFinite(duration) || duration <= 0) {
        failures.push(entry.file.name + ": the video duration could not be read.");
        await removeIfPresent(ffmpeg, inputPath);
        completedTasks += profiles.length;
        continue;
      }
      entry.duration = duration;
      const baseName = safeName(entry.file.name);
      const sourceFolder = String(fileIndex + 1).padStart(2, "0") + "_" + baseName;

      for (let profileIndex = 0; profileIndex < profiles.length; profileIndex += 1) {
        if (state.cancelled) throw new Error("Cancelled");
        const seconds = profiles[profileIndex];
        updateTaskProgress(completedTasks, state.totalTasks, entry.file.name, seconds);
        const output = state.mode === "precise" ? { format: "mp4", extension: "mp4" } : fastContainer(entry.file.name);
        const command = buildCommand(inputPath, seconds, state.mode, state.includeLast, duration, output.extension, output.format);

        if (!command) {
          failures.push(entry.file.name + " · " + formatDuration(seconds) + ": shorter than the selected duration; final partial clip is disabled.");
          completedTasks += 1;
          continue;
        }

        try {
          const exitCode = await ffmpeg.exec(command);
          if (exitCode !== 0) throw new Error("FFmpeg exited with code " + exitCode);
          const names = getOutputNames(await ffmpeg.listDir("/"), output.extension);
          if (!names.length) throw new Error("No output segments were produced.");
          for (let part = 0; part < names.length; part += 1) {
            if (state.cancelled) throw new Error("Cancelled");
            const outputName = names[part];
            const fileData = await ffmpeg.readFile(outputName);
            const segment = fileData instanceof Uint8Array ? fileData : new Uint8Array(fileData);
            const archivePath = sourceFolder + "/" + durationFolder(seconds) + "/" +
              baseName + "_part_" + String(part + 1).padStart(3, "0") + "." + output.extension;
            zip.file(archivePath, segment, { binary: true, compression: "STORE" });
            outputCount += 1;
            outputBytes += segment.byteLength;
            await removeIfPresent(ffmpeg, outputName);
          }
        } catch (error) {
          if (state.cancelled) throw error;
          failures.push(entry.file.name + " · " + formatDuration(seconds) + ": " + friendlyError(error));
          const leftovers = getOutputNames(await ffmpeg.listDir("/"), output.extension);
          for (const path of leftovers) await removeIfPresent(ffmpeg, path);
        }
        completedTasks += 1;
        setProgress((completedTasks / Math.max(1, state.totalTasks)) * 94,
          "Split job " + completedTasks + " of " + state.totalTasks,
          "Processed " + entry.file.name + " · " + formatDuration(seconds));
      }
      await removeIfPresent(ffmpeg, inputPath);
    }

    if (state.cancelled) throw new Error("Cancelled");
    if (outputCount === 0) throw new Error(failures.length ? failures.join(" ") : "No segments were produced.");
    els.progressTitle.textContent = "Packaging your clips";
    els.progressMessage.textContent = "Building one ZIP archive from " + outputCount + " segments…";
    setProgress(95, "Creating ZIP", "Packaging video segments…");
    const blob = await zip.generateAsync({ type: "blob", compression: "STORE" },
      (metadata) => setProgress(95 + metadata.percent * .05, "Creating ZIP", "Packaging video segments…"));

    if (state.zipUrl) URL.revokeObjectURL(state.zipUrl);
    state.zipUrl = URL.createObjectURL(blob);
    els.downloadZip.href = state.zipUrl;
    els.downloadZip.download = "Splytie_Export.zip";
    els.resultsTitle.textContent = failures.length ? "Your batch is ready with some skips." : "Your clips are ready.";
    els.resultsDetail.textContent = failures.length
      ? "Successful clips are packaged below. Review the skipped jobs before using the archive."
      : "All segments have been packaged into one ZIP archive.";
    els.resultStats.innerHTML =
      '<span class="result-stat">' + outputCount + ' clips</span>' +
      '<span class="result-stat">' + state.files.length + ' source videos</span>' +
      '<span class="result-stat">' + formatBytes(outputBytes) + ' video data</span>' +
      '<span class="result-stat">' + (state.mode === "fast" ? "Original streams" : "H.264 MP4") + '</span>';
    if (failures.length) {
      els.failureList.hidden = false;
      els.failureList.innerHTML = "<strong>" + failures.length + " skipped job" + (failures.length === 1 ? "" : "s") + "</strong><br>" +
        failures.slice(0, 8).map(escapeHTML).join("<br>") + (failures.length > 8 ? "<br>…and " + (failures.length - 8) + " more." : "");
    } else {
      els.failureList.hidden = true;
      els.failureList.textContent = "";
    }
    els.progressTitle.textContent = "Batch complete";
    els.progressMessage.textContent = "Your archive is ready to download.";
    setProgress(100, "Complete", "Archive created · " + outputCount + " clips");
    els.cancelSplit.hidden = true;
    els.resultsPanel.hidden = false;
    els.resultsPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    if (state.cancelled || error.message === "Cancelled") {
      els.progressTitle.textContent = "Batch cancelled";
      els.progressMessage.textContent = "The active processing worker was stopped. No new segments will be generated.";
      setProgress(0, "Cancelled", "Processing stopped");
    } else {
      els.progressTitle.textContent = "The batch could not finish";
      els.progressMessage.textContent = friendlyError(error);
      setProgress(0, "Stopped", "Review the message above and try again.");
    }
    els.cancelSplit.hidden = true;
  } finally {
    state.running = false;
    updateControls();
    els.startSplit.disabled = state.files.length === 0 || state.profiles.length === 0;
  }
}

function resetBatch() {
  if (state.running) return;
  state.files = [];
  state.profiles = [30];
  state.includeLast = true;
  els.includeLast.checked = true;
  els.customMinutes.value = "0";
  els.customSeconds.value = "20";
  els.progressPanel.hidden = true;
  els.resultsPanel.hidden = true;
  els.failureList.hidden = true;
  if (state.zipUrl) { URL.revokeObjectURL(state.zipUrl); state.zipUrl = null; }
  updatePreview();
  renderQueue();
  renderProfiles();
  setMode("fast");
  window.scrollTo({ top: $("#workspace").offsetTop - 20, behavior: "smooth" });
}
function cancelBatch() {
  if (!state.running) return;
  state.cancelled = true;
  els.cancelSplit.disabled = true;
  els.cancelSplit.textContent = "Stopping…";
  if (state.ffmpeg) {
    state.ffmpeg.terminate();
    state.ffmpeg = null;
  }
}
els.browseFiles.addEventListener("click", (event) => { event.stopPropagation(); els.fileInput.click(); });
els.dropzone.addEventListener("click", (event) => { if (!event.target.closest("button")) els.fileInput.click(); });
els.dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); els.fileInput.click(); }
});
els.fileInput.addEventListener("change", (event) => { addFiles(event.target.files); event.target.value = ""; });
els.dropzone.addEventListener("dragover", (event) => { event.preventDefault(); els.dropzone.classList.add("dragover"); });
els.dropzone.addEventListener("dragleave", () => els.dropzone.classList.remove("dragover"));
els.dropzone.addEventListener("drop", (event) => {
  event.preventDefault(); els.dropzone.classList.remove("dragover"); addFiles(event.dataTransfer.files);
});
els.fileList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-file]");
  if (!button || state.running) return;
  state.files = state.files.filter((entry) => entry.id !== button.dataset.removeFile);
  renderQueue(); updatePreview();
});
els.clearFiles.addEventListener("click", () => {
  if (state.running) return;
  state.files = []; renderQueue(); updatePreview();
});
els.durationPresets.addEventListener("click", (event) => {
  const button = event.target.closest("[data-seconds]");
  if (!button || state.running) return;
  const value = Number(button.dataset.seconds);
  state.profiles = state.profiles.includes(value) ? state.profiles.filter((item) => item !== value) : state.profiles.concat(value);
  renderProfiles();
});
els.selectedProfiles.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-duration]");
  if (!button || state.running) return;
  const value = Number(button.dataset.removeDuration);
  state.profiles = state.profiles.filter((item) => item !== value);
  renderProfiles();
});
els.addDuration.addEventListener("click", () => {
  if (state.running) return;
  const minutes = Number(els.customMinutes.value), seconds = Number(els.customSeconds.value);
  if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    els.customMinutes.setCustomValidity("Enter minutes and seconds between 0 and 59.");
    els.customMinutes.reportValidity(); return;
  }
  els.customMinutes.setCustomValidity("");
  const total = minutes * 60 + seconds;
  if (total < 1 || total > 3599) {
    els.customSeconds.setCustomValidity("Choose a duration between 1 second and 59 minutes 59 seconds.");
    els.customSeconds.reportValidity(); return;
  }
  els.customSeconds.setCustomValidity("");
  if (!state.profiles.includes(total)) state.profiles.push(total);
  renderProfiles();
});
document.querySelectorAll(".mode-option").forEach((button) => button.addEventListener("click", () => {
  if (!state.running) setMode(button.dataset.mode);
}));
els.includeLast.addEventListener("change", () => { state.includeLast = els.includeLast.checked; updateEstimate(); });
els.startSplit.addEventListener("click", runBatch);
els.cancelSplit.addEventListener("click", cancelBatch);
els.newBatch.addEventListener("click", resetBatch);

renderProfiles();
renderQueue();
setMode("fast");
els.cancelSplit.hidden = true;

// Desktop-only alpha video export using the renderer's transparent PNG·DIR output.
(function () {
  "use strict";

  var panel = document.getElementById("desktopAlphaExport");
  if (!panel) return;
  var desktop = window.trilyvaDesktop;
  if (!desktop || !desktop.isDesktop) {
    panel.style.display = "none";
    return;
  }

  var chooseButton = document.getElementById("alphaChooseFrames");
  var archiveButton = document.getElementById("alphaChooseArchive");
  var encodeButton = document.getElementById("alphaEncodeButton");
  var profileSelect = document.getElementById("alphaProfile");
  var folderLabel = document.getElementById("alphaFolderLabel");
  var settingsLabel = document.getElementById("alphaSettingsLabel");
  var statusBox = document.getElementById("alphaExportStatus");
  var inputPath = null;
  var activeUnlisten = null;

  function setStatus(message, error) {
    statusBox.textContent = message;
    statusBox.style.color = error ? "#ffb4b4" : "var(--ink-2)";
  }
  function basename(path) {
    var pieces = String(path).split(/[\\/]/);
    return pieces[pieces.length - 1] || path;
  }
  function getComposition() {
    if (typeof S === "undefined" || typeof CORE === "undefined" || !S || !CORE) {
      throw new Error("TRILYVA composition settings are not ready. Reload the workspace and try again.");
    }
    return CORE.composition(S.comp);
  }
  function syncSettings() {
    try {
      var c = getComposition();
      settingsLabel.textContent = c.width + "×" + c.height + " · " + c.fps + " FPS · " + c.frameCount + " frames";
    } catch (_) {
      settingsLabel.textContent = "Composition not ready";
    }
  }

  async function chooseInput(kind) {
    chooseButton.disabled = true;
    archiveButton.disabled = true;
    try {
      var selected = kind === "zip"
        ? await desktop.choosePngSequenceArchive()
        : await desktop.choosePngSequenceDirectory();
      if (!selected) return;
      inputPath = selected;
      folderLabel.textContent = basename(selected);
      folderLabel.title = selected;
      setStatus((kind === "zip" ? "PNG·ZIP archive" : "PNG·DIR folder") +
        " selected. Keep the composition settings matching this sequence, then encode.");
      syncSettings();
    } catch (error) {
      setStatus(String(error && error.message || error), true);
    } finally {
      chooseButton.disabled = false;
      archiveButton.disabled = false;
    }
  }
  chooseButton.addEventListener("click", function () { chooseInput("folder"); });
  archiveButton.addEventListener("click", function () { chooseInput("zip"); });

  profileSelect.addEventListener("change", function () {
    var profile = profileSelect.value;
    setStatus(profile === "mov"
      ? "ProRes 4444 MOV keeps a high-quality 10-bit-capable alpha channel; the output is larger."
      : profile === "apng"
        ? "APNG creates a transparent animated image from the PNG sequence. It can be large; use it for image-based animation rather than long video."
        : "VP9 WebM keeps an alpha channel and is usually smaller. Encoding requires the packaged FFmpeg build to support libvpx-vp9.");
  });

  encodeButton.addEventListener("click", async function () {
    if (!inputPath) {
      setStatus("Choose the PNG·DIR folder or PNG·ZIP archive first. Render the composition with BACKGROUND set to TRANSPARENT.", true);
      return;
    }

    var profile = profileSelect.value;
    var c;
    try {
      c = getComposition();
    } catch (error) {
      setStatus(String(error && error.message || error), true);
      return;
    }

    encodeButton.disabled = true;
    chooseButton.disabled = true;
    archiveButton.disabled = true;
    profileSelect.disabled = true;
    var unlisten = null;
    try {
      setStatus("Choose where to save the transparent video…");
      var outputPath = await desktop.chooseAlphaOutput(profile);
      if (!outputPath) {
        setStatus("Export cancelled. No output was written.");
        return;
      }

      var bitrate = null;
      if (profile === "webm") {
        var bitrateMbps = Number(document.getElementById("oBitrate").value);
        if (Number.isFinite(bitrateMbps) && bitrateMbps > 0) {
          bitrate = Math.round(bitrateMbps * 1000000);
        }
      }

      unlisten = await desktop.onEncodeProgress(function (progress) {
        if (!progress || !Number.isFinite(progress.percent)) return;
        var pct = Math.max(0, Math.min(100, progress.percent));
        var frame = Number.isFinite(progress.frame) ? progress.frame : 0;
        setStatus("FFmpeg " + Math.floor(pct) + "% · frame " + frame + " / " + c.frameCount);
      });
      activeUnlisten = unlisten;

      setStatus("Checking PNG sequence and alpha-capable encoder…");
      var result = await desktop.encodePngSequence({
        inputDir: inputPath,
        outputPath: outputPath,
        width: c.width,
        height: c.height,
        fps: c.fps,
        frameCount: c.frameCount,
        encoder: profile === "webm" ? "libvpx-vp9" : profile === "mov" ? "prores_ks" : "apng",
        bitrateBps: bitrate,
        pixelFormat: profile === "webm" ? "yuva420p" : profile === "mov" ? "yuva444p10le" : "rgba",
        preserveAlpha: true
      });

      var v = result && result.verification;
      if (!result || !v || !v.verified || !v.alphaChannel) {
        throw new Error("The encoder returned without verified alpha-channel metadata. Do not use this output as a transparent asset.");
      }
      setStatus("VERIFIED · " + basename(result.outputPath) + " · " +
        (v.videoCodec || "image sequence") + " · " + (v.pixelFormat || "unknown pixel format") +
        " · " + result.expectedFrames + " frames · " + c.width + "×" + c.height + " @ " + c.fps +
        " FPS · alpha channel confirmed.");
    } catch (error) {
      setStatus(String(error && error.message || error), true);
    } finally {
      if (typeof unlisten === "function") {
        try { unlisten(); } catch (_) {}
      }
      if (activeUnlisten === unlisten) activeUnlisten = null;
      encodeButton.disabled = false;
      chooseButton.disabled = false;
      archiveButton.disabled = false;
      profileSelect.disabled = false;
    }
  });

  if (typeof MutationObserver !== "undefined") {
    var observer = new MutationObserver(syncSettings);
    var target = document.getElementById("p-comp") || document.getElementById("p-render");
    if (target) observer.observe(target, { subtree: true, attributes: true, childList: true });
  }
  syncSettings();
  window.addEventListener("trilyva:desktop-ready", syncSettings);
})();
// Desktop alpha export panel: render the current code to native PNG files, then encode/verify alpha media.
(function () {
  "use strict";

  var panel = document.getElementById("desktopAlphaExport");
  if (!panel) return;
  var desktop = window.trilyvaDesktop;
  if (!desktop || !desktop.isDesktop) {
    panel.style.display = "none";
    return;
  }

  var integratedButton = document.getElementById("alphaRenderEncodeButton");
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
  function bytesToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var chunks = [];
    var step = 0x8000;
    for (var i = 0; i < bytes.length; i += step) {
      chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + step, bytes.length))));
    }
    return btoa(chunks.join(""));
  }
  function nativeDirectoryHandle(session) {
    return {
      name: session.folderName,
      getFileHandle: function (fileName) {
        return Promise.resolve({
          createWritable: function () {
            return Promise.resolve({
              write: function (blob) {
                if (!(blob instanceof Blob)) blob = new Blob([blob]);
                if (blob.size > 256 * 1024 * 1024) {
                  return Promise.reject(new Error("Frame " + fileName + " exceeds the safe 256 MiB native-transfer limit. Use a lighter scene or a lower resolution."));
                }
                if (/\.png$/i.test(fileName)) {
                  var chunkSize = 4 * 1024 * 1024;
                  if (!blob.size) return Promise.reject(new Error("Refusing to transfer an empty PNG frame."));
                  var offset = 0;
                  function writeNextChunk() {
                    var end = Math.min(blob.size, offset + chunkSize);
                    return blob.slice(offset, end).arrayBuffer().then(function (buffer) {
                      var isFinalChunk = end === blob.size;
                      return desktop.writeNativeSequenceChunk(
                        session.sessionId, fileName, bytesToBase64(buffer), isFinalChunk
                      ).then(function () {
                        offset = end;
                        return offset < blob.size ? writeNextChunk() : undefined;
                      });
                    });
                  }
                  return writeNextChunk();
                }
                return blob.arrayBuffer().then(function (buffer) {
                  return desktop.writeNativeSequenceFile(session.sessionId, fileName, bytesToBase64(buffer));
                });
              },
              close: function () { return Promise.resolve(); }
            });
          }
        });
      }
    };
  }
  async function withProgress(callback) {
    var unlisten = await desktop.onEncodeProgress(callback);
    activeUnlisten = unlisten;
    return unlisten;
  }
  function profileDetails(profile) {
    if (profile === "mov") return {
      encoder: "prores_ks",
      pixelFormat: "yuva444p10le",
      label: "ProRes 4444 MOV"
    };
    if (profile === "apng") return {
      encoder: "apng",
      pixelFormat: "rgba",
      label: "APNG"
    };
    return { encoder: "libvpx-vp9", pixelFormat: "yuva420p", label: "VP9 WebM" };
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
      ? "ProRes 4444 MOV keeps a high-quality alpha channel; the output is larger."
      : profile === "apng"
        ? "APNG creates a transparent animated image from the rendered PNG sequence. It can be large."
        : "VP9 WebM can preserve alpha when encoded with the native FFmpeg pipeline.");
  });

  async function chooseOutput(profile) {
    setStatus("Choose where to save " + profileDetails(profile).label + "…");
    return desktop.chooseAlphaOutput(profile);
  }

  async function renderCurrentAndEncode() {
    if (S.rendering) {
      setStatus("Finish or cancel the current render before starting a native transparent export.", true);
      return;
    }
    var session = null;
    var renderedComplete = false;
    var outputPath = null;
    var unlisten = null;
    integratedButton.disabled = true;
    chooseButton.disabled = true;
    archiveButton.disabled = true;
    encodeButton.disabled = true;
    profileSelect.disabled = true;
    try {
      if (typeof withCompiled !== "function" || typeof buildJob !== "function" || typeof startRender !== "function" || !Ed || !Ed.ta) {
        throw new Error("The TRILYVA render engine is not ready. Reload the workspace and try again.");
      }
      if (!(await withCompiled())) {
        throw new Error("The current animation code did not pass TRILYVA's render contract. Fix the error shown in the preview before exporting.");
      }
      var c = getComposition();
      if (!c.transparent) {
        throw new Error("Set Composition → Background → Transparent first. TRILYVA will not claim alpha for an opaque composition.");
      }
      var profile = profileSelect.value;
      outputPath = await chooseOutput(profile);
      if (!outputPath) {
        setStatus("Export cancelled. No frames or media output were written.");
        return;
      }

      // Build the ordinary renderer job with PNG·DIR as its sink. The virtual directory
      // adapter writes each frame directly to a native folder instead of browser downloads.
      var job = buildJob({ exportFormat: "dir" });
      job.code = Ed.ta.value;
      job.format = "png";
      job.target = "dir";
      job.exportFormat = "dir";
      var prefix = String((job.metadata && job.metadata.slug) || "frame") + "_";
      var settings = {
        width: c.width,
        height: c.height,
        fps: c.fps,
        frameCount: c.frameCount,
        bitrateBps: null
      };
      setStatus("Choose a parent folder for the rendered PNG sequence…");
      session = await desktop.beginNativePngSequence(settings, job.label || "TRILYVA", prefix);
      if (!session) {
        setStatus("Export cancelled. No frames or media output were written.");
        return;
      }
      folderLabel.textContent = session.folderName;
      folderLabel.title = session.directory;
      setStatus("Rendering every frame to " + session.folderName + "…");
      var renderResult = await startRender(job, {
        silent: true,
        skipStillExports: true,
        dirHandle: nativeDirectoryHandle(session),
        onProgress: function (progress) {
          if (!progress || !Number.isFinite(progress.done) || !Number.isFinite(progress.total)) return;
          var pct = Math.max(0, Math.min(100, progress.done / Math.max(1, progress.total) * 100));
          setStatus("RENDERING · " + Math.floor(pct) + "% · frame " +
            Number(progress.frame + 1).toLocaleString() + " / " + Number(progress.total).toLocaleString());
        }
      });
      if (!renderResult || !renderResult.ok || renderResult.cancelled) {
        await desktop.discardNativePngSequence(session.sessionId).catch(function () {});
        session = null;
        var reason = renderResult && renderResult.error ? renderResult.error.message : "The renderer did not complete all frames.";
        throw new Error("Transparent render stopped before completion: " + reason);
      }
      await desktop.finalizeNativePngSequence(session.sessionId);
      renderedComplete = true;
      inputPath = session.directory;
      folderLabel.textContent = session.folderName + " · rendered frames";
      folderLabel.title = session.directory;
      setStatus("RENDER COMPLETE · " + c.frameCount.toLocaleString() + " frames. Starting native " + profileDetails(profileSelect.value).label + " encoding…");

      var bitrate = null;
      if (profileSelect.value === "webm") {
        var bitrateMbps = Number(document.getElementById("oBitrate").value);
        if (Number.isFinite(bitrateMbps) && bitrateMbps > 0) {
          bitrate = Math.round(bitrateMbps * 1000000);
        }
      }
      unlisten = await withProgress(function (progress) {
        if (!progress || !Number.isFinite(progress.percent)) return;
        setStatus("ENCODING · " + Math.floor(Math.max(0, Math.min(100, progress.percent))) +
          "% · frame " + Number(progress.frame || 0).toLocaleString() + " / " + c.frameCount.toLocaleString());
      });
      setStatus("Encoding and verifying " + profileDetails(profileSelect.value).label + "…");
      var result = await desktop.encodeNativePngSequence(session.sessionId, outputPath, profileSelect.value, bitrate);
      var v = result && result.verification;
      if (!result || !v || !v.verified || !v.alphaChannel || result.expectedFrames !== c.frameCount) {
        throw new Error("The native encoder did not verify the expected frame count and decoded transparency. The frame sequence has been kept at " + session.directory);
      }
      setStatus("VERIFIED · " + basename(result.outputPath) + " · " +
        (v.videoCodec || "image sequence") + " · " + (v.pixelFormat || "unknown pixel format") +
        " · " + result.expectedFrames.toLocaleString() + " frames · " + c.width + "×" + c.height +
        " @ " + c.fps + " FPS · decoded alpha confirmed. Source frames remain in " + session.folderName + ".");
    } catch (error) {
      setStatus(String(error && error.message || error), true);
      if (session && !renderedComplete) {
        await desktop.discardNativePngSequence(session.sessionId).catch(function () {});
      } else if (session && renderedComplete) {
        inputPath = session.directory;
        folderLabel.textContent = session.folderName + " · frames available for retry";
        folderLabel.title = session.directory;
      }
    } finally {
      if (typeof unlisten === "function") {
        try { unlisten(); } catch (_) {}
      }
      if (activeUnlisten === unlisten) activeUnlisten = null;
      integratedButton.disabled = false;
      chooseButton.disabled = false;
      archiveButton.disabled = false;
      encodeButton.disabled = false;
      profileSelect.disabled = false;
    }
  }

  integratedButton.addEventListener("click", renderCurrentAndEncode);

  encodeButton.addEventListener("click", async function () {
    if (!inputPath) {
      setStatus("Choose the PNG·DIR folder or PNG·ZIP archive first, or use RENDER CURRENT CODE + EXPORT ALPHA.", true);
      return;
    }

    var profile = profileSelect.value;
    var c;
    try {
      c = getComposition();
      if (!c.transparent) {
        setStatus("Set Composition → Background → Transparent before encoding. Alpha export is blocked while the current composition is opaque.", true);
        return;
      }
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
      setStatus("Choose where to save " + profileDetails(profile).label + "…");
      var outputPath = await desktop.chooseAlphaOutput(profile);
      if (!outputPath) {
        setStatus("Export cancelled. No output was written.");
        return;
      }
      var bitrate = null;
      if (profile === "webm") {
        var bitrateMbps = Number(document.getElementById("oBitrate").value);
        if (Number.isFinite(bitrateMbps) && bitrateMbps > 0) bitrate = Math.round(bitrateMbps * 1000000);
      }
      unlisten = await withProgress(function (progress) {
        if (!progress || !Number.isFinite(progress.percent)) return;
        setStatus("ENCODING · " + Math.floor(Math.max(0, Math.min(100, progress.percent))) +
          "% · frame " + Number(progress.frame || 0).toLocaleString() + " / " + c.frameCount.toLocaleString());
      });
      var result = await desktop.encodePngSequence({
        inputDir: inputPath,
        outputPath: outputPath,
        width: c.width,
        height: c.height,
        fps: c.fps,
        frameCount: c.frameCount,
        encoder: profileDetails(profile).encoder,
        bitrateBps: bitrate,
        pixelFormat: profileDetails(profile).pixelFormat,
        preserveAlpha: true
      });
      var v = result && result.verification;
      if (!result || !v || !v.verified || !v.alphaChannel) {
        throw new Error("Output verification failed: decoded alpha was not confirmed. Do not use this as a transparent asset.");
      }
      setStatus("VERIFIED · " + basename(result.outputPath) + " · " +
        (v.videoCodec || "image sequence") + " · " + (v.pixelFormat || "unknown pixel format") +
        " · " + result.expectedFrames.toLocaleString() + " frames · decoded alpha confirmed.");
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

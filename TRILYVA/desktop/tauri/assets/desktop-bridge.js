// Bridge to the Rust media backend. It intentionally adds no visible UI.
(function () {
  "use strict";
  const api = window.__TAURI__;
  if (!api || !api.core || typeof api.core.invoke !== "function") return;

  const invoke = api.core.invoke;
  const eventApi = api.event;
  const desktop = Object.freeze({
    isDesktop: true,
    version: "0.1.0",
    status: () => invoke("desktop_status"),
    mediaCapabilities: () => invoke("media_capabilities"),
    validateRenderConfig: (config) => invoke("validate_render_config", { config }),
    choosePngSequenceDirectory: () => invoke("choose_png_sequence_directory"),
    choosePngSequenceArchive: () => invoke("choose_png_sequence_archive"),
    chooseAlphaOutput: (profile) => invoke("choose_alpha_output", { profile }),
    beginNativePngSequence: (config, projectName, prefix) => invoke("begin_native_png_sequence", {
      config, projectName, prefix
    }),
    writeNativeSequenceFile: (sessionId, fileName, base64Data) => invoke("write_native_sequence_file", {
      sessionId, fileName, base64Data
    }),
    writeNativeSequenceChunk: (sessionId, fileName, base64Data, finalChunk) => invoke("write_native_sequence_chunk", {
      sessionId, fileName, base64Data, finalChunk
    }),
    finalizeNativePngSequence: (sessionId) => invoke("finalize_native_png_sequence", { sessionId }),
    discardNativePngSequence: (sessionId) => invoke("discard_native_png_sequence", { sessionId }),
    encodeNativePngSequence: (sessionId, outputPath, profile, bitrateBps) => invoke("encode_native_png_sequence", {
      sessionId, outputPath, profile, bitrateBps
    }),
    encodePngSequence: (options) => invoke("encode_png_sequence", { options }),
    verifyMediaFile: (path) => invoke("verify_media_file", { path }),
    onEncodeProgress: async (callback) => {
      if (!eventApi || typeof eventApi.listen !== "function") {
        throw new Error("TRILYVA desktop events are unavailable.");
      }
      return eventApi.listen("trilyva://encode-progress", (event) => callback(event.payload));
    }
  });

  Object.defineProperty(window, "trilyvaDesktop", {
    value: desktop,
    enumerable: false,
    configurable: false,
    writable: false
  });
  document.documentElement.dataset.trilyvaDesktop = "true";
  window.dispatchEvent(new CustomEvent("trilyva:desktop-ready"));
})();

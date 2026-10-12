// What this does: Builds the animated emoji assets used in the motion library, including their timing and visual movement.

export default {
  id: "living-emojis",
  title: "LIVING EMOJIS",
  description: "TRILYVA Living Glyphs collection.",
  async load() {
    const bridge = window.TRILYVA_LEGACY_LIBRARY_BRIDGE;
    if (!bridge || typeof bridge.living !== "function") {
      throw new Error("Living Emoji engine has not initialized yet.");
    }
    return bridge.living();
  }
};

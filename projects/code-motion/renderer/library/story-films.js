/* TRILYVA STORY FILMS
   Full-length, editable procedural cartoons. Source is fetched as text so the
   same file can be previewed on its film page or loaded into the code editor. */

const SKYROOT_SOURCE_URL = new URL("../the-skyroot-bell.js", import.meta.url);

export default {
  id: "story-films",
  title: "STORY FILMS",
  description: "Original frame-driven cartoons. Each entry contains its complete editable JavaScript source and timeline.",

  async load() {
    const response = await fetch(SKYROOT_SOURCE_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("The Skyroot Bell source could not be loaded: " + response.status);
    }

    const code = await response.text();
    if (!code.includes("function renderFrame") || !code.includes("SKYROOT_DURATION = 600")) {
      throw new Error("The Skyroot Bell source is incomplete or does not match the expected renderer.");
    }

    return [{
      id: "the-skyroot-bell",
      title: "The Skyroot Bell — 10-Minute Fantasy Cartoon",
      category: "story film",
      description: "A complete 600-second 4K UHD / 60 fps fantasy story: Eira the young fox and Pip the lantern-moth follow the missing Skyroot Bell, meet Nix the lonely cloud-dragon, and help a floating village learn to share its light. Original vector characters, layered scenery, chapter transitions and timed dialogue.",
      code: code,
      width: 3840,
      height: 2160,
      fps: 60,
      duration: 600,
      loop: false,
      loopDuration: 600,
      speed: 1,
      background: "#111b35",
      transparent: false,
      seed: 20261011
    }];
  }
};

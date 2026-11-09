/* TRILYVA Library Registry
 * One flat library directory. Add a module to ./library/, then list it in
 * manifest.json (the GitHub workflow also regenerates the manifest).
 */
const MANIFEST_URL = new URL("./manifest.json", import.meta.url);

const items = [];

window.TRILYVA_LIBRARY = {
  version: 3,
  ready: null,
  all() { return items.slice(); },
  get(id) { return items.find(l => l.id === id) || null; },
  register(library) {
    if (!library || !library.id || !library.title || typeof library.load !== "function") {
      throw new TypeError("Invalid TRILYVA library module.");
    }
    if (!items.some(l => l.id === library.id)) items.push(library);
    return library;
  }
};

window.TRILYVA_LIBRARY.ready = (async function () {
  const response = await fetch(MANIFEST_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Library manifest request failed: " + response.status);
  const manifest = await response.json();

  if (!manifest || !Array.isArray(manifest.libraries)) {
    throw new Error("Library manifest is invalid.");
  }

  // Include the renderer build in each module URL. This keeps changed library
  // modules fresh even when a generated manifest retains the same schema version.
  const shellBuild = new URL(import.meta.url).searchParams.get("v") || "dev";
  const version = encodeURIComponent(String(manifest.version || 1) + "-" + shellBuild);
  for (const path of manifest.libraries) {
    const separator = path.indexOf("?") >= 0 ? "&" : "?";
    const mod = await import(path + separator + "v=" + version);
    const library = mod.default || mod.library || mod;
    window.TRILYVA_LIBRARY.register(library);
  }

  return window.TRILYVA_LIBRARY;
})();

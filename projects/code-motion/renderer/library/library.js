/* TRILYVA Library Registry
 * One flat library directory. Add a module to ./library/, then list it in
 * manifest.json (the GitHub workflow also regenerates the manifest).
 */
const MANIFEST_URL = "./manifest.json";

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

  for (const path of manifest.libraries) {
    const mod = await import(path);
    const library = mod.default || mod.library || mod;
    window.TRILYVA_LIBRARY.register(library);
  }

  return window.TRILYVA_LIBRARY;
})();

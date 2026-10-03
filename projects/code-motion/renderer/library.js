/* TRILYVA Library Registry
 * Add a library module under ./library/<id>/library.js and register it here.
 */
import prism from "./library/prism/library.js";
import living from "./library/living-emojis/library.js";
import webIcons from "./library/web-icons/library.js";

const libraries = [prism, living, webIcons];

window.TRILYVA_LIBRARY = {
  version: 1,
  all() { return libraries.slice(); },
  get(id) { return libraries.find(l => l.id === id) || null; },
  register(library) {
    if (!library || !library.id || !library.title || typeof library.load !== "function") {
      throw new TypeError("Invalid TRILYVA library module.");
    }
    if (!libraries.some(l => l.id === library.id)) libraries.push(library);
    return library;
  }
};

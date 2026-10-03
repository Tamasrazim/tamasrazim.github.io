const URL = "../../library/prism-library.json";

let cache = null;

export default {
  id: "prism",
  title: "PRISM FLOWERS",
  description: "Procedural translucent flower motion library.",
  async load() {
    if (cache) return cache;
    const response = await fetch(URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Prism library request failed: " + response.status);
    const raw = await response.json();
    if (!Array.isArray(raw)) throw new Error("Prism library payload is not an array.");
    cache = raw
      .filter(item => item && item.title)
      .map(item => {
        const code = typeof item.code === "string"
          ? item.code
          : typeof item.source === "string"
            ? item.source
            : typeof item.renderCode === "string"
              ? item.renderCode
              : "";
        return { ...item, code };
      })
      .filter(item => item.code && item.code.trim());
    return cache;
  }
};

import prismData from "./data.js";

let cache = null;

export default {
  id: "prism",
  title: "PRISM FLOWERS",
  description: "Procedural translucent flower motion library.",
  async load() {
    if (cache) return cache;
    if (!Array.isArray(prismData)) throw new Error("Prism library dataset is invalid.");
    cache = prismData
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

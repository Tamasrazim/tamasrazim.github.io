// What this does: Loads the shared Prism animation definitions used by TRILYVA's protected library.
const dataUrl = new URL("./prism-library.json", import.meta.url);
const response = await fetch(dataUrl, { cache: "no-store" });

if (!response.ok) {
  throw new Error("Shared Prism data could not be loaded: " + response.status);
}

const data = await response.json();
if (!Array.isArray(data)) {
  throw new Error("Shared Prism data must be a JSON array.");
}

export default data;

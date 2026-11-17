# Vectyz — Browser workspace

This directory is the GitHub Pages deployment of the Vectyz browser application.

Open: https://tamasrazim.github.io/projects/vectyz/

The application is static and local-first. Raster vectorization executes in a Web Worker; SVG rasterization runs in the browser; project metadata, source files and outputs are persisted in IndexedDB. There is no image-processing server or cloud upload endpoint.

The service worker is scoped to this directory and caches the application shell for offline use after the first successful visit. Stored projects are tied to this browser origin and profile.

Current browser build: up to 12 megapixels per raster input; vector output SVG; SVG raster output PNG, JPEG or WebP. Batch processing, PDF/EPS browser export and native WASM acceleration are not included in this browser build. The Python engine and CLI remain in the standalone Vectyz repository.

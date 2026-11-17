# Vectyz — Browser workspace

This directory is the GitHub Pages deployment of the Vectyz browser application.

Open: https://tamasrazim.github.io/projects/vectyz/

The application is static and local-first. Raster vectorization executes in a Web Worker; SVG rasterization runs in the browser; project metadata, source files and outputs are persisted in IndexedDB. There is no image-processing server or cloud upload endpoint.

The 0.4.0 studio interface includes original/vector comparison, synchronized zoom and pan, reconstruction presets, cancellable vectorization, a local project library, responsive inspector controls and keyboard shortcuts. The service worker is scoped to this directory and caches the application shell for offline use after the first successful visit.

Current browser engine limits: up to 12 megapixels per raster input; vector output SVG; SVG raster output PNG, JPEG or WebP. Browser batch processing, PDF/EPS export and native WASM acceleration are not included. The Python engine and CLI remain in the standalone Vectyz repository.

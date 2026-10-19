# TRILYVA — Tamasrazim

Browser-first deterministic code-driven animation workspace.

## Canonical routes

Project page:

`https://tamasrazim.github.io/projects/code-motion/`

Workspace:

`https://tamasrazim.github.io/projects/code-motion/renderer/`

The workspace entry is:

`projects/code-motion/renderer/index.html`

## Project files

- `index.html` — project landing page.
- `renderer/index.html` — canonical KYNESTRA workspace.
- `renderer/media-stack.js` — media capability and container/codec descriptors.
- `renderer/manifest.webmanifest` — workspace PWA manifest.
- `renderer/sw.js` — workspace service worker.
- `renderer/icons/` — workspace icon assets.
- `legacy-renderer.html` — archived previous renderer build.

## Compatibility URLs

Older inbound links are preserved through:

- `/code-motion-tamasrazim.html`
- `/code-motion-tamasrazim2.html`

Both redirect to the current KYNESTRA workspace.

The archived `legacy-renderer.html` is not used by normal navigation.

## Render model

The workspace evaluates animation time from the requested frame:

`time = frame / fps`

Preview playback is separate from export timing. Export requests output frames explicitly and uses the browser/device's available encoding capabilities.

## Output

Supported browser-side paths include:

- MP4 / ISO-BMFF with H.264 / AVC where a compatible WebCodecs configuration is available.
- WebM with browser-supported VP8/VP9 paths.
- PNG frame export, including preferred-frame ZIP export.
- Local generation without a backend, subscription, Electron runtime, or required FFmpeg installation.

## Development

The project page is the entry point for the project.

Open the workspace through:

`/projects/code-motion/renderer/`

The workspace is intentionally an `index.html` application directory rather than a standalone `.html` route.


## Flower Batch Lab

The batch surface is available at `batch/index.html`. It discovers the current Prism flower studies, builds deterministic idea combinations, prepares the fixed 3840×2160 / 60 FPS / 10 second contract, stages Core render jobs, and exposes the KYNESTRA-native ZIP packaging workflow.

## Dot Mesh library

TRILYVA includes 50 unique procedural dot-mesh designs. Click **Dot Mesh → Folder** directly above **Finish Movie**: the browser asks you to choose a save folder, then the renderer exports every design into its own subfolder without building a huge ZIP in memory.

Each completed design folder contains:
- One 12-second 3840×2160, 60 FPS MP4 using H.264 at a 20 Mbps encoder target.
- One static transparent 3840×2160 SVG still from frame zero (not an animated SVG).
- `metadata.json` and `metadata.csv`.

The selected folder also receives `DOT-MESH-CATALOG.csv`, `BATCH-MANIFEST.json`, and `README.txt`. Progress is shown in TRILYVA, cancellation is available, and outputs already written to the folder remain there if the batch stops. The manifest records actual verification and average bitrate where available. The 20 Mbps figure is the encoder target; the measured average can differ.

The browser must support the File System Access API and H.264 at 3840×2160 / 60 FPS. Open the HTTPS GitHub Pages renderer in a current Chromium-based browser.

## XYZ animation library

TRILYVA's renderer includes the **XYZ** library with 50 distinct procedural animations. Each entry uses its own Canvas drawing structure and motion logic, exposes an editable `renderFrame` function, and loops deterministically over 12 seconds at the composition's frame rate. The library is self-contained and has no external runtime dependencies.


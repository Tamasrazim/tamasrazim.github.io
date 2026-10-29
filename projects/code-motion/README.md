# TRILYVA — Browser Animation Workspace

TRILYVA is a browser-based, code-driven animation workspace built around deterministic frame timing, editable JavaScript source, preview, and frame-by-frame rendering.

## Current routes

- Project overview: https://tamasrazim.github.io/projects/trilyva/
- Documentation: https://tamasrazim.github.io/projects/trilyva/docs.html
- Step-by-step field guide: https://tamasrazim.github.io/projects/trilyva/tutorial.html
- Workspace: https://tamasrazim.github.io/projects/code-motion/renderer/

The active workspace entry point in this repository is **renderer/index.html**. The overview and documentation are separate from the working renderer.

## Editing and source files

The animation editor accepts JavaScript built around the renderer's **window.renderFrame(time, frame, fps, ctx, width, height)** contract. The editor provides lightweight syntax highlighting for language keywords, strings, numbers, comments, functions, properties, and recognised renderer/browser APIs. Highlighting is visual guidance, not a substitute for parsing or runtime validation.

In the **ANIMATION SOURCE** toolbar:

- **Copy** copies the current animation source.
- **Save → .tmotion** downloads the project package with the animation source and project composition/settings.
- **Save → .js** downloads only the current JavaScript animation source.

The main project **Save** action is separate: it stores a local project in browser storage. Download a file backup when work needs to survive clearing browser data or moving to another browser/device.

## Library source downloads

The Library tab's **DOWNLOAD FROM LIBRARY** section provides two source-oriented actions:

- **DOWNLOAD JS** downloads one selected animation as a JavaScript file.
- **DOWNLOAD LIBRARY (.ZIP)** packages the selected built-in or local library's JavaScript files with **library-manifest.json** and **README.txt**; source paths are retained where available.

These controls are separate from full-library rendering, which exports media such as videos, still frames, and metadata. A source ZIP contains animation code; it is not a rendered-media archive.

## Frame and render model

Animation time is evaluated from the requested frame:

**time = frame / fps**

The preview is for interactive inspection and may lag at demanding settings. Export processing requests frames against the chosen timeline instead of recording the live preview. This does not guarantee that every device can encode every requested combination: output depends on browser codec support, hardware, memory, storage, and operating-system limitations.

## Export and compatibility

The current workspace offers browser-side MP4/H.264 and WebM/VP8/VP9 paths where compatible encoder configurations are available. Inspect Frame has a separate **Save this frame as** picker with 18 individual-frame formats, detailed below. The Render panel and full-library batch render have a separate automatic still-image selection of PNG, JPG, SVG, and EPS. For that batch path, SVG/EPS use a vector recorder and are limited to operations it can represent. Directory/file destination pickers depend on browser support.

The interface exposes high output targets, including up to 16K, 240 fps, and a 2,000 Mbps (2 Gbps) bitrate target. These are configuration ceilings, not guaranteed real-world performance or a promise that all settings can be combined successfully on every machine. Test with a short render and inspect the result before production use.

## Capability map

### Animation authoring and preview

- Edit JavaScript that implements `window.renderFrame(time, frame, fps, ctx, width, height)`; the renderer supplies a Canvas 2D context and composition dimensions.
- Use syntax colours, find/replace, reindent, undo/redo, source analysis, paste, copy, clear, examples, and the Copy Prompt helper.
- Play, pause, scrub, seek to the first/last frame, step one frame, inspect an exact rendered frame, compare the preview with the export path, and use fullscreen preview.
- Work with deterministic frame timing: `time = frame / fps`. The seeded helpers and noise/easing/loop API help animations reproduce the same requested frame when it is evaluated out of order.

### Centered preview playback bar

The preview pane has a centered transport bar with first frame, previous frame, play/pause, next frame, last frame, and loop toggle. **Preview Scale** controls the display size and raster density; **FIT** returns the frame to the available space. **Playback Speed** changes interactive preview playback from 0.25× to 4× without changing the render FPS. **Time Rate** is a separate animation-time remapping control.

### Composition, timing, and rendering

- Choose resolution presets from 720p up to a 16K preset and custom dimensions up to 16,384 pixels per side.
- Choose frame rates from 1 to 240 fps, common presets through 240 fps, and a custom duration from 0.05 seconds up to one hour.
- Configure opaque or transparent background, background colour, random seed, loop length, seam analysis, retiming, and reverse.
- Run pre-flight analysis and test renders; select Draft, Standard, High, or Maximum quality, set a target bitrate up to 2,000 Mbps, inspect encoder diagnostics, and optionally enable frame fingerprints.
- The local video path supports MP4/H.264 and WebM/VP8/VP9 only when the current browser and device accept the selected configuration. Completed output is checked against the requested frame/sample count and container structure. These checks do not guarantee that the visual result matches the creator's intent.
- The 16K, 240 fps, and 2 Gbps values are configuration ceilings, not a promise that all can be combined on every computer.

### Projects, metadata, and libraries

- Save projects to browser storage; import or export the `.tmotion` project package, or export the animation source as `.js`.
- Record project name, creator, composition, description, and language. The source panel reports source-line count and SHA-256; metadata can be copied as a JSON receipt.
- Use bundled libraries or import one JavaScript file, a folder containing JS files, or a ZIP as a separate local library. Imported libraries stay in this browser's local storage.
- Download one library animation as `.js` or download the library source ZIP with `library-manifest.json` and `README.txt`.
- Render a full selected library to a folder or ZIP with per-animation video, selected automatic still frames, and metadata. Folder saving requires browser file-system access support.
- Frame-intelligence suggestions are heuristic stock-keyword/category ideas; review these suggestions instead of treating them as verified image facts.

## The 18 Inspect Frame image formats

Use **Preview → Inspect frame → Save this frame as**. WebP and AVIF depend on a compatible browser canvas encoder. The other formats are encoded locally. The single-frame inspector's SVG and EPS are raster-backed wrappers, not editable vector artwork.

| Format | What it writes and its limits |
| --- | --- |
| PNG | Lossless raster image; supports alpha transparency. |
| JPEG / JPG | Lossy raster image; transparency is flattened against white. |
| WebP | Modern web raster; requires browser canvas-encoder support. |
| AVIF | Modern compressed raster; requires browser canvas-encoder support. |
| BMP | 24-bit bitmap raster. |
| TIFF | Uncompressed RGB raster; file sizes can be large. |
| GIF | Single still image with up to 256 colours; not animated GIF output. |
| ICO | Icon image, maximum 256 pixels per side. |
| TGA | 24-bit true-colour raster. |
| QOI | Lossless RGBA raster. |
| SVG | SVG wrapper embedding a PNG image; not editable vector paths in the inspector output. |
| EPS | EPS/PostScript wrapper containing raster image data; not editable vector paths in the inspector output. |
| PPM | Portable pixmap colour image. |
| PGM | Portable graymap grayscale image. |
| PBM | Portable monochrome bitmap. |
| PAM | Portable arbitrary map with RGBA data. |
| XBM | Monochrome X bitmap. |
| XPM | Indexed-colour pixmap. |

**Important distinction:** the Render panel and full-library still settings currently provide four automatic formats: PNG, JPG, SVG, and EPS. That four-format output is not the same as the 18-format picker for one inspected frame. Batch SVG/EPS uses a separate vector recorder and can omit drawing operations it cannot represent.

## Repository map

- **index.html** — the project entry page for this folder.
- **renderer/index.html** — main browser workspace.
- **renderer/media-stack.js** — media capability and codec/container descriptors.
- **renderer/movie-finalizer.js** — local movie finalization support.
- **renderer/manifest.webmanifest** — workspace web-app manifest.
- **renderer/sw.js** — service worker and cache version.
- **renderer/library/** — bundled animation libraries and library metadata.
- **renderer/icons/** — workspace icons.
- **legacy-renderer.html** — archived previous renderer build.
- **LICENSE.md** and **THIRD-PARTY-NOTICES.md** — licensing and third-party notices.

Older inbound URLs remain as compatibility routes. The archived renderer is not used by normal navigation.

## Recommended workflow

1. Start with a library example or a small scene.
2. Use **time** to derive motion so frame output is reproducible.
3. Preview and inspect transitions at several frame indices.
4. Save a **.tmotion** project backup and/or export a **.js** source copy.
5. Test the intended resolution, FPS, codec, and destination with a short render.
6. Render the final job and inspect dimensions, duration, frame sequence, colour, and transparency.

For user-facing instructions, use the linked TRILYVA documentation and field guide. Update this README when workspace controls or supported output routes change.
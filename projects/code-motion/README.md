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

The current workspace includes browser-side video paths where compatible H.264/AVC or VP8/VP9 configurations are available. Still-image controls can offer PNG, JPG, SVG, and EPS depending on the current build; vector output is limited by the operations the vector recorder can represent. Directory/file destination pickers depend on browser support.

The interface exposes high output targets, including up to 16K, 240 fps, and a 2,000 Mbps (2 Gbps) bitrate target. These are configuration ceilings, not guaranteed real-world performance or a promise that all settings can be combined successfully on every machine. Test with a short render and inspect the result before production use.

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
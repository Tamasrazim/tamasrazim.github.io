# Code → Motion — Tamasrazim

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
- `renderer/index.html` — canonical Code → Motion workspace.
- `renderer/media-stack.js` — media capability and container/codec descriptors.
- `renderer/manifest.webmanifest` — workspace PWA manifest.
- `renderer/sw.js` — workspace service worker.
- `renderer/icons/` — workspace icon assets.
- `legacy-renderer.html` — archived previous renderer build.

## Compatibility URLs

Older inbound links are preserved through:

- `/code-motion-tamasrazim.html`
- `/code-motion-tamasrazim2.html`

Both redirect to the current Code → Motion workspace.

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

# Code → Motion — Tamasrazim

Browser-first deterministic code-driven animation renderer.

## Canonical routes

Project page:

`https://tamasrazim.github.io/projects/code-motion/`

Renderer:

`https://tamasrazim.github.io/projects/code-motion/renderer.html`

The renderer source of truth is:

`projects/code-motion/renderer.html`

## Project files

- `renderer.html` — current single-file renderer.
- `media-stack.js` — media capability and container/codec descriptors.
- `legacy-renderer.html` — archived previous renderer build.
- `manifest.webmanifest` / `sw.js` / `icons/` — PWA support.

## Compatibility URLs

Older inbound links are preserved through:

- `/code-motion-tamasrazim.html`
- `/code-motion-tamasrazim2.html`

Both compatibility entry points redirect to the current Code → Motion renderer.

The archived `legacy-renderer.html` is not used by normal navigation.

## Render model

The renderer evaluates animation time from the requested frame:

`time = frame / fps`

Preview playback is separate from export timing. Export requests output frames explicitly and uses the browser/device's available encoding capabilities.

## Output

The application checks the active browser/device for supported encoding paths instead of claiming universal codec availability.

Supported browser-side paths include:

- MP4 / ISO-BMFF with H.264 / AVC where a compatible WebCodecs configuration is available.
- WebM with browser-supported VP8/VP9 paths.
- PNG frame export, including preferred-frame ZIP export.
- Local generation without a backend, subscription, Electron runtime, or required FFmpeg installation.

## Development

The project entry page is `index.html`.

The separate standalone Animation Renderer application lives at:

`/renderer/`

Do not treat `/renderer/` as an alias for Code → Motion; they are separate applications.

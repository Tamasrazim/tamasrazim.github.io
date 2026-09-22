# Code → Motion — Tamasrazim

Browser-first deterministic animation rendering project.

## Canonical files

- `renderer.html` — current V2 single-file renderer.
- `media-stack.js` — media capability and container/codec descriptors.
- `legacy-renderer.html` — archived previous renderer build.

The old root URLs are kept as compatibility launchers so existing links do not break.

## Render model

The renderer evaluates animation time from the requested frame:

`time = frame / fps`

Preview playback is separate from export timing. The renderer requests frames explicitly, then uses the browser's available encoding path.

## Output

The application probes the active browser/device for compatible encoding configurations rather than claiming universal codec support.

Current project documentation describes:

- MP4 / ISO-BMFF with H.264 / AVC where the active browser exposes a compatible WebCodecs configuration.
- WebM with browser-supported VP8/VP9 paths.
- Local output generation without a backend, subscription, Electron runtime, or required FFmpeg installation.

## Development

The project entry page is `index.html`.

The actual renderer source of truth is:

`projects/code-motion/renderer.html`

The root `code-motion-tamasrazim.html` URL is retained only as a compatibility entry point.


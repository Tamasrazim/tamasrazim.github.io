# Code → Motion — Tamasrazim

Browser-first deterministic animation renderer and local media-production project.

## Renderer V2

The canonical renderer is `../../code-motion-tamasrazim.html`.

V2 runs animation source inside an isolated runtime, requests output frames explicitly from the animation clock, and sends those frames through the browser's available WebCodecs encoder.

Core timing rule:

`time = frame / fps`

Preview playback is not used as the export clock.

## Video output

V2 currently targets:

- MP4 / ISO-BMFF with H.264 / AVC when the browser reports a compatible WebCodecs configuration.
- WebM / Matroska with the supported VP8/VP9 browser encoders.

The renderer probes the selected resolution, FPS, bitrate and codec before rendering. Unsupported combinations are reported rather than represented as guaranteed support.

## Architecture

`source → isolated runtime → explicit frame → VideoFrame → WebCodecs encoder → local muxer → output verification → download`

The renderer UI is kept outside the render surface.

The browser-first V2 page does not require a backend service, account, subscription, Electron runtime, proprietary encoder binary, or FFmpeg installation.

## Repository note

`code-motion-tamasrazim2.html` is retained as the previous advanced renderer build. Its recent output-label precedence regressions are fixed, but the project entry point is now the uploaded V2 renderer.

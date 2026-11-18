# Splytie

A browser-based batch video splitter. Add multiple videos, select one or more clip durations, choose a cut method, and export the results as one ZIP archive.

## Live project

https://tamasrazim.github.io/projects/splytie/

The app is deployed as part of the Tamasrazim portfolio repository under `projects/splytie/`. This folder is the deployed web application, not a separate hosted service.

## Features

- Add multiple video files in one batch.
- Select several durations at once, including custom minute/second values.
- **Normal Mode:** preserves the original duration-profile workflow.
- **Advanced Mode:** trim a source time range, split into equal-length parts, or define manual cut timestamps (one timestamp per line).
- **Fast split:** copies the original streams without re-encoding. Segment boundaries depend on source keyframes, so actual clip lengths can exceed the selected duration.
- **Precise split:** re-encodes to H.264/AAC MP4 and places boundaries on frame-aligned keyframes. This is slower and changes the source encoding.
- Advanced timestamp plans use the same Fast (keyframe-dependent stream copy) or Precise (H.264 re-encode) cut method.
- Optionally omit the final partial segment.
- Review generated clips before export: preview, rename, download individually, or remove unwanted clips.
- Create the final ZIP only after review; edits invalidate any previously generated archive. The archive preserves source/profile folders.
- No application server or account is required. Source files are processed locally in the browser.

## Run locally

Serve this folder with a static web server. The app uses ES modules and Web Workers, so it cannot be opened directly from a `file://` URL.

For example, run `python -m http.server 8000` in this directory, then open `http://localhost:8000`.

## Processing and privacy

Splytie does not upload source videos to a Splytie backend. The FFmpeg WebAssembly runtime and JSZip library are loaded from jsDelivr when needed. Processing, clip review and ZIP creation happen in the current browser tab. Generated clips remain in browser memory while the review queue is open; close the batch when finished to release them.

The browser still needs enough available memory for the active input, generated segments, and final archive. Very large batches may exceed browser memory limits. Process large sources in smaller batches when necessary. Advanced source-range and split-point controls do not change the local-only processing model.

The first run downloads the FFmpeg WebAssembly engine (roughly 30 MB). The single-threaded core does not require cross-origin isolation headers.

## Runtime dependencies

- `@ffmpeg/ffmpeg` 0.12.15
- `@ffmpeg/core` 0.12.10
- `jszip` 3.10.1

The FFmpeg wrapper uses a same-origin worker bridge in `ffmpeg-worker.js` while loading the core module from the CDN.

# Splytie

A browser-based batch video splitter. Add multiple videos, select one or more clip durations, choose a cut method, and export the results as one ZIP archive.

## Live project

Deployed inside the Tamasrazim portfolio:

https://tamasrazim.github.io/projects/splytie/

The website is served by the main site repository at `projects/splytie/`. This repository contains the standalone source files for development and version history; it is not a separate Pages deployment.

## Features

- Add multiple video files in one batch.
- Select several durations at once, including custom minute/second values.
- **Normal Mode:** preserves the original duration-profile workflow.
- **Advanced Mode:** trim a source time range, split into equal-length parts, or define manual cut timestamps (one timestamp per line).
- **Per-video Advanced plans:** each source can inherit the global plan or use its own duration profiles, source range, equal-part count, or manual cut points. Select a source in the visual timeline to edit its plan; validation, estimates, and rendering use that source-specific configuration.
- **Fast split:** copies the original streams without re-encoding. Segment boundaries depend on source keyframes, so actual clip lengths can exceed the selected duration.
- **Precise split:** re-encodes to H.264/AAC MP4 and places boundaries on frame-aligned keyframes. This is slower and changes the source encoding.
- Advanced timestamp plans use the same Fast (keyframe-dependent stream copy) or Precise (H.264 re-encode) cut method.
- Optionally omit the final partial segment.
- Review generated clips before export: preview, rename, download individually, or remove unwanted clips.
- Create the final ZIP only after review; edits invalidate any previously generated archive. The archive preserves source and split-plan folders, including per-video plan differences.
- No application server or account is required. Source files are processed locally in the browser.

## Run locally

Serve the project files with a static web server. This app uses ES modules and Web Workers, so it cannot be opened directly from a `file://` URL.

For example, run `python -m http.server 8000` in this directory, then open `http://localhost:8000`.

## Processing and privacy

Splytie does not upload source videos to a Splytie backend. The FFmpeg WebAssembly runtime and JSZip library are loaded from jsDelivr when needed. Processing, clip review and ZIP creation happen in the current browser tab. Generated clips remain in browser memory while the review queue is open; close the batch when finished to release them. Processing is sequential by source: temporary input and FFmpeg readback buffers are cleared after transfer, and source/output filesystem entries are removed before moving on.

The browser still needs enough available memory for the active input, generated segments, and final archive. ZIP generation can temporarily require substantially more memory than the clips alone because the archive is assembled in the browser. Splytie shows a rough working-set estimate and asks for confirmation before packaging larger exports; this estimate is a warning, not a reliable prediction of available RAM. For large exports, use individual clip downloads or split the work into smaller batches. No resolution, bitrate, or quality is silently reduced. Advanced source-range and split-point controls do not change the local-only processing model.

The first run downloads the FFmpeg WebAssembly engine (roughly 30 MB). The single-threaded core does not require cross-origin isolation headers.

## Runtime dependencies

- `@ffmpeg/ffmpeg` 0.12.15
- `@ffmpeg/core` 0.12.10
- `jszip` 3.10.1

The FFmpeg wrapper uses a same-origin worker bridge in `ffmpeg-worker.js` while loading the core module from the CDN.

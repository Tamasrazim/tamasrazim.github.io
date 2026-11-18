# Splytie

A browser-based batch video splitter. Add multiple videos, select one or more clip durations, choose a cut method, and export the results as one ZIP archive.

## Run locally

Open the repository through a static web server. The app uses ES modules and Web Workers, so it cannot run from a file URL.

For example, run python -m http.server 8000 in this directory and open http://localhost:8000.

## Features

- Add multiple video files in one batch.
- Select several durations at once, including custom minute/second values.
- Fast split copies the original streams without re-encoding. Segment boundaries depend on source keyframes, so actual clip lengths can exceed the selected duration.
- Precise split re-encodes to H.264/AAC MP4 and places boundaries on frame-aligned keyframes. This is slower and changes the source encoding.
- Optionally omit the final partial segment.
- Package successful outputs into one ZIP, organized by source video and duration.
- No application server or account is required. Source files are processed locally in the browser.

## Processing and privacy

Splytie does not upload source videos to a Splytie backend. The FFmpeg WebAssembly runtime and JSZip library are loaded from jsDelivr when needed. Processing and ZIP creation happen in the current browser tab.

The browser still needs enough available memory for the active input, generated segments, and final archive. Very large batches may exceed browser memory limits. Process large sources in smaller batches when necessary.

The first run downloads the FFmpeg WebAssembly engine (roughly 30 MB). The app uses the single-threaded core and does not require cross-origin isolation headers, making it suitable for static hosting such as GitHub Pages.

## Deployment

One-time setup: open Settings → Pages → Build and deployment, then set Source to GitHub Actions. The workflow checks JavaScript syntax and deploys the repository root on every push to main. If the first run stops at Configure Pages, set the source as described above and rerun the workflow.

## Runtime dependencies

- @ffmpeg/ffmpeg 0.12.15
- @ffmpeg/core 0.12.10
- jszip 3.10.1

The FFmpeg wrapper uses a same-origin worker bridge in ffmpeg-worker.js so the page can host the worker itself while loading the core module from the CDN.

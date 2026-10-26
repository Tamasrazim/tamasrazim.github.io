# TRILYVA Desktop — Rust + Tauri

This project packages the existing TRILYVA renderer without changing its interface. The build script copies projects/code-motion/renderer to the Tauri frontend directory and makes only packaging-specific changes for the logo path, browser service worker, browser analytics, and the injected desktop command bridge.

## Build on Windows

From this directory, run:
- ./scripts/prepare-ffmpeg.ps1
- cargo install tauri-cli --locked
- cargo fmt --all -- --check
- cargo test
- cargo tauri dev
- cargo tauri build --bundles nsis,msi

The prepared static FFmpeg executables are packaged as resources. If they are not present, the app still opens but reports the missing dependency and falls back to looking for the tools on PATH.

## Backend bridge

The staged renderer can call window.trilyvaDesktop for status, actual FFmpeg capability discovery, export configuration validation, encoding a contiguous PNG sequence, and FFprobe output verification. Encoders are discovered from the packaged FFmpeg binary; they are not assumed to be present merely because their codec names exist.

## Export input contract

Input frames use frame_%06d.png, starting at frame_000000.png, with no missing indexes. The sequence must already be rendered; this command encodes an existing sequence and does not pretend it generated animation frames. The command rejects an existing output file, checks the requested encoder/container/pixel format against the FFmpeg build, emits progress events, and verifies the finished file.


## Transparent video and visual formats

The existing renderer remains responsible for deterministic composition rendering and already supports still-frame PNG, JPG, SVG, and EPS export. PNG and SVG can preserve transparency; JPG and EPS are opaque formats. PNG·DIR exports the rendered composition as a consecutive sequence of PNG files.

The desktop build adds a **TRANSPARENT VIDEO · DESKTOP** panel to the existing Render workspace. To use it, set **Background → Transparent**, render to **PNG·DIR**, select that resulting folder in the alpha panel, and keep the composition width, height, FPS, and duration equal to the PNG sequence. The panel can then encode:

- **WebM / VP9 alpha** using `libvpx-vp9`, `yuva420p`, and alternate-reference frames disabled.
- **MOV / ProRes 4444** using `prores_ks`, profile 4, and `yuva444p10le`.

The output is not accepted just because FFmpeg wrote a file: FFprobe checks its video stream, frame count, and pixel format. If the resulting stream does not report an alpha-capable pixel format, TRILYVA deletes the output and reports failure. Support still depends on the packaged FFmpeg build advertising the required encoder, muxer, and pixel format. The alpha panel encodes an already-rendered PNG sequence; it does not re-render the animation a second time.

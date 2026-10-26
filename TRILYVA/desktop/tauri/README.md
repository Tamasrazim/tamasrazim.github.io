# TRILYVA Desktop — Rust + Tauri

This project packages the existing TRILYVA renderer without changing its interface. The build script copies projects/code-motion/renderer to the Tauri frontend directory and makes only packaging-specific changes for the logo path, browser service worker, browser analytics, and the injected desktop command bridge.

## Integrated transparent render workflow

On desktop, set the composition background to Transparent, choose WebM, MOV, or APNG in the desktop alpha panel, and press **RENDER CURRENT CODE + EXPORT ALPHA**. TRILYVA compiles the current editor code, writes each PNG frame sequentially to a native directory without a browser download/re-import round trip, checks the manifest and complete frame sequence, then runs the native encoder. The encoder checks dimensions, exact frame count, requested FPS, advertised alpha support, and decoded non-opaque alpha samples. A failed render removes its incomplete frame directory. A successful render keeps the source frame folder for reuse; a failed encode leaves complete frames available for retry.

Each PNG frame is streamed in bounded 4 MiB IPC chunks. The decoded frame is capped at 256 MiB to avoid unbounded memory/IPC payloads. If an unusually complex frame exceeds this limit, reduce resolution/scene complexity or use the existing PNG-sequence export path.

## Multi-platform CI builds

The GitHub Actions workflow builds desktop installers for Windows x64 (NSIS + MSI), Linux x64 (DEB + AppImage), macOS Apple Silicon (DMG), and macOS Intel (DMG), plus an Android ARM64 debug APK and an unsigned iOS Simulator app. Each target runs as a separate job in the same workflow so all targets start together.

The Windows job prepares FFmpeg using `scripts/prepare-ffmpeg.ps1`; Linux and macOS use `scripts/prepare-ffmpeg.sh`. The platform icon set is generated from the square TRILYVA SVG before packaging.

The Android APK is a debug/sideloading artifact rather than a Google Play release. The iOS artifact is for the Simulator, not a device-installable IPA. Creating a signed iOS device IPA, notarized macOS DMG, or production-signed Windows installer requires the appropriate Apple/Windows signing credentials and provisioning configuration.

To test locally on Windows, run:
- `./scripts/prepare-ffmpeg.ps1`
- `npm install --global "@tauri-apps/cli@^2"`
- `tauri icon ../../../assets/brand/trilyva/T.svg --output icons`
- `cargo fmt --all -- --check`
- `cargo test`
- `tauri build --bundles nsis msi`

On Linux and macOS, use `bash ./scripts/prepare-ffmpeg.sh linux64`, `macos64`, or `macosarm64` as appropriate before running `tauri build`.

The prepared static FFmpeg executables are packaged as resources. If they are not present, the app still opens but reports the missing dependency and falls back to looking for the tools on PATH.

## Backend bridge

The staged renderer can call window.trilyvaDesktop for status, actual FFmpeg capability discovery, export configuration validation, encoding a contiguous PNG sequence, and FFprobe output verification. Encoders are discovered from the packaged FFmpeg binary; they are not assumed to be present merely because their codec names exist.

## Export input contract

Input frames use frame_%06d.png, starting at frame_000000.png, with no missing indexes. The sequence must already be rendered; this command encodes an existing sequence and does not pretend it generated animation frames. The command rejects an existing output file, checks the requested encoder/container/pixel format against the FFmpeg build, emits progress events, and verifies the finished file.


## Transparent video and visual formats

The existing renderer remains responsible for deterministic composition rendering and already supports still-frame PNG, JPG, SVG, and EPS export. PNG and SVG can preserve transparency; JPG and EPS are opaque formats. PNG·DIR exports the rendered composition as a consecutive sequence of PNG files.

The desktop build adds a **TRANSPARENT VIDEO · DESKTOP** panel to the existing Render workspace. To use it, set **Background → Transparent**, render to **PNG·DIR** or **PNG·ZIP**, select that folder/archive in the alpha panel, and keep the composition width, height, FPS, and duration equal to the PNG sequence. ZIPs are safely extracted to a temporary directory inside the encoder workflow. The panel can then encode:

- **WebM / VP9 alpha** using `libvpx-vp9`, `yuva420p`, and alternate-reference frames disabled.
- **MOV / ProRes 4444** using `prores_ks`, profile 4, and `yuva444p10le`.
- **APNG** as a transparent animated-image output using the FFmpeg `apng` encoder and RGBA pixel format.

The output is not accepted just because FFmpeg wrote a file. TRILYVA verifies the stream dimensions, exact decoded frame count, and requested integer FPS; it also checks the reported pixel format and decodes a scaled sample of the alpha plane to confirm that the output contains actual non-opaque pixels. A container that merely advertises an alpha-capable format while decoding as fully opaque is rejected, and the failed output is removed. Support still depends on the packaged FFmpeg build advertising the required encoder, muxer, and pixel format. The alpha panel encodes an already-rendered PNG sequence; it does not re-render the animation a second time.

The Render workspace also includes **EXPORT VECTOR FRAME SEQUENCE · SVG ZIP**. It writes one editable SVG file per composition frame plus a manifest and README, with optional background removal when the composition's transparent-background option is enabled. This works only for drawing operations represented by TRILYVA's vector recorder; raster effects or unsupported Canvas operations may fail, and EPS remains an opaque still-image format.

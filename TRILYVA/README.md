# TRILYVA Desktop

TRILYVA Desktop packages the existing TRILYVA renderer in a Rust + Tauri application. The workspace HTML, CSS, panels, and animations are staged from the canonical browser renderer during the build; the visual interface is not redesigned.

## Current implementation

- Tauri 2 desktop shell with the current renderer staged at build time.
- Runtime discovery of the FFmpeg / FFprobe executables, encoders, decoders, muxers, pixel formats, and hardware-acceleration methods actually available in the packaged build.
- Rust export validation and PNG-sequence-to-video encoding through argument-safe process invocation.
- Progress events for an active encoding job and FFprobe verification of the finished file.
- Windows x64 build workflow that prepares a static FFmpeg package and creates MSI / NSIS installers.

The desktop backend exposes a JavaScript bridge at window.trilyvaDesktop. The browser renderer remains independently available and continues to use its established export path until the desktop-frame handoff is connected to the existing render workflow.

## Local development

- Rust stable toolchain
- Windows WebView2 runtime on Windows
- Tauri 2 CLI (install with cargo install tauri-cli --locked)
- FFmpeg and FFprobe placed in desktop/tauri/resources/bin, or available on PATH

From TRILYVA/desktop/tauri, run:
- ./scripts/prepare-ffmpeg.ps1
- cargo fmt --all -- --check
- cargo test
- cargo tauri dev
- cargo tauri build --bundles nsis,msi

The first build downloads a static FFmpeg package. The resulting installer is large because the FFmpeg executables are included.

## Encoding API

The backend command encode_png_sequence expects files named frame_000000.png, frame_000001.png, and so on, with contiguous zero-based frame indexes. The output encoder must be present in the packaged FFmpeg build. Existing output files are not overwritten. The completed video is inspected with FFprobe before success is reported.

Available encoder options depend on the FFmpeg build, operating system, drivers, and hardware. A listed encoder is not a guarantee that every resolution, pixel format, or bitrate is accepted by that encoder.

## FFmpeg licensing

The Windows build currently uses a GPL-configured static FFmpeg build from BtbN/FFmpeg-Builds. Read desktop/tauri/resources/FFMPEG-THIRD-PARTY-NOTICES.txt in the prepared build output and the upstream licensing/source information before redistributing modified packages. Codec availability and licensing can vary by build.

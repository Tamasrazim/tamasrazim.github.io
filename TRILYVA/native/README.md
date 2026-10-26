# TRILYVA Native

TRILYVA Native is the from-scratch desktop implementation. It is a Rust/egui native window, not a browser, Tauri shell, or embedded WebView. JavaScript animation code runs in an embedded QuickJS runtime, and drawing commands are rasterized by the native Rust renderer.

## Build locally

Install stable Rust and the native build dependencies for egui/winit on your operating system. Then run:

    python TRILYVA/native/packaging/generate-icon.py
    cargo test --manifest-path TRILYVA/native/Cargo.toml
    cargo run --manifest-path TRILYVA/native/Cargo.toml

On Linux, the native window requires X11/Wayland and OpenGL development libraries.

## Current native foundation

- Native glass-like monochrome workspace: code editor, preview, composition inspector, timeline playback and animated branded intro.
- The animation contract is window.renderFrame(time, frame, fps, ctx, width, height).
- A native QuickJS + tiny-skia pipeline currently supports frame-isolated JavaScript evaluation, deterministic `Math.random()` seeded by frame index, paths, solid fills/strokes, basic transforms, alpha and PNG rasterization.
- Animation scripts have a 250 ms per-evaluation budget, a 64 MiB QuickJS memory limit, a 256 KiB stack limit, a 1 MB source limit, and bounded frame-command output. Wall-clock APIs (`Date` and `performance`) are unavailable in animation code.
- Unsupported operations such as text drawing, gradient paints, non-default line caps/joins, and dashed strokes fail the frame with a diagnostic instead of being silently omitted or approximated.
- Native project open/save in .trilyva JSON containers.
- Sequential PNG frame export to ZIP, with frame naming, settings manifest, and a SHA-256 digest for the rendered frame stream.
- Custom monochrome application artwork and a Windows Inno Setup installer.
- The app has no embedded WebView and no dependency on the existing web workspace for its UI.

This is the first native foundation, not a claim of full feature parity yet. Advanced Canvas APIs (text/font rasterization, gradients, images, compositing), background preview rendering, render cancellation, codec exports, complete project/library migration, frame-by-frame output verification, and polished OS-specific installers are explicit follow-up implementation work. See [the verification record](../VERIFICATION.md) for the latest CI evidence and local installation status. A successful CI build confirms compilation and packaging; it does not confirm an installed application's behaviour on every operating system.

The exporter currently labels alpha as a request in the manifest; export verification must be expanded before an output is presented as alpha-verified. Inspect actual pixels before using an asset that requires transparency.



# TRILYVA Native

**Status: experimental desktop foundation — not a release build.**

This directory starts the native desktop edition without replacing or destabilizing the existing browser workspace. The native shell uses Tauri 2 and the operating system's WebView. It packages the existing TRILYVA renderer rather than maintaining a second, diverging copy of the editor.

## Targets

The CI workflow builds on each target operating system instead of attempting fragile cross-compilation:

- Windows x64 — NSIS and MSI packages where supported by the toolchain.
- macOS — application bundle and DMG.
- Linux — packages supported by the Linux bundler/toolchain.

The exact deliverables come from CI artifacts. A successful build on one operating system does not prove the other two work, and there is no signed or production-ready release yet.

## Build

Install Node.js 20+ and the stable Rust toolchain. Follow the Tauri 2 platform prerequisites for your operating system, then run from this directory:

```sh
npm install
npm run tauri:info
npm run tauri:dev
```

Create a distributable bundle with:

```sh
npm run tauri:build
```

Linux builds need WebKitGTK 4.1 and the native package/build dependencies listed by the Tauri 2 documentation. Windows builds use the Microsoft C++ build tools and WebView2; macOS builds require Xcode Command Line Tools. CI is the initial cross-platform build check.

## Architecture decisions

1. **Keep one renderer.** The bundled UI is read from `projects/code-motion/renderer/`; no copy of the large renderer is maintained in this folder.
2. **Keep the browser release working.** The existing web app remains available at `/projects/code-motion/renderer/` and remains the easiest no-install path.
3. **Native capabilities stay off by default.** This initial shell exposes no arbitrary process execution, file-system, updater, or shell commands to the page.
4. **Voice providers are adapters, not copied applications.** VoiceStudio is a separate optional local service for early integration tests. TRILYVA will not bundle VoiceStudio source or model weights as part of this scaffold.
5. **Use narrow local speech calls only.** A future native adapter may call only VoiceStudio's documented loopback speech endpoints after explicit user selection. It must not expose admin routes, weaken VoiceStudio's browser-origin guard, or allow a remote host to be silently selected.
6. **No model is assumed stock-cleared.** Exact engine, model, and weight licenses must be reviewed before promoting generated output for paid stock distribution.
7. **No release promises yet.** Signing, updater, project-file association, crash recovery, accessibility, offline installation, GPU paths, and large-media regression tests are not complete.

## Known caveats

- The native shell is a packaging foundation, not a rewrite of rendering internals.
- Browser encoding APIs and WebView media codecs vary by operating system. MP4/WebM availability, frame accuracy, large-resolution limits, and memory use must be tested on each target.
- A desktop window alone does not provide a native codec stack or guarantee 8K/60 fps. Those paths need capability probes and platform-specific tests.
- VoiceStudio's local AI models are not embedded here. Intel Arc acceleration and commercial-use rights are not assumed.
- Until CI builds and runtime smoke tests pass on all targets, this scaffold should be treated as engineering work, not an end-user download.

## Ownership

TRILYVA's original code and creative assets remain under `LICENSES/TRILYVA-PROPRIETARY.md`. Tauri and its transitive dependencies remain under their respective licenses. No license in this directory grants reuse of TRILYVA's proprietary renderer.

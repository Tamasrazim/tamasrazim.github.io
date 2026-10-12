# TRILYVA

C2M bundles the TRILYVA animation runtime inside KYNESTRA.

## Runtime source

The canonical renderer source is:

`/projects/code-motion/renderer/`

It includes the main editor, renderer modules, icons, service worker, manifests, local libraries, and large keyword data files.

## Desktop packaging

Tauri's `build.rs` copies the **complete** canonical renderer folder into:

`/KYNESTRA/desktop/shell/modules/c2m/renderer/`

That way dynamic imports and local files travel with `index.html`; the native app must not be built from the short placeholder in `/KYNESTRA/modules/c2m/renderer/`. This avoids maintaining two competing copies of the 200+ MiB renderer data tree.

The separate batch workflow remains under `/KYNESTRA/modules/c2m/batch/`. It is not injected as a floating tab over the main renderer.

## Module behavior

- JavaScript animation editor
- deterministic frame model
- live preview and frame-by-frame rendering
- WebCodecs/local muxer export paths supported by the runtime
- 60/120 FPS targets where the runtime supports them
- local assets and an independent PWA scope
- KYNESTRA return navigation when running inside the desktop shell

## Core contract

The module communicates conceptually through:

- `render.started`
- `render.completed`
- `render.failed`

See:

- `/KYNESTRA/core/render/render-contract.json`
- `/KYNESTRA/core/assets/asset-contract.json`

C2M outputs can use the shared Core handoff command when running inside the desktop shell:

`ingest_module_output(projectPath, sourcePath, "c2m", kind, metadata)`

Core owns copying, hashing, deduplication, asset registration, and `asset.imported` emission.

## Flower Batch Lab

`/KYNESTRA/modules/c2m/batch/index.html` provides Prism flower idea discovery, 4K/60/10s batch-job staging, deterministic selection of 50 studies, and native 50-per-folder packaging.

The native KYNESTRA package writer emits MP4, JPG first-frame, and transparent PNG first-frame ZIPs when those rendered deliverables are present, with SHA-256 file and chunk manifests. JPG is a flattened preview; PNG is the alpha-preserving first-frame deliverable.

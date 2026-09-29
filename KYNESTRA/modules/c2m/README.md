# C2M — Code Motion

C2M is KYNESTRA's JavaScript animation renderer module.

## Source boundary

Production renderer:

`/projects/code-motion/renderer/`

KYNESTRA-owned renderer:

`/KYNESTRA/modules/c2m/renderer/`

The production renderer remains untouched.

## Desktop packaging

Tauri's `build.rs` copies the KYNESTRA renderer into:

`/KYNESTRA/desktop/shell/modules/c2m/renderer/`

at build time. The source of truth remains inside the module directory.

## Module behavior

- JavaScript animation editor
- deterministic frame model
- live preview
- frame-by-frame rendering
- WebCodecs/local muxer export paths supported by the copied renderer
- 60/120 FPS targets where the runtime supports them
- independent PWA scope
- KYNESTRA return navigation

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

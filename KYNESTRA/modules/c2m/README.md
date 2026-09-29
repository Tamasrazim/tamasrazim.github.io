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

Actual render-job orchestration and Vault ingestion are the next integration layer.

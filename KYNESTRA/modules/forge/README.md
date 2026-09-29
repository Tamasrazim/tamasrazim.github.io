# Forge

KYNESTRA Forge integrates the existing **Format Forge** workspace as an independent module.

## Source boundary

Production:

`/projects/format-forge/`

KYNESTRA copy:

`/KYNESTRA/modules/forge/renderer/`

The production Format Forge page is not modified by KYNESTRA development.

## Current functionality

- browser-first file intake
- folder intake
- ZIP extraction
- batch conversion
- image conversion
- text/data conversion
- media conversion through the existing FFmpeg browser runtime
- ZIP output
- optional in-app registration of completed outputs into Stock Vault through the shared Core handoff

## Desktop packaging

Tauri copies the KYNESTRA-owned Forge renderer into the desktop bundle at:

`desktop/shell/modules/forge/renderer/`

The module remains independently maintainable.

## External runtimes

The copied Format Forge implementation currently loads JSZip and FFmpeg browser runtimes from public CDNs for some functionality. This dependency is explicitly declared in `module.json`; it is not silently treated as a bundled Core dependency.

## Architecture boundary

Forge does not call C2M or Stock Vault private code. Forge outputs can use the shared Core handoff command when running inside the desktop shell:

`ingest_module_output(projectPath, sourcePath, "forge", kind, metadata)`

Core owns copying, hashing, deduplication, asset registration, and `asset.imported` emission.

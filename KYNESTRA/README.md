# KYNESTRA

KYNESTRA is a modular desktop creative ecosystem.

## Current foundation

The Tauri desktop runtime now has a Rust Core with:

- project lifecycle
- .tamasrazim package creation/validation
- SQLite metadata
- persistent tasks
- Core event persistence/emission
- C2M module packaging
- persistent render jobs
- SHA-256 asset ingestion and deduplication
- project-local Stock Vault asset listing
- platform account metadata and connection state
- per-asset submission tracking
- shared Forge/C2M/Core asset handoff API
- generic public-status verification
- ZIP-backed portable .tamasrazim packages
- SHA-256 package integrity verification
- restart recovery for interrupted tasks
- validated built-in module registry

Modules:

- Forge (Format Forge integration)
- C2M (Code Motion)
- Stock Vault

## Repository boundary

All KYNESTRA implementation lives under /KYNESTRA/. Existing production website and production project code outside this folder is not modified by KYNESTRA development.

## Project format

.tamasrazim

## Windows installer

Download page: https://tamasrazim.github.io/KYNESTRA/download.html

The release workflow publishes a native Windows NSIS installer as `KYNESTRA-setup.exe` whenever a `kynestra-v*` version tag is released.

## Desktop entry

KYNESTRA/desktop/tauri/

Core validates module.json descriptors for all three built-in modules before the desktop state is created.

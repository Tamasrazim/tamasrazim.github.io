# KYNESTRA

KYNESTRA is a modular desktop creative ecosystem.

## Foundation

The current desktop runtime uses Tauri 2 with a Rust Core and a vanilla frontend embedded directly by Tauri. The current shell does not require a Node runtime.

Core owns:
- project lifecycle
- .tamasrazim package initialization and validation
- SQLite metadata
- persistent tasks
- Core events
- shared schema foundations

Modules:
- Forge
- C2M (Code Motion)
- Stock Vault

## Repository boundary

All KYNESTRA implementation lives under /KYNESTRA/. Existing production website and project files outside this folder are not part of the KYNESTRA build.

## Desktop entry

KYNESTRA/desktop/tauri/

## Project format

.tamasrazim
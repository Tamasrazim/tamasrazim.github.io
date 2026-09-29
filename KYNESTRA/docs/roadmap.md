# KYNESTRA Roadmap

## Alpha 0.1 — Foundation
- Core contracts
- .tamasrazim format
- SQLite schema
- Event and task contracts
- Desktop shell
- Project create/open/save

## Alpha 0.2 — C2M
- [x] Copy the existing Code Motion renderer into KYNESTRA as a separate module copy
- [x] Never modify the production C2M renderer
- [x] Package the KYNESTRA C2M copy through the Tauri build
- [x] Add C2M render and asset contracts
- [x] Add desktop launch path to C2M
- [ ] Connect live render jobs to Core
- [ ] Register completed renders with Vault

## Alpha 0.3 — Stock Vault
- Asset library and detail view
- Automatic ingestion from C2M render completion
- Manual Submitted state
- Exact filename/title publicity checks against configured contributor profile links
- Independent platform status
- Multi-platform account configuration

## Alpha 0.4 — Forge
- Integrate Forge as its own module
- Preserve Forge-specific workflows
- Optional handoff into C2M

## Beta / v1.0
- Plugin system
- Updater
- Task recovery
- Tests
- Windows packaging
- Stable .tamasrazim migrations

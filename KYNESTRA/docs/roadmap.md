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
- [x] Asset registry and listing
- [x] Render output ingestion service
- [x] SHA-256 duplicate detection
- [ ] Automatic C2M completion handoff
- [x] Platform account metadata
- [x] Account connection/disconnection state
- [x] Submission status records
- [x] Generic exact-filename public-status check against configured profile links
- [x] Separate found/not_found/blocked/unknown verification result
- [ ] Platform-specific connectors for client-rendered stock sites
- [ ] Multi-platform account connectors

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

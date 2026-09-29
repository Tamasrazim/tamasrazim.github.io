# KYNESTRA Roadmap

## Alpha 0.1 — Foundation
- Core contracts
- .tamasrazim format
- SQLite schema
- Event and task contracts
- Desktop shell
- Project create/open/save

## Alpha 0.2 — KYNESTRA Renderer
- [x] Copy the existing KYNESTRA renderer into KYNESTRA as a separate module copy
- [x] Never modify the production KYNESTRA renderer
- [x] Package the KYNESTRA renderer copy through the Tauri build
- [x] Add C2M render and asset contracts
- [x] Add desktop launch path to C2M
- [x] Connect live render jobs to Core
- [x] Register completed renders with Vault

## Alpha 0.3 — Stock Vault
- [x] Asset registry and listing
- [x] Render output ingestion service
- [x] SHA-256 duplicate detection
- [x] Automatic C2M completion handoff
- [x] Platform account metadata
- [x] Account connection/disconnection state
- [x] Submission status records
- [x] Generic exact-filename public-status check against configured profile links
- [x] Separate found/not_found/blocked/unknown verification result
- [ ] Platform-specific connectors for client-rendered stock sites
- [ ] Multi-platform account connectors

## Alpha 0.4 — Forge
- [x] Integrate the existing Format Forge workspace as its own KYNESTRA module
- [x] Preserve Forge-specific conversion workflows
- [x] Package Forge through the Tauri build
- [x] Core asset handoff from Forge outputs
- [ ] Optional handoff into C2M

## Beta / v1.0
- Plugin system
- Updater
- Task recovery
- Tests (unit/integration coverage in Core; native Windows release build runs through the installer workflow)
- [x] Windows packaging and installer release workflow
- Stable .tamasrazim migrations

## Alpha 0.5 — Core integrity hardening
- [x] Enforce KYNESTRA-created working manifests
- [x] Keep task/render lifecycle state synchronized across failure paths
- [x] Recover task and render rows independently after restart
- [x] Validate package paths, required files, duplicate entries, and SHA-256 metadata
- [x] Write portable packages through a temporary archive before replacing the destination
- [x] Reject symlinked project files during package export
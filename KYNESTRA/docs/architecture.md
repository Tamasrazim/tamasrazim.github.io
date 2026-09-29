# KYNESTRA Architecture

KYNESTRA is a single desktop application with a small Core and independent modules.

## Core
- Project lifecycle
- SQLite metadata
- Event bus
- Persistent task registry
- Settings
- Module registry and descriptor validation
- Safe filesystem operations

## Modules
- Forge: independent creation/workspace module.
- C2M: Code Motion renderer.
- Stock Vault: local asset library and multi-platform publishing tracker.

Modules never depend on another module's private implementation. Cross-module communication uses Core service contracts, events, and stable IDs.

## Primary flow
Forge or external source -> project -> C2M -> rendered asset -> Stock Vault -> platform tracking

## Boundary rule
KYNESTRA development is confined to /KYNESTRA/. Existing production files outside that folder are not modified by the KYNESTRA project.

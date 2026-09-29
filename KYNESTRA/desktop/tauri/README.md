# KYNESTRA Desktop

The desktop application is a Tauri 2 shell over the KYNESTRA Core runtime.

## Layout

- ../shell — vanilla HTML/CSS/JS frontend
- src/core — database, projects, tasks, events
- src/lib.rs — Tauri commands and application bootstrap
- src/main.rs — native entry point

## Build

From KYNESTRA/desktop/tauri:

    cargo check
    cargo test
    cargo tauri dev
    cargo tauri build

Tauri serves ../shell directly through frontendDist. No Node runtime is required for the current shell.

## Runtime capabilities

- Core status
- local project creation
- .tamasrazim package initialization
- manifest validation
- SQLite initialization
- project listing/opening
- persistent task create/update
- recoverable render-job reset after interrupted sessions
- Core event emission
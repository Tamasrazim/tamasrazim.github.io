# NEON VAULT

**NEON VAULT** is a native Windows x64 first-person 3D puzzle adventure built around exploration, memory, timing, movement, and environmental challenges.

The game contains **100 floors**, arranged across ten puzzle families with increasing difficulty. There is no minimap: several rooms deliberately require you to remember routes, patterns, and positions.

## Highlights

- 100 deterministic floors with persistent progression
- 10 puzzle families:
  - Collect
  - Key + Door
  - Switch Gate
  - Pressure Plates + Pushable Crates
  - Memory
  - Timed Gate
  - Teleport Networks
  - Numbered Sequences
  - Moving Gates
  - Finale
- Three-star floor scoring and persistent unlocks
- Checkpoints on longer floors
- Sprint, stamina, jumping, mouse-look, and crate pushing
- Hazards and moving obstacles
- Native 3D menus, floor select, pause screen, settings terminal, credits room, and completion room
- PBR-style lighting baseline for the 3D scene
- Procedural chill background audio
- Internal render-scale control
- Optional performance monitor with FPS, frame time, culling, VRAM, and render resolution
- Windowed, borderless, and fullscreen modes
- F11 display-mode shortcut
- Optional inverted Y axis, sensitivity, FOV, UI scale, hints, screen shake, and crosshair settings
- Native Windows application icon
- x64 installer and portable ZIP
- Built-in updater that checks the latest GitHub release before launching the game
- Offline-safe launch fallback: when an update check cannot complete, the installed game still launches

## Controls

| Action | Control |
|---|---|
| Move | WASD |
| Look | Mouse |
| Sprint | Left Shift |
| Jump | Space |
| Interact | E |
| Pause | Esc |
| Restart floor | R |
| Settings while paused | S |
| Next settings row | Tab |

## Progression

Floor difficulty is increased in ten-floor tiers.

**Floor 1** is intentionally more demanding than a traditional tutorial. Its route is deterministic and designed around remembering a long serpentine path instead of following a map.

**Floor 100** is the final combined challenge and contains the largest puzzle configuration.

## Saving

Progress and settings are stored locally at:

`%LOCALAPPDATA%\Tamasrazim\NeonVault.cfg`

The save contains:

- Highest unlocked floor
- Stars earned on each floor
- Mouse sensitivity
- Invert Y
- FOV
- Hints
- Screen shake
- UI scale
- Crosshair selection
- Display mode
- Performance monitor
- Render scale

## Windows Distribution

The GitHub Actions workflow produces:

- `NEON-VAULT-Setup.exe` — Windows installer
- `NEON-VAULT-Portable.zip` — portable package
- `neon_vault_updater.exe` — native updater used by the normal launcher shortcut

The installer places the game and updater together. The normal **NEON VAULT** shortcut starts the updater first; a **NEON VAULT (Direct)** shortcut launches the game executable without checking for updates.

## Updating

The updater:

1. Checks the latest GitHub release.
2. Compares its embedded build number with the installed build.
3. Downloads the latest Windows installer when a newer release exists.
4. Runs the installer silently.
5. Falls back to the installed game when the update check or download cannot complete.

No separate launcher account or cloud save system is required.

## Building from Source

### Requirements

- Windows x64
- Visual Studio 2026 / MSVC
- CMake 3.21+
- Git

The project fetches **raylib 5.5** through CMake FetchContent.

### Configure

```powershell
cmake -S projects/razim-fps -B projects/razim-fps/build -G "Visual Studio 18 2026" -A x64
```

### Build

```powershell
cmake --build projects/razim-fps/build --config Release --parallel
```

The Release directory contains:

- `neon_vault.exe`
- `neon_vault_updater.exe`

### Validate the generated floors

```powershell
projects/razim-fps/build/Release/neon_vault.exe --validate
```

The validator checks all 100 generated floors for invalid geometry and protected-object placement. Floor 1 also performs a reachability check across its deterministic route.

## Automated Windows Build

The workflow:

1. Configures CMake with Visual Studio 2026.
2. Builds the game and native updater.
3. Runs the 100-floor validator.
4. Builds the Inno Setup installer.
5. Creates the portable ZIP.
6. Verifies the generated outputs.
7. Uploads CI artifacts.
8. Publishes a GitHub Release.

The updater's build number is taken from the GitHub Actions run number so release comparison can be performed without a separate backend.

## Rendering and Audio Notes

The game currently uses a **PBR-style lighting baseline** implemented with GLSL and raylib. This is not hardware ray tracing.

The background soundtrack is generated procedurally at runtime rather than shipping copyrighted music.

The internal render-scale setting renders the 3D scene to a smaller render target and scales it to the native window resolution. It is not DLSS, FSR, or XeSS.

## Optional Environment Artwork

The game can load an optional environment image from:

`assets/sky/tamanna.png`

The file is not required for the game to run. When absent, the game simply skips that artwork.

## Project Structure

```
projects/razim-fps/
├── main.cpp
├── platform_win.cpp
├── updater.cpp
├── neon-vault.rc
├── neon-vault.ico
├── CMakeLists.txt
├── installer.iss
├── index.html
└── assets/
```

## Licensing

This project code is released under the **MIT License** unless a more specific file states otherwise.

NEON VAULT uses **raylib**. Refer to the upstream raylib license for that dependency.

---

**NEON VAULT — Tamasrazim**

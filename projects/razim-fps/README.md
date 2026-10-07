# NEON VAULT 2.0

Native Windows first-person 3D puzzle adventure with 100 progressively harder levels.

## 100 levels

10 puzzle families are rotated through 100 deterministic rooms: collect, keys + doors, switches, pressure plates + pushable crates, memory, timed gates, teleport networks, numbered sequences, moving gates, and combined finale rooms. Difficulty increases every ten levels.

## Features

- 100 levels + level select
- Three-star scoring + persistent unlocks
- Normal mouse Y axis by default
- Invert Y setting
- Sensitivity + FOV controls
- Hints, screen shake, UI scale and crosshair settings
- Sprint + stamina + jump
- Crystals, keys, doors, switches, crates and pressure plates
- Memory, timed, teleport and sequence puzzles
- Moving gates, hazards and checkpoints
- Pause / restart / settings
- Final 100-level completion screen
- Vector HUD/menu icons
- Custom Windows application icon
- Native x64 installer + portable build
- Save data in %LOCALAPPDATA%\Tamasrazim\NeonVault.cfg

## Controls

WASD Move
Mouse Look
Shift Sprint
Space Jump
E Interact
Esc Pause
R Restart
S Settings while paused
Tab Next setting row

## Build

GitHub Actions builds the Windows executable with Visual Studio 2026 + CMake, creates the Inno Setup installer and portable ZIP, validates the outputs, uploads artifacts and publishes a GitHub Release.

Source: MIT. raylib: upstream license.

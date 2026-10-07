# NEON VAULT

A native 3D first-person exploration and collection game for Windows.

## Game

Explore a neon arena, collect all 20 crystals, then reach the exit pad before the 120-second timer ends.

Features:

- First-person mouse look
- WASD movement
- Shift sprint with stamina
- Space jump
- Moving gate obstacle
- 20 collectible crystals
- Countdown timer
- Exit objective
- Pause menu
- Win / time-out screens
- 144 FPS target
- Resizable window
- Native x64 Windows build
- No external art or content pack required

## Controls

WASD = move, mouse = look, Shift = sprint, Space = jump, Esc = pause/resume or quit, Enter = start/restart.

## Build locally

Prerequisites: Windows 10/11 x64, Visual Studio 2022 with Desktop C++ workload, and CMake 3.21+.

Run build.ps1 with PowerShell. CMake downloads raylib 5.5 during configuration and builds a static Windows executable.

## Installer

GitHub Actions builds a Windows installer and portable ZIP on every relevant push. The latest release is linked from the project page.

## License

The game source in this folder is released under the MIT license. raylib remains under its upstream license.


Build status: Windows CI validates the native executable and installer before publishing.

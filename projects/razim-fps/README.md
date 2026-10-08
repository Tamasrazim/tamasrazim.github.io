# NEON VAULT — final Windows game build

NEON VAULT is a native Windows x64 first-person puzzle game built around a deterministic 100-floor progression system.

## Game systems

- 100 floors with increasing difficulty tiers and ten visual themes
- Six objective families: crystal recovery, power restore, keycard breach, memory sequence, survival run, and vault sequence
- FPS movement, sprint, jump, mouse-look, interact, scan and hazard avoidance
- Roaming drones and moving hazards on later floors
- Unlock progression, three-star scoring, persistent save data and a 100-floor selector
- Main menu, pause menu, settings, credits, completion screen and game-over state
- Windowed, borderless and fullscreen display modes
- Mouse sensitivity, Y inversion, FOV, hints, screen shake, SFX/music volume, crosshair and performance settings
- Original 24-second looping instrumental soundtrack with WAV asset fallback; no vocals
- Seven-second in-engine 3D intro with connected vault geometry, deterministic camera motion and skip controls
- Windows x64 installer, direct executable and updater

## Mouse behavior

The Windows cursor stays free on the intro, menus, floor select, settings, credits and pause screens.

1. Enter a floor.
2. While PLAYING, the mouse is automatically captured for FPS look.
3. Press ESC to release the cursor and pause.
4. Resume to return to PLAYING and capture the mouse again.

The gameplay mouse uses native disabled-cursor input without manual cursor warping. UI screens keep the cursor free.

## Build

```
cmake -S projects/razim-fps -B projects/razim-fps/build -G "Visual Studio 18 2026" -A x64
cmake --build projects/razim-fps/build --config Release --parallel
```

## Validation

```
projects/razim-fps/build/Release/neon_vault.exe --validate
```

Validation checks all 100 generated floors for non-overlapping entity placement, static collision clearance, objective reachability, start-to-exit reachability, and aggregate content counts.

## Gameplay rebuild 142

The current unreleased gameplay rebuild hardens frame clearing, procedural placement, memory-puzzle reset behavior, pause/resume state, objective-driven exit rendering, screen-shake feedback, and high-resolution industrial texture assets. The Windows CI/release pipeline is intentionally not triggered by this working branch.

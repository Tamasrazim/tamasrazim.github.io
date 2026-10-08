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
- Original 30-second looping instrumental soundtrack generated locally by the game at startup; no vocals
- Animated 15-second startup intro with skip controls
- Windows x64 installer, direct executable and updater

## Mouse behavior

The Windows cursor stays free on the intro, menus, floor select, settings, credits and pause screens.

1. Enter a floor.
2. While PLAYING, the mouse is automatically captured for FPS look.
3. Press ESC to release the cursor and pause.
4. Resume to return to PLAYING and capture the mouse again.

The capture routine centers the cursor only when gameplay capture begins. UI screens never reposition a free cursor.

## Build

```
cmake -S projects/razim-fps -B projects/razim-fps/build -G "Visual Studio 18 2026" -A x64
cmake --build projects/razim-fps/build --config Release --parallel
```

## Validation

```
projects/razim-fps/build/Release/neon_vault.exe --validate
```

Validation checks all 100 generated floors for clear spawn/objective positions and start-to-exit reachability.

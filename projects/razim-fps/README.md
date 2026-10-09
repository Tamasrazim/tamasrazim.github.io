# NEON VAULT — gameplay stability rebuild

NEON VAULT is a native Windows x64 first-person puzzle game built around 100 deterministic floors and six objective families.

## Game systems

- 100 deterministic floors in ten escalating difficulty/theme tiers
- Crystal recovery, power restore, keycard, ordered-memory, survival and combo objectives
- Floor 100 is **THE VAULT CORE**, a final combo objective with crystals, switches, a keycard and four memory fragments
- Native mouse-look with disabled-cursor capture; no cursor-position warp
- Swept, axis-separated movement collision to reduce wall tunnelling at low frame rates
- Floor reachability, pickup/switch reachability, objective inventory and memory-order validation
- Automatic level repair that keeps puzzle objects on the map and does not silently replace a broken puzzle with a different objective
- Retryable memory sequences: a wrong pick restores the sequence fragments, with a time/health penalty
- Main menu, 100-floor selector, pause/resume, settings, credits, completion and game-over screens
- Windowed, borderless and fullscreen display modes
- Mouse sensitivity, Y inversion, FOV, hints, screen shake, crosshair, music/SFX volume and performance display
- 30 dedicated 500×500 procedural material textures with trilinear filtering and generated mipmaps
- Original instrumental soundtrack plus an independently looping procedural beat layer
- 4.5-second in-engine 3D intro with skip controls
- Fractured-piece animations, interaction bursts, damage feedback and moving hazards
- Custom-branded Windows installer and uninstaller, direct executable shortcut and updater

## Controls

WASD moves, mouse looks, Left Shift sprints, Space jumps, E interacts, Q scans, and Esc pauses/releases the mouse. Menus and settings support clickable controls as well as keyboard navigation.

## Mouse behavior

The cursor stays free on intro/menu/floor select/settings/credits/pause. Starting a floor enables native disabled-cursor capture for FPS look; no pointer warp is used. Esc releases the cursor and pauses, Resume returns to the same floor state, and losing window focus releases the capture and pauses safely.

## Build

```powershell
cmake -S projects/razim-fps -B projects/razim-fps/build -G "Visual Studio 18 2026" -A x64
cmake --build projects/razim-fps/build --config Release --parallel
```

## Validation

```powershell
projects/razim-fps/build/Release/neon_vault.exe --validate
```

The validator checks all 100 generated floors for finite/in-bounds geometry, legal wall intersections (excluding intentional boundary-corner joins), reachable puzzle objects, objective inventory, unique sequential memory fragments and safe hazard placement. The asset audit checks all 30 BMP headers/dimensions, the WAV collection, mouse path, fractured-piece systems, installer branding and the 25 MB decimal runtime-asset target.

## Asset budget

The 30 generated material textures total **22,501,620 bytes**. The WAV assets add **2,934,400 bytes**, for **25,436,020 bytes** (25.44 MB decimal / 24.26 MiB) of raw texture-plus-audio assets before executable/updater files and installer compression.

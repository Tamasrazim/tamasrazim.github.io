# NEON VAULT — stability rebuild

NEON VAULT is a native Windows x64 first-person puzzle game with a deterministic 100-floor progression system.

## Game systems

- 100 deterministic floors across ten difficulty/theme tiers
- Six objective families: crystal recovery, power restore, keycard breach, memory sequence, survival run, and vault sequence
- FPS movement, sprint, jump, native mouse-look, interact, scan and moving hazards
- Persistent unlocks, three-star scoring, save data and 100-floor selector
- Main menu, pause/resume, settings, credits, completion and game-over states
- Windowed, borderless and fullscreen display modes
- Mouse sensitivity, Y inversion, FOV, hints, screen shake, crosshair and performance options
- 28 dedicated 500×500 procedural material textures plus the original supporting texture set
- Original instrumental soundtrack plus a layered procedural beat track
- 4.5-second in-engine 3D intro with skip controls
- Windows x64 installer, custom-branded uninstaller, direct executable and updater

## Mouse behavior

The cursor stays free on intro/menu/floor select/settings/credits/pause.

When a floor starts, Windows native disabled-cursor capture is enabled for FPS look. No cursor-position warp is used. ESC releases the cursor and pauses; resume captures it again. Focus loss also releases the capture and pauses.

## Build

```
cmake -S projects/razim-fps -B projects/razim-fps/build -G "Visual Studio 18 2026" -A x64
cmake --build projects/razim-fps/build --config Release --parallel
```

## Validation

```
projects/razim-fps/build/Release/neon_vault.exe --validate
```

Validation checks all 100 generated floors for wall overlap, objective reachability and start-to-exit reachability. Generated levels are repaired before launch if decorative geometry creates an invalid pocket.

## Asset budget

The shipped game asset set is intentionally just over the 25 MB target: about 24,959,292 bytes before the native executable/updater are added, with the executable pushing the installed payload above 25 MB. Procedural source seeds remain in the repository but are not copied into the runtime package.

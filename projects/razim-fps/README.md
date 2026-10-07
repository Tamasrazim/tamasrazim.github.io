
# NEON VAULT — v2 asset-backed rebuild

This is a ground-up rewrite of the previous prototype.

The previous build was only a small executable because almost all visual content and audio were generated at runtime and the project contained essentially no real asset files.

This build ships real content:
- 8 environment textures
- 2 OBJ 3D models
- 4 WAV sound effects
- 100 deterministic floors
- five objective families
- hazards and roaming drones
- persistent unlocks and stars
- floor selector
- settings and pause systems
- Windows installer and portable package

Mouse behavior:
1. Enter a floor.
2. Click once to capture the mouse for FPS look.
3. Press ESC to release the mouse and pause.
4. Click Resume to capture it again.

The cursor is never trapped automatically on menus, settings, floor select, credits or pause.

Build:
cmake -S projects/razim-fps -B projects/razim-fps/build -G "Visual Studio 18 2026" -A x64
cmake --build projects/razim-fps/build --config Release --parallel

Validation:
projects/razim-fps/build/Release/neon_vault.exe --validate

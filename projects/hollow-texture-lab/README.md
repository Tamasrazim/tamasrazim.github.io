# HOLLOW Texture Lab

An original, self-contained procedural material workshop for the HOLLOW horror-game world.

## Open it

- Live page: https://tamasrazim.github.io/projects/hollow-texture-lab/

## Current features

- 16 original material families with 64 deterministic recipe settings each (1,024 catalogue entries).
- Distinct material treatments for concrete, damp walls, plaster, wallpaper, wood, metal, rust, stone, moss, soil, mud, asphalt, tile, fabric, leather, and fictional organic surfaces.
- Search, category filters, sorting, pagination, random selection, and editable seeds.
- Locally rendered preview, surface scale, wear, brightness, roughness, and tile repetition controls.
- Export choices from 512 px through 8192 × 8192 (8K).
- Base-color, roughness, height, and normal-style map output.
- No external textures, libraries, fonts, CDNs, APIs, or accounts.

## Accuracy and performance notes

This is an original procedural system, not photogrammetry or a scanned-surface library. Its current roughness, height, and normal-style maps are algorithmic approximations, not calibrated scans. The generator is designed around periodic noise and repeating material structures; verify seams and map behavior in the target game engine before production use.

8K output is 67.1 million pixels and may consume several hundred MiB of memory. High-resolution output requires a modern browser with OffscreenCanvas worker support. Start at 2K or 4K if the browser or device runs out of memory. GitHub Pages serves the application source; the texture pixels are generated locally and are not stored as thousands of binary images in the repository.

## Implementation

Plain HTML, CSS, JavaScript Canvas APIs, and a generated Web Worker. No runtime dependency on third-party services.

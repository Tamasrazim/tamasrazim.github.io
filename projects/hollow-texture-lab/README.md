# HOLLOW Texture Lab

A free, browser-based procedural material library built for the HOLLOW horror-game world.

## Open it
Visit: https://tamasrazim.github.io/projects/hollow-texture-lab/

## What is in the library?
- 16 material families.
- 192 deterministic recipes per family.
- 3,072 searchable recipe variations.
- Category filtering, paging, random selection, and recipe IDs.
- Live material preview on a sphere, faceted object, wall panel, or floor plane.
- Local procedural generation with adjustable scale, wear, and brightness.
- PNG export at 512, 1024, or 2048 pixels.
- Base-color, roughness-approximation, and normal-style-approximation map modes.
- No paid assets, external libraries, account, or backend.

## Important accuracy note
The 3,072 entries are procedural recipes, not 3,072 pre-rendered files committed to Git. The browser generates a selected recipe's pixel data on demand. Roughness and normal-style outputs are artistic approximations, not calibrated physically based maps. This is an initial texture workbench; it does not yet provide full PBR calibration, guaranteed seamless tiling, or a real WebGL mesh renderer.

## How it works
The page uses ordinary HTML, CSS, and JavaScript Canvas APIs. It works locally in a modern browser and can be hosted as a static GitHub Pages page. PNG export runs in the browser.

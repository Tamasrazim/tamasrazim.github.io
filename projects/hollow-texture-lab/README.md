# HOLLOW Texture Lab

A curated library of original, individually authored surface artwork for the HOLLOW horror-game project.

## Current collection

Each asset is a separate static SVG artwork. The page does not generate textures from procedural recipes and does not use third-party runtime libraries, remote images, CDNs, fonts, or APIs.

- `assets/brick-wall-aged.svg` — fired-clay brick courses, recessed mortar, varied brick faces, stains and hand-placed wear.
- `assets/concrete-pitted-wall.svg` — concrete pores, aggregate scars, streaking and chipped areas.
- `assets/aged-pine-planks.svg` — separate timber boards, knots, grain lines, splits and worn edges.
- `assets/rusted-sheet-metal.svg` — corroded steel, paint loss, rust blooms, scratches and fasteners.
- `assets/cracked-ceramic-tile.svg` — old ceramic tiles, grout, glaze wear, chips and cracks.

## Exporting

Open the live page and select an asset. Download its original SVG master, or export a PNG at 512, 1024, 2048, 4096 or 8192 pixels wide. PNG export scales the authored drawing; it cannot create extra photographic detail beyond the original artwork. Large exports may require substantial memory.

## Important quality status

These first five assets are authored vector illustrations, not photographs, scanned materials, or photogrammetry. They are not yet validated as seamless PBR textures. The normal/roughness/height-map generator has been removed from the main interface because the goal is now unique, separately built artwork rather than procedural variants. More materials should be drawn and reviewed as individual assets before calling the collection production-ready.

## Local-first

All assets are in this repository and served from the same site. The gallery has no external runtime dependencies.

Live page: https://tamasrazim.github.io/projects/hollow-texture-lab/

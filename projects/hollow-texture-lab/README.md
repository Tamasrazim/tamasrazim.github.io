# HOLLOW Texture Lab

A curated library of original, individually authored surface artwork for the HOLLOW horror-game project.

## Current collection

Each asset is a separate static SVG artwork. The gallery uses separate authored SVG masters and a local JavaScript compositor. The compositor adds material-specific micrograin, wear, streak and scratch layers to the selected master. It uses no third-party runtime libraries, remote images, CDNs, fonts, or APIs.

- `assets/brick-wall-aged.svg` — fired-clay brick courses, recessed mortar, varied brick faces, stains and hand-placed wear.
- `assets/concrete-pitted-wall.svg` — concrete pores, aggregate scars, streaking and chipped areas.
- `assets/aged-pine-planks.svg` — separate timber boards, knots, grain lines, splits and worn edges.
- `assets/rusted-sheet-metal.svg` — corroded steel, paint loss, rust blooms, scratches and fasteners.
- `assets/cracked-ceramic-tile.svg` — old ceramic tiles, grout, glaze wear, chips and cracks.
- `assets/peeling-wallpaper.svg` — faded ornamental print, torn paper, exposed backing and damp marks.
- `assets/damp-plaster.svg` — mineral tide marks, salt bloom, branching cracks and chipped plaster.
- `assets/worn-corridor-carpet.svg` — flattened traffic lanes, faded ornament, pulled fibers and frayed edges.

## Layered material workbench

The gallery includes a browser-based layer composer. Every material has a separate tuned profile for grain scale, surface breakup, directional grain, wear and scratches. Toggle the layers and tune their overall strength before exporting. The original authored SVG remains available independently of the compositor.

The compositor builds a layered PNG at the selected output resolution (512, 1024, 2048, 4096 or 8192 pixels wide). The added micrograin is deterministic per material so the detail does not jump between preview and export. It improves surface breakup but does not magically add captured photographic information.

The height and roughness options are **artistic approximations**, not measured PBR scans. They should not be described as production-calibrated material maps without further authored or scanned data.

## Original-master export

Download each authored SVG master directly from the gallery. The original-master export is separate from the layered PNG compositor. Large PNG exports may require substantial browser memory.

## Important quality status

These eight base assets are authored vector illustrations, not photographs, scanned materials, or photogrammetry. They are not yet validated as seamless PBR textures. The new layer compositor adds material-specific noise and wear but cannot make the master a photogrammetry scan. Its height/roughness outputs are visual approximations, not physical measurements. The second collection adds three distinct surfaces built as separate static SVG artworks. More materials should be drawn and reviewed as individual assets before calling the collection production-ready.

## Local-first

All assets are in this repository and served from the same site. The gallery has no external runtime dependencies.

Live page: https://tamasrazim.github.io/projects/hollow-texture-lab/

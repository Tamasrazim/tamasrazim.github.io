# HOLLOW Texture Lab

A browser-based catalogue of distinct, named CC0 PBR material assets for the HOLLOW horror-game world.

## Open it

- Live catalogue: https://tamasrazim.github.io/projects/hollow-texture-lab/
- Original asset library: https://ambientcg.com/
- License: CC0 1.0 for the listed ambientCG source materials.

## Current catalogue

- 33 distinct named source materials across concrete, masonry, rock, wood, fabric, rust, metal, painted metal, and tile categories.
- Search, category filtering, sorting, pagination, and random selection.
- Source-material preview images, loaded from the catalogue CDN.
- A direct source-page link for each material.
- No procedural texture synthesis, seed-based variants, fake PBR map generation, or duplicate recipe entries.

## Important accuracy note

This page is a catalogue, not a locally bundled texture archive. Preview images are material previews; they are not presented as the downloadable base-color maps. Open the linked original source page to inspect and obtain the available PBR maps and check the current license details. The assets are separate source materials, not original textures authored by this repository. The app requires an internet connection to load remote previews and source pages.

## Implementation

The catalogue uses plain HTML, CSS, and JavaScript and can be hosted on static GitHub Pages. It does not synthesize image pixels or claim that a preview is a full-resolution PBR map.

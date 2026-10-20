# FRACTURE asset pipeline

These two same-origin SVG atlases are original vector artwork for the standalone WebGL2 game. The browser rasterizes each 4096 × 4096 atlas to up to 4096 × 4096 on desktop or 2048 × 2048 on touch devices, never exceeding the GPU's maximum texture size, then generates mipmaps.

## Material atlas

`material-atlas.svg` is a 4K square atlas divided into sixteen 1024 × 1024 cells. It contains basalt, moss, concrete, brushed steel, glacial ice, magma, oxidized metal, dune sand, circuit ceramic, hazard armor, shattered glass, root bark, ancient ruin, aureate machinery, alien organic and fracture-energy surface treatments.

The fragment shader uses world-space triplanar projection, so the materials do not require UVs and do not stretch across cube corners the way a single planar mapping would.

## Surface-marking atlas

`surface-decals.svg` is a transparent 4K square atlas with sixteen isolated 1024 × 1024 cells. It contains hazard chevrons, relay sigils, fracture runes, vents, access panels, cracks, route markings, bolt patterns, grids, bio-glyphs, security rings, ancient signs, energy loops, scuffs and shard markings.

The shader composites these details at a larger world scale so that the markings read as environmental surface detail rather than fine-grain noise.

## Runtime behavior

- The textures are loaded asynchronously from this folder; no CDN, third-party runtime, or build step is required.
- A neutral one-pixel fallback texture keeps the renderer usable while assets load.
- Atlas upload is capped at `MAX_TEXTURE_SIZE`; touch devices target 2048 pixels to conserve memory, while desktop targets 4096. A canvas downscale fallback handles GPUs with a lower limit.
- Mipmaps and linear filtering reduce aliasing at distance.
- If an asset fails to load, the procedural material shader remains available and logs a console warning.

The art is vector-authored and rasterized by the browser. Repository source size is therefore not equal to GPU texture memory: a 4096 × 4096 RGBA texture occupies about 64 MiB before mipmaps, while its SVG source is much smaller.

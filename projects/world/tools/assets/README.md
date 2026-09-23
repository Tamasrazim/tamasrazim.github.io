# World Asset Pipeline

The world uses three asset families.

## Materials

Start with a generated or photographed source, make it seamless, then derive:

- albedo
- normal
- roughness
- height
- ambient occlusion

Preferred runtime formats are WebP/AVIF for image layers and GLB for 3D props.

## Audio

Source audio is normalized and exported to OGG. Keep short variations instead of one repeated sample:

- footsteps
- wind
- UI
- discovery
- machinery
- ambience

## Procedural layer

Terrain, mineral distribution and some atmospheric detail remain procedural. This keeps the planet data compact while reserving file size for high-value materials, meshes and audio.
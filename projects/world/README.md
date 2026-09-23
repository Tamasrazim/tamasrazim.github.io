# Tamasrazim World

The portfolio is an explorable first-person world.

Controls:
- Click: capture mouse
- WASD: move
- Shift: sprint
- E: discover a nearby landmark
- M: planetary map
- Esc: release pointer / close overlays

Architecture:
- WebGL2 renderer with no runtime dependency
- Procedural height-field terrain with chunk rebaking
- Data-driven project landmarks
- Dedicated source and browser-ready dist layers
- Asset pipeline separated from runtime

Asset target:
50 MB+ of real project content as the world grows. Heavy materials, models and audio should be loaded on demand so the first visit stays lightweight.
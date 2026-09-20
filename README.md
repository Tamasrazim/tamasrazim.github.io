# ROBIUL RUMMAN RAZIM — TAMASRAZIM

<p align="center">
  <a href="https://tamasrazim.github.io/">Website</a>
  ·
  <a href="https://github.com/Tamasrazim">GitHub</a>
  ·
  <a href="https://www.linkedin.com/in/Tamasrazim/">LinkedIn</a>
</p>

---

## Digital Identity

**Robiul Rumman Razim — Tamasrazim**

This repository contains the source for the Tamasrazim personal web experience: an animation-focused, interactive digital identity built around motion, experimentation, and a continuously evolving interface.

The repository is the source of truth for the website.

---

## Animation Renderer — Tamasrazim

### Built from a stock contributor's workflow, for stock contributors.

The renderer exists for a practical reason: create animation assets from code, prepare them cleanly, and turn them into files that can be used in a stock-content workflow.

The idea is simple:

**Write animation code → Paste it → Preview it → Choose your render settings → Render → Prepare metadata → Download → Ready-to-upload stock animation → Submit → If approved, earn from the work.**

The renderer is designed to keep the exported visual itself clean. Tamasrazim branding, interface controls, or watermarks are not intended to be burned into the animation output.

### Workflow

**CODE**
→ **PREVIEW**
→ **RENDER**
→ **SETTINGS**
→ **CONFIRM**
→ **RENDERING**
→ **MINI-GAME**
→ **COMPLETE**
→ **DOWNLOAD**

During the workflow, the contributor controls the important production choices such as duration, frame rate, resolution, output format, and looping/recording behavior.

The browser renderer reports the formats it can actually produce rather than pretending that unsupported browser exports are available.

### Animation example

The renderer itself is the live example: open it, load or write an animation, preview it, configure the render, and produce the asset.

**[Open Animation Renderer — Tamasrazim](https://tamasrazim.github.io/renderer/)**

The goal is not simply to demonstrate an animation. The goal is to demonstrate the complete path from **animation code to a downloadable stock-content asset**.

---

## Website Motion System

The website uses a custom motion architecture for continuous interaction and scene behavior, including:

- Cursor-responsive motion
- Kinetic typography
- Text deformation and zoom
- Magnetic interactions
- Fluid contact/email field interaction
- Scroll choreography
- Canvas-based ambient effects
- Motion layers and depth
- Responsive and reduced-motion handling
- Renderer preview integration

The interaction system is implemented independently for Tamasrazim rather than copying another site's source code or assets.

---

## Repository Structure

- `index.html` — main identity site
- `assets/css/site.css` — website styling
- `assets/js/boot.js` — boot and progressive enhancement
- `assets/js/site.js` — site interactions and effects
- `assets/js/motion-core.js` — centralized motion and scene architecture
- `renderer/` — Animation Renderer — Tamasrazim
- `og-image.png` — social preview image
- `robots.txt` / `sitemap.xml` — search discovery
- `404.html` — GitHub Pages fallback

---

## Development

The website is designed as a static GitHub Pages project. There is no required application build pipeline for the main site.

Open `index.html` through a local static server when testing browser behavior, or visit the live site.

For renderer development, see the files inside `renderer/`.

---

## Links

- **Website:** https://tamasrazim.github.io/
- **Animation Renderer:** https://tamasrazim.github.io/renderer/
- **GitHub:** https://github.com/Tamasrazim
- **LinkedIn:** https://www.linkedin.com/in/Tamasrazim/

---

<sub>Built as an evolving digital identity and animation-production experiment.</sub>

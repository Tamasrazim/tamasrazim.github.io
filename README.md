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

**Write animation code → Paste it → Preview it → Choose render settings → Run preflight → Render frame-by-frame → Prepare metadata → Download → Ready-to-upload stock animation → Submit → If approved, earn from the work.**

The renderer is designed to keep the exported visual itself clean. Tamasrazim branding, interface controls, or watermarks are not intended to be burned into the animation output.

### Render engine

The production video path is built around deterministic frame generation when the browser exposes WebCodecs:

**Frame N → render at N / FPS → encode → timestamp → next frame**

That means output generation does not depend on the preview playing in real time. A slow machine may take longer to render, but the requested frame sequence remains explicit rather than being driven by realtime capture.

The renderer probes the current browser/device for supported encoder configurations before offering deterministic codecs. The current deterministic path targets browser-exposed VP8, VP9 and AV1 encoders packaged into WebM. MediaRecorder remains available as an explicitly labeled realtime fallback where the browser exposes formats such as H.264/MP4.

WebCodecs availability is browser-dependent, so the renderer reports what the current environment can actually configure rather than presenting a fixed list of imaginary codecs.

### Exact loop

The output duration and animation loop duration are independent.

Example:

**Output: 30 seconds**  
**Loop: 5.000 seconds**

The renderer evaluates the animation clock modulo the exact loop duration while still producing the full requested output frame count.

### Workflow

**CODE**
→ **PREVIEW**
→ **RENDER**
→ **SETTINGS**
→ **PREFLIGHT**
→ **CONFIRM**
→ **RENDERING**
→ **MINI-GAME**
→ **COMPLETE**
→ **DOWNLOAD**

The contributor controls resolution, frame rate, duration, loop behavior, bitrate, keyframe interval, hardware-acceleration hint, output codec where supported, transparency for stills, and stock metadata.

### Animation example

The renderer itself is the live example: open it, load or write an animation, preview it, configure the render, run preflight, and produce the asset.

**[Open Animation Renderer — Tamasrazim](https://tamasrazim.github.io/renderer/)**

The goal is not simply to demonstrate an animation. The goal is to demonstrate the complete path from **animation code to a downloadable stock-content asset**.

### PWA

The renderer includes an installable offline-oriented PWA shell with a versioned service-worker cache and update detection.

---

## Stock Asset Vault — Tamasrazim

A local-first stock asset organizer for the renderer workflow.

**Workflow:**
**Render → Import → Inspect → Add metadata → Track status → Download**

The vault stores imported image/video assets in the browser's IndexedDB rather than uploading them to a server. It supports asset previews, search, type/status filters, title, description, keywords, notes, per-asset download, metadata JSON export, deletion, and an installable PWA shell.

**Open Stock Asset Vault:** https://tamasrazim.github.io/asset-vault/

The project is designed as a companion to Animation Renderer — Tamasrazim: the renderer produces the asset; the vault keeps the finished asset and its submission metadata organized locally.

---

## BNC AgroCare

BNC validation runs automatically with `tools/validate_bnc.mjs` through GitHub Actions.

**BNC canonical source:** `projects/bncagrocare/` in this repository. `Tamasrazim/bncagrocare` is the backup mirror.

An agriculture-focused project with a public company website and a local-first invoice PWA.

**Project page:** https://tamasrazim.github.io/projects/bncagrocare/  
**BNC site:** https://tamasrazim.github.io/bncagrocare/  
**Invoice PWA:** https://tamasrazim.github.io/bncagrocare/invoice/  
**Repository:** https://github.com/Tamasrazim/bncagrocare

The invoice workflow is:

**Fill the boxes → Live A4 preview → Save invoice → Print / PDF**

The PWA keeps invoice drafts and saved invoice history in the browser with IndexedDB. JSON backup is available, and the original spreadsheet remains a reference rather than the editing interface.

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
- `renderer/` — Animation Renderer — Tamasrazim
- `projects/bncagrocare/` — BNC AgroCare project page
- `asset-vault/` — Stock Asset Vault — Tamasrazim
- `renderer/js/app.js` — renderer UI, timeline, settings, preview and workflow
- `renderer/js/video-engine.js` — deterministic WebCodecs frame encoder and WebM muxer
- `renderer/manifest.webmanifest` — PWA manifest
- `renderer/sw.js` — offline cache and update handling
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
- **Stock Asset Vault:** https://tamasrazim.github.io/asset-vault/
- **GitHub:** https://github.com/Tamasrazim
- **LinkedIn:** https://www.linkedin.com/in/Tamasrazim/

---

<sub>Built as an evolving digital identity and animation-production experiment.</sub>

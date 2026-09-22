# ROBIUL RUMMAN RAZIM — TAMASRAZIM

<p align="center">
  <a href="https://tamasrazim.github.io/">Website</a>
  ·
  <a href="https://github.com/Tamasrazim">GitHub</a>
  ·
  <a href="https://www.linkedin.com/in/Tamasrazim/">LinkedIn</a>
</p>

---

## What this repository is

This is the source-of-truth repository for **Robiul Rumman Razim — Tamasrazim**.

It contains the main digital identity site plus standalone browser projects and production tools. The repository is intentionally organized so the root stays focused on the personal site while project implementations live under `projects/`, and shared website code stays under `assets/`.

## Live projects

| Project | What it is | Live |
| --- | --- | --- |
| **Code → Motion** | Deterministic browser-first animation renderer | https://tamasrazim.github.io/projects/code-motion/ |
| **Animation Renderer** | Full rendering workflow / production renderer PWA | https://tamasrazim.github.io/renderer/ |
| **Stock Asset Vault** | Local-first asset organization and metadata workspace | https://tamasrazim.github.io/asset-vault/ |
| **BNC AgroCare** | Agricultural product catalogue + invoice PWA | https://tamasrazim.github.io/projects/bncagrocare/ |
| **Repo Token Meter** | Repository source-footprint measurement tool | https://tamasrazim.github.io/projects/repo-token-meter/ |

## Repository map

```text
/
├── index.html                         # Tamasrazim personal site
├── assets/
│   ├── css/                           # shared site styling
│   └── js/                            # boot, motion and site runtime
├── projects/
│   ├── index.html                     # canonical public project index
│   ├── code-motion/                   # Code → Motion project
│   │   ├── index.html                 # project landing page
│   │   ├── renderer.html              # canonical renderer
│   │   ├── legacy-renderer.html       # archived renderer build
│   │   └── media-stack.js              # media descriptors
│   ├── bncagrocare/                   # BNC business project
│   │   ├── index.html                 # company website
│   │   ├── invoice/                   # Invoice Studio PWA
│   │   └── reference/                 # reference material
│   └── repo-token-meter/              # standalone utility
├── renderer/                          # Animation Renderer PWA
├── asset-vault/                       # Stock Asset Vault PWA
├── tools/                             # project validators and contracts
├── scripts/                           # repository helper/check scripts
├── .github/workflows/                 # automated project validation
├── 404.html                           # GitHub Pages fallback
├── robots.txt                          # crawler rules
└── sitemap.xml                         # public route discovery
```

## Project notes

### Code → Motion

Canonical renderer source:

`projects/code-motion/renderer.html`

The repository also keeps root compatibility URLs for older inbound links:

- `/code-motion-tamasrazim.html`
- `/code-motion-tamasrazim2.html`

Those are entry-point compatibility files; the project source lives under `projects/code-motion/`.

### Animation Renderer

The production-oriented renderer lives under `renderer/`. Its main UI, deterministic video engine, PWA manifest, service worker and validation tooling stay together.

### Stock Asset Vault

`asset-vault/` is the companion local-first workspace for organizing rendered stock assets, previews, metadata and submission status.

### BNC AgroCare

BNC is maintained canonically under `projects/bncagrocare/`.

The public site is product-first and includes the current BNC product names and pack formats. The Invoice Studio is a separate local-first PWA under:

`projects/bncagrocare/invoice/`

The original `invoice.pdf` is an immutable project asset and remains the document master.

### Repo Token Meter

A standalone browser utility under `projects/repo-token-meter/` for measuring repository source footprint and estimating token volume. The measurement is an estimate of source text, not AI billing usage.

## Validation

Projects have their own automated checks:

- `tools/validate_site.mjs`
- `tools/validate_code_motion.mjs`
- `tools/validate_bnc.mjs`
- `tools/validate_renderer.py`
- `tools/validate_asset_vault.mjs`
- `tools/renderer-contract.ts`

GitHub Actions runs the relevant validation workflow when a project changes.

## Development

The main website is a static GitHub Pages site. There is no required root build pipeline.

The public project directory is `projects/`. Its index is `projects/index.html`; standalone applications that retain short top-level URLs, such as `/renderer/` and `/asset-vault/`, remain compatibility-friendly deployment surfaces.

For local browser testing, serve the repository through a static HTTP server rather than opening pages directly from `file://`.

Each standalone project keeps its own HTML/CSS/JS/PWA assets close to its implementation.

## Source-of-truth rule

When a project exists in both this repository and a separate deployment/backup repository, this repository is the canonical source unless the project documentation explicitly says otherwise.

For BNC AgroCare, `Tamasrazim/tamasrazim.github.io` is canonical and `Tamasrazim/bncagrocare` is the backup mirror.

## Links

- **Website:** https://tamasrazim.github.io/
- **Code → Motion:** https://tamasrazim.github.io/projects/code-motion/
- **Animation Renderer:** https://tamasrazim.github.io/renderer/
- **Stock Asset Vault:** https://tamasrazim.github.io/asset-vault/
- **BNC AgroCare:** https://tamasrazim.github.io/projects/bncagrocare/
- **Repo Token Meter:** https://tamasrazim.github.io/projects/repo-token-meter/
- **GitHub:** https://github.com/Tamasrazim
- **LinkedIn:** https://www.linkedin.com/in/Tamasrazim/

---

<sub>Source of truth for the Tamasrazim web ecosystem.</sub>

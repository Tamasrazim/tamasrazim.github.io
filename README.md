# ROBIUL RUMMAN RAZIM — TAMASRAZIM

<p align="center">
  <a href="https://tamasrazim.github.io/">Website</a>
  ·
  <a href="https://tamasrazim.github.io/projects/">Projects</a>
  ·
  <a href="https://github.com/Tamasrazim">GitHub</a>
  ·
  <a href="https://www.linkedin.com/in/Tamasrazim/">LinkedIn</a>
</p>

---

## Source of truth

This repository is the canonical source for **Robiul Rumman Razim — Tamasrazim** and the public projects maintained under the Tamasrazim web ecosystem.

The public structure is intentionally split into:

- the personal website at the root;
- the public project hub under `/projects/`;
- the dedicated Stock Asset Vault application at `/asset-vault/`;
- project implementations and business tools grouped under `projects/`.

There is no separate production repository that should silently replace the files in this repository.

## Canonical public routes

| Route | Purpose |
| --- | --- |
| `/` | Main Tamasrazim personal website |
| `/projects/` | Canonical public project index |
| `/projects/code-motion/` | Code → Motion project page |
| `/projects/code-motion/renderer.html` | Canonical Code → Motion renderer |
| `/asset-vault/` | Standalone Stock Asset Vault PWA |
| `/projects/bncagrocare/` | BNC AgroCare public website |
| `/projects/bncagrocare/invoice/` | BNC AgroCare Invoice Studio |
| `/projects/repo-token-meter/` | Repo Token Meter |

These are the routes that should be used for navigation, documentation and the sitemap.

## Repository map

```text
/
├── index.html                              # Main Tamasrazim website
├── assets/                                 # Shared main-site CSS/JS
│   ├── css/
│   └── js/
├── projects/
│   ├── index.html                          # Public project hub
│   ├── code-motion/
│   │   ├── index.html                      # Project landing page
│   │   ├── renderer.html                   # Canonical renderer
│   │   ├── legacy-renderer.html            # Archived renderer build
│   │   ├── media-stack.js                  # Media descriptors
│   │   └── README.md                       # Project documentation
│   ├── bncagrocare/
│   │   ├── index.html                      # Public BNC site
│   │   ├── invoice/                        # Invoice Studio PWA
│   │   └── reference/                      # Reference material
│   └── repo-token-meter/
│       └── index.html                      # Standalone utility
├── renderer/
│   └── index.html                          # Compatibility redirect to Code → Motion
├── asset-vault/
│   ├── index.html                          # Stock Asset Vault PWA
│   ├── manifest.webmanifest
│   └── ...                                 # Vault app assets
├── tools/                                  # Validation scripts
├── scripts/                                # Repository helpers
├── .github/workflows/                      # Automated checks
├── 404.html
├── robots.txt
└── sitemap.xml
```

## Project routing

### Code → Motion

Code → Motion owns its canonical renderer at:

`https://tamasrazim.github.io/projects/code-motion/renderer.html`

The project landing page is:

`https://tamasrazim.github.io/projects/code-motion/`

The root files:

- `/code-motion-tamasrazim.html`
- `/code-motion-tamasrazim2.html`

are compatibility entry points for older inbound links. They redirect to the current Code → Motion renderer and are not canonical project routes.

`projects/code-motion/legacy-renderer.html` is archived and should not be used by normal site navigation.

### Animation Renderer

The former standalone Animation Renderer has been archived. Its public compatibility route remains:

`https://tamasrazim.github.io/renderer/`

That route now redirects to the canonical Code → Motion project. The former renderer implementation is preserved on the `archive-animation-renderer-2026-09-24` branch and is not part of normal navigation, the sitemap, or the current product surface.

### Stock Asset Vault

The Stock Asset Vault is a separate local-first application:

`https://tamasrazim.github.io/asset-vault/`

It is used for organizing rendered stock assets, previews, metadata and submission status.

### BNC AgroCare

BNC AgroCare is maintained canonically in:

`projects/bncagrocare/`

Public site:

`https://tamasrazim.github.io/projects/bncagrocare/`

Invoice Studio:

`https://tamasrazim.github.io/projects/bncagrocare/invoice/`

The original invoice PDF remains the document master for the Invoice Studio workflow.

The separate repository `Tamasrazim/bncagrocare` is treated as a backup/mirror, while this repository remains the canonical source.

### Repo Token Meter

The Repo Token Meter lives at:

`https://tamasrazim.github.io/projects/repo-token-meter/`

It measures repository source footprint and estimates token volume from source text. The measurement is not a statement of AI billing.

## Navigation rules

The main website should link to canonical routes only.

The project hub should link to canonical project/application routes only.

Compatibility launchers may remain for older inbound links, but they should not appear in the sitemap or normal navigation.

Archived project builds may remain in the repository for recovery/reference, but they are not public canonical destinations.

## Validation

Relevant repository checks include:

- `tools/validate_site.mjs`
- `tools/validate_code_motion.mjs`
- `tools/validate_bnc.mjs`
- `tools/validate_renderer.py`
- `tools/validate_asset_vault.mjs`
- `tools/renderer-contract.ts`

GitHub Actions runs the relevant validation workflow when the corresponding project files change.

## Development

The site is deployed as a static GitHub Pages repository.

For browser testing, serve the repository through a local HTTP server rather than opening files directly with `file://`.

Each standalone project keeps its own HTML/CSS/JS/PWA files close to its implementation.

## Social / profile

- Website: https://tamasrazim.github.io/
- GitHub: https://github.com/Tamasrazim
- LinkedIn: https://www.linkedin.com/in/Tamasrazim/

---

<sub>Canonical source for the Tamasrazim web ecosystem.</sub>

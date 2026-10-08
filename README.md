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

## What this repository is

This repository is the public home of Tamasrazim: a personal website, a large collection of browser tools, creative and rendering projects, experiments, product work, and several flagship applications.

It is organized as a static-first GitHub Pages repository with self-contained public projects and a separate engineering and documentation layer.

### Current shape

| Area | Role |
| --- | --- |
| Website | Main personal site and identity surface |
| Projects | 1,200+ individually routed browser projects |
| Flagship apps | TRILYVA, CODE→EPS, CODE→SVG, NEON VAULT, BNC Agro Care and related products |
| Asset Vault | Stock and creative asset workspace |
| KYNESTRA | Architecture, modules, desktop and format work |
| Tools | Repository validators, generators and engineering utilities |
| Scripts | Small maintenance helpers |
| .github | CI/CD and GitHub automation |
| Docs | Repository architecture and policy |
| Licenses | Ownership and third-party notices |

---

## Public routes

| Route | Purpose |
| --- | --- |
| `/` | Main Tamasrazim personal website |
| `/projects/` | Public project collection |
| `/projects/code-motion/` | Legacy public route for the TRILYVA renderer family |
| `/projects/code-motion/renderer/` | TRILYVA renderer workspace |
| `/projects/code-motion/batch/` | TRILYVA batch surface |
| `/projects/code-to-eps/` | Browser vector/EPS tooling |
| `/projects/code-to-svg/` | Browser SVG tooling |
| `/projects/razim-fps/` | NEON VAULT |
| `/projects/bncagrocare/` | BNC Agro Care |
| `/projects/repo-token-meter/` | Repository Token Meter |
| `/asset-vault/` | Stock Asset Vault |
| `/KYNESTRA/` | KYNESTRA architecture/product workspace |
| `/renderer/` | Legacy/public renderer compatibility surface |

---

## Repository architecture

The repository is divided into clear zones rather than mixing everything together.

### Public runtime

`/` — Main website and GitHub Pages entry files.

`/assets/` — Site-wide images, brand material, styles and browser runtime assets.

`/projects/` — The public collection of self-contained applications and experiments.

`/asset-vault/` — Standalone Stock Asset Vault application.

`/renderer/` — Legacy/public renderer surface kept for route compatibility.

### Flagship products

`/projects/code-motion/` — TRILYVA public surface. The URL is intentionally preserved because the historical route is already public.

`/projects/code-to-eps/` — Vector/EPS tooling.

`/projects/code-to-svg/` — SVG tooling.

`/projects/razim-fps/` — NEON VAULT native Windows game, installer and release packaging.

`/projects/bncagrocare/` — BNC Agro Care application and supporting material.

`/KYNESTRA/` — KYNESTRA Core architecture, desktop work, modules, format definitions and releases.

### Engineering

`/.github/` — GitHub Actions and repository automation.

`/tools/` — Reusable validators, generators, contracts and maintenance tooling.

`/scripts/` — Small repository-level helper scripts.

### Documentation and ownership

`/docs/` — Repository documentation and architecture notes.

`/LICENSES/` — Project-specific proprietary and third-party notices.

Root governance files remain at root: `LICENSE`, `NOTICE.md`, `SECURITY.md`, `CONTRIBUTING.md`.

The complete folder map is in [docs/REPOSITORY-STRUCTURE.md](./docs/REPOSITORY-STRUCTURE.md) and [docs/REPOSITORY-MAP.md](./docs/REPOSITORY-MAP.md).

---

## Flagship projects

### TRILYVA

TRILYVA is the browser-based code-to-motion rendering workspace. The historical public URL remains `/projects/code-motion/renderer/`.

The repository keeps its renderer, library, batch surface and related project material together.

### NEON VAULT

Native Windows first-person puzzle game with 100 generated floors, settings, installer packaging, updater support and GitHub Actions release automation.

Latest production release: **neon-vault-116**

[Windows installer](https://github.com/Tamasrazim/tamasrazim.github.io/releases/download/neon-vault-116/NEON-VAULT-Setup.exe) · [Release page](https://github.com/Tamasrazim/tamasrazim.github.io/releases/tag/neon-vault-116)

### BNC Agro Care

Customer-facing application plus supporting reference, invoice and business files.

### KYNESTRA

A larger product architecture containing Core contracts, modules, desktop/Tauri work, format specifications, documentation and releases.

---

## Development model

This repository is designed around stable public routes.

Individual public projects normally keep their implementation, manifests, icons, service workers and project documentation inside their own folder.

Shared engineering code belongs in `/tools/` or `/scripts/`.

GitHub Actions belong in `/.github/workflows/`.

Documentation belongs in `/docs/`.

For browser testing, serve the repository through a local HTTP server rather than opening files directly with `file://`.

---

## Organization rules

1. Do not break public URLs just to make the tree look prettier.
2. Keep projects self-contained.
3. Keep shared tooling out of `/projects/`.
4. Keep documentation out of runtime folders unless it documents that specific project.
5. Keep licensing and ownership notices explicit.
6. Give flagship products their own visible boundary.
7. Use redirects or migrations before renaming public project folders.

This is why the repository has a deliberate mix of public runtime paths, engineering folders, product workspaces and documentation instead of one giant reorganized tree.

---

## Licensing

This repository is **source-available, not open source**. Original Tamasrazim code, libraries, datasets, vectors, project files and creative content are proprietary.

Do not copy, redistribute, mirror, republish, modify for redistribution, extract libraries or datasets for reuse, or incorporate original source or assets into another project without written permission.

See [LICENSE](./LICENSE), [NOTICE.md](./NOTICE.md), and [LICENSES/](./LICENSES/).

---

## Documentation

- [Repository documentation](./docs/)
- [Repository structure](./docs/REPOSITORY-STRUCTURE.md)
- [Repository map](./docs/REPOSITORY-MAP.md)
- [Licensing](./docs/LICENSING.md)
- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)

---

## Social

- Website: https://tamasrazim.github.io/
- GitHub: https://github.com/Tamasrazim
- LinkedIn: https://www.linkedin.com/in/Tamasrazim/
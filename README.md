# Robiul Rumman Razim — Tamasrazim

[Website](https://tamasrazim.github.io/) · [Selected projects](https://tamasrazim.github.io/projects/) · [GitHub](https://github.com/Tamasrazim)

## What this repository contains

This repository deploys my personal website and a curated set of real project pages on GitHub Pages. It also contains code, assets, product work, engineering checks, documentation, and release workflows behind those projects.

The former mass-generated one-page utility collection has been removed so the site and repository focus on projects I maintain and can explain.

## Public project pages

| Project | Public page |
| --- | --- |
| TRILYVA motion workspace | [Project overview](https://tamasrazim.github.io/projects/trilyva/) · [Open workspace](https://tamasrazim.github.io/projects/code-motion/renderer/) |
| NEO native Windows game | [Game page](https://tamasrazim.github.io/projects/neo/) · [Downloads](https://tamasrazim.github.io/projects/neo/download/) |
| TUNRUN C++ game in development | [Detailed project page](https://tamasrazim.github.io/projects/tunrun/) · [Live build / test status](https://github.com/Tamasrazim/TUNRUN/actions) |
| CODE → SVG | [Project page](https://tamasrazim.github.io/projects/code-to-svg/) · [Open workspace](https://tamasrazim.github.io/projects/code-to-svg/workspace/) |
| CODE → EPS | [Project page](https://tamasrazim.github.io/projects/code-to-eps/) · [Open workspace](https://tamasrazim.github.io/projects/code-to-eps/workspace/) |
| Format Forge | [Project page](https://tamasrazim.github.io/projects/format-forge/) · [Open workspace](https://tamasrazim.github.io/projects/format-forge/workspace/) |
| Stock Asset Vault | [Project page](https://tamasrazim.github.io/projects/asset-vault/) · [Open workspace](https://tamasrazim.github.io/asset-vault/) |
| KYNESTRA | [Project page](https://tamasrazim.github.io/projects/kynestra/) · [Downloads](https://tamasrazim.github.io/projects/kynestra/download/) |
| BNC AgroCare | [Business project](https://tamasrazim.github.io/projects/bncagrocare/) |
| Repo Token Meter | [Project page](https://tamasrazim.github.io/projects/repo-token-meter/) · [Open workspace](https://tamasrazim.github.io/projects/repo-token-meter/workspace/) |
| MailScope | [Project page](https://tamasrazim.github.io/projects/mail-scope/) · [Open workspace](https://tamasrazim.github.io/projects/mail-scope/workspace/) |
| Spiral Mic | [Project page](https://tamasrazim.github.io/projects/spiral-mic/) · [Open workspace](https://tamasrazim.github.io/projects/spiral-mic/workspace/) |
| Prism Web Icons | [Project page](https://tamasrazim.github.io/projects/prism-web-icons/) · [Open workspace](https://tamasrazim.github.io/projects/prism-web-icons/workspace/) |

## Repository layout

- Root: personal website, not-found page, sitemap, verification, governance, and deployment support files.
- assets: shared site styles, scripts, images, and branding; the original identity-card implementation remains in its existing styles and markup.
- projects: curated browser tools, game pages, vector workspaces, and business applications.
- asset-vault: standalone stock-asset workspace.
- KYNESTRA: product architecture, modules, desktop work, formats, and release material.
- renderer: legacy route kept for compatibility.
- tools and scripts: validators, engineering utilities, and maintenance.
- docs: repository architecture and policy.
- LICENSES: project-specific licensing and third-party notices.
- .github/workflows: CI, deployment, application checks, and native release automation.

## Structure rules

1. Keep the personal introduction about me, not about one particular project.
2. Keep the identity-card markup and original artwork intact.
3. Give each featured project a working project page; do not send visitors directly to source folders.
4. Distinguish browser tools, native games, and unfinished projects.
5. Preserve stable public paths for retained work.
6. Keep shared assets and scripts outside individual product folders unless a product owns the asset.
7. Run the site validation workflow before treating a structural change as complete.

## Validation

The site validator checks important routes and local references, duplicate HTML IDs, the original identity-card markup, JSON-LD, shared JavaScript parsing, key application pages, and the CODE→EPS icon library.
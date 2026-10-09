# Repository Structure

This is the maintained architecture for the Tamasrazim GitHub Pages repository. The goal is a smaller public project surface, clear product boundaries, stable paths for retained work, and a personal website that does not overstate unfinished work.

## Top-level architecture

| Path | Role |
| --- | --- |
| `/` | Personal website and GitHub Pages entry files |
| `/assets/` | Shared styles, scripts, images, and brand assets |
| `/projects/` | Curated product pages and creative experiments |
| `/asset-vault/` | Stock Asset Vault application |
| `/KYNESTRA/` | KYNESTRA product workspace |
| `/renderer/` | Legacy compatibility route |
| `/.github/workflows/` | CI, deployment, and native release automation |
| `/tools/` | Validators and engineering tools |
| `/scripts/` | Repository maintenance scripts |
| `/docs/` | Architecture and policy documentation |
| `/LICENSES/` | Ownership and third-party notices |

## Retained public project paths

- `/projects/trilyva/` — canonical TRILYVA project overview linked from the homepage and project directory.
- `/projects/code-motion/` — legacy TRILYVA route with a branded redirect to the overview.
- `/projects/code-motion/renderer/` — the actual TRILYVA editor and renderer.
- `/projects/code-to-svg/` and `/projects/code-to-eps/` — vector project overview pages.
- Their `/workspace/` routes hold the interactive applications.
- `/projects/neo/` — NEO project information and release entry point.
- `/projects/neo/download/` — clean canonical download page.
- `/projects/tunrun/` — TUNRUN project information.
- `/projects/format-forge/` — Format Forge project overview.
- `/projects/format-forge/workspace/` — browser file workflow.
- `/projects/mail-scope/` — MailScope project overview.
- `/projects/mail-scope/workspace/` — browser email/DNS workspace.
- `/projects/repo-token-meter/` — Repo Token Meter project overview.
- `/projects/repo-token-meter/workspace/` — repository analysis tool.
- `/projects/spiral-mic/` — Spiral Mic project overview.
- `/projects/spiral-mic/workspace/` — browser audio experiment.
- `/projects/prism-web-icons/` — Prism Web Icons project overview.
- `/projects/prism-web-icons/workspace/` — icon design workspace.
- `/projects/bncagrocare/` — BNC AgroCare project overview.
- `/projects/bncagrocare/catalog/` — catalogue workspace.
- `/projects/bncagrocare/invoice/` — invoice workspace.
- `/projects/asset-vault/` — Stock Asset Vault project overview.
- `/asset-vault/` — stock asset workspace.
- `/KYNESTRA/download.html` — KYNESTRA project information.

## Implementation rules

1. Keep shared website styles and scripts in `/assets/`.
2. Keep project-specific manifests and application files inside each maintained project folder.
3. Put reusable checks and repository tooling in `/tools/` and `/scripts/`.
4. Keep documentation separate from runtime implementation.
5. Preserve stable paths for retained work; never advertise a route that does not exist.
6. Keep the original identity-card HTML, styling, and artwork intact during site changes.
7. Label in-development work as in development.
8. Keep metadata aligned with the public pages.

## Removed generated utility pages

The repository previously carried more than 1,200 single-file utility routes. Those generated routes have been removed from the public tree to keep the directory focused on maintained projects. Git history still records earlier versions, but those retired pages are not current public routes.
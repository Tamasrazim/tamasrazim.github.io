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
- `/projects/code-to-svg/` and `/projects/code-to-eps/` — vector workspaces.
- `/projects/neo/` — NEO project information and release entry point.
- `/projects/neo/download/` — clean canonical download page.
- `/projects/tunrun/` — TUNRUN project information.
- `/projects/format-forge/` — browser file workflow.
- `/projects/mail-scope/` — browser email/DNS workspace.
- `/projects/repo-token-meter/` — repository analysis tool.
- `/projects/spiral-mic/` — audio experiment.
- `/projects/prism-web-icons/` — icon design workspace.
- `/projects/bncagrocare/` — business catalogue and invoice workflow.
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
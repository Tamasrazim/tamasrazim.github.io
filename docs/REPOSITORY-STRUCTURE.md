# Repository Structure

This is the canonical folder architecture for the repository.

The design goal is clarity without breaking public URLs. The repository contains a very large public project collection, so a purely cosmetic physical shuffle would make hundreds of routes harder to maintain and could invalidate existing links.

## Top-level architecture

| Path | Role | Stability |
| --- | --- | --- |
| `/` | Main GitHub Pages website and public root files | Public / stable |
| `/projects/` | 1,200+ self-contained browser projects | Public / stable |
| `/projects/code-motion/` | TRILYVA historical public route | Public / legacy-stable |
| `/projects/code-to-eps/` | Vector/EPS product | Public / stable |
| `/projects/code-to-svg/` | SVG product | Public / stable |
| `/projects/neo/` | NEO public product route | Public / stable |
| `/projects/razim-fps/` | NEO legacy source/build route | Public / compatibility |
| `/projects/bncagrocare/` | BNC Agro Care | Public / stable |
| `/projects/repo-token-meter/` | Repository measurement product | Public / stable |
| `/asset-vault/` | Stock Asset Vault | Public / stable |
| `/renderer/` | Legacy renderer route | Public / legacy-stable |
| `/KYNESTRA/` | KYNESTRA product workspace | Product workspace |
| `/assets/` | Shared website assets | Runtime support |
| `/.github/` | CI/CD and automation | Engineering |
| `/tools/` | Validators, generators and contracts | Engineering |
| `/scripts/` | Thin maintenance helpers | Engineering |
| `/docs/` | Repository documentation | Documentation |
| `/LICENSES/` | Ownership and third-party notices | Legal |

---

## Folder-by-folder rules

### `/`
Contains the main personal website and GitHub Pages support files.

Typical root files include `index.html`, `404.html`, `.nojekyll`, `robots.txt`, `sitemap.xml`, Google verification and `og-image.jpg`.

These files stay at root because they directly participate in the public site.

### `/assets/`
Shared visual and browser runtime resources for the main site.

Use this for site-wide assets, not for a single project's private library.

### `/projects/`
The large public application collection.

Most child folders represent one public route: `/projects/<project-name>/`.

A project normally owns its own entry point and supporting files.

Do not move projects into arbitrary category folders without a route-preservation plan.

See [projects/README.md](../projects/README.md).

### `/projects/code-motion/`
Historical route for the TRILYVA renderer family.

The name is intentionally retained in the URL for compatibility even though the current product identity is TRILYVA.

### `/projects/code-to-eps/`
Dedicated browser vector/EPS application.

Keep its runtime and vector libraries inside the product boundary.

### `/projects/code-to-svg/`
Dedicated browser SVG application.

### `/projects/neo/`
NEO public product route and release landing page.

### `/projects/razim-fps/`
NEO native source/build tree kept as a compatibility path so existing links remain valid.

This is intentionally self-contained because it includes native build, installer and release resources.

### `/projects/bncagrocare/`
BNC Agro Care customer-facing product plus related invoice and reference material.

### `/projects/repo-token-meter/`
Repository measurement and manifest tooling exposed as a public project.

### `/asset-vault/`
Standalone Stock Asset Vault application.

See [asset-vault/README.md](../asset-vault/README.md).

### `/renderer/`
Legacy/public renderer surface.

Keep this separate from the modern flagship projects so legacy compatibility does not pollute their internal structure.

### `/KYNESTRA/`
Large product workspace containing architecture, Core contracts, desktop/Tauri work, modules, formats, documentation and release material.

It is a product boundary, not a generic repository folder.

### `/.github/`
Repository automation.

GitHub Actions remain under `.github/workflows/` as required by GitHub.

See [.github/README.md](../.github/README.md).

### `/tools/`
Reusable engineering utilities.

Validators, generators, contracts and repository maintenance helpers belong here.

See [tools/README.md](../tools/README.md).

### `/scripts/`
Small orchestration and maintenance scripts.

See [scripts/README.md](../scripts/README.md).

### `/docs/`
Architecture, policy and repository-level documentation.

See [docs/README.md](./README.md).

### `/LICENSES/`
Project-specific legal notices.

See [LICENSES/README.md](../LICENSES/README.md).

---

## Why the repository is not being flattened into categories

A common cleanup would turn `/projects/a/`, `/projects/b/` and `/projects/c/` into nested category folders.

That looks cleaner locally but changes public URLs.

Because the repository is itself a deployed website with a large number of public routes, route stability is more important than visual nesting.

The redesign therefore separates the repository into strong top-level zones while keeping public project paths stable.

---

## Naming policy

### Public project folders
Use lowercase, URL-safe, descriptive names.

### Product workspaces
Use the product's established identity, for example KYNESTRA.

### Documentation
Use uppercase filenames for major repository documents when that matches the existing convention.

### Legacy surfaces
Keep legacy names when they are public routes. Explain the relationship in documentation instead of silently renaming the path.

---

## Reorganization checklist

Before moving any public folder:

1. Search for links to the old path.
2. Decide whether the old route must remain permanently.
3. Add a redirect or compatibility surface where required.
4. Update site navigation, manifests, sitemaps and workflows.
5. Run the relevant CI checks.
6. Only then remove the old location.

This repository treats URLs as part of the product.
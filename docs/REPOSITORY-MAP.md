# Repository Map

## 1. Public website layer

### /
The main Tamasrazim personal website and GitHub Pages entry point.

### /assets/
Site-wide design assets, styles, browser-side runtime helpers, brand material and images.

### /projects/
The public project collection. This currently contains 1,200+ individual project folders ranging from calculators and diagnostics to full applications.

### /asset-vault/
The standalone Stock Asset Vault application.

### /renderer/
A legacy/public renderer surface retained for route compatibility.

## 2. Flagship products

### /projects/code-motion/
The legacy public route for the TRILYVA renderer family.

Important public surfaces:
- /projects/code-motion/
- /projects/code-motion/renderer/
- /projects/code-motion/batch/

### /projects/code-to-eps/
Browser-based vector/EPS tooling.

### /projects/code-to-svg/
Browser-based SVG tooling.

### /projects/neo/
NEO, the native Windows 3D puzzle game public route.

### /projects/razim-fps/
Legacy-compatible source/build tree for NEO.

### /projects/bncagrocare/
BNC Agro Care customer-facing application and supporting business material.

### /KYNESTRA/
The larger KYNESTRA architecture, desktop shell, modules, format specifications and release material.

### /projects/repo-token-meter/
Repository measurement and token/size analysis project.

## 3. Engineering and automation

### /.github/
GitHub Actions, repository automation and CI/CD definitions.

### /tools/
Validation utilities, generators, contract checks and maintenance tooling.

### /scripts/
Small repository-level helper scripts.

These folders intentionally remain outside the public project collection because they support development rather than define public routes.

## 4. Documentation and policy

### /docs/
Repository architecture and policy documentation.

### /LICENSES/
Project-specific proprietary notices, third-party notices and website-content terms.

Root-level governance files remain at the repository root where GitHub and common tooling expect them:
- LICENSE
- NOTICE.md
- SECURITY.md
- CONTRIBUTING.md

## 5. Root-level public/support files

The following remain at root because they participate directly in the website or GitHub Pages deployment:
- index.html
- 404.html
- .nojekyll
- robots.txt
- sitemap.xml
- google30d1c6b4ff08817e.html
- og-image.jpg

Legacy prototype/export files are retained for history and compatibility instead of being mixed into the documentation tree.

## 6. Organization principles

1. Public URLs are stable.
2. Projects stay self-contained.
3. Shared tooling stays shared.
4. Documentation is separate from runtime code.
5. Licensing is explicit.
6. Flagship products get clear boundaries.
7. Structural cleanup must not break the public site.
# Tamasrazim — Personal Website

This repository is the source of truth for the public Tamasrazim website.

## Rebuilt architecture

The site has been rebuilt as a new interface and interaction system rather than a restyle of the previous page.

- Data-driven project index: `data/projects.json`
- New visual system: `assets/css/site.css`
- New interaction layer: `assets/js/site.js`
- New root experience: `index.html`
- Project archive: `projects/index.html`
- No external runtime libraries are required by the new shell.
- GitHub Pages remains the deployment target.

The individual project applications under `projects/`, `renderer/`, and `asset-vault/` remain canonical application routes; the new shell links to them without rewriting their internal functionality.

## Identity

**Robiul Rumman Razim — Tamasrazim**

Do not invent identity, project, social, or institutional facts.
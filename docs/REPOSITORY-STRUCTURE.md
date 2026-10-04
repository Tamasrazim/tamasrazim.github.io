# Repository Structure

The repository keeps live runtime paths stable. Documentation and legal material are
grouped separately so reorganization does not break GitHub Pages URLs.

## Top-level layout

| Path | Role |
| --- | --- |
| / | Main Tamasrazim website |
| /projects/ | Public project index and browser applications |
| /projects/code-motion/ | TRILYVA/KYNESTRA project surface |
| /projects/code-motion/renderer/ | Canonical TRILYVA renderer |
| /KYNESTRA/ | KYNESTRA architecture, modules, Core and desktop work |
| /asset-vault/ | Stock Asset Vault |
| /tools/ | Repository validation and engineering tools |
| /scripts/ | Build, generation and maintenance scripts |
| /assets/ | Site-wide static assets |
| /docs/ | Repository architecture and policy documentation |
| /LICENSES/ | Project-specific proprietary licensing notices |

## Boundary rules

Runtime URLs remain in their existing locations.

Reusable application code, internal libraries, generated datasets, stock metadata
corpora, vector libraries and production assets should not be moved into documentation
folders merely for visual organization.

When a project develops a materially different ownership or licensing model, place
its license in /LICENSES/ and add a project-level notice next to the affected
implementation.

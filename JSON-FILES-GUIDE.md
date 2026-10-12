# JSON and Manifest Files — Plain-English Guide

JSON must stay valid JSON. Unlike JavaScript, CSS, HTML, or Rust, it does **not** allow comment lines beginning with `#` or `//`. Adding those inside these files would break the app or its build. This guide explains each file without changing its format.

## KYNESTRA core contracts

- `KYNESTRA/core/assets/asset-contract.json` — describes the fields and rules used to identify an asset in a project.
- `KYNESTRA/core/assets/module-output-contract.json` — describes the output a module should return when it finishes a task.
- `KYNESTRA/core/events/event-contract.json` — describes the structure of events shared between parts of the application.
- `KYNESTRA/core/forge/forge-contract.json` — describes the data the Format Forge workflow expects and produces.
- `KYNESTRA/core/modules/module-contract.json` — describes the metadata a KYNESTRA module must provide.
- `KYNESTRA/core/package/package-contract.json` — describes the expected structure of a package created by the application.
- `KYNESTRA/core/projects/project-contract.json` — describes the information stored about a project.
- `KYNESTRA/core/render/render-contract.json` — describes the information a render request and result are expected to contain.
- `KYNESTRA/core/tasks/task-contract.json` — describes the information attached to a task and its status.

## KYNESTRA desktop and modules

- `KYNESTRA/desktop/tauri/capabilities/default.json` — lists which native desktop features the app window is allowed to call.
- `KYNESTRA/desktop/tauri/tauri.conf.json` — configures how Tauri builds, names, opens, and packages the desktop app.
- `KYNESTRA/modules/c2m/module.json` — tells KYNESTRA how to identify and load the Code-to-Motion module.
- `KYNESTRA/modules/c2m/renderer/manifest.webmanifest` — tells the browser the name and install-related details of the Code-to-Motion web app.
- `KYNESTRA/modules/forge/module.json` — tells KYNESTRA how to identify and load Format Forge.
- `KYNESTRA/modules/forge/renderer/format-forge.webmanifest` — provides the browser app metadata for Format Forge.
- `KYNESTRA/modules/vault/module.json` — tells KYNESTRA how to identify and load its asset-vault module.

## Browser app manifests

A `.webmanifest` file tells a browser about a web app's name, icons, launch behavior, and install presentation. It is configuration data, not a place for JavaScript comments.

- `asset-vault/manifest.webmanifest` — install and launch information for Asset Vault.
- `projects/bncagrocare/catalog/manifest.webmanifest` — install and launch information for the BNC product catalog.
- `projects/bncagrocare/invoice/manifest.webmanifest` — install and launch information for the BNC invoice tool.
- `projects/bncagrocare/manifest.webmanifest` — install and launch information for the main BNC Agrocare app.
- `projects/code-motion/renderer/manifest.webmanifest` — install and launch information for the Code Motion renderer.
- `projects/code-to-eps/code-to-eps.webmanifest` — browser app metadata for Code to EPS.
- `projects/code-to-eps/workspace/code-to-eps.webmanifest` — browser app metadata for the embedded Code to EPS workspace.
- `projects/code-to-svg/code-to-svg.webmanifest` — browser app metadata for Code to SVG.
- `projects/code-to-svg/workspace/code-to-svg.webmanifest` — browser app metadata for the embedded Code to SVG workspace.
- `projects/format-forge/format-forge.webmanifest` — browser app metadata for Format Forge.
- `projects/format-forge/workspace/format-forge.webmanifest` — browser app metadata for the embedded Format Forge workspace.

## Libraries and generated data

- `projects/code-motion/renderer/keyword-library/MANIFEST.json` — indexes the keyword-library data available to the renderer.
- `projects/code-motion/renderer/library/manifest.json` — lists the animation-library modules that the renderer loads.
- `projects/code-motion/renderer/library/prism-web-icons.json` — stores prism-style web-icon data used by the renderer.
- `projects/code-to-eps/prism-library.json` — stores the prism vector library used by Code to EPS.
- `projects/code-to-eps/workspace/prism-library.json` — the prism vector library for the embedded Code to EPS workspace.
- `projects/repo-token-meter/repo-manifest.json` — lists the repository files the Token Meter reads and presents.
- `projects/repo-token-meter/workspace/repo-manifest.json` — the file list used by the embedded Token Meter workspace.
- `tools/stock-metadata.example.json` — an example of the fields used when preparing metadata for stock content.

## How to read source files

Normal source files have a short plain-English comment at the top using the comment style their language supports. Strict JSON files are explained here instead, so their contents remain valid for the software that reads them.

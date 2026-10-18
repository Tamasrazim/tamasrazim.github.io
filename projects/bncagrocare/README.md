# BNC AgroCare

BNC AgroCare includes a customer-facing product catalogue and a local-first representative invoice workspace.

## Workspaces

- index.html — project overview.
- catalog/index.html — searchable product and pack-format catalogue.
- invoice/index.html — invoice editor, live preview, local drafts, XLSX and CSV export, and print/PDF workflow.
- reference/products.js — shared product data used by both workspaces.

## Invoice behavior

Invoice details and line items are calculated in the browser. Current work is auto-saved to this browser's local storage; saved drafts remain on that device and are not synchronized to a server. Export invoices as XLSX or CSV or print to PDF for separate backup. XLSX export uses ExcelJS from jsDelivr, so the XLSX option requires that library to load; CSV and print remain available without it.

## Product data

The shared file contains the supplied product names and pack formats. Prices, stock levels, usage instructions, registrations and availability are not inferred or invented.

## Validation

Run node tools/validate_bnc.mjs from the repository root. The catalogue also has a companion check at node projects/bncagrocare/catalog/tools/validate_bnc.mjs.

## Privacy

The static app does not send invoice fields to a BNC server. Drafts stay in local storage on the current device.
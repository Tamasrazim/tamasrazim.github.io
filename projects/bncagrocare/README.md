# BNC AgroCare

> Backup mirror: Canonical BNC source is maintained in Tamasrazim/tamasrazim.github.io under projects/bncagrocare/. Keep this repository as the deployment/backup copy.

BNC AgroCare website and PDF-first invoice PWA.

> **Immutable template:** invoice.pdf is the locked original BNC invoice template. The app reads it as the master PDF and never rewrites the source template.

## Invoice PWA

The working interface is form-based and PDF-first:

**Fill the fields → calculate automatically → generate the actual invoice PDF → preview → save/download**

The app provides:

- BNC website-matched UI with a focused invoice workspace
- Original BNC invoice PDF used as the locked first-page template
- Automatic Ctn × Rate / Ctn calculations
- Carton, gross, commission and final-total calculations
- Amount in words
- Product catalog autocomplete
- Dynamic product rows with alternating left/right SL continuation
- Same-page table extension while there is usable room
- Safe continuation pages when the first page is full
- Live PDF preview and PDF download
- Local draft persistence with IndexedDB
- Local invoice history with load, copy and delete
- JSON export/import
- Installable PWA shell with offline caching

The original workbook remains reference material; the active invoice workflow does not edit the locked PDF or overwrite source reference files.

## Company website

The project site and invoice tool are kept under the same BNC AgroCare visual system.
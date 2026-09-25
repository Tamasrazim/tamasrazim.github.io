# BNC Agro Care

Canonical BNC project inside the Tamasrazim main repository.

## Project rules

1. reference/BNCFINAL.xlsx is the invoice workbook source of truth.
2. reference/addProductRow.js owns the product-row insertion rule.
3. reference/products.js owns the shared product and pack-size catalogue used by both the public site and Invoice Studio.
4. reference/product name.txt and reference/product name and pack size.txt are preserved raw references.
5. FB_IMG_1789811599210.jpg is the BNC logo image.
6. FB_IMG_1789811611633.jpg is the BNC cover image.
7. Invoice Studio edits a live in-memory XLSX workbook, shows that current workbook in the preview, and downloads the latest edited XLSX.
8. Adding a product inserts a physical worksheet row immediately above the ST subtotal row, copies formatting from the row above, clears A:L, and rebalances SL numbering.
9. The repository master workbook is never overwritten by the Studio.
10. PDF generation is not part of the Studio workflow. invoice.pdf, where present, is an archive/reference file only.
11. This main repository is the canonical source. The Tamasrazim/bncagrocare repository is the backup/mirror.

## Structure

- index.html — public BNC Agro Care website.
- invoice/ — live XLSX Invoice Studio.
- reference/ — canonical workbook, row rule, product catalogue and raw references.
- tools/ — project validation.

# BNC Agro Care

BNC Agro Care is the canonical agriculture project inside the Tamasrazim main repository.

## Source hierarchy

1. BNCFINAL.xlsx — principal invoice-sheet reference.
2. addProductRow.js — authoritative rule for inserting an invoice product row.
3. products.js — shared product and pack-size data used by the public catalogue and Invoice Studio.
4. invoice.pdf — immutable PDF master used for final document generation.
5. invoice/ — local-first business UI.

## Public site

projects/bncagrocare/index.html

## Invoice Studio

projects/bncagrocare/invoice/

Base sheet: 4 rows per side / 8 product slots. Adding a row follows the spreadsheet rule: insert before the ST subtotal region, extend ST formulas, copy the row structure, and renumber left/right SL values.

## Canonical / backup model

This personal repository is canonical. github.com/Tamasrazim/bncagrocare is the backup/deployment mirror.

Edit here first -> verify -> mirror to backup.
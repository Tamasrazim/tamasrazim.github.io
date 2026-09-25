# BNC Agro Care — Project Rules

## Canonical hierarchy

BNCFINAL.xlsx → addProductRow.js → products.js → Invoice Studio → latest XLSX

BNCFINAL.xlsx is the master invoice workbook. The Studio must never overwrite it.

## Product-row rule

1. Find the first ST subtotal row in column B, starting at row 11.
2. Insert one worksheet row immediately above ST.
3. Copy formatting from the row above into the new row.
4. Clear A:L in the new row.
5. Rebalance SL numbering: column A = 1..N; column G = N+1..2N.
6. Rebuild the affected subtotal formulas so the inserted row is included.

## Live workbook rule

edit → workbook changes → preview changes → download latest XLSX

The preview is a representation of the current live workbook, not a separate invoice data source.

## Output rule

The Studio downloads the current edited workbook as .xlsx.
It does not generate PDFs.

## Shared reference rule

products.js is the catalogue consumed by both the public BNC site and Invoice Studio.
The raw text references remain preserved.

## Branding

FB_IMG_1789811599210.jpg — BNC logo.
FB_IMG_1789811611633.jpg — BNC cover.

## Repository rule

Tamasrazim/tamasrazim.github.io is canonical.
Tamasrazim/bncagrocare is the backup/mirror.
# BNC Agro Care reference set

## Canonical files

- BNCFINAL.xlsx — master invoice workbook.
- addProductRow.js — JavaScript implementation of the product-row insertion rule.
- products.js — shared product and pack-size catalogue.
- product name.txt — preserved raw product-name reference.
- product name and pack size.txt — preserved raw product/pack reference.

## Branding references

- ../FB_IMG_1789811599210.jpg — BNC logo image.
- ../FB_IMG_1789811611633.jpg — BNC cover image.

## Workbook rule

For Add Product, the Studio finds the first ST subtotal row in column B starting at row 11, inserts a worksheet row above it, copies formatting from the preceding row, clears A:L on the new row, rebalances SL values in columns A and G, and rebuilds the affected subtotal formulas.

## Workflow rule

BNCFINAL.xlsx → live edit → live Sheet 01 preview → latest XLSX download

The Studio never overwrites BNCFINAL.xlsx and does not generate PDFs.

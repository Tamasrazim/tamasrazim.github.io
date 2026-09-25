# BNC AgroCare reference data

`BNCFINAL.xlsx` is the invoice workbook master.

`addProductRow.js` is the row engine used when product rows are added. Workbook edits are performed through explicit worksheet Row → Cell access.

`products.js` contains the shared product and pack-size catalogue.

The Studio never overwrites `BNCFINAL.xlsx` or `invoice.pdf`.

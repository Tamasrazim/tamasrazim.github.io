# BNC AgroCare

A clean rebuild of the BNC AgroCare project using the business data preserved in the `bncagrocare` repository.

## Data preserved from the BNC repository

- `reference/BNCFINAL.xlsx` — invoice workbook master.
- `reference/products.js` — current product and pack-size catalogue.
- `reference/product name.txt` — raw product-name reference.
- `reference/product name and pack size.txt` — raw pack-size reference.
- `reference/addProductRow.js` — invoice row-expansion engine.
- `invoice.pdf` — immutable document archive.
- Sample invoice workbooks and BNC product photographs.

## Rebuilt workflow

**BNC site → Invoice Studio → edited BNCFINAL.xlsx → live workbook preview → XLSX download**

The Studio never modifies the repository master workbook and does not generate PDF.

## Structure

`index.html` is the public BNC AgroCare page.

`invoice/` is the local-first Invoice Studio.

`reference/` contains canonical business data.

`tools/` contains project validation.

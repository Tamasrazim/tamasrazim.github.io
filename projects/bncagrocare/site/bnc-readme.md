# BNC AgroCare

BNC AgroCare website and invoice PWA.

## Invoice PWA

The spreadsheet is no longer the working interface.

Use the form-based invoice app instead:

https://tamasrazim.github.io/bncagrocare/invoice/

Workflow:

**Fill the boxes → Live paper preview → Print**

The PWA provides:

- BNC AgroCare invoice header and official-details fields
- Invoice number and dates
- Customer / buyer boxes
- Add/remove product rows
- Quantity × unit price calculations
- Discount and tax fields
- Notes / terms
- Prepared-by field
- Live A4 paper preview
- Browser print output
- Local draft persistence with IndexedDB
- JSON backup for the current invoice
- Invoice history with load, copy and delete actions
- Automatic invoice numbering for saved invoices
- Installable PWA shell

Nothing in the PWA edits the original Excel workbook. The existing demo.xlsx remains a reference file.

## Company website

https://tamasrazim.github.io/bncagrocare/

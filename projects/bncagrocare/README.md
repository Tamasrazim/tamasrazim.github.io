# BNC AgroCare

> Backup mirror: Canonical BNC source is maintained in Tamasrazim/tamasrazim.github.io under projects/bncagrocare/. Keep this repository as the deployment/backup copy.

BNC AgroCare website and invoice PWA.

## Invoice PWA

The working interface is PDF-first.

Workflow:

**Fill the boxes → calculate automatically → generate the real PDF → preview the PDF → open/print or save PDF**

The PWA provides:

- Original BNC invoice PDF used as the page-1 template
- Named AcroForm fields filled directly where the template exposes them
- Automatic amount calculations: Ctn × Rate / Ctn, left/right subtotals, total cartons, total taka, commission %, final total and amount in words
- Four starting product rows per side
- Automatic SL 5, SL 6, and onward when more products are entered
- Empty product rows omitted from the generated PDF
- Overflow products rendered on continuation PDF pages without changing the original page-1 template
- Live PDF preview in the browser
- Open / print and Save PDF actions
- Local draft persistence with IndexedDB
- JSON backup for the current invoice
- Invoice history with load, copy and delete actions
- Installable PWA shell

The original Excel files remain reference/demo material; the working invoice interface no longer uses HTML as the paper preview and does not edit the original workbook.

## Company website

https://tamasrazim.github.io/bncagrocare/
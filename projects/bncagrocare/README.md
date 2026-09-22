# BNC AgroCare

BNC AgroCare is the canonical agriculture-focused project in this repository.

> **Immutable invoice template:** `invoice.pdf` is the locked original BNC invoice template. The Invoice Studio reads it as the master document and never rewrites the source PDF.

## Website

The public BNC site is a product-first business interface with:
- the current BNC product names
- exact pack-size options from the project reference
- product/pack search
- BNC reference imagery
- direct access to Invoice Studio

## Invoice Studio

The PWA workflow is:

**Customer details → product lines → live totals → A4 preview → generate/download**

It includes:
- the BNC product catalogue with pack-size suggestions
- automatic CTN × RATE calculations
- commission and final-total calculations
- amount in words
- dynamic product rows and continuation pages
- local draft persistence with IndexedDB
- saved invoice history
- JSON export/import
- installable/offline PWA shell
- the locked original invoice PDF as the document master

The public website and Invoice Studio share one BNC visual system, while the invoice template remains unchanged.

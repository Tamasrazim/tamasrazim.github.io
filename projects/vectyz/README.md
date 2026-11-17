# Vectyz

**A deterministic raster-to-vector and vector-to-raster conversion engine.**

Vectyz has two local runtimes: a browser workspace for day-to-day conversion and a Python engine/CLI for native workflows. Source images are not sent to a remote processing service.

## Browser workspace

The browser GUI is a static, offline-first application (workspace release 0.5.0). Its processing engine runs inside a Web Worker; IndexedDB stores source files, SVG/raster outputs and project metadata on the current browser origin.

- No Python API server, Node backend, cloud processing, login or external JavaScript dependencies.
- Palette quantization, contour extraction and SVG generation run locally in the browser.
- Web Workers keep the main interface responsive while an image is processed.
- IndexedDB stores original files and generated results as binary Blobs.
- The service worker caches the application shell for offline launches after the first visit.
- SVG rasterization removes scripts, embedded HTML, CSS stylesheets and external resource references before rendering.\n- The 0.5.0 workspace adds original/vector comparison, synchronized zoom and pan, reconstruction presets, cancellable vectorization jobs, keyboard shortcuts, a responsive studio layout and a live SVG palette editor. Palette edits are applied to generated SVG fill groups and saved locally.

### Run locally

The browser needs an HTTP(S) origin for ES modules, workers and service-worker support. This is only static file hosting: it does not process images, expose an API or store project data. From the repository root, run:

    python -m http.server 8000

Open http://127.0.0.1:8000/ in a current Chromium-based browser. After the first successful load, Vectyz can reopen offline from the same browser origin. Projects are origin-specific, so clearing site data or using a different browser profile removes access to that local library.

Choose **Keep data** in the top bar to ask the browser for persistent storage. The browser may decline; IndexedDB remains subject to browser storage and quota policies.

### Browser engine limits in this build

- Raster vectorization is limited to 12 megapixels per image to keep memory use bounded.
- The browser engine supports up to 64 palette colors, 1–8 transparency levels, contour simplification and corner-aware cubic paths.
- Browser export currently includes recolorable SVG fill groups for vector output and PNG, JPEG or WebP for SVG rasterization.
- Browser PDF/EPS export, folder batch processing, native WASM acceleration and full parameter parity with the Python engine are not implemented yet.
- The original bitmap is not embedded in vector output; the browser engine writes real SVG path geometry.

## Python engine on Windows

Install Python 3.10 or newer, then open PowerShell:

    git clone https://github.com/Tamasrazim/Vectyz.git
    cd Vectyz
    py -m venv .venv
    .\.venv\Scripts\Activate.ps1
    python -m pip install --upgrade pip
    python -m pip install -e .

This base install is enough for raster-to-SVG and EPS conversion. PDF export and SVG-to-raster conversion use CairoSVG:

    python -m pip install -e ".[render]"

On Windows, CairoSVG may also need the native Cairo DLLs. Install the 64-bit GTK3 Runtime, then set its bin directory for the current PowerShell session:

    $env:CAIROCFFI_DLL_DIRECTORIES = "C:\Program Files\GTK3-Runtime Win64\bin"
    python -c "import cairosvg; print('CairoSVG ready')"

If PowerShell blocks activation, run this once in the current terminal and activate again:

    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
    .\.venv\Scripts\Activate.ps1

## Python CLI

Convert one image to SVG:

    vectyz vectorize "C:\Images\logo.png" "C:\Images\logo.svg"

Tune the vector result:

    vectyz vectorize "C:\Images\illustration.png" "C:\Images\illustration.svg" --colors 24 --detail 0.7 --curve smooth --quantizer maxcoverage

Useful controls:

| Option | Default | Effect |
| --- | ---: | --- |
| --colors | 16 | Maximum number of palette colors (2–256). |
| --detail | 1.0 | Contour simplification; lower retains more detail. |
| --min-area | 2.0 | Remove tiny outer regions smaller than this area in source pixels. |
| --curve | smooth | Fitted cubic curves or polygon-only paths. |
| --quantizer | mediancut | Palette learning algorithm. |
| --alpha-bins | 4 | Opacity bands (1–16). |
| --corner-angle | 65 | Preserve sharper turns as corners. |
| --transparent-threshold | 4 | Ignore pixels whose alpha is at or below this value. |

Export PDF or EPS:

    vectyz vectorize "C:\Images\logo.png" "C:\Images\logo.pdf"
    vectyz vectorize "C:\Images\logo.png" "C:\Images\logo.eps"

PDF export needs the render extra. EPS does not support alpha, so translucent regions are composited against white.

Convert a folder:

    vectyz batch "C:\Images\input" "C:\Images\vectors" --recursive --format svg --colors 24 --detail 0.8

Batch mode processes one file at a time and writes a vectyz-report.json file containing per-file statistics and failures.

Convert SVG back to a raster image:

    vectyz rasterize "C:\Images\logo.svg" "C:\Images\logo.png" --width 2400

Python raster outputs include PNG, JPEG, WebP, TIFF and BMP.

## Python API

    from vectyz import VectorizerConfig, vectorize_image

    settings = VectorizerConfig(
        colors=24,
        detail=0.7,
        curve="smooth",
        quantizer="maxcoverage",
        alpha_bins=4,
    )
    result = vectorize_image("input.png", "output.svg", settings)
    print(result.stats)

## Architecture

Browser files:
- index.html, styles.css and app.js: browser workspace.
- vector-engine.js: palette learning, pixel classification, boundary tracing, simplification and SVG generation.
- vector-worker.js: image decoding and vectorization off the UI thread.
- db.js: IndexedDB project, asset and result storage.
- sw.js: offline application-shell cache.

Python modules:
- image.py: image loading, EXIF orientation and palette quantization.
- tracing.py: contour extraction, holes and path fitting.
- engine.py: single-image conversion pipeline and statistics.
- batch.py: sequential folder conversion and JSON reports.
- exporters.py: SVG, PDF, EPS and raster output.
- cli.py: command-line interface.
- models.py: validated settings and result types.

Both implementations use deterministic classical image processing, not generative AI. They are separate implementations and are not yet guaranteed to produce byte-identical paths for identical inputs. The Python engine remains the native/reference implementation.

## Current limitations

- Photographs can produce many small regions and are not guaranteed to become compact, hand-editable illustrations.
- Palette quantization approximates gradients; continuous vector-gradient reconstruction is not implemented.
- The smooth curve fitter is geometry-based and may need a lower detail value for intricate artwork.
- EPS has no native alpha support; translucent fills are composited against white.
- Python SVG-to-raster conversion and PDF export require CairoSVG.

## Development

    python -m pip install -e ".[dev,render]"
    pytest
    ruff check src tests
    npm test

The browser test suite requires Node.js 20 or newer and has no npm dependencies.
#!/usr/bin/env python3
"""Validate the browser renderer's important file contracts with only the Python stdlib."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Animation Renderer — Tamasrazim.")
    parser.add_argument("--root", default=".", help="Repository root.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    renderer = root / "renderer"
    errors: list[str] = []

    index = renderer / "index.html"
    app = renderer / "js" / "app.js"
    engine = renderer / "js" / "video-engine.js"
    sw = renderer / "sw.js"
    manifest = renderer / "manifest.webmanifest"

    for required in (index, app, engine, sw, manifest):
        if not required.is_file():
            fail(errors, f"Missing required renderer file: {required.relative_to(root)}")

    if 'id="exportProjectBtn"' in html and "Save project" not in html:
        fail(errors, "Project save control is malformed")
    if 'id="importProjectBtn"' in html and "Open project" not in html:
        fail(errors, "Project open control is malformed")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    html = read(index)
    app_js = read(app)
    engine_js = read(engine)
    sw_js = read(sw)
    manifest_text = read(manifest)

    scripts = re.findall(r'<script\s+src="([^"]*app\.js[^"]*)"></script>', html)
    if len(scripts) != 1:
        fail(errors, f"Expected exactly one renderer app.js include, found {len(scripts)}")

    required_html = (
        'id="scenesPanel"',
        'id="sourcesPanel"',
        'id="codePanel"',
        'id="settingsPanel"',
        'id="stockPanel"',
        'id="renderCanvas"',
        'id="videoEngine"',
        'id="videoCodec"',
        'id="exportProjectBtn"',
        'id="importProjectBtn"',
        'id="projectFileInput"',
        'id="addImageBtn"',
        'id="imageFileInput"',
    )
    for token in required_html:
        if token not in html:
            fail(errors, f"Missing renderer UI contract: {token}")

    required_app = (
        "window.renderFrame",
        "function renderOutputFrame",
        "function renderPreviewGuides",
        "tamasrazim-renderer-studio",
        "function exportVideo",
        "function exportProject",
        "function importProjectFile",
        "tamasrazim-render-project",
        "function drawImageSource",
        "function imageAsSvg",
    )
    for token in required_app:
        if token not in app_js:
            fail(errors, f"Missing renderer logic contract: {token}")

    if "new VideoFrame" not in engine_js or "VideoEncoder" not in engine_js:
        fail(errors, "Deterministic WebCodecs engine contract is missing")

    cache_match = re.search(r"const CACHE='([^']+)'", sw_js)
    if not cache_match:
        fail(errors, "Service worker cache version is missing")
    elif "video-engine.js" not in sw_js or "app.js" not in sw_js:
        fail(errors, "Service worker core asset list is incomplete")

    if '"start_url":"/renderer/"' not in manifest_text:
        fail(errors, "PWA manifest start_url is incorrect")

    fps_values = set(re.findall(r'<option(?:[^>]*)>(\d+)</option>', html))
    if "120" not in fps_values:
        fail(errors, "120 FPS export option is missing")
    if "60" not in fps_values:
        fail(errors, "60 FPS option is missing")

    if "previewOnly" not in app_js or "renderOutputFrame(i/FPS)" not in app_js:
        fail(errors, "Preview-only source isolation is missing from the realtime export path")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("Renderer validation passed.")
    print(f"WebCodecs engine: OK")
    print(f"PWA cache: {cache_match.group(1)}")
    print("FPS options include: 60, 120")
    print("Preview-only sources are excluded from realtime export.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

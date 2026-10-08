# F75 PRO Control Deck

An original offline-first browser control and diagnostics workspace for the AULA F75 Pro family.

Live route:
https://tamasrazim.github.io/projects/aula-f75-pro/

## Rebuilt architecture

The project was rebuilt into one application core instead of layered enhancement scripts:

- `index.html` — UI shell, layout and responsive styling.
- `app.js` — virtual F75 matrix, live press view, WebHID connection/observation, keymap editor, RGB preview, diagnostics and exports.
- `service-worker.js` — offline cache for the app and exact repository hardware-reference image.
- `manifest.webmanifest` — install metadata.
- `icon.svg` — project icon.

## Key Lab

The Key Lab works without a connected keyboard and includes:

- Live physical-key press display from normal browser keyboard events.
- Held-key state and recent press history.
- F75 physical matrix indexes and mapping badges.
- Double-click virtual keys for simulated test input.
- Single-key remapping.
- Shortcut / combo construction.
- Preset shortcuts.
- Add, Edit, Delete, Reset selected and Reset all.
- Win ↔ Alt local swap.
- JSON import/export.

Mappings are stored locally in the browser and are not written to keyboard memory.

## Hardware / WebHID

The wired AULA family target uses the public VID/PID research reference of `0x258A / 0x010C`. The application can silently reconnect an already-authorized device or request a new WebHID connection.

WebHID input reports are observed as raw packets. Browser key events remain the authoritative visual keypress path instead of guessing custom firmware report bytes.

Persistent hardware writes are deliberately gated in this rebuild.

## Offline mode

The whole workspace starts in a deterministic virtual-device mode. Identity/configuration probes can be exercised without hardware, and RGB design remains live offline.

## Hardware reference

The Deck displays the exact repository asset:

`aula-f75-pro-wireless-mechanical-keyboard-10-700x700.jpg.webp`

so the physical reference and virtual control surface are presented together.

## Research

The implementation uses public reverse-engineering material as engineering reference for device behavior and protocol investigation. It does not copy OpenAula source code, components or styling.

## Route

`/projects/aula-f75-pro/`

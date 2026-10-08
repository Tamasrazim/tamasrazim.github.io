# F75 PRO Control Deck

An original browser-first control and diagnostics project for the AULA F75 Pro family.

Live route:
https://tamasrazim.github.io/projects/aula-f75-pro/

## Design

This project takes the ideas that make modern keyboard configurators useful — device detection, protocol inspection, key mapping, RGB design, backups and diagnostics — and implements a separate UI and codebase.

It does not copy OpenAula source code, components or styling.

The current build is deliberately conservative with persistent writes:

- WebHID device discovery for the wired AULA family.
- Safe identity and configuration probes.
- Raw report inspection.
- Local key-map designer with JSON export.
- RGB design/preview workspace.
- Session/config backup export.
- Persistent RGB writes remain gated until the physical F75 Pro revision is verified.

## Browser

Use a Chromium-family browser with WebHID support and connect the keyboard by USB-C.

The project is static and has no account, backend, CDN, framework runtime, or remote API dependency.

## Hardware note

Public reverse-engineering work reports the wired F75-family identity as VID `0x258A` / PID `0x010C`, while other wireless transports use different device identities and protocols. The app therefore treats wired USB as the first-class configuration path instead of pretending all connection modes are interchangeable.

## Sources / research

The implementation was informed by publicly available protocol research from not-ayan/openaula, free-soldier28/Aula-Manager, vndarkblue/aula-keybind, and veysiemrah/aula-rgb-controller.

Those projects are references for protocol behavior and engineering ideas, not copied source.

## Files

- `index.html` — complete self-contained application
- `manifest.webmanifest` — install metadata
- `icon.svg` — project icon

## Route

`/projects/aula-f75-pro/`

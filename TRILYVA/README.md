# TRILYVA — Native Desktop Application Specification

**Product owner:** Tamasrazim  
**Product name:** TRILYVA  
**Document purpose:** The single source of truth Codex must follow when building the native desktop application from scratch.  
**Status:** Implementation specification, not a statement that every listed feature is already implemented.  
**Primary rule:** Build the actual product described here. Do not stop at a mock-up, a static preview, a thin wrapper, or a renamed copy of the browser application.

---

## 1. What TRILYVA is

TRILYVA is a code-driven motion graphics and deterministic frame-rendering workstation. Users write JavaScript that describes a scene, preview it at a particular time or frame, choose a composition, render every requested frame in sequence, encode video or image output, validate the bytes actually written, and organise their work in a local project and asset library.

It is not only a background-animation generator. It must be capable of creating detailed motion graphics, looping visual systems, procedural forms, typography treatments, abstract animation, science visualisations, transitions, animated symbols, edit-style effects, and scenes whose motion is generated directly from code.

The primary authoring mechanism is intentionally simple and stable:

- Users write JavaScript.
- The animation is evaluated at an explicit time and frame index.
- A deterministic renderer draws that specific frame at the requested composition size.
- The export coordinator visits every requested frame in order.
- The media backend encodes the rendered frames when a video format is requested.
- TRILYVA inspects the output that was actually written and reports what could and could not be verified.

The same project and the same source code must behave as consistently as the selected renderer and output format permit across preview, still export, frame-sequence export, and video export. The renderer must never silently pretend an unsupported feature worked.

## 2. Non-negotiable product requirements

These are acceptance requirements rather than optional ideas.

1. **A genuine native desktop application.** The workspace must be implemented with a native desktop UI toolkit and a native rendering pipeline. Do not display the existing web application in a WebView, browser control, Tauri WebView, Electron window, or embedded browser. Do not copy the old HTML/CSS layout and call it native. Existing web code is a behavioural reference and compatibility source, not the production UI.
2. **TRILYVA branding only.** Do not show Code Motion, C2M, KYNESTRA, or any other product name in the application name, title bar, splash, installer, menus, icons, documentation inside the app, or default project templates. The application is called TRILYVA.
3. **A custom monochrome glassmorphism interface.** Dark charcoal and near-black surfaces, white primary text, muted grey secondary text, restrained border highlights, translucent-looking cards, smooth curved geometry, and motion used purposefully. No bright accent colour as a default visual identity.
4. **The brand logo and intro animation.** Use the provided TRILYVA T mark from the repository brand asset as the source of truth. Build a custom startup animation around the mark; do not substitute a generic icon, a spinning loading wheel, or a third-party logo.
5. **A real JavaScript animation editor and renderer.** The editor must execute real user code against the renderer contract. A hard-coded visual, sample GIF, static screenshot, or fake progress animation is not a rendering implementation.
6. **Frame-by-frame export.** A successful render must attempt every frame index in the requested composition, in the correct order. Never skip frames, silently duplicate a frame to meet a counter, blend neighbouring frames to hide a problem, or report a complete export after a failed frame.
7. **Local-first operation.** Rendering, projects, assets, queues, caches, and media exports stay on the user's machine. Do not require sign-in, a server account, a cloud render service, a subscription check, or a network connection to use the core editor.
8. **Useful error reporting.** Every fatal error must tell the user what failed, where it failed when that is known, why it failed when that is known, and the next practical action. A crashed render must not silently disappear or corrupt the current project.
9. **No fake feature claims.** If a codec, alpha format, Canvas operation, image format, hardware path, or maximum resolution is unavailable, the UI must say so. Do not show a green READY badge merely because an output option exists.
10. **Release quality.** The project must include tests, automated builds, proper application icons, target-specific packaging, installer and uninstaller behaviour, logging, a clean first-run experience, and documentation. A development window is not a release.
11. **Do not change the website renderer by accident.** Native sources belong in the native desktop project. Existing browser versions remain separate and should continue to work unless the owner explicitly asks to change them.
12. **No false completion.** Keep a feature marked incomplete until its implementation, tests, output verification, and target-platform checks have passed. CI queued is not CI passed. A file existing is not proof it launches.

## 3. What the native rebuild means

The old browser renderer is not the native application. Codex must create the desktop product as a separate implementation and port the important mechanisms and user-facing capabilities into it.

The existing renderer can be inspected to understand its established contract, project behaviour, export metadata, filename conventions, frame calculations, error handling, library behaviours, and feature priorities. Reuse compatible algorithms and format rules where appropriate, but do not render its DOM, transplant its page CSS into a browser window, or use it as the actual desktop workspace.

A reasonable native design is a Rust desktop process with a native GPU-backed interface, an embedded JavaScript engine, a native drawing engine, a native job coordinator, and a bundled or reliably discovered local media backend. The exact libraries can be chosen by Codex after checking current compatibility, licences, supported platforms, memory requirements, and maintenance. The design must satisfy the behaviour in this document.

### Mandatory separation of responsibilities

- **Native UI layer:** Layout, panels, menus, buttons, editor interactions, preview viewport, timeline, modals, progress, settings, focus, and input.
- **Project layer:** The project data model, version migration, save/load, recovery, history, autosave, file associations, and metadata.
- **Animation runtime:** JavaScript parsing and execution, the TRILYVA API, deterministic evaluation, limits, error mapping, and source diagnostics.
- **Canvas compatibility layer:** The documented drawing operations available to animation code. Unsupported APIs must raise a useful diagnostic or produce a clearly documented limitation, not be silently dropped.
- **Native raster/render engine:** Rasterisation, alpha compositing, colour conversion, image handling, clipping, transforms, gradients, text, and any GPU pipeline used by preview and export.
- **Export coordinator:** Immutable render job settings, frame scheduling, progress, cancellation, checkpoints, temporary output, naming, validation, finalisation, and cleanup.
- **Media backend:** Codec discovery, image/video encoding, metadata, FFprobe or an equivalent parser, actual-pixel alpha inspection, and media validation.
- **Library and asset database:** Local imported animation code, project examples, source metadata, tags, folders, thumbnails, and export receipts.
- **Packaging layer:** Icons, installers, app bundles, file associations, application data directories, bundled dependencies, notices, and uninstall behaviour.

A failure in one layer should not cause unrelated layers to lose data. For example, invalid user JavaScript must not crash the native window or destroy the project.

## 4. Desktop targets and delivery

The first-class desktop release targets are:

| Platform | Release deliverable | Requirements |
|---|---|---|
| Windows x64 | Custom signed-ready installer EXE, plus an optional MSI when supported | Custom icon, modern dark installer pages, install/uninstall, Start Menu shortcut, optional desktop shortcut, clean file association registration |
| Linux x64 | AppImage and DEB package where dependencies and CI allow | Correct desktop entry, icon, executable permissions, per-user configuration, package metadata |
| macOS Apple Silicon | DMG containing a named TRILYVA app bundle | Correct bundle identifier, icons, app metadata, launch behaviour, architecture checks |
| macOS Intel | DMG containing a named TRILYVA app bundle | Correct bundle identifier, icons, app metadata, launch behaviour, architecture checks |

Additional Linux architectures and mobile platforms can be separate later deliverables. Do not claim them supported until their UI, input model, packaging, and tests are real. Desktop must be completed first.

The workflow should build each platform on an appropriate runner. It must use a pinned or otherwise controlled toolchain where practical, keep third-party notices with redistributed media tools, fail when an expected artifact is missing, and upload artifacts to the workflow run. The project owner has explicitly said that a full application release does not automatically mean creating a GitHub Release. Do not create a GitHub Release unless asked.

### Installer design

The Windows installer must look like a branded product rather than a generic, unstyled bundle:

- TRILYVA app icon and title.
- A clean black/charcoal visual style where the installer framework allows it.
- Clear Install Location step.
- Optional desktop shortcut.
- Start Menu shortcut.
- File association for the native project file, if the user opts in or the installer behaviour is clearly documented.
- Installation progress that does not claim completion prematurely.
- Launch TRILYVA after installation option.
- Uninstall entry with a correct publisher and application name.
- Uninstall removes application binaries and app-owned caches, but never silently deletes user-created projects, exports, library files, or manually chosen directories.
- Upgrades must not overwrite project files or user preferences.
- Installation and uninstallation must not require administrator permissions when a per-user installation can meet the requirements.
- Any code-signing status must be truthful. Do not invent a signature, certificate, or publisher verification.

The macOS app bundle and Linux packages need equivalent identity, icon, startup, uninstall, and file-location behaviour. Do not distribute a raw development executable as if it were a finished installer.

## 5. Product vocabulary and visual language

Use these names consistently.

| Term | Meaning |
|---|---|
| Project | The saved document, animation source, composition settings, metadata, and project-owned assets |
| Composition | The width, height, frame rate, duration, loop settings, background/alpha mode, and export defaults |
| Frame | One discrete evaluated image identified by a zero-based frame index |
| Preview | The interactive viewport for viewing the current composition |
| Render | Deterministic evaluation and production of all requested frames |
| Export | The packaging of rendered frames into a chosen image, sequence, vector, or video format |
| Library | Local user-owned imported animation code, projects, and reusable assets |
| Renderer | The implementation that evaluates the animation contract and generates pixels or supported vector commands |
| Job | A validated immutable request to render and/or encode a composition |
| Receipt | The metadata describing what was exported and what verification actually passed |

Use human-readable labels. Avoid marketing phrases in operational UI. Avoid calling a feature native if it is only an alias or a wrapper.

## 6. Visual design system

### 6.1 Overall appearance

The interface must feel like a carefully made creative workstation: quiet, monochrome, spacious, precise, and animated. It should not look like a browser dashboard, an admin panel, a generic code editor theme, or a cluttered media converter.

Recommended base palette:

| Token | Suggested value | Use |
|---|---|---|
| Background | #070708 | Main app background |
| Raised background | #0D0D0F | Toolbar and recessed regions |
| Glass surface | rgba(255,255,255,0.035) over dark | Secondary panels |
| Glass surface hover | rgba(255,255,255,0.065) over dark | Hovered cards |
| Elevated surface | #18181B | Menus, popovers, modal content |
| Primary text | #F4F4F5 | Titles and essential information |
| Secondary text | #A1A1AA | Labels and helper copy |
| Tertiary text | #707078 | Inactive and tertiary details |
| Border | rgba(255,255,255,0.10) | Panel outlines |
| Highlight border | rgba(255,255,255,0.20) | Focus and active glass edges |
| Primary button | #F4F4F5 background, #080809 text | Main safe action |
| Secondary button | Transparent/dark glass with a light border | Secondary action |
| Destructive state | Grayscale emphasis plus a plain, explicit warning | Destructive actions |

Use a consistent spacing scale, such as 4, 8, 12, 16, 20, 24, 32, and 40 logical pixels. Avoid random panel padding and inconsistent gaps.

Use rounded geometry but not oversized bubbles. Standard panel radius should be around 14–18 px; compact cards around 10–12 px; small controls around 8–10 px. Borders should be light and restrained. Shadows should be subtle. True background blur may be simulated by layered translucent native surfaces, but do not require OS-wide acrylic or backdrop blur to make the layout legible.

### 6.2 Typography

- UI title and selected brand headlines: Unbounded where the font is available under a compatible licence.
- Code editor: JetBrains Mono or a bundled/system monospace fallback under a compatible licence.
- General UI: a clean system sans-serif fallback.
- Use a small but readable type scale: 11–12 px for tertiary technical detail, 12–13 px for labels, 13–15 px for normal controls, 16–20 px for section titles, and larger type only for primary status or splash branding.
- Never reduce critical interface text to microcopy.
- Do not use widely tracked uppercase text for every label.
- Avoid overline labels: no tiny all-caps category printed above every section heading.
- Use sentence case for panel titles and action labels.
- Code font and syntax colours should remain readable in monochrome; use weight and shade as well as subtle, accessible token differentiation.

Typography must never overlap controls, buttons, icons, error messages, tooltips, or neighbouring text. Avoid forced clipping, overflow hidden that cuts off essential text, text printed over the button icon, or multiple labels competing for the same space. The layout must work at minimum supported window size and with longer filenames.

### 6.3 Glassmorphism rules

- Use glass surfaces to distinguish floating panels and overlays, not to blur everything.
- Every glass layer needs sufficient contrast against the workspace beneath it.
- Use fine borders and restrained highlights to define panel boundaries.
- Do not place a semi-transparent card directly over text in a way that reduces readability.
- Modals must have an opaque-enough backing, a readable focus path, and a dismiss/cancel action.
- Context menus and tooltips must be drawn above panels and must not extend outside the window without repositioning.
- Focus rings are visible and consistent.
- When a panel is dragged or resized, no labels should remain ghosted or overlap.
- Glass effects must not depend on network images, a CSS engine, or an embedded web page.

### 6.4 Button rules — strictly enforced

This section is important because overlap and clutter are unacceptable.

- An **icon button** contains a single, centred icon only. It does not contain a text label inside the same visual box.
- A **text button** contains a readable text label only. If a small icon is genuinely needed, use a separately aligned icon-and-label layout with a fixed gap, never an icon layered over text.
- No icon, glyph, spinner, badge, status dot, count, or decorative shape may overlap the button label.
- Do not put an icon over a word or a word over an icon.
- Do not place two labels inside the same hit area.
- Do not put a progress spinner on top of a text label. Disable the button and show progress beside or below it, or use a clearly sized icon-only loading state with an accessible tooltip.
- Icon-only controls must have a tooltip, accessible name, focus indicator, and a reasonable hit target. Aim for 34–40 logical pixels in the toolbar and 40–44 logical pixels on touch-capable devices.
- Text buttons should be wide enough for their full labels. Never use ellipses to fit a standard action if the layout could simply widen or wrap the surrounding panel.
- Primary action buttons should be visually distinct but restrained. Never use several equally bright primary buttons in the same panel.
- Avoid unexplained icons. Use familiar metaphors and consistent strokes.
- Disabled controls must have visible disabled states and explain missing prerequisites on hover/focus when useful.
- Destructive actions require confirmation when they could remove user data.
- No button may be a decorative fake control. Every visible action must work or be visibly disabled with a reason.

### 6.5 No-overlap and layout rules

- No layout may depend on absolute positioning text over another control.
- Use layout containers, measured text, responsive widths, and proper alignment.
- A resize must recalculate panel and canvas sizes.
- Text editors and preview viewports may grow/shrink with their pane.
- Tooltips must remain in-window and avoid covering the control that opened them when another placement is available.
- Modal buttons should have adequate separation and predictable order.
- Progress bars have their own rows, with status text outside the bar.
- Labels and controls must have distinct hit areas.
- Lists must show truncation only when the full value remains available in a tooltip or details panel.
- At 1120 × 680 or the chosen documented minimum, the app must still show the editor, preview, and the main inspector without one hiding the others. Lower resolutions can use a deliberate collapsed-pane mode rather than arbitrary overlap.

## 7. Application startup, logo, and intro animation

### 7.1 Logo

Use the repository's TRILYVA T mark at assets/brand/trilyva/T.svg as the authoritative brand source. Inspect the SVG's actual artwork and preserve its geometry. Do not redraw the brand as a different T, use an emoji, create a generic letter tile, or replace it with a third-party asset. If native raster/vector conversion is required, create the needed platform sizes from the same mark.

The logo system needs:
- Main application icon.
- Splash/intro version.
- Compact title-bar version.
- Installer artwork.
- Windows icon container and a transparent PNG source.
- macOS ICNS set.
- Linux icon assets at standard sizes.
- High-density assets appropriate for display scaling.
- Consistent safe padding and correct monochrome contrast.

Do not use a different logo variant in the installer, title bar, and splash unless the only difference is a carefully sized crop for the destination.

### 7.2 Intro animation sequence

Build a short custom intro, around 1.8–2.8 seconds depending on measured startup and user settings. The interface must not delay first use unnecessarily.

1. **Dark arrival:** The native window appears on a near-black surface. Avoid a white flash, default framework window, console window, or visible page load.
2. **Mark formation:** The TRILYVA T mark fades and scales into its centre position using a smooth ease-out curve. Avoid a hard pop.
3. **Orbit motion:** One thin monochrome orbit/ring or a carefully restrained moving highlight travels around the mark. The curve is smooth. It must not resemble an infinite spinning loading indicator.
4. **Light sweep:** A narrow white/grey sheen passes along the mark or ring. Keep it low contrast and brief.
5. **Brand reveal:** TRILYVA fades into view beneath or beside the mark. The logo and wordmark must not collide.
6. **Transition:** The logo group eases toward the application title position while the workspace panels emerge with small opacity and position transitions. No screen-wide flash, oversized zoom, or excessive bounce.
7. **Ready:** The app is interactive only when the runtime and default project are ready. Display the real status in the status area.

The intro must be deterministic enough to test. It must not depend on remote assets. It can be skipped after first launch by a preference or shortcut, and should respect the operating system's reduced-motion preference where available. If reduced motion is enabled, use a near-instant fade without orbit or scale animation.

The logo animation should use rounded easing, not abrupt linear transitions. It must look polished at 60 Hz and remain acceptable at high refresh rates. It should never interfere with frame renders or cause missed frames in the render engine: splash animation and composition rendering are separate systems.

### 7.3 Motion design for the workspace

- Panel reveal: fade plus a small directional movement of roughly 4–10 px, lasting around 140–220 ms.
- Pane resize: no bouncing and no delayed layout.
- Hover: subtle border brightening or background elevation within 90–150 ms.
- Button press: tiny scale or brightness change only if it does not cause label movement.
- Menus: short fade/slide, with a stable origin and clear dismissal.
- Modal open: background dims slightly; modal enters from a small offset, then becomes still.
- Preview playhead: smooth visual movement, while the rendered frame remains tied to integer frame indices.
- Timeline scrub: immediate frame selection; optionally interpolate the playhead's display position, but never silently change which frame is rendered.
- Export progress: steady progress based on actual rendered/encoded frames, not a cosmetic timer.
- Success: a restrained completion state with output path and verification results. No confetti.
- Error: gently highlight the relevant pane; do not shake the whole window, flash red over the whole app, or animate constantly.
- Cursor interaction can affect a subtle glass highlight or a few background particles, but the effect must be low-amplitude, must not distract from code, and must respect reduced motion.

The workspace cannot continuously animate every card or blur effect without purpose. Animation consumes resources; it must not sabotage preview, export, laptop battery, or accessibility.

## 8. Main workspace layout

The default layout is a professional three-pane workstation with a compact top toolbar and a dedicated transport/timeline area. The left editor, centre preview, and right inspector can be resized independently. The preview receives the largest share of space by default.

### 8.1 Top title bar and toolbar

Contains:
- TRILYVA logo and wordmark.
- Current project title.
- Unsaved-change indicator that does not overlap the title.
- New project.
- Open project.
- Save.
- Save As.
- Undo and redo.
- Library.
- Preview controls when appropriate.
- Render and export access.
- Help/documentation access.
- Settings access.
- A compact status area for active render, encoder, or error state.

Icon toolbar items use icon-only buttons with tooltips; text actions use text buttons. Group related controls and separate groups with whitespace or a thin divider. Do not fill the toolbar with dozens of buttons. Rare actions should be in a menu.

Window decoration must behave correctly on supported OSes. If custom window decorations are used, provide accurate drag regions, min/max/close behaviour, keyboard access, and a reliable fallback. Never make a draggable title region swallow clicks on buttons.

### 8.2 Left pane — code editor

The code editor is a primary workspace, not a side feature.

Requirements:
- JavaScript editor with syntax highlighting.
- Line numbers.
- Current-line highlight.
- Indentation and predictable tab behaviour.
- Undo and redo.
- Find and replace.
- Go to line.
- Selection and caret.
- Keyboard navigation and standard editing shortcuts.
- Diagnostics with line and column where the engine can identify them.
- A visible dirty state when edits are unsaved.
- Optional folding only if it is reliable.
- Copy, paste, select all, comment/uncomment, and common editing actions.
- A compile/rebuild action.
- A restore-starter action with confirmation when it would replace user code.
- Editor font size controls.
- Word wrap toggle.
- Proper large-file behaviour; avoid rebuilding the entire UI every keystroke if that makes typing lag.
- Code editing must not freeze the native UI while a lengthy composition is exporting.
- Clear separation between source text and log output.
- Error marker in the gutter for line-based diagnostics.
- Clicking an error takes the user to the relevant line and column.
- If no exact line mapping is available, explain that rather than jumping to an arbitrary line.

Default animation contract:

    window.renderFrame = function (time, frame, fps, ctx, width, height) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      var x = width * 0.5 + Math.cos(time * 2) * 200;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x, height * 0.5, 40, 0, Math.PI * 2);
      ctx.fill();
    };

The default animation is a working reference, not the final product demonstration. Replace it with a distinctive animated monochrome example that illustrates the real runtime. It must animate across time, and it must not be a static screenshot disguised as a sample.

The editor must expose the actual accepted rendering API. Do not show sample helper functions that the runtime does not implement. The documentation and code completion must match the real runtime version.

### 8.3 Centre pane — preview viewport

The preview should be the visual centre of the app.

Requirements:
- Real frame rendering from the current source.
- Play/pause.
- Restart.
- Frame stepping backwards and forwards.
- Timeline/playhead scrubbing.
- Time/frame readout.
- Fit-to-view.
- 100% scale.
- Zoom controls and optional mouse-wheel zoom.
- Pan when zoomed in.
- Full-screen preview.
- Preview background choice: checkerboard for alpha, solid dark/light/custom when useful, and a clear indication of the actual composition background setting.
- Safe area guides can be optional.
- Optional resolution display and preview-scale indicator.
- An error overlay only when it doesn't hide the useful code diagnostics; provide a hide action.
- Preview quality scale separate from export quality. The preview may run at a lower scale when the full composition is too expensive.
- If a preview frame is being computed, show a small independent indicator. Do not pretend a stale texture is the latest rendered frame.
- When preview is behind the playback clock, communicate that it is preview lag and show the current evaluated frame index.
- Preview can be paused on a precise frame.
- Alpha preview must use a checkerboard or another clear alpha indication, not a black background that makes transparency indistinguishable.
- Preview resizing must preserve composition aspect ratio.
- Pixel inspection or a colour sample tool can be added if it does not compromise performance.

A preview is not the final export. Explain that preview resolution and playback speed may be reduced for performance; the export coordinator is required to render every requested frame.

### 8.4 Right pane — inspector and control centre

The inspector has clearly labelled sections, preferably navigable with a short vertical icon rail or native tabs. Do not create a second giant toolbar full of unclear symbols. When icon navigation is used, every icon has a tooltip and an accessible label.

Sections:
1. Composition.
2. Render settings.
3. Output format and encoding.
4. Metadata.
5. Library/asset options when relevant.
6. Advanced or runtime diagnostics where relevant.

Use consistent controls. Numeric fields should show units and validate ranges. A setting that cannot be supported by the selected codec should not silently revert. Show the effective value.

### 8.5 Bottom transport and frame timeline

The bottom area shows:
- Frame ruler.
- Playhead.
- Current frame and time.
- Frame rate.
- Duration.
- Playback controls.
- In/out range or render-range controls if range rendering is implemented.
- Render queue summary and progress when jobs are active.

The current TRILYVA contract is time-driven and deterministic; a keyframe editor is not required to fulfil it. Do not invent a keyframe system and imply it exists. A frame timeline is for navigation, scrubbing, range display, and render control. A future keyframe feature must be a separate explicit design.

The timeline must handle short and long compositions. Do not draw every frame tick for a million-frame sequence; use adaptive tick density and efficient painting. Scrubbing must select real integer frames.

### 8.6 Panel behaviour

- Left pane default around 30% of usable width.
- Preview default around 45–50%.
- Right pane default around 22–25%.
- Save pane sizes in preferences.
- Each pane can be resized, collapsed, and restored.
- A reset-layout action returns to the documented defaults.
- Panel dividers have sufficiently large hit targets and clear hover states.
- Collapsing panes must never destroy their data.
- Avoid overlapping panels or off-screen controls at the minimum supported window size.
- Modal dialogs must use the native owner window and return results into the app's state model.

## 9. Composition model

Composition settings must be explicit and serialisable.

Required fields:
- Name.
- Width and height.
- Frame rate.
- Duration in seconds and the resulting integer frame count.
- Background mode: opaque colour or transparent.
- Loop enabled/disabled.
- Optional loop duration if the product's existing project contract supports it.
- Preview scale/quality.
- Default output format.
- Default output quality/bitrate.
- Metadata fields.
- Source hash where available.

### 9.1 Resolution

- Support resolutions from a sensible minimum through 16,384 px per dimension where memory and render backend limits allow it.
- Do not let a resolution control silently clip its value to fit a preview.
- Show estimated memory use and a warning before known-dangerous allocations.
- Reject impossible or overflowed image sizes before allocation.
- For preview, render at a lower resolution if needed without changing the export composition.
- For export, process frames sequentially and release temporary buffers where possible.
- Do not allocate all frames as full-size raw images in memory.
- Actual maximum dimensions depend on output format, encoder, GPU/CPU, and available memory; state capability accurately.

### 9.2 Frame rate and duration

- Common FPS options include 24, 25, 30, 50, 60, 120, and 240.
- Custom FPS should be permitted within the documented runtime and encoder limits.
- Common duration presets: 10, 15, 20, 30, and 60 seconds, with custom duration available where supported.
- Calculate frame count deterministically from validated duration and FPS.
- Define rounding rules explicitly. Do not let different export code paths calculate different frame counts for the same composition.
- Frame indices start at zero; the rendered time for a frame is a documented deterministic calculation, usually frame index divided by FPS and adjusted by explicit time/composition parameters.
- The last frame must follow the selected loop and inclusive/exclusive duration convention. That convention must be documented and tested.
- Frame-rate metadata and frame timestamps in output must match the actual contract as closely as the output format permits.

### 9.3 Transparent backgrounds

Transparency is a first-class output requirement, not an aesthetic toggle.

- The composition has an explicit alpha/transparent setting.
- Preview shows alpha clearly with a checkerboard.
- Renderer output pixels must preserve alpha.
- A solid fill that covers the whole canvas can make a nominally transparent scene actually opaque; show the actual alpha result where feasible.
- Do not claim alpha merely because the project setting is enabled.
- H.264 MP4 typically does not preserve alpha; the UI must say that the chosen profile is opaque.
- Transparent output options include WebM VP9 alpha, ProRes 4444 MOV, and APNG when the required encoder/pixel format is available.
- PNG frames preserve alpha.
- JPG is opaque and must never be sold as transparent.
- SVG and EPS can preserve transparency only for the vector operations and target profiles that can represent them.
- Verify alpha by decoding actual output pixels and checking for non-opaque samples, not by checking only container metadata or a pixel-format name.
- When alpha verification fails, mark the output invalid and explain the reason.

## 10. Animation runtime and compatibility contract

### 10.1 Contract

TRILYVA animation code must keep the familiar interface:

    window.renderFrame = function (time, frame, fps, ctx, width, height) {
      // Draw the entire requested frame.
    };

The runtime must validate this function before a render starts. The function receives:
- **time:** The deterministic composition time for this frame.
- **frame:** The integer frame index, starting at zero.
- **fps:** The validated composition frame rate.
- **ctx:** The TRILYVA drawing context.
- **width:** The composition width.
- **height:** The composition height.

The animation must redraw what it needs every time the function is called. Rendering frame 240 directly must not depend on having rendered frames 0–239 first. The core mechanism is frame-addressable, not a stateful capture of a live animation loop.

Do not require setInterval, setTimeout, requestAnimationFrame, DOM operations, network fetch, HTML, or external runtime dependencies inside animation code. They undermine deterministic rendering and portability. Wall-clock access and uncontrolled random calls should be restricted or documented. Provide deterministic helpers where possible.

### 10.2 Runtime helpers

Preserve helpers that are part of the current published TRILYVA contract, after checking the actual source:
- TAU and PI constants.
- lerp/mix.
- clamp.
- map.
- smoothstep and smootherstep.
- wrap and pingpong.
- easing helpers.
- deterministic random and seeded helper functions.
- helper functions such as noise, fbm, spring, and vector math only if their implementations are actually shipped and documented.

Do not claim helper availability by listing a function in docs when the runtime doesn't define it. Add automated contract tests for every documented global helper.

### 10.3 Canvas API parity

Create a versioned compatibility specification listing every operation accepted by the native renderer. At minimum, evaluate support for:
- Fill and stroke styles.
- Alpha/globalAlpha.
- Line width, line cap, line join, dash.
- Paths: moveTo, lineTo, bezierCurveTo, quadraticCurveTo, arc, ellipse if supported, rect, closePath, fill, stroke, strokeRect, fillRect, clearRect.
- save, restore, translate, scale, rotate, transform, setTransform, resetTransform.
- Linear and radial gradients.
- Text drawing and measurement.
- Image drawing and image decoding.
- Clipping.
- Composite modes.
- Pixel readback when safely supported.
- Transparent canvas.
- Colour parsing and colour space.
- Deterministic error mapping.

This list is a target for implementation and verification, not a claim the native engine already supports every entry. Keep an explicit supported/partial/unsupported table in app documentation and tests.

When users call an unsupported operation, do not silently skip it. Either implement it, provide a clear runtime diagnostic, or explicitly mark a documented compatibility limitation before export. Incomplete SVG/EPS vector support must not imply that arbitrary Canvas scenes are vector-compatible.

### 10.4 Source execution and safety

- Execute user source in an isolated runtime context.
- Use sensible limits for memory, instruction/time budgets, output size, recursion, and per-frame execution.
- A runaway animation should be stopped with a useful frame-specific error.
- Never run untrusted source with filesystem, process, or network privileges by default.
- The renderer bridge exposes only the intended drawing and deterministic helper API.
- Do not let an animation write arbitrary files or execute system commands.
- Importing code is not consent to execute it invisibly; opening a project should show its source and should follow documented run settings.
- The app must stay responsive while a script is executing; render work should be isolated from UI events.
- The exact API surface and runtime version should be included in metadata when practical.

## 11. Rendering model and reliability

Rendering must be a reproducible pipeline. Do not treat the encoder's frame count as a substitute for actually evaluating each frame.

### 11.1 Job preparation

Before starting:
1. Validate the project and animation contract.
2. Validate dimensions, frame rate, duration, and total frame count.
3. Validate output path and output format.
4. Discover the actual codec and pixel format capability.
5. Estimate memory and output size.
6. Check disk space where the OS allows it.
7. Resolve metadata and filename.
8. Create an isolated temporary output area.
9. Record immutable settings and a source hash.
10. Show a clear summary before a large or destructive operation.

### 11.2 Frame production

- Iterate over the exact expected integer frame indices.
- Calculate each frame's time using the documented time formula.
- Render one frame or a bounded batch at a time.
- Validate that the frame buffer dimensions are correct.
- Preserve the correct pixel format and alpha.
- Update progress from work that really completed.
- Record per-frame failures, elapsed time, and diagnostic information.
- Allow cancellation at safe frame boundaries.
- Remove incomplete final outputs; optionally retain recoverable frame checkpoints when that behaviour is explicitly chosen.
- Avoid unbounded RAM growth.
- Never fill gaps by duplicating another frame.
- Never interpolate/blend frames to make the frame count appear correct.
- A resumed render must verify existing frames and continue only when the checkpoint and settings match.
- If the user edits code or settings after a job starts, the immutable running job must not silently change halfway through.

### 11.3 Encoding and finalisation

- Use a reliable local FFmpeg/FFprobe or another validated local media backend.
- Discover real executables, codecs, muxers, decoders, pixel formats, and available hardware paths at runtime.
- Use argument-safe process invocation, not shell string interpolation of user input.
- Capture progress and diagnostic output.
- Avoid parsing progress solely from fragile human-readable console text when a structured output mode exists.
- Verify the actual file with FFprobe or an equivalent parser.
- Validate dimensions, duration, actual stream frame count when available, FPS/time base, codec, pixel format, output size, and container properties.
- Decode output samples to verify alpha for transparent formats.
- Delete or clearly quarantine output that fails required validation.
- Keep logs and a receipt for successful and failed jobs.
- Give users the output path and a reveal-in-file-manager action.
- If the encoder doesn't support the requested setting, show the supported alternatives before rendering.

### 11.4 Performance targets

TRILYVA's aspirational marketing targets include up to 16K frame output, up to 240 FPS composition timing, and bitrate options reaching 2 Gbps where the selected backend and codec permit them. These are ceilings to validate, not guaranteed real-time speed on every PC.

- Rendering at 16K is inherently expensive. Do not promise smooth 16K preview.
- Preview can be downscaled and slower than playback.
- Export must still process all requested frames accurately.
- User-facing bitrate fields must explain when a codec cannot accept the selected value.
- Hardware encoding is optional and capability-gated; the CPU/software path remains available where practical.
- Memory use and disk usage must be considered explicitly.
- A high resolution/FPS setting must not result in overflow, frozen UI, or silently reduced output.
- Benchmark with small, medium, high-resolution, alpha, text, gradient, and complex procedural scenes.
- Report actual render time and actual processing rate, not the target number as measured performance.

## 12. Export formats

Treat each format as a real implementation with its own rules and tests.

### 12.1 Video formats

- **MP4 / H.264:** Common compatibility profile, opaque output. Validate the actual H.264 encoder and muxer. Do not claim alpha.
- **WebM / VP9:** Validate the actual VP9 encoder, container, dimensions, FPS, and pixel format. Alpha output is a separate profile.
- **WebM / VP8:** Optional where supported and useful; capability-gate it.
- **Transparent WebM / VP9 alpha:** Require an alpha-capable pixel format and verify decoded output pixels for transparency.
- **MOV / ProRes 4444:** For high-quality alpha workflows where the native encoder and pixel format are available.
- **APNG:** Transparent animated image where supported. Report frame count and timing.
- Other codecs can be added only after their settings, metadata, alpha behaviour, and verification are implemented.

Do not label a ProRes, AV1, HEVC, or other output successful solely because a command returned an exit code. Parse and inspect the written media.

### 12.2 Still images

- PNG.
- JPG/JPEG.
- WebP.
- SVG when vector recorder compatibility allows it.
- EPS when the source scene can be represented correctly by the supported vector exporter.

Still export should operate on a selected frame, which may be frame zero, the current playhead, or a user-selected index. The selected output dimensions must be explicit. JPG conversion needs a chosen background when the source has alpha.

### 12.3 Frame sequences

- PNG sequence in ZIP.
- PNG sequence in a chosen folder when the platform's native file APIs allow it.
- SVG frame sequence in ZIP for supported vector scenes.
- Sequence manifest and README.
- Sequential filenames with documented, zero-padded frame indices.
- Frame count, dimensions, FPS, duration, alpha/background mode, project title, creator, software version, timestamp, and source hash in metadata.
- The sequence must identify partial/incomplete state when a render is cancelled.
- A completed sequence is not declared fully verified until all expected frames, manifests, and metadata are present and checked.
- Huge sequences require a size/memory warning.

### 12.4 Vector output honesty

The native SVG/EPS exporter may only be able to represent a subset of Canvas drawing operations. Maintain a compatibility detector and report which features cannot be represented exactly. Never claim a fully vector result when text, filters, raster assets, blend modes, clipping, or other unsupported operations have been skipped or approximated.

## 13. Export settings UI

The render/export area should contain:

- Output format selector with clear labels.
- Resolution fields and presets.
- FPS.
- Duration and expected frame count.
- Background/alpha mode.
- Quality preset if meaningful for the selected encoder.
- Bitrate field where applicable.
- Pixel format/alpha indication where relevant.
- Output file/folder selection.
- Filename preview.
- Output location.
- Overwrite decision when a destination already exists.
- Current capability status derived from actual probes.
- Estimated output size when a reasonable estimate can be computed.
- Verification requirements for the chosen format.
- Render/encode/cancel actions.
- Real progress and a useful log panel.

Format selection must alter the available controls. For example, do not show an alpha toggle for an opaque H.264 profile as if it will be preserved. Do not show a bitrate control for a still image if it has no meaning.

### Progress stages

Use a clear state machine similar to:
- Idle.
- Validating.
- Preparing.
- Rendering frames.
- Encoding.
- Finalising.
- Verifying.
- Complete.
- Failed.
- Cancelled.

The exact labels can be refined, but state must come from the real job. Render and encode percentages must not be conflated. A result may show 100% rendering but still be encoding or verifying.

### Completion receipt

After a successful job, show:
- Output filename.
- Output location.
- Dimensions.
- FPS and duration.
- Expected and verified frames.
- Codec/container.
- Pixel format.
- Alpha verification result if requested.
- Output size.
- Render duration and average measured render rate.
- Metadata and source hash.
- Any warning or partial-verification details.
- Buttons to open the file, reveal the output folder, copy the receipt, and return to work.

A file that fails the required verification must not use the same success presentation.

## 14. Project files and document lifecycle

A project is not just an editor buffer. It includes a versioned manifest, source code, composition settings, metadata, user-owned assets, and optional preview thumbnail and render presets.

Requirements:
- Save.
- Save As.
- Open.
- New.
- Recent projects.
- Dirty-state tracking.
- Autosave/recovery.
- Versioned project schema.
- Backup before schema migration.
- Atomic file writes where the OS permits.
- Graceful handling of corrupt or truncated files.
- Avoid losing user work after a native crash.
- Clear conflict handling when the target file changed elsewhere.
- Project title and filename are separate fields.
- Safe filename generation that avoids invalid OS characters.
- Preserve Unicode titles and metadata.
- Include source hash and creation/modified timestamps.
- Export metadata should include the project/software version.
- Project format must be documented and validated.
- Don't write into the installed application directory for user state.

Define a native project extension such as .trilyva and register it appropriately during installation. It should be possible to inspect or recover project data without a proprietary online account. A compressed project archive can be used if that makes the file more portable; if so, include a versioned manifest and integrity checks.

### Recovery

- Autosave to an app-data directory.
- Do not overwrite the user's last known-good save with a failed partial write.
- On restart after a crash, offer to recover an autosave and show its timestamp.
- Keep a documented retention policy.
- Never silently delete the original project while cleaning render temporary files.
- Provide a user-controlled cleanup option for caches and recovered temporary documents.

## 15. Library and reusable assets

The Library is local and user-owned. It is not a paid content service and does not require an account.

### 15.1 Main Library button

Keep one visible Library entry in the toolbar. Clicking it opens the actual Library panel or window; it must not open an access-gate page or request a product password. There is no general application access password.

Library actions include:
- Import a JavaScript animation file.
- Import a folder of assets or project examples.
- Import a ZIP archive.
- Unlock an encrypted ZIP by prompting for its archive password only when the archive actually requires one.
- Browse imported projects/assets.
- Search by name, tag, description, and format when metadata is present.
- Show import date.
- Separate imports into dated collections or folders.
- Rename user-visible library entries without changing the original imported file unless explicitly requested.
- Remove an entry from the library without deleting the source file unless the user explicitly chooses delete.
- Export selected entry or collection.
- Export the whole library as a folder or ZIP with a stable manifest.
- Open an item in the editor.
- Duplicate an item for editing.
- Show a clear missing-file state if a source was moved outside the library.

### 15.2 Import and ZIP handling

- Importing a JavaScript file validates that it can be opened as text; the renderer may validate the contract after the user chooses to run/preview it.
- ZIP import validates paths and rejects path traversal, unexpected symlinks where applicable, excessive decompressed size, unreasonable compression ratios, and unsafe filenames.
- Encrypted ZIP files prompt for a password. Do not persist the password by default.
- Failed imports are atomic: an invalid archive must not leave half a collection that looks complete.
- Imported folders/ZIPs become separate dated library imports, not one uncontrolled merged directory.
- Preserve source filenames and provenance metadata.
- Detect duplicates by stable hash where practical.
- Never execute every JS file automatically during import.
- Display a clear import summary with added, skipped, and failed files.

### 15.3 Local library storage

- Put library index/database and thumbnails under the OS app-data directory or a user-selected library location.
- Keep source assets in user-accessible folders where practical.
- Use a versioned local catalogue.
- Back up the catalogue before a database migration.
- A deleted catalogue entry must not erase its source by surprise.
- A missing or malformed thumbnail must not make the source unusable.
- Do not upload library contents to a server.
- Provide a way to reveal the selected file or collection on disk.

### 15.4 Copy Prompt

Keep a Copy Prompt action available in a sensible place, such as the editor toolbar or animation assistant menu. It copies text to the clipboard and reports success without overlaying a tooltip on top of the button.

The default prompt must preserve the documented TRILYVA API and must explicitly demand real animation, not one static frame. The starter prompt is:

Create a polished, genuinely animated scene for Trilyva. Output ONLY complete, runnable JavaScript code using this exact API:

    window.renderFrame = function (time, frame, fps, ctx, width, height) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      var x = width*0.5 + Math.cos(time*2)*200;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x,height*0.5,40,0,Math.PI*2);
      ctx.fill();
    };

Use this as a working reference, not final animation. Replace drawing logic with the requested scene. Animate using time for smooth deterministic motion. Redraw every frame, scale to width/height, support any resolution/FPS. No static images, HTML, DOM, external libraries, timers, or requestAnimationFrame. Prioritize beautiful visuals, detailed motion, complete working code. No explanations/Markdown. Requested scene placeholder: <describe the animation>.

The UI may provide a text field for the requested scene and substitute the placeholder, but the copied result must remain complete and runnable. Do not require a connected AI service for the prompt-copy function.

## 16. Metadata, CSV, and receipts

Metadata fields should include:
- Title.
- Description.
- Creator/credit.
- Tags/keywords.
- Composition title.
- Width and height.
- FPS.
- Duration and frame count.
- Background/alpha mode.
- Format and codec.
- Colour space where known.
- Source hash.
- Software/version.
- Created/exported timestamps.
- Render settings.
- Output file.
- Verification outcomes.
- Warnings or unsupported-operation disclosures.

Support exporting metadata for selected items or a batch into CSV with a stable column order and valid CSV escaping. Keep metadata generation separate from media encoding so metadata failures cannot change pixels or cause frame loss.

A receipt is machine-readable JSON and human-readable UI detail. It must clearly distinguish:
- Requested values.
- Effective values.
- Parsed output values.
- Values verified from decoded output.
- Values unavailable or not verified.

## 17. Keyboard shortcuts and interaction

Use standard desktop expectations and show the shortcuts in menus/tooltips. Proposed baseline:

| Action | Windows/Linux | macOS |
|---|---|---|
| New project | Ctrl+N | Cmd+N |
| Open project | Ctrl+O | Cmd+O |
| Save | Ctrl+S | Cmd+S |
| Save As | Ctrl+Shift+S | Cmd+Shift+S |
| Undo | Ctrl+Z | Cmd+Z |
| Redo | Ctrl+Y or Ctrl+Shift+Z | Cmd+Shift+Z |
| Find | Ctrl+F | Cmd+F |
| Render current composition | F5 | F5 |
| Toggle preview playback | Space when focus is not in a text editor | Space when focus is not in a text editor |
| Move one frame backward | Left arrow when focus is not an editor | Left arrow when focus is not an editor |
| Move one frame forward | Right arrow when focus is not an editor | Right arrow when focus is not an editor |
| Documentation/help | F12 | F12 |

If an action cannot be completed, the shortcut should report why. Shortcuts must not hijack typing in the code editor or numeric fields.

F12 is explicitly reserved for opening the in-app documentation/help view or help window, not developer tools. Do not attach the user-facing F12 action to browser developer tools.

Support:
- Keyboard-only operation.
- Visible focus indicators.
- Predictable tab order.
- Escape to dismiss transient menus/modals when safe.
- Confirmation when Escape would discard a long render or unsaved destructive action.
- Mouse-wheel zoom only within the preview when it is the active pointer region.
- Native copy/paste and clipboard permissions.
- Drag and drop of supported files with safe import handling.

## 18. Icons and icon inventory

Create one consistent icon system. Use the TRILYVA mark plus a custom set of monochrome vector icons with consistent geometry and stroke weight. Avoid emoji, platform-mixed emoji symbols, arbitrary Unicode characters used as production icons, and unrelated icon libraries. A temporary text glyph is acceptable only during development; the release must use real icons.

### Global toolbar icons

| Action | Icon concept | Tooltip |
|---|---|---|
| New project | Document with plus | New project |
| Open | Open folder | Open project |
| Save | Document with inward/confirm mark | Save project |
| Save As | Document with outward arrow | Save project as |
| Undo | Curved arrow left | Undo |
| Redo | Curved arrow right | Redo |
| Library | Stacked cards or archive | Library |
| Render | Crisp frame/target icon | Render composition |
| Export | Arrow leaving a tray | Export |
| Settings | Sliders | Settings |
| Help | Circle with question mark | Help and documentation |
| Notifications/log | Three-line log with small status marker | Render log |
| Close panel | Simple close glyph | Close panel |

### Editor icons

| Action | Icon concept |
|---|---|
| Recompile/refresh | Curved refresh arrow |
| Search/replace | Magnifier |
| Go to line | Numbered vertical cursor |
| Restore starter | Reset arrow |
| Copy code | Two offset rectangles |
| Expand/collapse editor | Horizontal pane with arrow |
| Clear diagnostics view | Clear list icon |

### Preview and timeline icons

| Action | Icon concept |
|---|---|
| Play | Right-facing triangle |
| Pause | Two vertical bars |
| Restart | Circular arrow |
| Step backward | Single left frame arrow |
| Step forward | Single right frame arrow |
| Fit | Four inward/outward corners |
| Zoom in | Magnifier with plus |
| Zoom out | Magnifier with minus |
| Full screen | Four-corner expand |
| Checkerboard/background | Square with contrasting cells |
| Timeline visibility | Horizontal ruler |

### Export icons

| Format | Icon concept |
|---|---|
| MP4 | Small frame/film outline |
| WebM | Simplified video frame |
| PNG | Image sheet with alpha checker |
| JPG | Image sheet without alpha checker |
| WebP | Image sheet with compact dot pattern |
| SVG | Vector path/nodes |
| EPS | Vector document |
| Frame ZIP | Archive box |
| Folder sequence | Folder with frame stack |
| Verified | Checkmark in a circle |
| Warning | Triangle outline |
| Failed | Cross in a circle |

These are icon concepts, not instructions to insert arbitrary Unicode symbols. Draw or license appropriate monochrome vector assets, verify the licence, and keep the icon system consistent. Tooltips use words, but the button's actual hit-area contains the icon only.

### Icon requirements

- Fixed optical size and stroke width within icon families.
- Align to the same baseline and optical centre.
- Use an icon viewBox with sensible padding.
- Hover and pressed states change background/border/opacity, not icon geometry.
- Disabled icons remain understandable.
- Do not put a label underneath every toolbar icon when the tooltip already names it.
- Never rely on colour alone to convey success/warning/failure.
- Make an icon's meaning discoverable through tooltip, keyboard focus, and menu labels.

## 19. Settings and preferences

Persist settings separately from project data. Include:
- Theme: monochrome dark default. A light theme may be added later, but the main product visual remains dark monochrome.
- Startup intro: full, reduced, or skip.
- Editor font size.
- UI scale.
- Preview default zoom and quality.
- Default project and composition presets.
- Default export format and bitrate.
- Default output directory.
- Autosave interval and recovery retention.
- Library location.
- Recent projects limit.
- Confirmation settings for overwrite/delete.
- Render worker count or resource preference only when it has a reliable effect.
- Media backend status and third-party notices.
- Reset preferences.
- Open logs folder.
- Open app-data folder.

Settings UI must be organised and searchable if it becomes large. Do not make every preference a separate modal. Any preference reset must make clear whether it resets project data or only settings.

## 20. Built-in examples and documentation

Include a useful set of genuinely animated example projects. They must be authored against the documented runtime API, not rendered video files or screenshots. Each example should have a title, concise description, categories/tags, expected API features, and a licence/source note.

Suggested example categories:
- Minimal looping geometry.
- Orbital/DNA-style motion.
- Flower/petal bloom with natural easing.
- Seamless loop.
- Procedural wave field.
- Particle trails.
- Radial symmetry.
- Typography reveal.
- Fast abstract transition.
- Star-fight/energy-motion style scene implemented with original geometry, without relying on unlicensed character art or copied assets.
- Transparent web-background loop.
- Vector-safe shape animation.
- Complex procedural scene used for render stress testing.

The example browser should support search/filter, preview, open, duplicate, and reset. A sample must not silently overwrite the user's code.

In-app documentation should cover the animation contract, time/frame semantics, available helpers, supported Canvas operations, deterministic random, output formats, transparency, project files, library imports, performance guidance, runtime limitations, and troubleshooting.

## 21. Accessibility, focus, and responsiveness

- All controls should be keyboard reachable.
- Icon buttons need accessible names.
- Tooltips must appear on keyboard focus as well as hover.
- Focus states must contrast against monochrome glass.
- Maintain readable text contrast.
- Do not communicate status only via grey shade or a tiny dot.
- Allow reduced motion.
- Respect OS text/UI scaling within practical layout limits.
- Ensure long project titles and file paths do not overlap controls.
- Provide a useful minimum window size.
- At narrow widths, collapse optional panes through explicit toggles instead of hiding controls underneath each other.
- Menus and dialogs need reliable keyboard navigation and cancellation.
- Error details should be selectable/copyable.
- Progress can be announced through accessible status text without spamming a screen reader for every encoded frame.
- Do not repeatedly steal focus while a render is running.

## 22. Local data, privacy, and security

TRILYVA should work completely offline for local editing and rendering.

- No mandatory account.
- No remote render service.
- No telemetry by default.
- No unrequested uploads.
- No remote font, JavaScript, CSS, image, or CDN dependencies.
- Use application data directories that follow OS conventions.
- User chooses where outputs are written.
- Protect against ZIP path traversal and decompression bombs.
- Use safe filesystem paths.
- Validate project formats before loading.
- Do not run imported animation code with system privileges.
- Avoid shell execution using interpolated user-controlled values.
- Keep temporary output separate from final output.
- Treat metadata and filenames as untrusted text when displaying them.
- Never include API keys, signing certificates, passwords, or secrets in the repository.
- Do not persist ZIP passwords unless the user explicitly requests a safe password manager feature.
- Bundle media tools only with the required notices and redistribution compliance.
- Explain exactly where logs, caches, projects, and library data are stored.
- A crash report is local by default; any future upload must be explicit opt-in.

## 23. Diagnostics and error handling

Errors should be concise first and expandable into technical details.

A useful error should include:
- What failed.
- Stage: compile, validate, render, encode, write, or verify.
- Frame/time when known.
- Line/column when available.
- Reason.
- Suggested fix.
- Whether any file was written.
- Whether partial output was removed or retained.
- Log identifier or path.

Examples of correct behaviour:
- Missing renderFrame function: show the expected function contract and a link/action to open documentation.
- Unsupported Canvas method: identify the method, explain that it is not implemented or not supported in this mode, and prevent a silently incomplete export.
- Codec unavailable: explain which local backend capability is missing and suggest a supported format.
- Insufficient disk space: stop before corrupting an existing file; do not overwrite an existing output.
- Alpha missing: mark the transparent export invalid, report the measured pixels, and retain diagnostic information.
- Render cancellation: clearly distinguish cancelled from failed and complete.
- Invalid or encrypted ZIP: report the archive import failure without partially modifying the library.
- Corrupt project: offer recovery/backup options and do not overwrite the original automatically.

Logs should be useful to a developer but should not flood the user with raw stack traces on every failure. Provide Copy details and Open logs actions.

## 24. Data integrity and file-write protocol

- Write to a temporary file in the destination filesystem when possible.
- Flush/close before verification.
- Verify the bytes actually written.
- Rename atomically into the final output name after required validation.
- If verification fails, do not leave a corrupt file with a successful-looking final name.
- If the platform prevents atomic rename, use a safe fallback and document it.
- Never overwrite an existing file without the selected overwrite policy.
- Use cryptographic hashes for source/sequence identity where practical.
- For a sequence, check expected frame files, names, dimensions, and frame indices.
- For video, inspect the final container and decode samples.
- A result receipt must never say a field was verified if the parser could not inspect it.
- Do not confuse a process exit code, a manifest claim, or encoder input count with output verification.

## 25. Testing and acceptance criteria

The native project is not ready just because it compiles. Implement tests around actual behaviour.

### 25.1 Runtime tests

- A valid renderFrame function is accepted.
- Missing or wrongly named renderFrame is rejected with a useful error.
- Same source/time/frame/settings produces the same frame output across repeated evaluations.
- Frame 100 can render directly without needing frames 0–99 first.
- Time semantics and frame count are consistent.
- Deterministic helper functions return stable values.
- Runtime limits stop infinite/very long scripts without freezing the UI.
- Unsupported APIs produce a visible diagnostic.
- Source errors map to line/column where possible.
- Canvas operations preserve transforms, alpha, clipping, and styles as implemented.

### 25.2 Raster/render tests

- Solid fill.
- Transparency.
- Paths and curves.
- Stroke/fill styles.
- Transform stack.
- Alpha blending.
- Gradient behaviour if implemented.
- Text and image behaviour if implemented.
- Exported resolution.
- Preview scaling does not change the composition's logical coordinate system.
- Large resolutions fail safely before exhausting memory.
- Pixel samples match expected values within a documented tolerance.

### 25.3 Export tests

- Exact sequential frame order.
- Frame zero and the final expected frame are present.
- Correct frame count.
- Resolution and aspect ratio.
- Correct frame-rate contract.
- Output filename and path sanitisation.
- Cancellation and cleanup.
- Disk write errors.
- Unsupported codec.
- Alpha and opaque formats.
- Actual alpha decoded from output.
- Metadata and CSV escaping.
- Corrupt output fails verification.
- Existing output is not overwritten unexpectedly.
- Checkpoint resumption requires matching source/settings.
- Large render does not increase memory without bound.

### 25.4 UI tests

- Main panes are usable at minimum window size.
- Resizing panes causes no overlap.
- Buttons are not clipped.
- Icon-only buttons have tooltips and accessible names.
- Text-only buttons show their full label.
- Tooltips and menus remain on-screen.
- Keyboard focus and shortcuts work.
- Editing code does not freeze the app.
- Opening/saving projects retains settings and source.
- Startup animation can be skipped and reduced.
- Library imports report accurate success/failure.
- The app window remains responsive during render/export.
- Errors are not drawn under buttons or outside panel bounds.

### 25.5 Installer tests

- Fresh install works.
- Existing install upgrades safely.
- Shortcut creation matches choices.
- Project file association works if installed.
- App launches from the expected location.
- Uninstall removes app-owned files but preserves user data.
- Installer includes correct icon, name, version, and publisher.
- Packaged native media dependencies are found, or a clear diagnostic explains what is missing.
- Linux package dependencies are documented.
- macOS app bundle metadata matches actual binary architecture.
- Every artifact uploaded by CI exists and has the expected architecture/format.

### 25.6 Release acceptance gate

A release candidate is accepted only when:
- Native UI source contains no WebView/embedded browser as its application interface.
- The old browser app is not rendered inside the native window.
- The logo and splash are implemented.
- The editor, runtime, preview, and deterministic frame renderer work together.
- The required format paths are implemented or clearly marked as out of scope for the stated release instead of being represented by fake controls.
- Every claimed format has a round-trip or parser validation test.
- Transparent formats have a decoded alpha test.
- A test project can be saved, closed, reopened, and rendered again.
- CI passes on every claimed target.
- Installer/package smoke tests pass.
- The README and in-app docs accurately state compatibility limitations.
- The output artifacts are attached to a CI run or explicitly delivered by the requested workflow.
- No unsupported feature is marked complete merely because a button exists.

## 26. Development structure

Keep the native source isolated from the GitHub Pages site. A proposed structure is:

    TRILYVA/
      README.md
      native/
        Cargo.toml
        Cargo.lock
        src/
          main.rs
          app/
          editor/
          project/
          runtime/
          renderer/
          export/
          media/
          library/
          ui/
          theme/
        assets/
          logo/
          icons/
          splash/
          examples/
        packaging/
          windows/
          linux/
          macos/
        tests/
        docs/
        scripts/

Exact module names can differ, but responsibilities must remain separated. Keep the public web workspace in its own existing directory and do not delete or replace it as part of the native build.

### Dependency policy

- Prefer mature native libraries with acceptable licences and active maintenance.
- Pin versions for the release build and update them intentionally.
- Do not use HTML/CSS/JS as the native UI.
- Do use JavaScript as the animation authoring language because the renderFrame contract is part of TRILYVA's mechanism.
- Do not use an external cloud service for core behaviour.
- Avoid bundling large, unnecessary GUI runtimes.
- Keep licence and third-party notices for all shipped libraries, fonts, codecs, and helper executables.
- Do not download runtime dependencies during normal app launch.
- Explain the design decision for any major rendering, scripting, or codec dependency.

## 27. Implementation order for Codex

Codex must work on the real codebase, keep changes reviewable, and build in verifiable steps. It must not stop after creating screens.

### Phase 1 — repository audit and design foundation
- Inspect the existing public renderer, its contracts, exports, examples, formats, settings, metadata, and library flows.
- Record actual behaviour before porting it.
- Keep an explicit checklist for every feature listed here.
- Set up the separate native source tree, build scripts, versioning, platform identity, and a test harness.
- Define the UI component system and icon rules.

### Phase 2 — native window and branded onboarding
- Build the native window and theme.
- Implement logo assets and the intro animation.
- Implement real panes, resizing, focus, tooltips, menus, and no-overlap rules.
- Implement settings and local app-data handling.
- Confirm there is no embedded browser or copied HTML workspace.

### Phase 3 — project model and editor
- Implement project serialization, save/load, recovery, editor, undo/redo, syntax highlighting, diagnostics, and source hash.
- Keep file format documented.
- Verify that editing and saving are independent of the renderer's current frame.

### Phase 4 — runtime and raster renderer
- Implement the renderFrame contract and deterministic time/frame semantics.
- Implement the Canvas compatibility layer.
- Create automated API/parity tests.
- Show real output in the preview. No fake preview.

### Phase 5 — preview, transport, and composition
- Implement playback, scrubbing, frame stepping, zoom, background/alpha view, composition controls, and responsive panes.
- Measure actual preview performance and avoid blocking UI events.

### Phase 6 — deterministic export engine
- Implement immutable render jobs, sequential frame rendering, cancellation, progress, checkpoints where appropriate, temporary files, metadata, and receipts.
- Validate frame order and completeness.
- Ensure the UI remains responsive during long renders.

### Phase 7 — media and still/vector formats
- Implement PNG/JPG/WebP, MP4/WebM, transparent WebM/MOV/APNG, PNG sequences, and supported SVG/EPS paths according to the actual capability matrix.
- Bundle/discover media tools correctly.
- Verify output bytes and alpha.
- Do not label unsupported features complete.

### Phase 8 — Library, examples, CSV, and project management
- Implement local library import, archive password prompts, safe ZIP extraction, separate dated imports, search, duplication, export, and metadata CSV.
- Add curated animated example projects and the documented Copy Prompt action.
- Test the whole lifecycle, not only the import button.

### Phase 9 — packaging and distribution
- Make the custom Windows installer.
- Create Linux packages and macOS app/DMG outputs for the claimed architectures.
- Include icons, notices, file associations, and safe uninstall/update handling.
- Run fresh-install and upgrade smoke tests.

### Phase 10 — hardening and release candidate
- Run runtime/raster/export/UI/package test suites.
- Fix defects before adding visual polish.
- Run a representative project pack on each target.
- Ensure documentation matches implementation.
- Build all requested desktop platforms.
- Provide actual artifact links from CI.
- Do not publish a GitHub Release unless the project owner explicitly asks.

At the end of each phase, report what was actually implemented, tests run, tests that failed, and features not yet implemented. Do not call a phase complete if its acceptance tests are still queued or failing.

## 28. Instructions Codex must follow while working

- Read this entire document before editing files.
- Inspect the existing project and its real contracts before changing anything.
- Implement a native application from scratch. The existing web workspace is a reference, not the desktop UI.
- Do not merely scaffold directories, add TODO comments, or create mock screens.
- Do not add unconnected buttons or controls that have no behaviour.
- Do not mark an item complete until its code path works and has appropriate tests.
- Do not alter unrelated website projects.
- Do not merge changes into main without explicit permission.
- Do not replace user project content or library data during migrations.
- Do not commit generated build output, private user data, or secrets.
- Do not claim builds passed unless their logs show success.
- Prefer a small, tested, complete implementation of a real feature to a broad collection of hollow controls; nonetheless, keep the full acceptance checklist visible so nothing is forgotten.
- If a requested feature cannot be delivered in the current phase, label it as incomplete and explain the technical blocker.
- Never silently degrade a requested feature.
- Use the native brand mark. Follow the monochrome glass design and icon/button constraints literally.
- Run formatters, tests, lint checks, and platform builds after changes.
- Keep the README updated whenever implementation facts or compatibility support change.

## 29. Definition of done

The Native Desktop rebuild is done only when TRILYVA can be installed and launched as a standalone native application; presents the custom monochrome glassmorphism workspace and branded intro; edits and saves JavaScript animation projects; evaluates the documented renderFrame contract; previews true frames; renders every requested frame deterministically; exports and verifies the formats claimed by the release; maintains an offline local library; recovers from ordinary failures; offers proper metadata and logs; and ships with custom OS-specific packaging and tests.

Most importantly, it must feel like a coherent creative application. The editor, preview, composition inspector, timeline, project model, renderer, export controls, and library must be parts of one product—not separate web screens placed in a native-looking frame.

This document is the specification Codex should implement against. Where implementation details require an engineering decision, choose the approach that best preserves the user-visible requirements above, document the decision, test it, and update this document only when the product owner approves a change.

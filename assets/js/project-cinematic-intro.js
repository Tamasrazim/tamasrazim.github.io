/*
 * What this does:
 * Plays a short, skippable cinematic intro on a project's overview page.
 * It uses original CSS/SVG artwork, runs once per project per browser tab, and
 * skips the sequence entirely when reduced motion is enabled.
 */
(function () {
  "use strict";

  const body = document.body;
  const projectKey = body && body.getAttribute("data-cinematic-intro");
  if (!projectKey) return;

  const profiles = {
    tunrun: {
      title: "TUNRUN",
      kicker: "NATIVE GAME / WINDOWS X64",
      tagline: "ENTER THE WORMHOLE.",
      description: "A flight path drawn one curve at a time.",
      sequence: "SEQUENCE 01 / PROCEDURAL FLIGHT",
      art: `
        <div class="pci-tunnel" aria-hidden="true">
          <i class="pci-ring" style="--size:94%;--tilt:-17deg;--delay:.15s;--spin:18s;--ring-opacity:.34"></i>
          <i class="pci-ring" style="--size:79%;--tilt:21deg;--delay:.30s;--spin:14s;--ring-opacity:.48"></i>
          <i class="pci-ring" style="--size:65%;--tilt:-24deg;--delay:.45s;--spin:12s;--ring-opacity:.63"></i>
          <i class="pci-ring" style="--size:51%;--tilt:13deg;--delay:.60s;--spin:9s;--ring-opacity:.76"></i>
          <i class="pci-ring" style="--size:36%;--tilt:-9deg;--delay:.75s;--spin:7s;--ring-opacity:.92"></i>
          <i class="pci-ring" style="--size:21%;--tilt:27deg;--delay:.90s;--spin:5s;--ring-opacity:1"></i>
          <span class="pci-ship"></span>
        </div>`
    },
    webedyts: {
      title: "WEBEDYTS",
      kicker: "LOCAL-FIRST / VISUAL WEBSITE EDITOR",
      tagline: "SHAPE THE WEB.",
      description: "From a page outline to a precise, local edit.",
      sequence: "SEQUENCE 02 / VISUAL EDITING",
      art: `
        <div class="pci-editor-window" aria-hidden="true">
          <div class="pci-window-bar"><i></i><i></i><i></i></div>
          <div class="pci-editor-canvas">
            <span class="pci-layout-card a"></span>
            <span class="pci-layout-card b"></span>
            <span class="pci-layout-card c"></span>
            <span class="pci-select-box"></span>
            <span class="pci-pointer"></span>
          </div>
        </div>`
    },
    qalyvyron: {
      title: "QALYVYRON",
      kicker: "3D CREATION / OFFLINE RENDERING",
      tagline: "BUILD A WORLD IN 3D.",
      description: "Geometry, light and space converge on a single canvas.",
      sequence: "SEQUENCE 03 / SPATIAL DESIGN",
      art: `
        <div class="pci-wire-art" aria-hidden="true">
          <i class="pci-orbit"></i><i class="pci-orbit two"></i>
          <svg viewBox="0 0 520 520" role="presentation">
            <g class="pci-cube-back">
              <path d="M260 53 411 140 411 314 260 401 109 314 109 140Z"/>
              <path d="M260 53V228L109 314M260 228 411 140M260 228V401"/>
              <path d="M109 140 260 228 411 314 260 401 109 314"/>
            </g>
            <g class="pci-cube-front">
              <path d="M260 108 364 168 364 288 260 348 156 288 156 168Z"/>
              <path d="M260 108V228L156 288M260 228 364 168M260 228V348"/>
              <path d="M156 168 260 228 364 288 260 348 156 288"/>
              <path d="M206 138 314 318M314 138 206 318" stroke-opacity=".35"/>
            </g>
          </svg>
        </div>`
    },
    trilyva: {
      title: "TRILYVA",
      kicker: "PROCEDURAL MOTION / FRAME-DRIVEN",
      tagline: "MAKE MOTION.",
      description: "Ideas become frames. Frames become a sequence.",
      sequence: "SEQUENCE 04 / MOTION DESIGN",
      art: `
        <div class="pci-motion-art" aria-hidden="true">
          <i class="pci-motion-ring"></i><i class="pci-motion-ring two"></i>
          <svg viewBox="0 0 600 480" role="presentation">
            <path d="M20 255 C90 30 160 30 230 245 S370 460 445 230 535 15 580 190"/>
            <path d="M20 285 C90 60 160 60 230 275 S370 490 445 260 535 45 580 220" style="opacity:.56"/>
            <path d="M20 225 C90 0 160 0 230 215 S370 430 445 200 535 -15 580 160" style="opacity:.35"/>
            <path d="M46 80 C145 360 240 360 300 220 S450 50 555 390" style="opacity:.42"/>
          </svg>
        </div>`
    }
  };

  const profile = profiles[projectKey];
  if (!profile) return;

  const prefersReducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  const sessionKey = "tamasrazim-cinematic-intro-v1:" + projectKey;
  try {
    if (window.sessionStorage.getItem(sessionKey) === "shown") return;
  } catch (_storageUnavailable) {
    // Continue normally if browser storage is disabled.
  }

  const intro = document.createElement("section");
  intro.className = "pci-intro pci-project--" + projectKey;
  intro.setAttribute("role", "dialog");
  intro.setAttribute("aria-modal", "true");
  intro.setAttribute("aria-label", profile.title + " cinematic introduction");
  intro.setAttribute("tabindex", "-1");
  intro.innerHTML = `
    <div class="pci-topbar">
      <span>TAMASRAZIM <strong>/ PROJECT STUDIO</strong></span>
      <button class="pci-skip" type="button" aria-label="Skip cinematic introduction">
        SKIP INTRO <kbd>ESC</kbd>
      </button>
    </div>
    <div class="pci-stage">
      <div class="pci-scene">${profile.art}</div>
      <div class="pci-copy">
        <p class="pci-kicker">${profile.kicker}</p>
        <h1 class="pci-title">${profile.title}<span class="pci-period">.</span></h1>
        <p class="pci-tagline">${profile.tagline}</p>
        <p class="pci-description">${profile.description}</p>
      </div>
    </div>
    <div class="pci-bottomline">
      <span>${profile.sequence}</span>
      <div class="pci-progress" aria-hidden="true"><span></span></div>
      <span>04.2 SEC</span>
    </div>`;

  body.appendChild(intro);
  body.classList.add("pci-lock");

  let closeTimer = 0;
  let isClosing = false;

  function markAsShown() {
    try {
      window.sessionStorage.setItem(sessionKey, "shown");
    } catch (_storageUnavailable) {
      // Storage is optional; the current page still works without it.
    }
  }

  function closeIntro() {
    if (isClosing) return;
    isClosing = true;
    window.clearTimeout(closeTimer);
    markAsShown();
    intro.classList.add("pci-is-leaving");
    intro.setAttribute("aria-hidden", "true");
    body.classList.remove("pci-lock");
    document.removeEventListener("keydown", onKeyDown, true);

    // Return keyboard focus to the project's real heading when the overlay leaves.
    const heading = document.querySelector("main h1");
    if (heading && intro.contains(document.activeElement)) {
      const hadTabindex = heading.hasAttribute("tabindex");
      if (!hadTabindex) heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
      if (!hadTabindex) {
        heading.addEventListener("blur", function restoreHeadingTabindex() {
          heading.removeAttribute("tabindex");
        }, { once: true });
      }
    }
    window.setTimeout(function removeIntro() {
      if (intro.parentNode) intro.parentNode.removeChild(intro);
    }, 650);
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeIntro();
      return;
    }
    // Keep tab focus inside the short modal while its Skip control is available.
    if (event.key === "Tab") {
      event.preventDefault();
      const skip = intro.querySelector(".pci-skip");
      if (skip) skip.focus({ preventScroll: true });
    }
  }

  intro.querySelector(".pci-skip").addEventListener("click", closeIntro);
  document.addEventListener("keydown", onKeyDown, true);

  // Let the browser paint the overlay before starting its entrance choreography.
  window.requestAnimationFrame(function startIntro() {
    intro.classList.add("pci-is-live");
    intro.focus({ preventScroll: true });
    const skip = intro.querySelector(".pci-skip");
    if (skip) skip.focus({ preventScroll: true });
  });
  closeTimer = window.setTimeout(closeIntro, 4250);
})();
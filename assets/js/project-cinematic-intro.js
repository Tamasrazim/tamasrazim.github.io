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


  // Every featured project has its own visual direction and short title sequence.
  Object.assign(profiles, {
    neo: {
      title: "NEO", kicker: "NATIVE GAME / WINDOWS X64",
      tagline: "FIND THE NEXT WAY THROUGH.",
      description: "A quiet corridor turns into a puzzle of light, space, and movement.",
      sequence: "SEQUENCE 05 / SPATIAL PUZZLE",
      art: '<div class="pci-neo-scene" aria-hidden="true"><div class="pci-neo-floor"></div><div class="pci-neo-side pci-neo-side-left"></div><div class="pci-neo-side pci-neo-side-right"></div><div class="pci-neo-portal"><i></i><i></i><b>NEO</b></div><span class="pci-neo-marker">FLOOR 001 / GATE ONLINE</span></div>'
    },
    "code-to-svg": {
      title: "CODE → SVG", kicker: "VECTOR WORKSPACE / SCALABLE ART",
      tagline: "DRAW WITH CODE.",
      description: "A path is traced, nodes settle into place, and a clean vector takes shape.",
      sequence: "SEQUENCE 06 / VECTOR CONSTRUCTION",
      art: '<div class="pci-vector-art" aria-hidden="true"><div class="pci-vector-paper"></div><svg viewBox="0 0 560 460" role="presentation"><path class="pci-vector-path" d="M75 330 C90 110 200 65 280 230 S440 390 485 105"/><path class="pci-vector-path pci-vector-path-secondary" d="M75 330 L180 122 L280 230 L390 320 L485 105"/><g class="pci-vector-nodes"><circle cx="75" cy="330" r="6"/><circle cx="180" cy="122" r="6"/><circle cx="280" cy="230" r="6"/><circle cx="390" cy="320" r="6"/><circle cx="485" cy="105" r="6"/></g></svg><span class="pci-vector-label">PATH / 05 NODES / SVG</span></div>'
    },
    "code-to-eps": {
      title: "CODE → EPS", kicker: "VECTOR OUTPUT / PRINT-READY GEOMETRY",
      tagline: "SHAPE IT. EXPORT IT.",
      description: "A vector artboard resolves into precise contours and export marks.",
      sequence: "SEQUENCE 07 / VECTOR OUTPUT",
      art: '<div class="pci-eps-scene" aria-hidden="true"><div class="pci-eps-sheet"><i></i><i></i><i></i><i></i><svg viewBox="0 0 420 420" role="presentation"><path d="M210 60 335 132 335 276 210 350 85 276 85 132Z"/><path d="M210 60V205L85 276M210 205 335 132M210 205V350"/><circle cx="210" cy="205" r="77"/><path d="M130 205H290M210 125V285"/></svg></div><span class="pci-eps-label">EPS / VECTOR ARTBOARD</span></div>'
    },
    "format-forge": {
      title: "FORMAT FORGE", kicker: "BROWSER TOOL / LOCAL FILE WORKFLOW",
      tagline: "MAKE FILES FLOW.",
      description: "File shapes rotate through a clean conversion path, ready for the next task.",
      sequence: "SEQUENCE 08 / FILE WORKFLOW",
      art: '<div class="pci-forge-scene" aria-hidden="true"><div class="pci-forge-orbit"></div><div class="pci-file-tile pci-file-tile-back"><span>TXT</span><i></i></div><div class="pci-file-tile pci-file-tile-mid"><span>SVG</span><i></i></div><div class="pci-file-tile pci-file-tile-front"><span>FILE</span><i></i><b>↗</b></div><span class="pci-forge-track">INPUT / TRANSFORM / OUTPUT</span></div>'
    },
    "asset-vault": {
      title: "STOCK ASSET VAULT", kicker: "CREATIVE LIBRARY / LOCAL ORGANISATION",
      tagline: "KEEP EVERY ASSET IN SIGHT.",
      description: "A field of asset cards arranges itself into a tidy creative library.",
      sequence: "SEQUENCE 09 / ASSET ORGANISATION",
      art: '<div class="pci-vault-scene" aria-hidden="true"><div class="pci-vault-grid"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="pci-vault-card pci-vault-card-a"><b>SVG</b><span>VECTOR</span></div><div class="pci-vault-card pci-vault-card-b"><b>MP4</b><span>MOTION</span></div><div class="pci-vault-card pci-vault-card-c"><b>PNG</b><span>IMAGE</span></div><span class="pci-vault-caption">FILES / TAGS / METADATA</span></div>'
    },
    kynestra: {
      title: "KYNESTRA", kicker: "MODULAR DESKTOP / CREATIVE SYSTEM",
      tagline: "ONE CORE. CONNECTED TOOLS.",
      description: "Independent modules align around one stable centre.",
      sequence: "SEQUENCE 10 / MODULAR ARCHITECTURE",
      art: '<div class="pci-kyn-scene" aria-hidden="true"><div class="pci-kyn-orbit"></div><div class="pci-kyn-module pci-kyn-module-a">CORE</div><div class="pci-kyn-module pci-kyn-module-b">MEDIA</div><div class="pci-kyn-module pci-kyn-module-c">FORGE</div><div class="pci-kyn-module pci-kyn-module-d">DATA</div><div class="pci-kyn-centre">K</div><span class="pci-kyn-caption">MODULES / SHARED STATE / LOCAL</span></div>'
    },
    bncagrocare: {
      title: "BNC AGROCARE", kicker: "BUSINESS SOFTWARE / CATALOGUE + INVOICING",
      tagline: "GROWTH MEETS GOOD WORKFLOW.",
      description: "A branching line grows into an agricultural mark.",
      sequence: "SEQUENCE 11 / BUSINESS WORKFLOW",
      art: '<div class="pci-organic-scene" aria-hidden="true"><div class="pci-organic-orbit"></div><svg viewBox="0 0 520 500" role="presentation"><path class="pci-vine" d="M260 435 C240 350 278 282 260 208 S245 108 260 64"/><path class="pci-vine" d="M258 310 C193 291 155 252 115 205"/><path class="pci-vine" d="M263 234 C324 217 365 173 404 127"/><path class="pci-leaf" d="M115 205 C119 147 167 140 214 226 C179 256 139 244 115 205Z"/><path class="pci-leaf" d="M404 127 C354 102 319 130 304 205 C352 211 388 182 404 127Z"/><path class="pci-leaf" d="M260 64 C215 112 225 158 260 190 C295 157 305 111 260 64Z"/><path class="pci-leaf" d="M260 341 C204 310 176 342 191 390 C225 400 252 378 260 341Z"/></svg><span class="pci-organic-caption">CATALOGUE / INVOICE / LOCAL WORKFLOW</span></div>'
    },
    home: {
      title: "TAMASRAZIM",
      kicker: "REGISTERED IDENTITY / LIVE BUILD",
      tagline: "A SINGLE ID. ONE CLEAN STRIKE.",
      description: "The existing identity card is the animation—not a recreation.",
      sequence: "DROP-IN IDENTITY / MAIN SITE",
      durationMs: 8500,
      durationLabel: "08.5 SEC",
      art: '<div class="pci-home-id-mount" aria-label="Original identity card landing into a precision frame"></div>'
    },
    "repo-token-meter": {
      title: "REPO TOKEN METER", kicker: "DEVELOPER TOOL / REPOSITORY FOOTPRINT",
      tagline: "SEE THE SHAPE OF YOUR CODE.",
      description: "Lines, bars, and a scanning beam turn a repository into a readable overview.",
      sequence: "SEQUENCE 12 / REPOSITORY ANALYSIS",
      art: '<div class="pci-meter-scene" aria-hidden="true"><div class="pci-meter-header"><span>REPO / SCAN</span><span>LOCAL</span></div><div class="pci-meter-bars"><i style="--bar:30%;--delay:.1s"></i><i style="--bar:76%;--delay:.2s"></i><i style="--bar:52%;--delay:.3s"></i><i style="--bar:91%;--delay:.4s"></i><i style="--bar:43%;--delay:.5s"></i><i style="--bar:68%;--delay:.6s"></i><i style="--bar:36%;--delay:.7s"></i><i style="--bar:84%;--delay:.8s"></i><i style="--bar:58%;--delay:.9s"></i><i style="--bar:96%;--delay:1s"></i><i style="--bar:44%;--delay:1.1s"></i><i style="--bar:72%;--delay:1.2s"></i></div><div class="pci-meter-scan"></div><div class="pci-meter-number">SHA <b>256</b> / FILE MAP</div></div>'
    }
  });

  const profile = profiles[projectKey];
  if (!profile) return;

  const prefersReducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  const sessionKey = projectKey === "home"
    ? "tamasrazim-cinematic-intro-v4:home"
    : "tamasrazim-cinematic-intro-v1:" + projectKey;
  try {
    if (window.sessionStorage.getItem(sessionKey) === "shown") return;
  } catch (_storageUnavailable) {
    // Continue normally if browser storage is disabled.
  }

  const durationMs = Number(profile.durationMs) > 0 ? Number(profile.durationMs) : 4250;
  let homeCard = null;
  let homeCardOriginalParent = null;
  let homeCardPlaceholder = null;
  let homeCardOriginalClassName = "";
  let homeCardOriginalStyle = null;

  if (projectKey === "home") {
    homeCard = document.querySelector("main .id-card");
    if (!homeCard || !homeCard.parentNode || typeof document.createComment !== "function") return;
    homeCardOriginalParent = homeCard.parentNode;
    homeCardOriginalClassName = homeCard.className;
    homeCardOriginalStyle = homeCard.getAttribute("style");
  }

  const intro = document.createElement("section");
  intro.className = "pci-intro pci-project--" + projectKey;
  intro.setAttribute("role", "dialog");
  intro.setAttribute("aria-modal", "true");
  intro.setAttribute("aria-label", profile.title + " cinematic introduction");
  intro.setAttribute("tabindex", "-1");
  if (projectKey === "home") {
    intro.innerHTML = `
      <div class="pci-topbar">
        <span>TAMASRAZIM <strong>/ IDENTITY / MOTION STUDY</strong></span>
        <button class="pci-skip" type="button" aria-label="Skip identity card animation">
          SKIP INTRO <kbd>ESC</kbd>
        </button>
      </div>
      <div class="pci-home-build-stage">
        <div class="pci-home-id-rig">
          <div class="pci-home-id-rail pci-home-id-rail-x" aria-hidden="true"></div>
          <div class="pci-home-id-rail pci-home-id-rail-y" aria-hidden="true"></div>
          <div class="pci-home-id-crop" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
          <div class="pci-home-id-scan" aria-hidden="true"></div>
          ${profile.art}
        </div>
      </div>
      <div class="pci-bottomline">
        <span>TR / ID LOCKED</span>
        <div class="pci-progress" aria-hidden="true"><span></span></div>
        <span>${profile.durationLabel || "04.2 SEC"}</span>
      </div>`;
  } else {
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
        <span>${profile.durationLabel || "04.2 SEC"}</span>
      </div>`;
  }

  if (homeCard) {
    const homeMount = intro.querySelector(".pci-home-id-mount");
    if (!homeMount) return;
    homeCardPlaceholder = document.createComment("original identity card position");
    homeCardOriginalParent.insertBefore(homeCardPlaceholder, homeCard);
    homeCard.classList.add("pci-home-built-card", "is-visible");
    homeMount.appendChild(homeCard);
  }

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

  function restoreHomeCard() {
    if (!homeCard || !homeCardPlaceholder || !homeCardPlaceholder.parentNode) return;
    const originalParent = homeCardPlaceholder.parentNode;
    originalParent.insertBefore(homeCard, homeCardPlaceholder);
    originalParent.removeChild(homeCardPlaceholder);
    homeCard.className = homeCardOriginalClassName;
    if (homeCardOriginalStyle === null) {
      homeCard.removeAttribute("style");
    } else {
      homeCard.setAttribute("style", homeCardOriginalStyle);
    }
    homeCardPlaceholder = null;
  }

  function closeIntro() {
    if (isClosing) return;
    isClosing = true;
    window.clearTimeout(closeTimer);
    markAsShown();
    restoreHomeCard();
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
  closeTimer = window.setTimeout(closeIntro, durationMs);
})();
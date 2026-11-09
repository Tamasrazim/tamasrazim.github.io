(function () {
  "use strict";

  if (window.__swarmLauncherInstalled) return;
  window.__swarmLauncherInstalled = true;

  const SWARM_SRC = "/assets/js/swarm-rebuild.js?v=20261109-2";
  const host = document.createElement("swarm-launcher");
  host.setAttribute("aria-label", "Swarm Rebuild launcher");
  host.style.cssText = [
    "all:initial!important",
    "position:fixed!important",
    "right:max(16px,env(safe-area-inset-right))!important",
    "bottom:max(16px,env(safe-area-inset-bottom))!important",
    "z-index:2147483000!important",
    "display:block!important",
    "pointer-events:auto!important"
  ].join(";");

  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      button {
        appearance: none;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 222px;
        min-height: 54px;
        padding: 8px 12px;
        border: 1px solid rgba(255,255,255,.24);
        border-radius: 2px;
        background: rgba(7,7,7,.9);
        color: #f4f4f1;
        box-shadow: 0 16px 44px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.08);
        backdrop-filter: blur(22px) saturate(0);
        -webkit-backdrop-filter: blur(22px) saturate(0);
        font: 500 10px/1 ui-monospace, SFMono-Regular, Consolas, monospace;
        text-align: left;
        cursor: pointer;
        transition: background .2s ease, color .2s ease, border-color .2s ease, transform .2s ease;
      }
      .mark {
        display: grid;
        grid-template-columns: repeat(3,4px);
        gap: 2px;
        align-content: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        flex: none;
        transform: rotate(45deg);
      }
      .mark i { display: block; width: 4px; height: 4px; background: currentColor; }
      .mark i:nth-child(2), .mark i:nth-child(4) { opacity: .5; }
      .copy { display: grid; gap: 5px; flex: 1; min-width: 0; }
      .copy b { font: 700 10px/1 ui-monospace, SFMono-Regular, Consolas, monospace; letter-spacing: .15em; }
      .copy small { color: #858585; font: 500 8px/1 ui-monospace, SFMono-Regular, Consolas, monospace; letter-spacing: .08em; white-space: nowrap; }
      .shortcut { color: #777; font: 500 8px/1 ui-monospace, SFMono-Regular, Consolas, monospace; letter-spacing: .04em; white-space: nowrap; }
      button:hover { background: #f4f4f1; color: #050505; border-color: #f4f4f1; transform: translateY(-2px); }
      button:hover .copy small, button:hover .shortcut { color: #666; }
      button[aria-pressed="true"] { border-color: rgba(255,255,255,.68); }
      button[aria-pressed="true"] .mark i { animation: markPulse 1.8s ease-in-out infinite; }
      button:focus-visible { outline: 2px solid #f4f4f1; outline-offset: 4px; }
      button:disabled { opacity: .62; cursor: wait; transform: none; }
      @keyframes markPulse { 50% { opacity: .28; } }
      @media (max-width: 600px) {
        button { min-width: 0; min-height: 48px; padding: 7px 10px; gap: 9px; }
        .shortcut { display: none; }
      }
      @media (prefers-reduced-motion: reduce) {
        button, .mark i { transition: none; animation: none !important; }
      }
    </style>
    <button type="button" aria-pressed="false" aria-label="Start Swarm Rebuild. Shortcut Alt Shift S">
      <span class="mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
      <span class="copy"><b data-label>SWARM REBUILD</b><small>PAGE RECONSTRUCTION</small></span>
      <span class="shortcut">ALT SHIFT S</span>
    </button>
  `;

  const button = root.querySelector("button");
  const label = root.querySelector("[data-label]");
  let loading = false;

  function sync() {
    const running = !!(window.__swarmRebuild && window.__swarmRebuild.app);
    label.textContent = running ? "SWARM ACTIVE" : "SWARM REBUILD";
    button.setAttribute("aria-pressed", String(running));
    button.setAttribute(
      "aria-label",
      running ? "Stop Swarm Rebuild" : "Start Swarm Rebuild. Shortcut Alt Shift S"
    );
  }

  function toggle() {
    if (window.__swarmRebuild && typeof window.__swarmRebuild.toggle === "function") {
      window.__swarmRebuild.toggle();
      sync();
      return;
    }
    if (loading) return;

    loading = true;
    button.disabled = true;
    label.textContent = "INITIALIZING";

    const script = document.createElement("script");
    script.src = SWARM_SRC;
    script.async = true;
    script.onload = function () {
      loading = false;
      button.disabled = false;
      sync();
    };
    script.onerror = function () {
      loading = false;
      button.disabled = false;
      label.textContent = "LOAD FAILED";
      button.setAttribute("aria-pressed", "false");
      window.setTimeout(sync, 2200);
      console.error("[swarm-rebuild] Could not load the website renderer:", SWARM_SRC);
    };
    document.head.appendChild(script);
  }

  button.addEventListener("click", toggle);
  window.addEventListener("swarmrebuild:state", sync);

  window.addEventListener("keydown", function (event) {
    if (!(event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey)) return;
    if (String(event.key).toLowerCase() !== "s") return;
    const target = event.target;
    if (target && (
      target.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
    )) return;
    event.preventDefault();
    toggle();
  }, true);

  function mount() {
    if (!document.body || host.isConnected) return;
    document.body.appendChild(host);
    sync();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
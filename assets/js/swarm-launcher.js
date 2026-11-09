(function () {
  "use strict";

  if (window.__swarmLauncherInstalled) return;
  window.__swarmLauncherInstalled = true;

  const SWARM_SRC = "/assets/js/swarm-rebuild.js?v=20261109-1";
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
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-height: 42px;
        padding: 0 14px;
        border: 1px solid rgba(255,255,255,.34);
        border-radius: 3px;
        background: rgba(5,5,5,.92);
        color: #f4f4f1;
        box-shadow: 0 8px 30px rgba(0,0,0,.26);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        font: 600 10px/1 ui-monospace, SFMono-Regular, Consolas, monospace;
        letter-spacing: .12em;
        text-transform: uppercase;
        cursor: pointer;
        transition: background .18s ease, color .18s ease, border-color .18s ease, transform .18s ease;
      }
      button::before {
        content: "";
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #f4f4f1;
        box-shadow: 0 0 0 3px rgba(255,255,255,.1);
      }
      button:hover { background: #f4f4f1; color: #050505; border-color: #f4f4f1; transform: translateY(-2px); }
      button:hover::before { background: #050505; box-shadow: 0 0 0 3px rgba(0,0,0,.1); }
      button[aria-pressed="true"] { border-color: #f4f4f1; }
      button[aria-pressed="true"]::before { background: #7bd7a4; box-shadow: 0 0 0 3px rgba(123,215,164,.16); }
      button:focus-visible { outline: 2px solid #f4f4f1; outline-offset: 4px; }
      button:disabled { opacity: .62; cursor: wait; transform: none; }
      @media (max-width: 600px) {
        button { min-height: 38px; padding: 0 11px; font-size: 9px; }
      }
      @media (prefers-reduced-motion: reduce) {
        button { transition: none; }
      }
    </style>
    <button type="button" aria-pressed="false" aria-label="Start Swarm Rebuild. Shortcut Alt Shift S">
      SWARM REBUILD
    </button>
  `;

  const button = root.querySelector("button");
  let loading = false;

  function sync() {
    const running = !!(window.__swarmRebuild && window.__swarmRebuild.app);
    button.textContent = running ? "SWARM ACTIVE" : "SWARM REBUILD";
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
    button.textContent = "SWARM LOADING";

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
      button.textContent = "SWARM ERROR";
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

(() => {
  "use strict";
  const map = document.querySelector("[data-signal-map]");
  if (!map) return;

  const nodes = [...map.querySelectorAll("[data-signal]")];
  const routes = [...map.querySelectorAll("[data-route]")];
  const detail = {
    kicker: document.getElementById("signal-kicker"),
    title: document.getElementById("signal-title"),
    copy: document.getElementById("signal-copy"),
    link: document.getElementById("signal-link")
  };

  const content = {
    trilyva: {
      kicker: "01 / PROCEDURAL MOTION",
      title: "TRILYVA",
      copy: "A frame-driven browser workspace for authoring, inspecting and rendering motion.",
      href: "/web2/trilyva/"
    },
    trss: {
      kicker: "02 / GRAPHICS RESEARCH",
      title: "TrSS",
      copy: "Independent renderer-guided reconstruction research for Intel Arc.",
      href: "/web2/trss/"
    },
    kynestra: {
      kicker: "03 / DESKTOP SOFTWARE",
      title: "KYNESTRA",
      copy: "A modular Windows creative-software project built around a shared Rust core.",
      href: "/web2/kynestra/"
    },
    neo: {
      kicker: "04 / GAME SYSTEMS",
      title: "NEO",
      copy: "A native first-person puzzle game built around deterministic floors and persistent progress.",
      href: "/web2/neo/"
    }
  };

  function select(id) {
    const item = content[id];
    if (!item) return;
    nodes.forEach(node => {
      const active = node.dataset.signal === id;
      node.classList.toggle("is-active", active);
      node.toggleAttribute("data-active", active);
    });
    routes.forEach(route => route.classList.toggle("is-active", route.dataset.route === id));
    if (detail.kicker) detail.kicker.textContent = item.kicker;
    if (detail.title) detail.title.textContent = item.title;
    if (detail.copy) detail.copy.textContent = item.copy;
    if (detail.link) {
      detail.link.href = item.href;
      detail.link.setAttribute("aria-label", "Open " + item.title + " project page");
    }
  }

  nodes.forEach(node => {
    const id = node.dataset.signal;
    node.addEventListener("focus", () => select(id));
    node.addEventListener("pointerenter", event => {
      if (event.pointerType === "mouse" || event.pointerType === "pen") select(id);
    }, { passive: true });
  });

  const initial = nodes.find(node => node.classList.contains("is-active")) || nodes[0];
  if (initial) select(initial.dataset.signal);
})();

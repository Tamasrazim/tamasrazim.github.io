
(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // One small reading-progress indicator. It never replaces native scroll.
  const progress = document.createElement("div");
  progress.className = "reading-progress";
  progress.setAttribute("aria-hidden", "true");
  progress.innerHTML = "<span></span>";
  document.body.prepend(progress);
  const progressFill = progress.firstElementChild;
  let progressFrame = 0;
  const updateProgress = () => {
    if (progressFrame) return;
    progressFrame = requestAnimationFrame(() => {
      progressFrame = 0;
      const root = document.documentElement;
      const range = Math.max(1, root.scrollHeight - window.innerHeight);
      const value = Math.max(0, Math.min(1, window.scrollY / range));
      progressFill.style.transform = "scaleX(" + value.toFixed(4) + ")";
    });
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
  updateProgress();

  // Reveal authored groups once. Content is visible by default without JavaScript.
  if (!reduced && "IntersectionObserver" in window) {
    const revealSelector = [
      ".hero-copy", ".signal-card", ".section-heading", ".project-card",
      ".statement-grid", ".principle-row", ".cta-inner", ".page-hero",
      ".project-figure", ".content-grid", ".work-index-item", ".archive-item",
      ".quote-panel", ".text-card"
    ].join(",");
    const targets = [...document.querySelectorAll(revealSelector)];
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    targets.forEach((el, index) => {
      el.classList.add("motion-reveal");
      if (el.matches(".project-card")) {
        const order = [...el.parentElement.children].indexOf(el);
        el.style.setProperty("--reveal-delay", (order * 90) + "ms");
      } else if (el.matches(".principle-row,.work-index-item,.archive-item")) {
        el.style.setProperty("--reveal-delay", (index % 5 * 55) + "ms");
      }
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * .94 && rect.bottom > 0) {
        el.classList.add("is-visible");
      } else {
        observer.observe(el);
      }
    });
  }

  // The featured project map is an actual control, not a hover-only decoration.
  const map = document.querySelector("[data-signal-map]");
  if (map) {
    const card = map.closest(".signal-card");
    const nodes = [...map.querySelectorAll("[data-signal]")];
    const routes = [...map.querySelectorAll("[data-route]")];
    const detail = {
      kicker: document.getElementById("signal-kicker"),
      title: document.getElementById("signal-title"),
      copy: document.getElementById("signal-copy"),
      link: document.getElementById("signal-link")
    };
    const content = {
      trilyva: { kicker:"01 / PROCEDURAL MOTION", title:"TRILYVA", copy:"A frame-driven browser workspace for authoring, inspecting and rendering motion.", href:"/web2/trilyva/" },
      trss: { kicker:"02 / GRAPHICS RESEARCH", title:"TrSS", copy:"Independent renderer-guided reconstruction research for Intel Arc.", href:"/web2/trss/" },
      kynestra: { kicker:"03 / DESKTOP SOFTWARE", title:"KYNESTRA", copy:"A modular Windows creative-software project built around a shared Rust core.", href:"/web2/kynestra/" },
      neo: { kicker:"04 / GAME SYSTEMS", title:"NEO", copy:"A native first-person puzzle game built around deterministic floors and persistent progress.", href:"/web2/neo/" }
    };
    function select(id) {
      const item = content[id];
      if (!item) return;
      nodes.forEach(node => {
        const active = node.dataset.signal === id;
        node.classList.toggle("is-active", active);
        node.setAttribute("aria-pressed", String(active));
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
      node.addEventListener("click", () => select(id));
      if (finePointer) node.addEventListener("pointerenter", () => select(id), { passive: true });
    });
    const initial = nodes.find(node => node.getAttribute("aria-pressed") === "true") || nodes[0];
    if (initial) select(initial.dataset.signal);
    if (card && !reduced) requestAnimationFrame(() => card.classList.add("is-awake"));
  }

  // Procedural 2D signal field: one bounded canvas, capped DPR, paused off-screen.
  const canvas = document.querySelector("[data-hero-field]");
  if (canvas) {
    let ctx = null;
    try { ctx = canvas.getContext("2d", { alpha: true, desynchronized: true }); }
    catch (_) { try { ctx = canvas.getContext("2d"); } catch (_) {} }

    if (ctx) {
      const hero = canvas.closest(".home-hero");
      const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };
      const particles = [];
      let width = 1, height = 1, dpr = 1;
      let visible = true, running = false, raf = 0, last = 0, clock = 0;

      const random = (() => {
        let seed = 0x5a17b;
        return () => {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          return seed / 4294967296;
        };
      })();

      function setup() {
        const rect = hero.getBoundingClientRect();
        width = Math.max(1, rect.width);
        height = Math.max(1, rect.height);
        const mobile = width < 760 || !finePointer;
        dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.2 : 1.5);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        particles.length = 0;
        const count = Math.max(mobile ? 34 : 64, Math.min(mobile ? 58 : 126, Math.round(width / (mobile ? 8 : 11))));
        for (let i = 0; i < count; i++) {
          particles.push({
            x: random() * width,
            y: random() * height,
            phase: random() * Math.PI * 2,
            size: .45 + random() * 1.15,
            drift: 2 + random() * 7
          });
        }
        paint(0, true);
      }

      function paint(time, still = false) {
        ctx.clearRect(0, 0, width, height);
        const px = pointer.x, py = pointer.y;
        const influence = pointer.active && !reduced ? 1 : 0;
        const positions = particles.map(p => {
          const driftX = still ? 0 : Math.sin(time * .28 + p.phase) * p.drift;
          const driftY = still ? 0 : Math.cos(time * .21 + p.phase * 1.7) * p.drift * .8;
          const dx = px - p.x, dy = py - p.y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const pull = influence * Math.max(0, 1 - dist / 210) * .055;
          return {
            x: p.x + driftX + dx * pull,
            y: p.y + driftY + dy * pull,
            size: p.size,
            phase: p.phase
          };
        });

        const threshold = width < 760 ? 106 : 154;
        const limit2 = threshold * threshold;
        ctx.lineWidth = .7;
        for (let i = 0; i < positions.length; i++) {
          const a = positions[i];
          for (let j = i + 1; j < positions.length; j++) {
            const b = positions[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > limit2) continue;
            const alpha = (1 - d2 / limit2) * .19;
            ctx.strokeStyle = "rgba(225,224,217," + alpha.toFixed(3) + ")";
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        positions.forEach((p, i) => {
          const pulse = still ? 1 : .76 + Math.sin(time * .75 + p.phase) * .2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(242,241,236," + (.28 + pulse * .3).toFixed(3) + ")";
          ctx.fill();
        });

        if (influence) {
          const radius = 23 + Math.sin(time * 2.1) * 2;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(242,241,236,.38)";
          ctx.lineWidth = .8;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(px, py, radius + 8, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(242,241,236,.12)";
          ctx.stroke();
        }
      }

      function tick(timestamp) {
        if (!running) return;
        if (timestamp - last < 15) {
          raf = requestAnimationFrame(tick);
          return;
        }
        const dt = Math.min(.04, (timestamp - (last || timestamp)) / 1000);
        last = timestamp;
        clock += dt;
        pointer.x += (pointer.tx - pointer.x) * (1 - Math.pow(.001, dt));
        pointer.y += (pointer.ty - pointer.y) * (1 - Math.pow(.001, dt));
        paint(clock);
        raf = requestAnimationFrame(tick);
      }

      function start() {
        if (reduced || !visible || document.hidden || running) return;
        running = true;
        last = 0;
        raf = requestAnimationFrame(tick);
      }
      function stop() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      }

      hero.addEventListener("pointermove", event => {
        if (reduced) return;
        const rect = canvas.getBoundingClientRect();
        pointer.tx = event.clientX - rect.left;
        pointer.ty = event.clientY - rect.top;
        pointer.active = true;
      }, { passive: true });
      hero.addEventListener("pointerleave", () => { pointer.active = false; }, { passive: true });

      if ("ResizeObserver" in window) {
        const resize = new ResizeObserver(() => { setup(); });
        resize.observe(hero);
      } else {
        window.addEventListener("resize", setup, { passive: true });
      }
      if ("IntersectionObserver" in window) {
        const visibility = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible) start(); else stop();
        }, { threshold: .02 });
        visibility.observe(hero);
      }
      document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());

      // Normalize SVG path length, so diagrams draw consistently regardless of path size.
      document.querySelectorAll(".project-card .art-svg .bright").forEach(path => path.setAttribute("pathLength", "1"));
      setup();
      if (reduced) paint(0, true);
      else start();
    }
  } else {
    document.querySelectorAll(".project-card .art-svg .bright").forEach(path => path.setAttribute("pathLength", "1"));
  }
})();


(() => {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Reveal content without hiding it when motion or IntersectionObserver is unavailable.
  const revealItems = document.querySelectorAll("[data-reveal]");
  if (!reduced && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
    revealItems.forEach(item => revealObserver.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add("is-visible"));
  }

  // The home hero is a lightweight, pointer-reactive field. It pauses off-screen.
  const canvas = document.getElementById("signal-field");
  if (!canvas) return;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const panel = canvas.parentElement;
  const coordinateLabel = document.getElementById("field-coordinates");
  const pointer = { x: -1000, y: -1000, active: false };
  const cols = 19;
  const rows = 15;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frame = 0;
  let raf = 0;
  let active = true;
  let visible = true;

  function resize() {
    const bounds = panel.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint();
  }

  function pointAt(x, y) {
    const baseX = ((x + 0.5) / cols) * width;
    const baseY = ((y + 0.5) / rows) * height;
    const wave = reduced ? 0 : Math.sin(frame * 0.012 + x * 0.52 + y * 0.31) * 2.4;
    let px = baseX;
    let py = baseY + wave;
    if (pointer.active && !reduced) {
      const dx = baseX - pointer.x;
      const dy = baseY - pointer.y;
      const distance = Math.hypot(dx, dy);
      const radius = Math.min(width, height) * 0.34;
      if (distance < radius) {
        const force = (1 - distance / radius);
        const push = force * force * 25;
        const angle = Math.atan2(dy, dx);
        px += Math.cos(angle) * push;
        py += Math.sin(angle) * push;
      }
    }
    return { x: px, y: py, baseX, baseY };
  }

  function paint() {
    context.clearRect(0, 0, width, height);
    const points = [];
    for (let y = 0; y < rows; y++) {
      const line = [];
      for (let x = 0; x < cols; x++) line.push(pointAt(x, y));
      points.push(line);
    }

    context.lineWidth = 0.7;
    context.strokeStyle = "rgba(235,233,225,.17)";
    context.beginPath();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const p = points[y][x];
        if (x < cols - 1) {
          const q = points[y][x + 1];
          context.moveTo(p.x, p.y);
          context.lineTo(q.x, q.y);
        }
        if (y < rows - 1) {
          const q = points[y + 1][x];
          context.moveTo(p.x, p.y);
          context.lineTo(q.x, q.y);
        }
      }
    }
    context.stroke();

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const p = points[y][x];
        const dx = pointer.x - p.baseX;
        const dy = pointer.y - p.baseY;
        const near = pointer.active ? Math.max(0, 1 - Math.hypot(dx, dy) / 160) : 0;
        const radius = 1.1 + near * 1.7;
        context.beginPath();
        context.arc(p.x, p.y, radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(241,240,235," + (0.38 + near * 0.52) + ")";
        context.fill();
      }
    }
    if (!reduced) frame++;
  }

  function tick() {
    raf = 0;
    if (!active || !visible) return;
    paint();
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (reduced || !active || !visible || raf) {
      if (reduced) paint();
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function pointerMove(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    pointer.active = true;
    if (coordinateLabel) {
      const x = Math.max(0, Math.min(100, pointer.x / Math.max(1, width) * 100));
      const y = Math.max(0, Math.min(100, pointer.y / Math.max(1, height) * 100));
      coordinateLabel.textContent = "X " + x.toFixed(1).padStart(4, "0") + " / Y " + y.toFixed(1).padStart(4, "0");
    }
  }

  panel.addEventListener("pointermove", pointerMove, { passive: true });
  panel.addEventListener("pointerleave", () => {
    pointer.active = false;
    if (coordinateLabel) coordinateLabel.textContent = "FIELD / AT REST";
  });
  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
    if (visible) start();
    else stop();
  });

  if ("IntersectionObserver" in window) {
    const fieldObserver = new IntersectionObserver(entries => {
      active = entries.some(entry => entry.isIntersecting);
      if (active) start();
      else stop();
    }, { threshold: 0.05 });
    fieldObserver.observe(panel);
  }

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(panel);
  } else {
    window.addEventListener("resize", resize, { passive: true });
  }
  resize();
  start();
})();

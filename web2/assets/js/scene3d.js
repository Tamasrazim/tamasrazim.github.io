(async function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const mobile = window.matchMedia("(max-width: 760px)").matches;

  // Spatial navigation: native anchors with horizontal wheel and mouse-drag control.
  const nav = document.querySelector(".site-nav");
  if (nav) {
    const destinations = [
      ["00", "Home", "/web2/"],
      ["01", "Work", "/web2/work/"],
      ["02", "About", "/web2/about/"],
      ["03", "Approach", "/web2/approach/"],
      ["04", "TRILYVA", "/web2/trilyva/"],
      ["05", "TrSS", "/web2/trss/"],
      ["06", "KYNESTRA", "/web2/kynestra/"],
      ["07", "NEO", "/web2/neo/"],
      ["08", "Contact", "mailto:admin@tamasrazim.anonaddy.com"]
    ];
    const normalize = value => {
      const clean = value.replace(/index\.html$/, "");
      return clean.endsWith("/") ? clean : clean + "/";
    };
    const current = normalize(window.location.pathname);

    nav.classList.add("scene-nav");
    nav.setAttribute("aria-label", "Main navigation. Drag or scroll horizontally to explore.");
    nav.replaceChildren();

    destinations.forEach(([number, label, href]) => {
      const link = document.createElement("a");
      link.className = "scene-nav-item";
      link.href = href;
      const index = document.createElement("span");
      index.className = "scene-nav-number";
      index.textContent = number;
      const name = document.createElement("span");
      name.className = "scene-nav-label";
      name.textContent = label;
      link.append(index, name);
      if (href.startsWith("/") && normalize(href) === current) link.setAttribute("aria-current", "page");
      nav.append(link);
    });

    const items = Array.from(nav.querySelectorAll(".scene-nav-item"));
    let drag = null;
    let moved = false;
    let suppressClick = false;

    function updateRail() {
      const center = nav.scrollLeft + nav.clientWidth / 2;
      items.forEach(item => {
        const itemCenter = item.offsetLeft + item.offsetWidth / 2;
        const distance = Math.max(-1.3, Math.min(1.3, (itemCenter - center) / Math.max(1, nav.clientWidth * .56)));
        const depth = Math.max(0, 1 - Math.abs(distance));
        item.style.transform =
          "perspective(900px) translateZ(" + (depth * 22).toFixed(1) + "px) rotateY(" +
          (-distance * 15).toFixed(2) + "deg) scale(" + (1 - Math.min(.12, Math.abs(distance) * .09)).toFixed(3) + ")";
        item.style.opacity = String(.62 + depth * .38);
      });
    }

    nav.addEventListener("scroll", updateRail, { passive: true });
    window.addEventListener("resize", updateRail, { passive: true });
    requestAnimationFrame(() => {
      const active = nav.querySelector('[aria-current="page"]');
      if (active) nav.scrollLeft = Math.max(0, active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2);
      updateRail();
    });

    nav.addEventListener("wheel", event => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        nav.scrollLeft += event.deltaY;
        event.preventDefault();
      }
    }, { passive: false });

    function finishDrag() {
      if (!drag) return;
      window.removeEventListener("pointermove", moveDrag);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      nav.classList.remove("is-dragging");
      if (moved) {
        suppressClick = true;
        window.setTimeout(() => { suppressClick = false; }, 90);
      }
      drag = null;
    }

    function moveDrag(event) {
      if (!drag) return;
      const delta = event.clientX - drag.x;
      if (Math.abs(event.clientX - drag.startX) > 5) moved = true;
      if (moved) {
        nav.scrollLeft = drag.scroll - delta;
        event.preventDefault();
      }
      updateRail();
    }

    nav.addEventListener("pointerdown", event => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      drag = { x: event.clientX, startX: event.clientX, scroll: nav.scrollLeft };
      moved = false;
      nav.classList.add("is-dragging");
      window.addEventListener("pointermove", moveDrag, { passive: false });
      window.addEventListener("pointerup", finishDrag);
      window.addEventListener("pointercancel", finishDrag);
    });

    nav.addEventListener("click", event => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }, true);

    nav.addEventListener("keydown", event => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const index = items.indexOf(document.activeElement);
      if (index < 0) return;
      const next = items[Math.max(0, Math.min(items.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)))];
      if (next) {
        event.preventDefault();
        next.focus();
        next.scrollIntoView({ block: "nearest", inline: "center", behavior: reduced ? "auto" : "smooth" });
      }
    });
  }

  // Pointer tilt turns important interface panels into shallow 3D surfaces.
  if (finePointer && !reduced) {
    document.querySelectorAll(
      ".project-card, .signal-card, .page-hero, .project-figure, .content-grid, .text-card, .quote-panel, .work-index-item, .archive-item"
    ).forEach(element => {
      element.classList.add("scene-tilt");
      element.addEventListener("pointermove", event => {
        const box = element.getBoundingClientRect();
        if (!box.width || !box.height) return;
        const x = (event.clientX - box.left) / box.width - .5;
        const y = (event.clientY - box.top) / box.height - .5;
        element.style.setProperty("--scene-tilt-x", (-y * 4.2).toFixed(2) + "deg");
        element.style.setProperty("--scene-tilt-y", (x * 5.2).toFixed(2) + "deg");
      }, { passive: true });
      element.addEventListener("pointerleave", () => {
        element.style.setProperty("--scene-tilt-x", "0deg");
        element.style.setProperty("--scene-tilt-y", "0deg");
      }, { passive: true });
    });
  }

  // The WebGL scene is visual only; page content remains semantic HTML.
  const world = document.createElement("div");
  world.className = "scene3d-world";
  world.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas");
  canvas.className = "scene3d-canvas";
  const fallback = document.createElement("div");
  fallback.className = "scene3d-fallback";
  world.append(canvas, fallback);
  document.body.prepend(world);

  try {
    const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js");
    if (!window.WebGL2RenderingContext) throw new Error("WebGL 2 is unavailable.");

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: !mobile,
      powerPreference: "low-power",
      depth: true,
      stencil: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.2 : 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x090909, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090909, .026);
    const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, .1, 80);
    camera.position.set(0, 0, 9.2);

    const system = new THREE.Group();
    system.position.set(mobile ? .65 : 2.15, -.05, -.45);
    scene.add(system);
    const core = new THREE.Group();
    system.add(core);

    const shellGeometry = new THREE.IcosahedronGeometry(1.48, 1);
    core.add(new THREE.Mesh(
      shellGeometry,
      new THREE.MeshBasicMaterial({ color: 0xaaa89f, wireframe: true, transparent: true, opacity: .19 })
    ));
    core.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(shellGeometry),
      new THREE.LineBasicMaterial({ color: 0xd8d6ce, transparent: true, opacity: .35 })
    ));
    const inner = new THREE.Mesh(
      new THREE.OctahedronGeometry(.78, 1),
      new THREE.MeshBasicMaterial({ color: 0xd3d1c8, wireframe: true, transparent: true, opacity: .25 })
    );
    core.add(inner);

    const rings = [];
    [
      [2.08, .008, .34, .86, .18],
      [1.82, .006, 1.16, -.34, -.28],
      [2.34, .005, .92, .42, .36]
    ].forEach((v, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(v[0], v[1], 6, 220),
        new THREE.MeshBasicMaterial({
          color: i === 1 ? 0xaaa89e : 0x77756e,
          transparent: true,
          opacity: i === 1 ? .31 : .2
        })
      );
      ring.rotation.set(v[2], v[3], v[4]);
      core.add(ring);
      rings.push(ring);
    });

    const satelliteMaterial = new THREE.MeshBasicMaterial({ color: 0xf0eee6 });
    const satellites = [];
    for (let i = 0; i < 9; i++) {
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(i % 3 === 0 ? .032 : .019, 8, 8),
        satelliteMaterial
      );
      const angle = (i / 9) * Math.PI * 2;
      node.userData.angle = angle;
      node.userData.radius = 1.95 + (i % 3) * .16;
      node.userData.height = Math.sin(angle * 2.1) * .78;
      core.add(node);
      satellites.push(node);
    }

    let seed = 0x4f1bbcdc;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const starCount = mobile ? 115 : 245;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 2.65 + random() * 3.6;
      const theta = random() * Math.PI * 2;
      const z = random() * 2 - 1;
      const planar = Math.sqrt(1 - z * z);
      positions[i * 3] = Math.cos(theta) * planar * radius;
      positions[i * 3 + 1] = z * radius * .72;
      positions[i * 3 + 2] = Math.sin(theta) * planar * radius - 1.5;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    scene.add(new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0xc7c5bd, size: .018, transparent: true, opacity: .32, sizeAttenuation: true })
    ));

    const grid = new THREE.GridHelper(18, 36, 0x716f68, 0x34332f);
    grid.position.set(0, -3.1, -3.8);
    grid.material.transparent = true;
    grid.material.opacity = .095;
    grid.material.depthWrite = false;
    scene.add(grid);

    let pointerX = 0;
    let pointerY = 0;
    let running = false;
    let frame = 0;
    let lastFrame = 0;

    function renderStatic() {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      system.rotation.set(.18 + progress * .24, progress * 1.12, progress * .16);
      system.position.set(mobile ? .65 : 2.15, -.05 - progress * .34, -.45);
      camera.position.set(0, progress * .12, 9.2 - progress * .42);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }

    function renderFrame(now) {
      const time = now * .001;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      system.rotation.x = .18 + Math.sin(time * .18) * .075 + progress * .24 - pointerY * .06;
      system.rotation.y = time * .105 + progress * 1.12 + pointerX * .12;
      system.rotation.z = Math.sin(time * .13) * .08 + progress * .16;
      system.position.x = (mobile ? .65 : 2.15) + pointerX * .22;
      system.position.y = -.05 - progress * .34 + Math.sin(time * .24) * .1 + pointerY * .12;
      core.rotation.y = time * .16;
      core.rotation.x = Math.sin(time * .21) * .12;
      inner.rotation.x = -time * .2;
      inner.rotation.y = time * .25;
      rings[0].rotation.z += .0005;
      rings[1].rotation.y -= .00035;
      rings[2].rotation.x += .00025;
      satellites.forEach(node => {
        const angle = node.userData.angle + time * (.12 + node.userData.radius * .018);
        node.position.set(
          Math.cos(angle) * node.userData.radius,
          node.userData.height + Math.sin(angle * 1.8 + time * .2) * .08,
          Math.sin(angle) * node.userData.radius * .62
        );
      });
      camera.position.x += (pointerX * .19 - camera.position.x) * .035;
      camera.position.y += (pointerY * .12 + progress * .12 - camera.position.y) * .035;
      camera.position.z += (9.2 - progress * .42 - camera.position.z) * .035;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }

    function animate(now) {
      if (!running || document.hidden) return;
      const interval = mobile ? 1000 / 40 : 1000 / 60;
      if (now - lastFrame >= interval) {
        lastFrame = now;
        renderFrame(now);
      }
      frame = requestAnimationFrame(animate);
    }
    function start() {
      if (reduced || running || document.hidden) return;
      running = true;
      lastFrame = 0;
      frame = requestAnimationFrame(animate);
    }
    function stop() {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }
    function resize() {
      camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderStatic();
    }

    if (finePointer && !reduced) {
      window.addEventListener("pointermove", event => {
        pointerX = (event.clientX / Math.max(1, window.innerWidth) - .5) * 2;
        pointerY = (event.clientY / Math.max(1, window.innerHeight) - .5) * 2;
      }, { passive: true });
    }
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else if (reduced) renderStatic();
      else start();
    });
    canvas.addEventListener("webglcontextlost", event => {
      event.preventDefault();
      stop();
      world.classList.add("is-fallback");
    });

    world.classList.add("is-live");
    if (reduced) renderStatic();
    else start();
  } catch (error) {
    world.classList.add("is-fallback");
    canvas.hidden = true;
  }
})();
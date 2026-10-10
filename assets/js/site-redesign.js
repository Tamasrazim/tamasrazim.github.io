(function () {
  'use strict';

  var d = document;
  var w = window;
  var q = function (selector, root) {
    return (root || d).querySelector(selector);
  };
  var qa = function (selector, root) {
    return Array.prototype.slice.call((root || d).querySelectorAll(selector));
  };
  var frameInterval = 1000 / 60;

  if (d.body.classList.contains('home-v2')) {
    d.documentElement.classList.add('home-v2-motion');

    var reduceQuery = w.matchMedia ? w.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var fineQuery = w.matchMedia ? w.matchMedia('(pointer: fine)') : null;
    var reduce = !!(reduceQuery && reduceQuery.matches);
    var fine = !!(fineQuery && fineQuery.matches);
    var body = d.body;

    function syncPointerMode() {
      body.classList.toggle('has-fine-pointer', fine && !reduce);
    }
    syncPointerMode();

    var year = q('#year');
    var clock = q('#clock');
    var progress = q('#progressFill');
    if (year) year.textContent = String(new Date().getFullYear());

    // The clock only displays minutes, so update on minute boundaries instead of every second.
    var clockTimer = 0;
    function updateClock() {
      if (clock) {
        clock.textContent = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
    function scheduleClock() {
      if (clockTimer) w.clearTimeout(clockTimer);
      clockTimer = 0;
      if (!clock || d.hidden) return;
      var now = new Date();
      var delay = 60000 - (now.getSeconds() * 1000) - now.getMilliseconds() + 80;
      clockTimer = w.setTimeout(function () {
        clockTimer = 0;
        updateClock();
        scheduleClock();
      }, Math.max(1000, delay));
    }
    updateClock();
    scheduleClock();

    // Coalesce scroll progress updates so long pages do not trigger repeated layout writes.
    var progressFrame = 0;
    function updateProgress() {
      progressFrame = 0;
      if (!progress) return;
      var scrollTop = w.scrollY || d.documentElement.scrollTop || 0;
      var maxScroll = Math.max(1, d.documentElement.scrollHeight - w.innerHeight);
      progress.style.width = Math.max(0, Math.min(100, scrollTop / maxScroll * 100)) + '%';
    }
    function scheduleProgress() {
      if (progressFrame || d.hidden) return;
      progressFrame = w.requestAnimationFrame(updateProgress);
    }
    updateProgress();
    w.addEventListener('scroll', scheduleProgress, { passive: true });
    w.addEventListener('resize', scheduleProgress, { passive: true });
    w.addEventListener('pageshow', function () {
      updateClock();
      updateProgress();
      scheduleClock();
    });

    // Mobile navigation is keyboard- and pointer-dismissible, with its ARIA state kept in sync.
    var nav = q('#primaryNav');
    var menu = q('#menuButton');
    if (nav && menu) {
      function setMenuOpen(open, returnFocus) {
        nav.classList.toggle('is-open', open);
        menu.setAttribute('aria-expanded', String(open));
        menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
        if (!open && returnFocus) menu.focus();
      }
      menu.addEventListener('click', function () {
        setMenuOpen(!nav.classList.contains('is-open'), false);
      });
      qa('a', nav).forEach(function (link) {
        link.addEventListener('click', function () {
          setMenuOpen(false, false);
        });
      });
      d.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && nav.classList.contains('is-open')) {
          setMenuOpen(false, true);
        }
      });
      d.addEventListener('pointerdown', function (event) {
        if (!nav.classList.contains('is-open')) return;
        if (nav.contains(event.target) || menu.contains(event.target)) return;
        setMenuOpen(false, false);
      });
      w.addEventListener('resize', function () {
        if (w.innerWidth > 680 && nav.classList.contains('is-open')) {
          setMenuOpen(false, false);
        }
      }, { passive: true });
    }

    var reveals = qa('.v2-reveal, [data-reveal]');
    var revealObserver = null;
    if ('IntersectionObserver' in w && !reduce) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 });
      reveals.forEach(function (element) {
        revealObserver.observe(element);
      });
    } else {
      reveals.forEach(function (element) {
        element.classList.add('is-visible');
      });
    }

    var cards = qa('.v2-project-card');
    cards.forEach(function (card) {
      card.addEventListener('pointermove', function (event) {
        if (!fine || reduce) return;
        var rect = card.getBoundingClientRect();
        var x = (event.clientX - rect.left) / Math.max(1, rect.width);
        var y = (event.clientY - rect.top) / Math.max(1, rect.height);
        card.style.setProperty('--mx', x * 100 + '%');
        card.style.setProperty('--my', y * 100 + '%');
        card.style.setProperty('--rx', (0.5 - y) * 3 + 'deg');
        card.style.setProperty('--ry', (x - 0.5) * 4 + 'deg');
      }, { passive: true });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      }, { passive: true });
    });

    var alias = q('#aliasText');
    if (alias) {
      alias.addEventListener('pointerenter', function () {
        if (reduce || !fine) return;
        alias.classList.add('is-glitching');
        w.setTimeout(function () {
          alias.classList.remove('is-glitching');
        }, 450);
      }, { passive: true });
    }

    var kineticStage = q('#kineticStage');
    var hero = q('#top');
    var orbitA = q('#orbitSlow');
    var orbitB = q('#orbitFast');
    var orbitFrameId = 0;
    var orbitLast = 0;
    var orbitAngleA = 0;
    var orbitAngleB = 0;
    var orbitReady = !!(kineticStage && hero && orbitA && orbitB);

    if (kineticStage && hero) {
      hero.addEventListener('pointermove', function (event) {
        if (!fine || reduce) return;
        var rect = hero.getBoundingClientRect();
        var nx = (event.clientX - (rect.left + rect.width / 2)) / Math.max(1, rect.width);
        var ny = (event.clientY - (rect.top + rect.height / 2)) / Math.max(1, rect.height);
        kineticStage.style.setProperty('--stage-x', (nx * 23).toFixed(2) + 'px');
        kineticStage.style.setProperty('--stage-y', (ny * 17).toFixed(2) + 'px');
      }, { passive: true });
      hero.addEventListener('pointerleave', function () {
        kineticStage.style.setProperty('--stage-x', '0px');
        kineticStage.style.setProperty('--stage-y', '0px');
      }, { passive: true });
    }

    function canAnimateOrbit() {
      return orbitReady && fine && !reduce && !d.hidden;
    }
    function stopOrbit() {
      if (orbitFrameId) w.cancelAnimationFrame(orbitFrameId);
      orbitFrameId = 0;
      orbitLast = 0;
    }
    function orbitFrame(time) {
      orbitFrameId = 0;
      if (!canAnimateOrbit()) return;
      if (!orbitLast || time - orbitLast >= frameInterval) {
        var delta = orbitLast ? Math.min(50, time - orbitLast) : frameInterval;
        orbitLast = time;
        orbitAngleA = (orbitAngleA + delta * 0.0042) % 360;
        orbitAngleB = (orbitAngleB - delta * 0.0064) % 360;
        orbitA.setAttribute('transform', 'rotate(' + orbitAngleA.toFixed(3) + ' 350 350)');
        orbitB.setAttribute('transform', 'rotate(' + orbitAngleB.toFixed(3) + ' 350 350)');
      }
      orbitFrameId = w.requestAnimationFrame(orbitFrame);
    }
    function startOrbit() {
      if (canAnimateOrbit() && !orbitFrameId) {
        orbitFrameId = w.requestAnimationFrame(orbitFrame);
      }
    }

    var canvas = q('#field');
    var context = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    var particles = [];
    var fieldFrameId = 0;
    var fieldLast = 0;

    function resizeField() {
      if (!context || !canvas) return;
      var dpr = Math.min(1.5, w.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(w.innerWidth * dpr));
      canvas.height = Math.max(1, Math.round(w.innerHeight * dpr));
      canvas.style.width = w.innerWidth + 'px';
      canvas.style.height = w.innerHeight + 'px';
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = [];
      var count = Math.min(52, Math.max(24, Math.floor(w.innerWidth / 27)));
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w.innerWidth,
          y: Math.random() * w.innerHeight,
          vx: (Math.random() - 0.5) * 0.14,
          vy: (Math.random() - 0.5) * 0.12
        });
      }
    }
    function stopField() {
      if (fieldFrameId) w.cancelAnimationFrame(fieldFrameId);
      fieldFrameId = 0;
      fieldLast = 0;
    }
    function fieldFrame(time) {
      fieldFrameId = 0;
      if (!context || reduce || d.hidden) return;
      if (!fieldLast || time - fieldLast >= frameInterval) {
        fieldLast = time;
        context.clearRect(0, 0, w.innerWidth, w.innerHeight);
        particles.forEach(function (particle, index) {
          particle.x += particle.vx;
          particle.y += particle.vy;
          if (particle.x < 0) particle.x = w.innerWidth;
          if (particle.x > w.innerWidth) particle.x = 0;
          if (particle.y < 0) particle.y = w.innerHeight;
          if (particle.y > w.innerHeight) particle.y = 0;
          context.fillStyle = 'rgba(240,240,235,.16)';
          context.fillRect(particle.x, particle.y, 1.2, 1.2);
          for (var j = index + 1; j < particles.length; j++) {
            var other = particles[j];
            var distance = Math.hypot(other.x - particle.x, other.y - particle.y);
            if (distance < 118) {
              context.strokeStyle = 'rgba(240,240,235,' + (1 - distance / 118) * 0.1 + ')';
              context.beginPath();
              context.moveTo(particle.x, particle.y);
              context.lineTo(other.x, other.y);
              context.stroke();
            }
          }
        });
      }
      fieldFrameId = w.requestAnimationFrame(fieldFrame);
    }
    function startField() {
      if (context && !reduce && !d.hidden && !fieldFrameId) {
        fieldFrameId = w.requestAnimationFrame(fieldFrame);
      }
    }
    if (context) {
      resizeField();
      w.addEventListener('resize', resizeField, { passive: true });
      startField();
    }

    // Keep the custom cursor mouse-only while allowing pointer preferences to change at runtime.
    var cursorDot = q('#cursorDot');
    var cursorRing = q('#cursorRing');
    if (cursorDot || cursorRing) {
      w.addEventListener('pointermove', function (event) {
        if (!fine || reduce) return;
        [cursorDot, cursorRing].forEach(function (element) {
          if (!element) return;
          element.style.opacity = '1';
          element.style.transform = 'translate(' + event.clientX + 'px,' + event.clientY + 'px) translate(-50%,-50%)';
        });
      }, { passive: true });
    }

    var copyButton = q('#copyButton');
    var emailLink = q('#emailLink');
    var copyStatus = q('#copyStatus');
    if (copyButton && emailLink) {
      copyButton.addEventListener('click', function () {
        var address = emailLink.textContent.trim();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(address).then(function () {
            if (copyStatus) copyStatus.textContent = 'Email address copied.';
          }).catch(function () {
            if (copyStatus) copyStatus.textContent = 'Select the email address above to copy it.';
          });
        } else if (copyStatus) {
          copyStatus.textContent = 'Select the email address above to copy it.';
        }
      });
    }

    function syncVisibility() {
      if (d.hidden) {
        if (clockTimer) w.clearTimeout(clockTimer);
        clockTimer = 0;
        stopOrbit();
        stopField();
        return;
      }
      updateClock();
      scheduleClock();
      updateProgress();
      startOrbit();
      startField();
    }
    d.addEventListener('visibilitychange', syncVisibility);

    if (reduceQuery) {
      var onMotionPreferenceChange = function (event) {
        reduce = event.matches;
        syncPointerMode();
        if (reduce) {
          stopOrbit();
          stopField();
          reveals.forEach(function (element) {
            element.classList.add('is-visible');
          });
        } else {
          startOrbit();
          startField();
        }
      };
      if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onMotionPreferenceChange);
      else if (reduceQuery.addListener) reduceQuery.addListener(onMotionPreferenceChange);
    }
    if (fineQuery) {
      var onPointerPreferenceChange = function (event) {
        fine = event.matches;
        syncPointerMode();
        if (fine) startOrbit();
        else stopOrbit();
      };
      if (fineQuery.addEventListener) fineQuery.addEventListener('change', onPointerPreferenceChange);
      else if (fineQuery.addListener) fineQuery.addListener(onPointerPreferenceChange);
    }
    startOrbit();
  }

  if (d.body.classList.contains('project-index-v2')) {
    var cards = qa('.pi-card');
    var search = q('#piSearch');
    var buttons = qa('[data-filter]');
    var result = q('#piResult');
    var empty = q('#piEmpty');
    var count = q('#piCount');
    var year = q('#piYear');
    var active = 'all';

    if (year) year.textContent = String(new Date().getFullYear());

    function updateFilterButtons(selected) {
      buttons.forEach(function (button) {
        var on = (button.getAttribute('data-filter') || 'all') === selected;
        button.classList.toggle('is-active', on);
        button.setAttribute('aria-pressed', String(on));
      });
    }

    function drawProjects() {
      var term = search ? (search.value || '').trim().toLowerCase() : '';
      var visible = 0;
      cards.forEach(function (card) {
        var matchesCategory = active === 'all' || card.getAttribute('data-category') === active;
        var haystack = ((card.getAttribute('data-search') || '') + ' ' + card.textContent).toLowerCase();
        var show = matchesCategory && (!term || haystack.indexOf(term) !== -1);
        card.hidden = !show;
        if (show) visible++;
      });
      if (result) result.textContent = 'Showing ' + visible + ' of ' + cards.length + ' projects.';
      if (empty) empty.hidden = visible !== 0;
      if (count) count.textContent = String(visible);
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        active = button.getAttribute('data-filter') || 'all';
        updateFilterButtons(active);
        drawProjects();
      });
    });
    if (search) {
      search.addEventListener('input', drawProjects);
      search.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        if (search.value) search.value = '';
        active = 'all';
        updateFilterButtons(active);
        drawProjects();
      });
    }

    var fineQuery = w.matchMedia ? w.matchMedia('(pointer: fine)') : null;
    var reduceQuery = w.matchMedia ? w.matchMedia('(prefers-reduced-motion: reduce)') : null;
    cards.forEach(function (card) {
      card.addEventListener('pointermove', function (event) {
        if (!(fineQuery && fineQuery.matches) || (reduceQuery && reduceQuery.matches)) return;
        var rect = card.getBoundingClientRect();
        var x = (event.clientX - rect.left) / Math.max(1, rect.width);
        var y = (event.clientY - rect.top) / Math.max(1, rect.height);
        card.style.setProperty('--mx', x * 100 + '%');
        card.style.setProperty('--my', y * 100 + '%');
        card.style.setProperty('--rx', (0.5 - y) * 3 + 'deg');
        card.style.setProperty('--ry', (x - 0.5) * 4 + 'deg');
      }, { passive: true });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      }, { passive: true });
    });
    drawProjects();
  }
})();
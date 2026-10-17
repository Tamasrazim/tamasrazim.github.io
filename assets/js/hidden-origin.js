/* Hidden Origin: isolated interactions for the homepage footer. */
(function () {
  'use strict';

  function initHiddenOrigin() {
    var node = document.getElementById('secretNode');
    var reveal = document.getElementById('secretReveal');
    var close = document.getElementById('secretClose');
    var bubble = document.getElementById('secretBubble');
    var wrap = document.querySelector('.secret-node-wrap');

    if (!node || !reveal || !close || !wrap) return;

    var open = false;
    var reducedMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia &&
      window.matchMedia('(pointer: fine)').matches;
    var messages = [
      'something is hiding here', 'closer', 'nearly',
      'you found the seam', 'not that easy', 'still trying?'
    ];
    var attempts = 0;
    var lastDodge = 0;
    var pauseUntil = 0;
    var bubbleTimer = 0;
    var offsetX = 0;
    var offsetY = 0;

    function say(message, duration) {
      if (!bubble) return;
      bubble.textContent = message;
      bubble.classList.add('show');
      window.clearTimeout(bubbleTimer);
      bubbleTimer = window.setTimeout(function () {
        bubble.classList.remove('show');
      }, duration || 1100);
    }

    function resetNode() {
      offsetX = 0;
      offsetY = 0;
      node.style.setProperty('--sn-x', '0px');
      node.style.setProperty('--sn-y', '0px');
      node.style.setProperty('--sn-scale', '1');
    }

    function openReveal() {
      if (open) return;
      open = true;
      var rect = node.getBoundingClientRect();
      reveal.style.setProperty('--reveal-x',
        (((rect.left + rect.width / 2) / Math.max(1, window.innerWidth)) * 100).toFixed(2) + '%');
      reveal.style.setProperty('--reveal-y',
        (((rect.top + rect.height / 2) / Math.max(1, window.innerHeight)) * 100).toFixed(2) + '%');
      reveal.hidden = false;
      reveal.classList.remove('is-closing');
      document.body.classList.add('is-locked');
      node.setAttribute('aria-expanded', 'true');
      window.requestAnimationFrame(function () {
        reveal.classList.add('is-open');
        try { close.focus({ preventScroll: true }); } catch (err) { close.focus(); }
      });
    }

    function closeReveal() {
      if (!open) return;
      open = false;
      reveal.classList.remove('is-open');
      reveal.classList.add('is-closing');
      node.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-locked');
      window.setTimeout(function () {
        reveal.hidden = true;
        reveal.classList.remove('is-closing');
        resetNode();
        pauseUntil = 0;
        try { node.focus({ preventScroll: true }); } catch (err) { node.focus(); }
      }, 500);
    }

    function dodge(event) {
      if (open || reducedMotion || !finePointer || event.pointerType !== 'mouse') return;
      var now = performance.now();
      if (now < pauseUntil || now - lastDodge < 180) return;
      var rect = node.getBoundingClientRect();
      var distance = Math.hypot(event.clientX - (rect.left + rect.width / 2),
        event.clientY - (rect.top + rect.height / 2));
      if (distance > 58) return;

      lastDodge = now;
      attempts += 1;
      var maxX = Math.min(120, Math.max(60, window.innerWidth * 0.2));
      var angle = Math.atan2(rect.top + rect.height / 2 - event.clientY,
        rect.left + rect.width / 2 - event.clientX) + (Math.random() - 0.5) * 0.7;
      var jump = 35 + Math.min(45, attempts * 5);
      offsetX = Math.max(-maxX, Math.min(maxX, offsetX + Math.cos(angle) * jump));
      offsetY = Math.max(-18, Math.min(18, offsetY + Math.sin(angle) * jump * 0.3));
      node.style.setProperty('--sn-x', offsetX.toFixed(1) + 'px');
      node.style.setProperty('--sn-y', offsetY.toFixed(1) + 'px');
      say(messages[(attempts - 1) % messages.length], 900);

      if (attempts >= 5) {
        attempts = 0;
        pauseUntil = now + 1800;
        window.setTimeout(function () {
          resetNode();
          say('fine. you earned the click.', 1400);
        }, 120);
      }
    }

    node.addEventListener('click', openReveal);
    node.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openReveal();
      }
    });
    close.addEventListener('click', closeReveal);
    reveal.addEventListener('click', function (event) {
      if (event.target === reveal) closeReveal();
    });
    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        closeReveal();
      }
    });
    window.addEventListener('pointermove', dodge, { passive: true });
    node.addEventListener('focus', function () {
      resetNode();
      pauseUntil = performance.now() + 1800;
      say('the secret is easier to find from here.', 1400);
    });

    resetNode();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHiddenOrigin, { once: true });
  } else {
    initHiddenOrigin();
  }
})();

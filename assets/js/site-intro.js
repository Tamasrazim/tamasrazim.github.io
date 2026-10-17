/* What this does: plays the main-site welcome, then reveals the same metallic Tamasrazim wordmark used in Hidden Origins. */
(function () {
  'use strict';

  function initSiteIntro() {
    var intro = document.getElementById('siteIntro');
    if (!intro || intro.dataset.ready === 'true') return;
    intro.dataset.ready = 'true';

    var welcome = intro.querySelector('[data-intro-stage="welcome"]');
    var to = intro.querySelector('[data-intro-stage="to"]');
    var wordmark = intro.querySelector('[data-intro-stage="wordmark"]');
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var timers = [];
    var finished = false;

    function later(fn, delay) {
      timers.push(window.setTimeout(fn, delay));
    }

    function activate(stage) {
      [welcome, to, wordmark].forEach(function (item) {
        if (item) item.classList.toggle('is-active', item === stage);
      });
    }

    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(window.clearTimeout);
      timers = [];
      intro.classList.add('is-leaving');
      window.setTimeout(function () {
        intro.hidden = true;
      }, reduceMotion ? 0 : 740);
    }

    if (reduceMotion) {
      intro.hidden = true;
      return;
    }

    intro.hidden = false;
    activate(welcome);
    // Welcome holds for one second; "To" is a brief bridge to the two-second wordmark reveal.
    later(function () { activate(to); }, 1000);
    later(function () {
      activate(wordmark);
      wordmark.classList.add('is-active');
    }, 1700);
    later(finish, 3900);

    // Let visitors bypass the intro without adding a visible button to the design.
    document.addEventListener('keydown', function onIntroKey(event) {
      if (event.key !== 'Escape' || finished) return;
      document.removeEventListener('keydown', onIntroKey);
      finish();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSiteIntro, { once: true });
  } else {
    initSiteIntro();
  }
})();

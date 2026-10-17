/* Hidden Origin v3 — keyboard-safe, isolated modal controller. */
(function () {
  'use strict';

  function initHiddenOrigin() {
    var trigger = document.getElementById('secretNode');
    var dialog = document.getElementById('secretReveal');
    var closeButton = document.getElementById('secretClose');

    if (!trigger || !dialog || !closeButton || dialog.dataset.hoReady === 'true') return;
    dialog.dataset.hoReady = 'true';

    var isOpen = false;
    var returnFocus = null;
    var previousOverflow = '';
    var closeTimer = 0;
    var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

    function focusableItems() {
      return Array.prototype.slice.call(dialog.querySelectorAll(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )).filter(function (item) {
        return !item.hidden && item.getAttribute('aria-hidden') !== 'true';
      });
    }

    function openDialog() {
      if (isOpen) return;
      isOpen = true;
      returnFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
      window.clearTimeout(closeTimer);
      dialog.hidden = false;
      dialog.classList.remove('is-closing');
      document.body.style.overflow = 'hidden';
      document.body.classList.add('is-locked');
      trigger.setAttribute('aria-expanded', 'true');

      window.requestAnimationFrame(function () {
        dialog.classList.add('is-open');
        closeButton.focus({ preventScroll: true });
      });
    }

    function closeDialog() {
      if (!isOpen) return;
      isOpen = false;
      dialog.classList.remove('is-open');
      dialog.classList.add('is-closing');
      trigger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-locked');
      document.body.style.overflow = previousOverflow;

      var finish = function () {
        dialog.hidden = true;
        dialog.classList.remove('is-closing');
        if (returnFocus && typeof returnFocus.focus === 'function') {
          try { returnFocus.focus({ preventScroll: true }); }
          catch (error) { returnFocus.focus(); }
        }
      };

      if (motionQuery && motionQuery.matches) finish();
      else closeTimer = window.setTimeout(finish, 320);
    }

    trigger.setAttribute('aria-expanded', 'false');
    trigger.addEventListener('click', openDialog);
    closeButton.addEventListener('click', closeDialog);

    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) closeDialog();
    });

    dialog.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== 'Tab') return;

      var items = focusableItems();
      if (!items.length) {
        event.preventDefault();
        closeButton.focus();
        return;
      }

      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen) closeDialog();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHiddenOrigin, { once: true });
  } else {
    initHiddenOrigin();
  }
})();

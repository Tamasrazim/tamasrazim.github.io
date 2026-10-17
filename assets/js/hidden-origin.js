/* Hidden Origin cinematic sequence — deterministic, accessible and self-contained. */
(function () {
  'use strict';

  function initHiddenOrigin() {
    var trigger = document.getElementById('secretNode');
    var dialog = document.getElementById('secretReveal');
    var closeButton = document.getElementById('secretClose');
    var yearNumber = document.getElementById('hoYearNumber');
    var storyLines = Array.prototype.slice.call(document.querySelectorAll('#hoStoryCopy .ho-story-line'));
    var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

    if (!trigger || !dialog || !closeButton || !yearNumber || dialog.dataset.hoReady === 'true') return;
    dialog.dataset.hoReady = 'true';

    var isOpen = false;
    var timers = [];
    var returnFocus = null;
    var previousOverflow = '';
    var previousBodyLock = false;

    function later(fn, delay) {
      var id = window.setTimeout(function () {
        timers = timers.filter(function (timer) { return timer !== id; });
        if (isOpen) fn();
      }, delay);
      timers.push(id);
      return id;
    }

    function clearTimers() {
      timers.forEach(function (id) { window.clearTimeout(id); });
      timers = [];
    }

    function setStage(stage) {
      ['year', 'names', 'path', 'wordmark', 'story'].forEach(function (name) {
        dialog.classList.toggle('stage-' + name, name === stage);
      });
    }

    function resetStory() {
      storyLines.forEach(function (line) {
        line.classList.remove('is-visible', 'is-typing');
        Array.prototype.forEach.call(line.querySelectorAll('.ho-word'), function (word) {
          word.style.transitionDelay = '';
          word.classList.remove('is-visible');
        });
      });
    }

    function wrapWords(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        var text = node.nodeValue;
        if (!text || !text.trim()) return;
        var fragment = document.createDocumentFragment();
        text.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            fragment.appendChild(document.createTextNode(part));
          } else {
            var span = document.createElement('span');
            span.className = 'ho-word';
            span.textContent = part;
            fragment.appendChild(span);
          }
        });
        node.parentNode.replaceChild(fragment, node);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || node.classList.contains('ho-word')) return;
      Array.prototype.slice.call(node.childNodes).forEach(wrapWords);
    }

    storyLines.forEach(wrapWords);

    function revealStoryLine(index) {
      if (!isOpen || index >= storyLines.length) return;
      var line = storyLines[index];
      line.classList.add('is-typing');
      var words = Array.prototype.slice.call(line.querySelectorAll('.ho-word'));
      if (reduceMotion && reduceMotion.matches) {
        line.classList.add('is-visible');
        words.forEach(function (word) { word.classList.add('is-visible'); });
        later(function () { revealStoryLine(index + 1); }, 100);
        return;
      }
      words.forEach(function (word, wordIndex) {
        word.style.transitionDelay = (wordIndex * 43) + 'ms';
        later(function () { word.classList.add('is-visible'); }, wordIndex * 43 + 70);
      });
      var lineDuration = Math.min(2200, 450 + words.length * 65);
      later(function () {
        line.classList.add('is-visible');
        revealStoryLine(index + 1);
      }, lineDuration);
    }

    function showStory() {
      setStage('story');
      later(function () { revealStoryLine(0); }, 650);
    }

    function runSequence() {
      clearTimers();
      resetStory();
      yearNumber.textContent = '2026';
      yearNumber.classList.remove('is-ticking');
      setStage('year');

      if (reduceMotion && reduceMotion.matches) {
        yearNumber.textContent = '2023';
        setStage('story');
        storyLines.forEach(function (line) {
          line.classList.add('is-visible');
          Array.prototype.forEach.call(line.querySelectorAll('.ho-word'), function (word) {
            word.classList.add('is-visible');
          });
        });
        return;
      }

      [2025, 2024, 2023].forEach(function (year, index) {
        later(function () {
          yearNumber.classList.add('is-ticking');
          later(function () {
            yearNumber.textContent = String(year);
            yearNumber.classList.remove('is-ticking');
          }, 110);
        }, 700 + index * 690);
      });

      later(function () { setStage('names'); }, 3000);
      later(function () { setStage('path'); }, 4750);
      later(function () { setStage('wordmark'); }, 7650);
      later(showStory, 9800);
    }

    function focusableItems() {
      return Array.prototype.slice.call(dialog.querySelectorAll(
        'button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])'
      )).filter(function (item) {
        return !item.hidden && item.getAttribute('aria-hidden') !== 'true';
      });
    }

    function openDialog() {
      if (isOpen) return;
      isOpen = true;
      returnFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
      previousBodyLock = document.body.classList.contains('is-locked');
      dialog.hidden = false;
      document.body.style.overflow = 'hidden';
      document.body.classList.add('is-locked');
      trigger.setAttribute('aria-expanded', 'true');
      window.requestAnimationFrame(function () {
        if (!isOpen) return;
        dialog.classList.add('is-open');
        try { closeButton.focus({ preventScroll: true }); }
        catch (error) { closeButton.focus(); }
        runSequence();
      });
    }

    function closeDialog() {
      if (!isOpen) return;
      isOpen = false;
      clearTimers();
      dialog.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = previousOverflow;
      if (!previousBodyLock) document.body.classList.remove('is-locked');
      window.setTimeout(function () {
        if (isOpen) return;
        dialog.hidden = true;
        ['year', 'names', 'path', 'wordmark', 'story'].forEach(function (name) {
          dialog.classList.remove('stage-' + name);
        });
        if (returnFocus && typeof returnFocus.focus === 'function') {
          try { returnFocus.focus({ preventScroll: true }); }
          catch (error) { returnFocus.focus(); }
        }
      }, reduceMotion && reduceMotion.matches ? 0 : 560);
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

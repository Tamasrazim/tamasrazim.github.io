/* Hidden Origin cinematic sequence — deterministic, accessible and self-contained. */
(function () {
  'use strict';

  function initHiddenOrigin() {
    var trigger = document.getElementById('secretNode');
    var dialog = document.getElementById('secretReveal');
    var closeButton = document.getElementById('secretClose');
    var yearNumber = document.getElementById('hoYearNumber');
    var yearReel = document.getElementById('hoYearReel');
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

    function alignOriginPaths() {
      var svg = document.querySelector('#hoPathScene .ho-path-svg');
      var leftName = document.getElementById('hoRazim');
      var rightName = document.getElementById('hoTamanna');
      if (!svg || !leftName || !rightName || typeof svg.createSVGPoint !== 'function') return;

      var matrix = svg.getScreenCTM();
      if (!matrix) return;
      var inverse = matrix.inverse();
      var view = svg.viewBox.baseVal;
      var targetX = view.x + view.width / 2;
      var targetY = view.y + view.height * 0.75;

      function pointFor(element) {
        var rect = element.getBoundingClientRect();
        var point = svg.createSVGPoint();
        // Anchor the flow just below the visible name, never through its lettering.
        point.x = rect.left + rect.width / 2;
        point.y = rect.bottom + 5;
        return point.matrixTransform(inverse);
      }

      function pathFrom(element, pathIds, side) {
        var start = pointFor(element);
        var bendX = start.x + (targetX - start.x) * 0.55;
        var controlY = Math.min(targetY - 40, start.y + Math.max(70, view.height * 0.18));
        var d = 'M ' + start.x.toFixed(2) + ' ' + start.y.toFixed(2) +
          ' C ' + start.x.toFixed(2) + ' ' + controlY.toFixed(2) +
          ', ' + bendX.toFixed(2) + ' ' + (targetY - 70).toFixed(2) +
          ', ' + targetX.toFixed(2) + ' ' + targetY.toFixed(2);
        pathIds.forEach(function (id) {
          var path = document.getElementById(id);
          if (path) path.setAttribute('d', d);
        });
      }

      pathFrom(leftName, ['hoFlowA', 'hoFlowCoreA'], 'left');
      pathFrom(rightName, ['hoFlowB', 'hoFlowCoreB'], 'right');
    }

    function keepPathsBelowNames() {
      if (!isOpen || !dialog.classList.contains('stage-path')) return;
      alignOriginPaths();
      window.requestAnimationFrame(keepPathsBelowNames);
    }

    function setStage(stage) {
      if (stage === 'path') {
        alignOriginPaths();
        window.requestAnimationFrame(keepPathsBelowNames);
      }
      ['year', 'names', 'path', 'wordmark', 'story'].forEach(function (name) {
        dialog.classList.toggle('stage-' + name, name === stage);
      });

      // Keep both names explicitly visible during the name and flowing-line shots.
      var nameScene = document.getElementById('hoNameScene');
      var razim = document.getElementById('hoRazim');
      var tamanna = document.getElementById('hoTamanna');
      var showNames = stage === 'names' || stage === 'path';
      if (nameScene) {
        nameScene.style.zIndex = showNames ? '20' : '';
        nameScene.style.opacity = showNames ? '1' : '';
        nameScene.style.visibility = showNames ? 'visible' : '';
      }
      [razim, tamanna].forEach(function (name) {
        if (!name) return;
        name.style.zIndex = showNames ? '40' : '';
        name.style.display = showNames ? 'block' : '';
        name.style.opacity = showNames ? '1' : '';
        name.style.visibility = showNames ? 'visible' : '';
        name.style.filter = showNames ? 'none' : '';
        name.style.transform = showNames ? 'none' : '';
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
      yearNumber.setAttribute('aria-label', '2026');
      if (yearReel) yearReel.style.setProperty('--reel-step', '5');
      yearNumber.classList.remove('is-ticking');
      setStage('year');

      if (reduceMotion && reduceMotion.matches) {
        yearNumber.setAttribute('aria-label', '2021');
        if (yearReel) yearReel.style.setProperty('--reel-step', '0');
        setStage('story');
        storyLines.forEach(function (line) {
          line.classList.add('is-visible');
          Array.prototype.forEach.call(line.querySelectorAll('.ho-word'), function (word) {
            word.classList.add('is-visible');
          });
        });
        return;
      }

      [2025, 2024, 2023, 2022, 2021].forEach(function (year, index) {
        later(function () {
          yearNumber.classList.add('is-ticking');
          if (yearReel) yearReel.style.setProperty('--reel-step', String(4 - index));
          later(function () {
            yearNumber.setAttribute('aria-label', String(year));
            yearNumber.classList.remove('is-ticking');
          }, 220);
        }, 650 + index * 650);
      });

      later(function () { setStage('names'); }, 4300);
      later(function () { setStage('path'); }, 6050);
      // The two line draws meet at the center after the second path finishes.
      // Reveal the animated wordmark only after that collision, hold it for one second,
      // then transition it upward into the story.
      later(function () { setStage('wordmark'); }, 11600);
      // Let the wordmark finish fading in, then hold it for one full second before it rises.
      later(showStory, 13500);
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

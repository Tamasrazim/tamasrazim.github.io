// What this does: Keeps the compact main-site navigation easy to dismiss with a click or Escape.

(function () {
  'use strict';

  // Close any open route menu when the visitor clicks somewhere else on the page.
  document.addEventListener('pointerdown', function (event) {
    document.querySelectorAll('details.site-page-menu[open]').forEach(function (menu) {
      if (!menu.contains(event.target)) menu.removeAttribute('open');
    });
  });

  // Escape closes the route list and returns keyboard focus to its button.
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;

    document.querySelectorAll('details.site-page-menu[open]').forEach(function (menu) {
      menu.removeAttribute('open');
      var button = menu.querySelector('summary');
      if (button) button.focus();
    });
  });
})();

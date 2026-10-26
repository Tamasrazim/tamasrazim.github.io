/* TRILYVA global maintenance redirect.
   This script fails open if the status endpoint is unreachable. */
(function () {
  'use strict';
  var maintenancePage = '/projects/trilyva/maintenance.html';
  if (window.location.pathname === maintenancePage) return;

  var root = document.documentElement;
  var style = document.createElement('style');
  style.textContent = 'html.trilyva-maintenance-checking body{visibility:hidden!important}';
  document.head.appendChild(style);
  root.classList.add('trilyva-maintenance-checking');

  var finished = false;
  var controller = new AbortController();
  var timeout = setTimeout(function () {
    controller.abort();
    reveal();
  }, 2200);

  function reveal() {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    root.classList.remove('trilyva-maintenance-checking');
  }

  fetch('/projects/trilyva/maintenance.json?check=' + Date.now(), {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal: controller.signal
  }).then(function (response) {
    if (!response.ok) throw new Error('Maintenance status unavailable');
    return response.json();
  }).then(function (state) {
    clearTimeout(timeout);
    if (state && state.enabled === true) {
      window.location.replace(maintenancePage);
      return;
    }
    reveal();
  }).catch(reveal);
})();

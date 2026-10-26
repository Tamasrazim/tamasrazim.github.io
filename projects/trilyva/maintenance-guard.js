/* TRILYVA global maintenance redirect.
   This script fails open if the status endpoint is unreachable and polls active tabs. */
(function () {
  'use strict';
  var maintenancePage = '/projects/trilyva/maintenance.html';
  if (window.location.pathname === maintenancePage) return;

  var root = document.documentElement;
  var style = document.createElement('style');
  style.textContent = 'html.trilyva-maintenance-checking body{visibility:hidden!important}';
  document.head.appendChild(style);
  root.classList.add('trilyva-maintenance-checking');

  var initialFinished = false;
  var checking = false;

  function reveal() {
    if (initialFinished) return;
    initialFinished = true;
    root.classList.remove('trilyva-maintenance-checking');
  }

  function checkStatus(isInitial) {
    if (checking) return;
    checking = true;
    var controller = new AbortController();
    var timeout = setTimeout(function () {
      controller.abort();
      if (isInitial) reveal();
    }, isInitial ? 2200 : 4000);

    fetch('/projects/trilyva/maintenance.json?check=' + Date.now(), {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    }).then(function (response) {
      if (!response.ok) throw new Error('Maintenance status unavailable');
      return response.json();
    }).then(function (state) {
      if (state && state.enabled === true) {
        window.location.replace(maintenancePage);
        return;
      }
      if (isInitial) reveal();
    }).catch(function () {
      if (isInitial) reveal();
    }).finally(function () {
      clearTimeout(timeout);
      checking = false;
    });
  }

  checkStatus(true);
  // If maintenance is enabled while someone already has TRILYVA open,
  // send that active tab to the same page on the next successful check.
  window.setInterval(function () { checkStatus(false); }, 30000);
})();

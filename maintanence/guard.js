/* Central maintenance routing for Tamasrazim's static GitHub Pages site.
   The guard fails open if the status file is unavailable. */
(function () {
  'use strict';
  var path = window.location.pathname || '/';
  if (/^\/(?:maintanence|maintenance)(?:\/|$)/i.test(path)) return;

  var root = document.documentElement;
  var css = document.createElement('style');
  css.textContent = 'html.site-maintenance-checking body{visibility:hidden!important}';
  (document.head || root).appendChild(css);
  root.classList.add('site-maintenance-checking');

  var initialDone = false;
  var inFlight = false;
  var timeoutId = null;

  function reveal() {
    if (initialDone) return;
    initialDone = true;
    root.classList.remove('site-maintenance-checking');
    if (timeoutId) clearTimeout(timeoutId);
  }

  function isTrilyvaRoute(p) {
    return /^\/projects\/trilyva(?:\/|$)/i.test(p) ||
      /^\/projects\/code-motion\/(?:renderer|batch)(?:\/|$)/i.test(p) ||
      /^\/projects\/code-motion\/legacy-renderer\.html$/i.test(p) ||
      /^\/(?:renderer|code-motion-tamasrazim2?\.html)(?:\/|$)/i.test(p);
  }

  function isProjectRoute(p) {
    return /^\/projects(?:\/|$)/i.test(p);
  }

  function isProfileRoute(p) {
    return p === '/' ||
      /^\/(?:about|approach|elsewere|licences|work)(?:\/|$)/i.test(p);
  }

  function isWorkspaceRoute(p) {
    return /^\/(?:KYNESTRA|asset-vault)(?:\/|$)/i.test(p);
  }

  function shouldRedirect(config) {
    if (!config || typeof config !== 'object') return false;
    if (config.globalEnabled === true) return true;
    var scopes = config.scopes || {};
    if (scopes.trilyva === true && isTrilyvaRoute(path)) return true;
    if (scopes.projects === true && isProjectRoute(path)) return true;
    if (scopes.profile === true && isProfileRoute(path)) return true;
    if (scopes.workspaces === true && isWorkspaceRoute(path)) return true;
    return false;
  }

  function checkStatus(initial) {
    if (inFlight) return;
    inFlight = true;
    var controller = new AbortController();
    var delay = initial ? 2500 : 5000;
    var id = window.setTimeout(function () {
      controller.abort();
      if (initial) reveal();
    }, delay);

    fetch('/maintanence/config.json?check=' + Date.now(), {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    }).then(function (response) {
      if (!response.ok) throw new Error('Maintenance configuration unavailable');
      return response.json();
    }).then(function (config) {
      if (shouldRedirect(config)) {
        var requested = path + window.location.search + window.location.hash;
        window.location.replace('/maintenance/?from=' + encodeURIComponent(requested));
        return;
      }
      if (initial) reveal();
    }).catch(function () {
      if (initial) reveal();
    }).finally(function () {
      window.clearTimeout(id);
      inFlight = false;
    });
  }

  timeoutId = window.setTimeout(reveal, 2700);
  checkStatus(true);
  // Existing tabs follow later changes without requiring a reload.
  window.setInterval(function () { checkStatus(false); }, 30000);
})();

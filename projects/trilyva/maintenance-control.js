/* Owner-side controls for the published TRILYVA maintenance switch.
   The GitHub token is used for the current action only and is never persisted. */
(function () {
  'use strict';
  var PAGE_URL = 'https://tamasrazim.github.io/projects/trilyva/maintenance.html';
  var CONFIG_PATH = 'projects/trilyva/maintenance.json';
  var API_URL = 'https://api.github.com/repos/Tamasrazim/tamasrazim.github.io/contents/' + CONFIG_PATH;
  var opener = document.getElementById('trilyvaMaintenanceOpen');
  if (!opener) return;

  var style = document.createElement('style');
  style.textContent = [
    '#triMaintenanceOverlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.82);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}',
    '#triMaintenanceOverlay[hidden]{display:none}',
    '#triMaintenanceDialog{width:min(620px,100%);max-height:min(88vh,900px);overflow:auto;border:1px solid #393939;background:#080808;color:#f1f1ed;box-shadow:0 24px 100px #000;padding:clamp(22px,4vw,36px);font:13px/1.7 system-ui,-apple-system,"Segoe UI",sans-serif}',
    '#triMaintenanceDialog *{box-sizing:border-box}',
    '#triMaintenanceDialog .tm-kicker{font:9px ui-monospace,monospace;letter-spacing:.17em;color:#9b9b95;text-transform:uppercase}',
    '#triMaintenanceDialog h2{font:700 clamp(24px,4vw,36px)/1.1 Unbounded,system-ui,sans-serif;letter-spacing:-.07em;margin:15px 0 10px}',
    '#triMaintenanceDialog p{color:#aaa;max-width:58ch;margin:9px 0}',
    '#triMaintenanceDialog .tm-state{display:flex;align-items:center;gap:9px;border:1px solid #303030;padding:12px 14px;margin:20px 0;background:#0e0e0e}',
    '#triMaintenanceDialog .tm-led{width:8px;height:8px;border-radius:50%;background:#777;flex:0 0 auto}',
    '#triMaintenanceDialog .tm-state[data-on="true"] .tm-led{background:#f1f1ed;box-shadow:0 0 0 4px #ffffff12}',
    '#triMaintenanceDialog .tm-state strong{font:10px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase}',
    '#triMaintenanceDialog label{display:block;color:#c6c6c0;font:10px ui-monospace,monospace;letter-spacing:.04em;margin:17px 0 7px}',
    '#triMaintenanceDialog input{display:block;width:100%;min-height:42px;padding:10px 12px;background:#030303;border:1px solid #353535;color:#f1f1ed;outline:none;font:12px ui-monospace,monospace}',
    '#triMaintenanceDialog input:focus{border-color:#aaa}',
    '#triMaintenanceDialog .tm-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}',
    '#triMaintenanceDialog button,#triMaintenanceDialog a.tm-button{display:inline-flex;align-items:center;justify-content:center;min-height:39px;padding:0 13px;border:1px solid #3b3b3b;background:#111;color:#f1f1ed;font:10px ui-monospace,monospace;cursor:pointer;text-decoration:none}',
    '#triMaintenanceDialog button.tm-primary{background:#f1f1ed;color:#050505;border-color:#f1f1ed}',
    '#triMaintenanceDialog button:disabled{opacity:.45;cursor:wait}',
    '#triMaintenanceDialog .tm-message{min-height:24px;margin-top:12px;font:11px/1.7 ui-monospace,monospace;color:#bcbcb5;overflow-wrap:anywhere}',
    '#triMaintenanceDialog .tm-message[data-kind="error"]{color:#f0b4b4}',
    '#triMaintenanceDialog .tm-message[data-kind="success"]{color:#d9e9d2}',
    '#triMaintenanceDialog .tm-help{font-size:11px;color:#888;line-height:1.8;margin-top:20px}',
    '#triMaintenanceDialog .tm-help a{color:#eee;text-decoration:underline;text-underline-offset:3px}',
    '#triMaintenanceDialog .tm-top{display:flex;align-items:center;justify-content:space-between;gap:18px}',
    '#triMaintenanceDialog .tm-close{background:transparent!important;min-height:32px!important}',
    '@media(prefers-reduced-motion:reduce){#triMaintenanceOverlay{backdrop-filter:none}}'
  ].join('');
  document.head.appendChild(style);

  var overlay = document.createElement('div');
  overlay.id = 'triMaintenanceOverlay';
  overlay.hidden = true;
  overlay.innerHTML = [
    '<section id="triMaintenanceDialog" role="dialog" aria-modal="true" aria-labelledby="triMaintenanceTitle">',
    '<div class="tm-top"><div class="tm-kicker">TRILYVA / OWNER CONTROLS</div><button type="button" class="tm-close" id="triMaintenanceClose">Close</button></div>',
    '<h2 id="triMaintenanceTitle">Maintenance mode<span>.</span></h2>',
    '<p>Switch the public TRILYVA pages into maintenance mode. When enabled, new visits to the workspace, project overview, tutorial, and updates page are redirected here.</p>',
    '<div class="tm-state" id="triMaintenanceState" data-on="false"><span class="tm-led" aria-hidden="true"></span><strong id="triMaintenanceStateText">Checking published status...</strong></div>',
    '<div class="tm-actions"><button type="button" id="triMaintenanceRefresh">Refresh status</button><button type="button" id="triMaintenanceCopy">Copy page link</button><a class="tm-button" href="' + PAGE_URL + '" target="_blank" rel="noopener noreferrer">Open page</a></div>',
    '<label for="triMaintenanceToken">GitHub fine-grained personal access token</label>',
    '<input id="triMaintenanceToken" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste a repository-scoped token">',
    '<div class="tm-actions"><button type="button" class="tm-primary" id="triMaintenanceEnable">Enable maintenance</button><button type="button" id="triMaintenanceDisable">Disable maintenance</button></div>',
    '<div class="tm-message" id="triMaintenanceMessage" role="status" aria-live="polite"></div>',
    '<div class="tm-help">Required permission: select only the <strong>Tamasrazim/tamasrazim.github.io</strong> repository and grant <strong>Contents: Read and write</strong>. Create a fine-grained token in <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">GitHub token settings</a>. The token is not saved to browser storage and is cleared after each attempt. Enabling or disabling mode creates a repository commit; GitHub Pages needs time to publish it.</div>',
    '</section>'
  ].join('');
  document.body.appendChild(overlay);

  var $ = function (id) { return document.getElementById(id); };
  var tokenInput = $('triMaintenanceToken');
  var stateBox = $('triMaintenanceState');
  var stateText = $('triMaintenanceStateText');
  var message = $('triMaintenanceMessage');
  var enableButton = $('triMaintenanceEnable');
  var disableButton = $('triMaintenanceDisable');
  var refreshButton = $('triMaintenanceRefresh');
  var activeButton = null;

  function setMessage(text, kind) {
    message.textContent = text || '';
    message.setAttribute('data-kind', kind || '');
  }
  function setPublishedState(enabled) {
    stateBox.setAttribute('data-on', enabled ? 'true' : 'false');
    stateText.textContent = enabled ? 'MAINTENANCE ENABLED' : 'MAINTENANCE DISABLED';
  }
  function setBusy(busy) {
    [enableButton, disableButton, refreshButton].forEach(function (button) { button.disabled = busy; });
    if (busy) activeButton = document.activeElement;
    else if (activeButton && activeButton.focus) activeButton.focus();
  }
  function readPublicState() {
    return fetch('/projects/trilyva/maintenance.json?status=' + Date.now(), { cache: 'no-store', headers: { Accept: 'application/json' } })
      .then(function (response) {
        if (!response.ok) throw new Error('Could not read the published maintenance status.');
        return response.json();
      });
  }
  function refreshStatus() {
    setMessage('Reading the published status...', '');
    return readPublicState().then(function (status) {
      setPublishedState(status.enabled === true);
      setMessage(status.enabled === true
        ? 'The published switch is ON. New guarded visits will be redirected when the latest commit is live.'
        : 'The published switch is OFF. TRILYVA pages are open.', '');
    }).catch(function (error) {
      setMessage(error.message || 'Could not read maintenance status.', 'error');
    });
  }
  function encodeBase64Utf8(value) {
    var bytes = new TextEncoder().encode(value);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  function setMode(enabled) {
    var token = tokenInput.value.trim();
    if (!token) {
      setMessage('Paste a fine-grained token with Contents: Read and write for this repository.', 'error');
      tokenInput.focus();
      return;
    }
    setBusy(true);
    setMessage('Updating the repository configuration...', '');
    var headers = {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28'
    };
    fetch(API_URL, { method: 'GET', headers: headers, cache: 'no-store' }).then(function (response) {
      return response.json().then(function (file) {
        if (!response.ok) throw new Error(file.message || 'GitHub could not read the maintenance configuration. Check the token and repository permission.');
        return file;
      });
    }).then(function (file) {
      var current;
      try { current = JSON.parse(atob(String(file.content || '').replace(/\s/g, ''))); }
      catch (error) { throw new Error('The repository maintenance configuration is not valid JSON.'); }
      var updated = Object.assign({}, current, {
        enabled: enabled,
        updatedAt: new Date().toISOString()
      });
      var payload = {
        message: 'TRILYVA: ' + (enabled ? 'enable' : 'disable') + ' maintenance mode',
        content: encodeBase64Utf8(JSON.stringify(updated, null, 2) + '\n'),
        sha: file.sha,
        branch: 'main'
      };
      return fetch(API_URL, {
        method: 'PUT',
        headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      }).then(function (response) {
        return response.json().then(function (result) {
          if (!response.ok) throw new Error(result.message || 'GitHub rejected the update. Confirm Contents: Read and write permission.');
          return result;
        });
      });
    }).then(function () {
      setPublishedState(enabled);
      setMessage('Commit created successfully. GitHub Pages must publish it before the global redirect takes effect. Use Open page to preview the maintenance screen.', 'success');
    }).catch(function (error) {
      setMessage(error.message || 'Could not update maintenance mode.', 'error');
    }).finally(function () {
      tokenInput.value = '';
      token = '';
      setBusy(false);
    });
  }

  function openModal() {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    refreshStatus();
    tokenInput.focus({ preventScroll: true });
  }
  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    tokenInput.value = '';
    setMessage('', '');
    opener.focus({ preventScroll: true });
  }
  opener.addEventListener('click', openModal);
  $('triMaintenanceClose').addEventListener('click', closeModal);
  overlay.addEventListener('click', function (event) { if (event.target === overlay) closeModal(); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !overlay.hidden) closeModal();
  });
  refreshButton.addEventListener('click', refreshStatus);
  enableButton.addEventListener('click', function () { setMode(true); });
  disableButton.addEventListener('click', function () { setMode(false); });
  $('triMaintenanceCopy').addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(PAGE_URL).then(function () {
        setMessage('Maintenance page link copied.', 'success');
      }).catch(function () {
        window.prompt('Copy the maintenance page URL:', PAGE_URL);
      });
    } else {
      window.prompt('Copy the maintenance page URL:', PAGE_URL);
    }
  });
})();

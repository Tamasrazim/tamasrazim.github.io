const invoke = window.__TAURI__?.core?.invoke ?? null;
const eventApi = window.__TAURI__?.event ?? null;
const dialogApi = window.__TAURI__?.dialog ?? null;

const title = document.getElementById('title');
const view = document.getElementById('view');
const statusEl = document.getElementById('status');
const state = { projects: [], core: null, activeProject: null, currentView: 'home', refreshToken: 0 };

const views = {
  home: renderHome,
  forge: renderForge,
  c2m: renderC2M,
  vault: renderVault,
  settings: renderSettings
};

async function renderForge() {
  view.innerHTML =
    '<div class="card"><h2>Forge</h2><p class="muted">KYNESTRA Forge currently ships the real Format Forge workspace as an independent module. It handles browser-first conversion, batch processing and ZIP export; the production page remains untouched.</p><div class="actions"><button id="launch-forge" class="action primary">Launch Forge</button></div><div class="notice">Forge is intentionally separate from C2M and Stock Vault. Core handoff contracts will be added without merging module internals.</div></div>';
}

async function renderC2M() {
  const project = state.activeProject;
  const active = project
    ? '<div class="notice">Active project: <strong>'+escapeHtml(project.name)+'</strong></div>'
    : '<div class="notice">Open a .tamasrazim project first to create a Core render job.</div>';

  view.innerHTML =
    '<div class="card"><h2>Code Motion</h2><p class="muted">KYNESTRA ships its own C2M renderer copy. Core render jobs and Vault ingestion are now connected around it.</p>'+
    active+
    '<div class="actions">'+
    '<button id="launch-c2m" class="action primary">Launch C2M Renderer</button>'+
    (project ? '<button id="new-render-job" class="action">Create Core Render Job</button><button id="import-render-output" class="action">Register Render Output</button>' : '')+
    '</div>'+
    '<div id="render-job-list" class="projects"></div></div>';

  if (!project) return;

  const jobs = await api('list_render_jobs', { projectPath: project.path });
  const list = document.getElementById('render-job-list');
  list.innerHTML = jobs.length
    ? jobs.map(job => '<div class="project"><b>'+escapeHtml(job.status.toUpperCase())+' · '+escapeHtml(job.format)+'</b><code>'+escapeHtml(job.job_id)+'</code><span class="muted">'+escapeHtml(JSON.stringify(job.composition))+'</span>'+(job.status==='recoverable' ? '<span class="muted">The previous process stopped before completion. Recovery resets this job to queued so C2M can rerun it cleanly.</span><div class="actions"><button class="action" data-recover-job="'+escapeAttr(job.job_id)+'">Recover Job</button></div>' : '')+'</div>').join('')
    : '<div class="notice">No render jobs yet.</div>';

  document.getElementById('new-render-job')?.addEventListener('click', createRenderJob);
  document.querySelectorAll('[data-recover-job]').forEach(button => button.addEventListener('click', () => recoverRenderJob(button.dataset.recoverJob)));
  document.getElementById('import-render-output')?.addEventListener('click', completeRenderJob);
}

async function renderVault() {
  const project = state.activeProject;
  if (!project) {
    renderModule('Stock Vault', 'Open a .tamasrazim project first. Vault is project-local.');
    return;
  }

  const [assets, accounts, submissions] = await Promise.all([
    api('list_assets', { projectPath: project.path }),
    api('list_accounts', { projectPath: project.path }),
    api('list_submissions', { projectPath: project.path })
  ]);

  view.innerHTML =
    '<div class="card"><h2>Stock Vault</h2>'+
    '<p class="muted">Assets, platform accounts, and submission states are tracked per project. Public-status verification remains a separate check and is never inferred from absence.</p>'+
    '<div class="notice">Project: <strong>'+escapeHtml(project.name)+'</strong> · '+assets.length+' asset'+(assets.length===1?'':'s')+' · '+accounts.length+' account'+(accounts.length===1?'':'s')+'</div>'+
    '<div class="actions">'+
    '<button id="vault-add-account" class="action">Add Platform Account</button>'+
    (accounts.length ? '<button id="vault-set-submission" class="action">Update Submission Status</button><button id="vault-check-public" class="action primary">Check Public Status</button>' : '')+
    '</div>'+
    '<div class="projects">'+(
      assets.length
      ? assets.map(asset => {
          const states=submissions.filter(s=>s.asset_id===asset.asset_id);
          const stateText=states.length
            ? states.map(s=>(s.platform||'Account')+' · '+s.status+' · public '+s.public_status).join(' · ')
            : 'not submitted';
          return '<div class="project"><b>'+escapeHtml(asset.filename)+'</b><code>'+escapeHtml(asset.relative_path)+'</code><span class="muted">'+escapeHtml(asset.kind)+' · '+formatBytes(asset.size_bytes)+' · SHA-256 '+escapeHtml(asset.sha256.slice(0,16))+'…</span><span class="muted">Submission: '+escapeHtml(stateText)+'</span></div>';
        }).join('')
      : '<div class="notice">Vault is empty for this project.</div>'
    )+
    '</div></div>';

  document.getElementById('vault-add-account')?.addEventListener('click', createAccount);
  document.getElementById('vault-set-submission')?.addEventListener('click', setSubmissionStatus);
  document.getElementById('vault-check-public')?.addEventListener('click', checkSubmissionPublicStatus);
}

async function renderSettings() {
  const project = state.activeProject;
  if (!project) {
    renderModule('Settings', 'Open a .tamasrazim project first to manage platform accounts for that project.');
    return;
  }

  const accounts = await api('list_accounts', { projectPath: project.path });
  view.innerHTML =
    '<div class="card"><h2>Accounts Manager</h2>'+
    '<p class="muted">Store platform identity metadata and contributor profile links here. Secrets are represented only by credential references; credentials are not written into project files.</p>'+
    '<div class="notice">Project: <strong>'+escapeHtml(project.name)+'</strong></div>'+
    '<div class="actions"><button id="add-account" class="action primary">Add Account</button></div>'+
    '<div class="projects">'+(
      accounts.length
      ? accounts.map(a => '<div class="project"><b>'+escapeHtml(a.platform)+' · '+escapeHtml(a.display_name)+'</b><code>'+escapeHtml(a.account_id)+'</code><span class="muted">'+escapeHtml(a.status)+(a.profile_url ? ' · '+escapeHtml(a.profile_url) : '')+'</span><div class="actions"><button class="action" data-account-status="'+escapeAttr(a.account_id)+'" data-status="'+escapeAttr(a.status==='connected'?'disconnected':'connected')+'">'+(a.status==='connected'?'Mark Disconnected':'Mark Connected')+'</button></div></div>').join('')
      : '<div class="notice">No platform accounts configured.</div>'
    )+
    '</div></div>';

  document.getElementById('add-account')?.addEventListener('click', createAccount);
  document.querySelectorAll('[data-account-status]').forEach(button => button.addEventListener('click', () => updateAccountStatus(button.dataset.accountStatus, button.dataset.status)));
}

async function createAccount() {
  const project=state.activeProject;
  if (!project) return;
  const platform=prompt('Platform name');
  if (!platform) return;
  const displayName=prompt('Account display name', platform);
  if (!displayName) return;
  const profileUrl=prompt('Contributor/profile URL (optional)') || null;
  try {
    await api('create_account', { projectPath: project.path, platform, displayName, profileUrl });
    await renderSettings();
  } catch (error) { alert(String(error)); }
}

async function updateAccountStatus(accountId, status) {
  const project=state.activeProject;
  if (!project) return;
  try {
    await api('update_account_status', { projectPath: project.path, accountId, status });
    await renderSettings();
  } catch (error) { alert(String(error)); }
}

async function setSubmissionStatus() {
  const project=state.activeProject;
  if (!project) return;
  try {
    const assets=await api('list_assets', { projectPath: project.path });
    const accounts=await api('list_accounts', { projectPath: project.path });
    if (!assets.length || !accounts.length) {
      alert('Create an asset and a platform account first.');
      return;
    }
    const assetId=prompt('Asset ID', assets[0].asset_id);
    if (!assetId) return;
    const accountId=prompt('Account ID', accounts[0].account_id);
    if (!accountId) return;
    const status=prompt('Status: not_submitted, submitted, pending, approved, rejected, unknown', 'submitted');
    if (!status) return;
    const publicUrl=prompt('Public URL (optional)') || null;
    const reason=prompt('Status note (optional)') || null;
    await api('set_submission_status', {
      projectPath: project.path,
      assetId,
      accountId,
      status,
      publicUrl,
      reason
    });
    await renderVault();
  } catch (error) { alert(String(error)); }
}

async function checkSubmissionPublicStatus() {
  const project=state.activeProject;
  if (!project) return;
  try {
    const submissions=await api('list_submissions', { projectPath: project.path });
    if (!submissions.length) {
      alert('Create a submission record first.');
      return;
    }
    const submissionId=prompt('Submission ID', submissions[0].submission_id);
    if (!submissionId) return;
    const result=await api('check_submission_public_status', {
      projectPath: project.path,
      submissionId
    });
    alert('Public status: '+result.public_status+'\n\n'+result.reason);
    await renderVault();
  } catch (error) { alert(String(error)); }
}

async function createRenderJob() {
  if (!state.activeProject) return;
  try {
    const format = prompt('Output format', 'webm') || 'webm';
    const duration = Number(prompt('Duration in seconds', '15')) || 15;
    const fps = Number(prompt('FPS', '60')) || 60;
    const composition = {
      width: 3840,
      height: 2160,
      fps,
      duration,
      frameCount: Math.round(duration * fps)
    };
    const job = await api('create_render_job', {
      projectPath: state.activeProject.path,
      format,
      composition
    });
    await api('start_render_job', { projectPath: state.activeProject.path, jobId: job.job_id });
    await renderC2M();
  } catch (error) {
    alert(String(error));
  }
}

async function recoverRenderJob(jobId) {
  if (!state.activeProject) return;
  try {
    await api('recover_render_job', {
      projectPath: state.activeProject.path,
      jobId
    });
    alert('Render job recovered and returned to queued state. Rerun it from the C2M module.');
    await renderC2M();
  } catch (error) {
    alert(String(error));
  }
}

async function pickRenderOutput() {
  if (!dialogApi?.open) {
    const fallback = prompt('Absolute path to the rendered output file');
    return fallback || null;
  }
  const selected = await dialogApi.open({
    multiple: false,
    directory: false,
    title: 'Select rendered output',
    filters: [{ name: 'Media', extensions: ['webm', 'mp4', 'mov', 'mkv', 'png', 'jpg', 'jpeg', 'gif'] }, { name: 'All files', extensions: ['*'] }]
  });
  return typeof selected === 'string' ? selected : null;
}

async function pickTamasrazimPackage() {
  if (!dialogApi?.open) {
    const fallback = prompt('Absolute path to the .tamasrazim package');
    return fallback || null;
  }
  const selected = await dialogApi.open({
    multiple: false,
    directory: false,
    title: 'Open .tamasrazim package',
    filters: [{ name: 'KYNESTRA Project', extensions: ['tamasrazim'] }]
  });
  return typeof selected === 'string' ? selected : null;
}

async function saveTamasrazimPackage() {
  if (!dialogApi?.save) {
    const fallback = prompt('Output path for the .tamasrazim package');
    return fallback || null;
  }
  return dialogApi.save({
    title: 'Export .tamasrazim package',
    filters: [{ name: 'KYNESTRA Project', extensions: ['tamasrazim'] }]
  });
}

async function completeRenderJob() {
  if (!state.activeProject) return;
  try {
    const jobId = prompt('Render job ID');
    if (!jobId) return;
    const sourcePath = await pickRenderOutput();
    if (!sourcePath) return;
    const asset = await api('complete_render_job', {
      projectPath: state.activeProject.path,
      jobId,
      sourcePath,
      kind: 'video',
      metadata: { source: 'c2m' }
    });
    alert('Imported '+asset.filename+' into Stock Vault.');
    await renderC2M();
  } catch (error) {
    alert(String(error));
  }
}

function formatBytes(value) {
  const n = Number(value) || 0;
  if (n < 1024) return n+' B';
  if (n < 1024*1024) return (n/1024).toFixed(1)+' KB';
  if (n < 1024*1024*1024) return (n/1024/1024).toFixed(1)+' MB';
  return (n/1024/1024/1024).toFixed(2)+' GB';
}

function renderModule(name, text) {
  view.innerHTML = '<div class="card"><h2>'+name+'</h2><p class="muted">'+text+'</p></div>';
}

async function api(command, args) {
  if (!invoke) throw new Error('KYNESTRA desktop runtime is not connected.');
  return invoke(command, args);
}

async function refreshProjects() {
  if (!invoke) return;
  state.projects = await api('list_projects');
  if (state.activeProject && !state.projects.some(p => p.project_id === state.activeProject.project_id)) state.activeProject = null;
}

async function createProject() {
  const name = prompt('Project name');
  if (!name) return;
  try {
    const result = await api('create_project', { name });
    state.activeProject = result.project;
    await refreshProjects();
    renderHome();
  } catch (error) { alert(String(error)); }
}

async function openProject(path) {
  try { state.activeProject = await api('open_project', { path }); renderHome(); }
  catch (error) { alert(String(error)); }
}

async function importPackage() {
  if (!invoke) return;
  const packagePath = await pickTamasrazimPackage();
  if (!packagePath) return;
  try {
    const result = await api('import_project_package', { packagePath });
    state.activeProject = await api('open_project', { path: result.project_path });
    await refreshProjects();
    alert('Imported '+result.name+' with '+result.files_verified+' verified files.');
    renderHome();
  } catch (error) { alert(String(error)); }
}

async function exportPackage() {
  if (!state.activeProject) return;
  const outputPath = await saveTamasrazimPackage();
  if (!outputPath) return;
  try {
    const result = await api('export_project_package', {
      projectPath: state.activeProject.path,
      outputPath
    });
    alert('Exported '+result.name+' · '+result.files.length+' files verified into the package manifest.');
  } catch (error) { alert(String(error)); }
}

function renderHome() {
  const cards = state.projects.map(p => '<div class="project"><b>'+escapeHtml(p.name)+'</b><code>'+escapeHtml(p.path)+'</code><div class="actions"><button class="action" data-open="'+escapeAttr(p.path)+'">Open</button></div></div>').join('');
  view.innerHTML = '<div class="card"><h2>Core workspace</h2><p class="muted">The shell is connected to Rust Core. Working projects are local .tamasrazim directories; portable projects are ZIP-backed .tamasrazim packages with integrity manifests.</p><div class="actions"><button id="new-project" class="action primary">New Project</button><button id="import-package" class="action">Import .tamasrazim</button>'+(state.activeProject ? '<button id="export-package" class="action">Export Active Project</button>' : '')+'</div>'+(state.activeProject ? '<div class="notice">Active: <strong>'+escapeHtml(state.activeProject.name)+'</strong></div><div id="task-center" class="projects"><div class="notice">Loading Core tasks…</div></div>' : '')+'<div class="projects">'+(cards || '<div class="notice">No projects created yet.</div>')+'</div></div><div class="grid"><div class="tile"><b>Forge</b><span class="muted">Create</span></div><div class="tile"><b>C2M</b><span class="muted">Render</span></div><div class="tile"><b>Stock Vault</b><span class="muted">Manage</span></div></div>';
  document.getElementById('new-project')?.addEventListener('click', createProject);
  document.getElementById('import-package')?.addEventListener('click', importPackage);
  document.getElementById('export-package')?.addEventListener('click', exportPackage);
  document.querySelectorAll('[data-open]').forEach(btn => btn.addEventListener('click', () => openProject(btn.dataset.open)));

  if (state.activeProject) loadTaskCenter(state.activeProject.path);
}

async function loadTaskCenter(projectPath) {
  const target = document.getElementById('task-center');
  if (!target) return;
  try {
    const tasks = await api('list_tasks', { projectPath });
    target.innerHTML = tasks.length
      ? tasks.slice(0, 12).map(task => '<div class="project"><b>'+escapeHtml(task.status.toUpperCase())+' · '+escapeHtml(task.task_type)+'</b><code>'+escapeHtml(task.task_id)+'</code><span class="muted">'+Math.round(Number(task.progress)*100)+'%'+(task.message ? ' · '+escapeHtml(task.message) : '')+'</span></div>').join('')
      : '<div class="notice">No Core tasks for this project yet.</div>';
  } catch (error) {
    target.innerHTML = '<div class="notice">Task Center unavailable: '+escapeHtml(error)+'</div>';
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }

async function handleCoreEvent(event) {
  const type = event?.payload?.event_type;
  if (!type) return;

  if (type === 'task.created' || type === 'task.started' || type === 'task.progress' || type === 'task.completed' || type === 'task.failed' || type === 'task.recovered') {
    if (state.currentView === 'home' && state.activeProject) {
      await loadTaskCenter(state.activeProject.path);
    }
    if (['c2m'].includes(state.currentView)) {
      await renderC2M();
    }
    return;
  }

  if (type === 'project.created' || type === 'project.imported') {
    await refreshProjects();
    if (type === 'project.imported' && event?.payload?.payload?.path) {
      state.activeProject = state.projects.find(p => p.path === event.payload.payload.path) || state.activeProject;
    }
    if (state.currentView === 'home') renderHome();
    return;
  }

  if (!state.activeProject) return;

  if (['render.started', 'render.completed', 'render.failed', 'task.recovered'].includes(type) && state.currentView === 'c2m') {
    const token = ++state.refreshToken;
    await new Promise(resolve => setTimeout(resolve, 0));
    if (token === state.refreshToken) await renderC2M();
    return;
  }

  if (type === 'asset.imported' && state.currentView === 'vault') {
    const token = ++state.refreshToken;
    await new Promise(resolve => setTimeout(resolve, 0));
    if (token === state.refreshToken) await renderVault();
    return;
  }

  if ((type === 'submission.updated' || type.startsWith('account.')) && ['vault', 'settings'].includes(state.currentView)) {
    const token = ++state.refreshToken;
    await new Promise(resolve => setTimeout(resolve, 0));
    if (token === state.refreshToken) await views[state.currentView]();
  }
}

async function init() {
  try {
    if (invoke) {
      state.core = await api('core_status');
      statusEl.textContent = 'CORE ONLINE · '+state.core.version;
      await refreshProjects();
      if (eventApi?.listen) await eventApi.listen('kynestra:event', handleCoreEvent);
    } else statusEl.textContent = 'WEB PREVIEW';
  } catch (error) { statusEl.textContent = 'CORE ERROR'; console.error(error); }
  renderHome();
}

document.querySelectorAll('#nav button').forEach(button => button.addEventListener('click', () => {
  const name = button.dataset.view;
  state.currentView = name;
  title.textContent = name === 'c2m' ? 'C2M' : name === 'vault' ? 'Stock Vault' : name[0].toUpperCase()+name.slice(1);
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b === button));
  views[name]();
}));

async function launchC2M() {
  const project = state.activeProject;
  let query = '';
  if (project) {
    try {
      const jobs = await api('list_render_jobs', { projectPath: project.path });
      const handoffJob = jobs.find(job => job.status === 'running') || jobs.find(job => job.status === 'queued');
      const params = new URLSearchParams({ projectPath: project.path });
      if (handoffJob) params.set('jobId', handoffJob.job_id);
      query = '?'+params.toString();
    } catch (error) {
      console.warn('Could not attach Core render context to C2M:', error);
    }
  }
  window.location.href = 'modules/c2m/renderer/index.html'+query;
}

function launchForge() {
  const project = state.activeProject;
  const query = project ? '?'+new URLSearchParams({ projectPath: project.path }).toString() : '';
  window.location.href = 'modules/forge/renderer/index.html'+query;
}

document.getElementById('view')?.addEventListener('click', event => {
  if (event.target?.id === 'launch-c2m') launchC2M();
  if (event.target?.id === 'launch-forge') launchForge();
});
init();
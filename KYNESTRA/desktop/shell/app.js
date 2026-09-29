const invoke = window.__TAURI__?.core?.invoke ?? null;
const eventApi = window.__TAURI__?.event ?? null;

const title = document.getElementById('title');
const view = document.getElementById('view');
const statusEl = document.getElementById('status');
const state = { projects: [], core: null, activeProject: null };

const views = {
  home: renderHome,
  forge: () => renderModule('Forge', 'Creation workspace boundary is ready. Forge will become the source and recipe module.'),
  c2m: renderC2M,
  vault: renderVault,
  settings: () => renderModule('Settings', 'Core settings will be persisted through the shared settings service.')
};

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
    ? jobs.map(job => '<div class="project"><b>'+escapeHtml(job.status.toUpperCase())+' · '+escapeHtml(job.format)+'</b><code>'+escapeHtml(job.job_id)+'</code><span class="muted">'+escapeHtml(JSON.stringify(job.composition))+'</span></div>').join('')
    : '<div class="notice">No render jobs yet.</div>';

  document.getElementById('new-render-job')?.addEventListener('click', createRenderJob);
  document.getElementById('import-render-output')?.addEventListener('click', completeRenderJob);
}

async function renderVault() {
  const project = state.activeProject;
  if (!project) {
    renderModule('Stock Vault', 'Open a .tamasrazim project first. Vault is project-local.');
    return;
  }

  const assets = await api('list_assets', { projectPath: project.path });
  view.innerHTML =
    '<div class="card"><h2>Stock Vault</h2><p class="muted">Assets registered from KYNESTRA render outputs are stored in the project asset registry and deduplicated by SHA-256.</p>'+
    '<div class="notice">Project: <strong>'+escapeHtml(project.name)+'</strong> · '+assets.length+' asset'+(assets.length === 1 ? '' : 's')+'</div>'+
    '<div class="projects">'+(
      assets.length
      ? assets.map(asset => '<div class="project"><b>'+escapeHtml(asset.filename)+'</b><code>'+escapeHtml(asset.relative_path)+'</code><span class="muted">'+escapeHtml(asset.kind)+' · '+formatBytes(asset.size_bytes)+' · SHA-256 '+escapeHtml(asset.sha256.slice(0,16))+'…</span></div>').join('')
      : '<div class="notice">Vault is empty for this project.</div>'
    )+'</div></div>';
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

async function completeRenderJob() {
  if (!state.activeProject) return;
  try {
    const jobId = prompt('Render job ID');
    if (!jobId) return;
    const sourcePath = prompt('Absolute path to the rendered output file');
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

function renderHome() {
  const cards = state.projects.map(p => '<div class="project"><b>'+escapeHtml(p.name)+'</b><code>'+escapeHtml(p.path)+'</code><div class="actions"><button class="action" data-open="'+escapeAttr(p.path)+'">Open</button></div></div>').join('');
  view.innerHTML = '<div class="card"><h2>Core workspace</h2><p class="muted">The shell is connected to Rust Core. Projects are local .tamasrazim packages with their own SQLite metadata database.</p><div class="actions"><button id="new-project" class="action primary">New Project</button></div>'+(state.activeProject ? '<div class="notice">Active: <strong>'+escapeHtml(state.activeProject.name)+'</strong></div>' : '')+'<div class="projects">'+(cards || '<div class="notice">No projects created yet.</div>')+'</div></div><div class="grid"><div class="tile"><b>Forge</b><span class="muted">Create</span></div><div class="tile"><b>C2M</b><span class="muted">Render</span></div><div class="tile"><b>Stock Vault</b><span class="muted">Manage</span></div></div>';
  document.getElementById('new-project')?.addEventListener('click', createProject);
  document.querySelectorAll('[data-open]').forEach(btn => btn.addEventListener('click', () => openProject(btn.dataset.open)));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }

async function init() {
  try {
    if (invoke) {
      state.core = await api('core_status');
      statusEl.textContent = 'CORE ONLINE · '+state.core.version;
      await refreshProjects();
      if (eventApi?.listen) await eventApi.listen('kynestra:event', ({ payload }) => { if (payload?.event_type === 'project.created') refreshProjects().then(renderHome); });
    } else statusEl.textContent = 'WEB PREVIEW';
  } catch (error) { statusEl.textContent = 'CORE ERROR'; console.error(error); }
  renderHome();
}

document.querySelectorAll('#nav button').forEach(button => button.addEventListener('click', () => {
  const name = button.dataset.view;
  title.textContent = name === 'c2m' ? 'C2M' : name === 'vault' ? 'Stock Vault' : name[0].toUpperCase()+name.slice(1);
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b === button));
  views[name]();
}));

document.getElementById('view')?.addEventListener('click', event => { if (event.target?.id === 'launch-c2m') window.location.href = 'modules/c2m/renderer/index.html'; });
init();
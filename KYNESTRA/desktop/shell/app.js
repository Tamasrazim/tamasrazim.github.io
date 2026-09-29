const invoke = window.__TAURI__?.core?.invoke ?? null;
const eventApi = window.__TAURI__?.event ?? null;

const title = document.getElementById('title');
const view = document.getElementById('view');
const statusEl = document.getElementById('status');
const state = { projects: [], core: null, activeProject: null };

const views = {
  home: renderHome,
  forge: () => renderModule('Forge', 'Creation workspace boundary is ready. Forge will become the source and recipe module.'),
  c2m: () => renderModule('C2M', 'Code Motion is the renderer module. The production renderer remains outside KYNESTRA.'),
  vault: () => renderModule('Stock Vault', 'Vault will ingest completed C2M renders and track platform states independently.'),
  settings: () => renderModule('Settings', 'Core settings will be persisted through the shared settings service.')
};

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

init();
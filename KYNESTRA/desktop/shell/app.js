const views={
home:['Home','<div class="card"><h2>KYNESTRA Core</h2><p class="muted">Foundation shell online. The desktop product will use this workspace as the UI basis.</p><div class="grid"><div class="tile"><b>Forge</b><span class="muted">Independent creation module</span></div><div class="tile"><b>C2M</b><span class="muted">Code Motion renderer</span></div><div class="tile"><b>Stock Vault</b><span class="muted">Asset and publishing tracker</span></div></div></div>'],
forge:['Forge','<div class="card"><h2>Forge</h2><p class="muted">Module boundary initialized. Forge remains independent from C2M and Vault.</p></div>'],
c2m:['C2M','<div class="card"><h2>Code Motion</h2><p class="muted">A separate KYNESTRA copy of the production renderer will be integrated here.</p></div>'],
vault:['Stock Vault','<div class="card"><h2>Stock Vault</h2><p class="muted">Rendered assets, metadata, accounts, submission state, and publicity checks.</p></div>'],
settings:['Settings','<div class="card"><h2>Settings</h2><p class="muted">Core preferences and future module permissions.</p></div>']
};
const title=document.getElementById('title'),view=document.getElementById('view');
function openView(name){const [label,html]=views[name]||views.home;title.textContent=label;view.innerHTML=html;document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name))}
document.querySelectorAll('#nav button').forEach(b=>b.addEventListener('click',()=>openView(b.dataset.view)));
openView('home');

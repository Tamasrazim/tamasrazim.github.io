(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const DB='tamasrazim-asset-vault', STORE='assets', VERSION=1;
let db=null, assets=[], filtered=[], selectedId=null, objectUrls=new Map();

const statusOrder=['ready','submitted','approved','rejected'];
const statusLabel={ready:'Ready',submitted:'Submitted',approved:'Approved',rejected:'Rejected'};

function uid(){return crypto.randomUUID?crypto.randomUUID():'asset-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,VERSION);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE)){const s=d.createObjectStore(STORE,{keyPath:'id'});s.createIndex('updatedAt','updatedAt')}};r.onsuccess=()=>{db=r.result;resolve(db)};r.onerror=()=>reject(r.error)})}
function tx(mode){return db.transaction(STORE,mode).objectStore(STORE)}
function put(asset){return new Promise((resolve,reject)=>{const r=tx('readwrite').put(asset);r.onsuccess=resolve;r.onerror=()=>reject(r.error)})}
function remove(id){return new Promise((resolve,reject)=>{const r=tx('readwrite').delete(id);r.onsuccess=resolve;r.onerror=()=>reject(r.error)})}
function all(){return new Promise((resolve,reject)=>{const r=tx('readonly').getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.updatedAt-a.updatedAt));r.onerror=()=>reject(r.error)})}
async function refresh(){assets=await all();applyFilters()}
function revokeUrl(id){const u=objectUrls.get(id);if(u){URL.revokeObjectURL(u);objectUrls.delete(id)}}
function urlFor(asset){if(asset.url&&!objectUrls.has(asset.id))objectUrls.set(asset.id,URL.createObjectURL(asset.blob));return objectUrls.get(asset.id)}
function kindOf(file){if(file.type.startsWith('video/'))return 'VIDEO';if(file.type.startsWith('image/'))return 'IMAGE';return 'FILE'}
function bytes(n){if(n<1024)return n+' B';let u=['KB','MB','GB'];let i=-1;do{n/=1024;i++}while(n>=1024&&i<u.length-1);return n.toFixed(n>100?0:1)+' '+u[i]}
function escape(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function applyFilters(){
  const q=$('#search').value.trim().toLowerCase(), status=$('#statusFilter').value, kind=$('#kindFilter').value;
  filtered=assets.filter(a=>{
    const hay=[a.name,a.title,a.description,a.keywords.join(' '),a.notes].join(' ').toLowerCase();
    return (!q||hay.includes(q))&&(!status||a.status===status)&&(!kind||a.kind===kind)
  });
  render();
}
function render(){
  $('#totalCount').textContent=assets.length;$('#readyCount').textContent=assets.filter(a=>a.status==='ready').length;$('#submittedCount').textContent=assets.filter(a=>a.status==='submitted').length;$('#approvedCount').textContent=assets.filter(a=>a.status==='approved').length;
  $('#resultCount').textContent=filtered.length+' shown';
  const grid=$('#grid');
  grid.innerHTML='';
  if(!filtered.length){grid.innerHTML='<div class="empty">No assets match the current filter.</div>';return}
  filtered.forEach(a=>{
    const card=document.createElement('article');card.className='card';
    const u=urlFor(a);
    const media=a.kind==='VIDEO'&&a.blob?'<video src="'+u+'" muted playsinline preload="metadata"></video>':a.kind==='IMAGE'&&a.blob?'<img src="'+u+'" alt="">':'<span class="kicker">BINARY ASSET</span>';
    const tags=a.keywords.slice(0,5).map(k=>'<span class="tag">'+escape(k)+'</span>').join('');
    card.innerHTML='<div class="thumb">'+media+'<span class="kind">'+a.kind+'</span></div><div class="card-body"><div class="card-title">'+escape(a.title||a.name)+'</div><div class="card-sub">'+escape(a.name)+' · '+bytes(a.size)+'</div><div class="tags">'+tags+'</div><div class="status '+a.status+'">'+statusLabel[a.status]+'</div><div class="card-actions"><button class="btn" data-open="'+a.id+'">Inspect</button><button class="btn" data-download="'+a.id+'">Download</button></div></div>';
    grid.appendChild(card)
  });
  $$('[data-open]').forEach(b=>b.addEventListener('click',()=>openDetail(b.dataset.open)));
  $$('[data-download]').forEach(b=>b.addEventListener('click',()=>downloadAsset(b.dataset.download)));
}
async function importFiles(list){
  const files=Array.from(list||[]).filter(f=>/^(image|video)\//.test(f.type));
  if(!files.length){toast('Use image or video files.');return}
  for(const file of files){
    const asset={id:uid(),name:file.name,title:file.name.replace(/\.[^.]+$/,''),description:'',keywords:[],notes:'',status:'ready',kind:kindOf(file),mime:file.type,size:file.size,blob:file,createdAt:Date.now(),updatedAt:Date.now()};
    await put(asset)
  }
  await refresh();toast(files.length+' asset'+(files.length===1?'':'s')+' imported')
}
function openDetail(id){
  selectedId=id;const a=assets.find(x=>x.id===id);if(!a)return;
  $('#detailTitle').textContent=a.title||a.name;$('#metaTitle').value=a.title||'';$('#metaDescription').value=a.description||'';$('#metaKeywords').value=a.keywords.join(', ');$('#metaNotes').value=a.notes||'';$('#metaStatus').value=a.status;
  const box=$('#detailPreview');const u=urlFor(a);box.innerHTML=a.kind==='VIDEO'?'<video src="'+u+'" controls playsinline loop></video>':a.kind==='IMAGE'?'<img src="'+u+'" alt="">':'<span class="muted">Binary asset</span>';
  $('#detailName').textContent=a.name+' · '+bytes(a.size)+' · '+a.mime;
  $('#detail').classList.add('open')
}
function closeDetail(){$('#detail').classList.remove('open');selectedId=null}
async function saveDetail(){
  const a=assets.find(x=>x.id===selectedId);if(!a)return;
  a.title=$('#metaTitle').value.trim()||a.name.replace(/\.[^.]+$/,'');a.description=$('#metaDescription').value.trim();a.keywords=$('#metaKeywords').value.split(',').map(x=>x.trim()).filter(Boolean);a.notes=$('#metaNotes').value.trim();a.status=$('#metaStatus').value;a.updatedAt=Date.now();
  await put(a);await refresh();openDetail(a.id);toast('Asset saved')
}
async function deleteSelected(){
  const a=assets.find(x=>x.id===selectedId);if(!a)return;
  if(!confirm('Delete '+a.name+' from the local vault?'))return;
  await remove(a.id);revokeUrl(a.id);await refresh();closeDetail();toast('Asset removed')
}
function downloadAsset(id){
  const a=assets.find(x=>x.id===id);if(!a)return;
  const u=urlFor(a),link=document.createElement('a');link.href=u;link.download=a.name;document.body.appendChild(link);link.click();link.remove()
}
function downloadMetadata(id){
  const a=assets.find(x=>x.id===id);if(!a)return;
  const meta={title:a.title,description:a.description,keywords:a.keywords,creator:'Tamasrazim',status:a.status,originalFile:a.name,mime:a.mime,size:a.size,createdAt:new Date(a.createdAt).toISOString(),updatedAt:new Date(a.updatedAt).toISOString()};
  const blob=new Blob([JSON.stringify(meta,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),link=document.createElement('a');link.href=u;link.download=(a.title||a.name).replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)
}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}
$('#fileInput').addEventListener('change',e=>{importFiles(e.target.files);e.target.value=''});
['dragenter','dragover'].forEach(ev=>$('#drop').addEventListener(ev,e=>{e.preventDefault();$('#drop').classList.add('drag')}));
['dragleave','drop'].forEach(ev=>$('#drop').addEventListener(ev,e=>{e.preventDefault();$('#drop').classList.remove('drag')}));
$('#drop').addEventListener('drop',e=>importFiles(e.dataTransfer.files));
$('#pickBtn').addEventListener('click',()=>$('#fileInput').click());
$('#clearBtn').addEventListener('click',async()=>{if(!assets.length)return;if(!confirm('Delete every asset from this local vault?'))return;for(const a of assets)revokeUrl(a.id);await new Promise((resolve,reject)=>{const r=tx('readwrite').clear();r.onsuccess=resolve;r.onerror=()=>reject(r.error)});await refresh();toast('Vault cleared')});
$('#search').addEventListener('input',applyFilters);$('#statusFilter').addEventListener('change',applyFilters);$('#kindFilter').addEventListener('change',applyFilters);
$('#closeDetail').addEventListener('click',closeDetail);$('#saveDetail').addEventListener('click',saveDetail);$('#deleteDetail').addEventListener('click',deleteSelected);$('#downloadDetail').addEventListener('click',()=>downloadAsset(selectedId));$('#metadataDetail').addEventListener('click',()=>downloadMetadata(selectedId));
$('#detail').addEventListener('click',e=>{if(e.target.id==='detail')closeDetail()});
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeDetail()});
window.addEventListener('beforeunload',()=>objectUrls.forEach(u=>URL.revokeObjectURL(u)));
(async()=>{try{await openDB();await refresh()}catch(e){console.error(e);toast('Local storage could not be initialized')}})();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
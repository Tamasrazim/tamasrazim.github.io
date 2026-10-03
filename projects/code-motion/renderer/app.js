
/* ============================================================
   Code -> Motion — application shell
   ============================================================ */
(function () {
'use strict';

var SELF_SOURCE = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
var APP_VERSION = '1.1.0';
var SOFTWARE = 'TRILYVA — Tamasrazim';

var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
function pad(n, w) { return ('0000000' + n).slice(-(w || 2)); }
function fmtBytes(b) {
  if (!b && b !== 0) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(2) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}
function fmtClock(sec) {
  sec = Math.max(0, sec | 0);
  var h = (sec / 3600) | 0, m = ((sec % 3600) / 60) | 0, s = sec % 60;
  return (h ? pad(h) + ':' : '') + pad(m) + ':' + pad(s);
}
function timecode(frame, fps) {
  var f = frame % fps, t = (frame / fps) | 0;
  return pad((t / 3600) | 0) + ':' + pad(((t % 3600) / 60) | 0) + ':' + pad(t % 60) + ':' + pad(f);
}
function slugify(s) {
  return String(s || 'untitled').trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'untitled';
}
function sha256(text) {
  if (!(self.crypto && crypto.subtle && crypto.subtle.digest)) return Promise.resolve(null);
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }).catch(function () { return null; });
}
function download(blob, name) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click();
  setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 8000);
}

/* ============================================================
   Engine host — worker path with a main-thread fallback
   ============================================================ */
var CORE = null, ENC = null, EXP = null, EVAL_OK = true;
try { new Function('return 1')(); } catch (e) { EVAL_OK = false; }

var Engine = {
  mode: 'none', ready: false, worker: null, seq: 0, pending: {}, api: null, bootNote: ''
};

function buildLocal() {
  CORE = MotionCore;
  ENC = MotionEncoders;
  EXP = MotionExport;
}

function mainEngine() {
  var rt = CORE.createRuntime(), assets = {}, cancelled = false;
  function mk(w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    return { canvas: c, ctx: c.getContext('2d', { alpha: true }) };
  }
  /* The export render target is a real, inspectable canvas element:
     <canvas id="render-target">. VideoFrame is built from this and nothing
     else — never from the document, an iframe or any other DOM node. */
  function mkExport(w, h) {
    var host = $('#renderTargetHost');
    var old = document.getElementById('render-target');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var c = document.createElement('canvas');
    c.id = 'render-target';
    c.width = w; c.height = h;
    c.setAttribute('aria-hidden', 'true');
    host.appendChild(c);
    return { canvas: c, ctx: c.getContext('2d', { alpha: true }), role: 'render-target' };
  }
  function releaseExport(o) {
    if (o && o.canvas && o.canvas.parentNode) o.canvas.parentNode.removeChild(o.canvas);
  }
  var ENVI = {
    core: CORE, enc: ENC, makeCanvas: mk, makeExportCanvas: mkExport, releaseExportCanvas: releaseExport,
    toBlob: function (canvas, type) { return new Promise(function (r) { canvas.toBlob(r, type); }); }
  };
  var pv = null;
  return {
    mode: 'main',
    setAssets: function (list) {
      return Promise.all(list.map(function (a) {
        return createImageBitmap(a.blob).then(function (bm) { return { name: a.name, bm: bm }; }).catch(function () { return null; });
      })).then(function (r) {
        assets = {}; r.forEach(function (x) { if (x) assets[x.name] = x.bm; });
        rt.setAssets(assets); return assets;
      });
    },
    compile: function (code, comp) { rt.setComposition(comp); rt.setAssets(assets); return Promise.resolve(rt.compile(code)); },
    setComposition: function (comp) { rt.setComposition(comp); return Promise.resolve(); },
    preview: function (frame, w, h, scale) {
      if (!pv || pv.canvas.width !== w || pv.canvas.height !== h) pv = mk(w, h);
      var r = rt.renderInto(pv.ctx, frame, { rasterScale: scale });
      return Promise.resolve(r.ok ? { ok: true, canvas: pv.canvas, frame: frame, ms: r.ms } : { ok: false, error: r.error, frame: frame });
    },
    renderOne: function (frame, w, h) {
      var o = mk(w, h);
      var r = rt.renderInto(o.ctx, frame, { isExport: true, rasterScale: w / rt.comp.width });
      return Promise.resolve(r.ok ? { ok: true, canvas: o.canvas, ms: r.ms } : { ok: false, error: r.error });
    },
    timing: function (job, n) { return EXP.sampleTiming(ENVI, job, n); },
    loopSeam: function (job) { return EXP.loopSeam(ENVI, job); },
    cancel: function () { cancelled = true; },
    exportJob: function (job, from, dirHandle, existing, onLog, onProgress) {
      cancelled = false;
      var writeFile = dirHandle ? function (name, blob) {
        return dirHandle.getFileHandle(name, { create: true })
          .then(function (fh) { return fh.createWritable(); })
          .then(function (ws) { return ws.write(blob).then(function () { return ws.close(); }); });
      } : null;
      return EXP.run({
        env: ENVI, job: job, from: from, assets: assets, existing: existing, writeFile: writeFile,
        isCancelled: function () { return cancelled; }, onLog: onLog, onProgress: onProgress
      });
    }
  };
}

function workerEngine() {
  var w = new Worker('./motion-worker.js');
  var pending = {};
  var seq = 0;
  w.onmessage = function (ev) {
    var m = ev.data, p = pending[m.id];
    if (m.type === 'ready') return;
    if (!p) return;
    if (m.type === 'log') { p.onLog && p.onLog(m.message); return; }
    if (m.type === 'progress') { p.onProgress && p.onProgress(m.progress); return; }
    delete pending[m.id];
    p.res(m);
  };
  w.onerror = function (e) { Object.keys(pending).forEach(function (k) { pending[k].rej(new Error(e.message || 'worker error')); delete pending[k]; }); };
  function call(msg, transfer, onLog, onProgress) {
    return new Promise(function (res, rej) {
      msg.id = ++seq;
      pending[msg.id] = { res: res, rej: rej, onLog: onLog, onProgress: onProgress };
      w.postMessage(msg, transfer || []);
    });
  }
  return {
    mode: 'worker', raw: w, call: call,
    setAssets: function (list) { return call({ type: 'assets', assets: list }); },
    compile: function (code, comp) { return call({ type: 'compile', code: code, composition: comp }).then(function (m) { return m.result; }); },
    setComposition: function (comp) { return call({ type: 'composition', composition: comp }); },
    preview: function (frame, rw, rh, scale) { return call({ type: 'preview', frame: frame, rasterW: rw, rasterH: rh, scale: scale }); },
    renderOne: function (frame, rw, rh) { return call({ type: 'renderOne', frame: frame, width: rw, height: rh }); },
    timing: function (job, n) { return call({ type: 'timing', job: job, frames: n }).then(function (m) { return m.result; }); },
    loopSeam: function (job) { return call({ type: 'loopSeam', job: job }).then(function (m) { return m.result; }); },
    cancel: function () { w.postMessage({ type: 'cancel' }); },
    exportJob: function (job, from, dirHandle, existing, onLog, onProgress) {
      return call({ type: 'export', job: job, from: from, dirHandle: dirHandle || null, existing: existing || null }, [], onLog, onProgress)
        .then(function (m) { return m.result; });
    }
  };
}

function bootEngine() {
  buildLocal();
  var wantWorker = (typeof Worker !== 'undefined') && (typeof OffscreenCanvas !== 'undefined') &&
    (typeof OffscreenCanvas.prototype.transferToImageBitmap === 'function');
  if (!wantWorker) {
    Engine.api = mainEngine(); Engine.mode = 'main';
    Engine.bootNote = (typeof OffscreenCanvas === 'undefined') ? 'OffscreenCanvas is missing, so rendering runs on the main thread.' : 'Workers are unavailable, so rendering runs on the main thread.';
    return Promise.resolve();
  }
  return new Promise(function (resolve) {
    var e;
    try { e = workerEngine(); } catch (err) {
      Engine.api = mainEngine(); Engine.mode = 'main';
      Engine.bootNote = 'The worker could not start (' + err.message + '), so rendering runs on the main thread.';
      return resolve();
    }
    var settled = false;
    var to = setTimeout(function () {
      if (settled) return; settled = true;
      try { e.raw.terminate(); } catch (x) { }
      Engine.api = mainEngine(); Engine.mode = 'main';
      Engine.bootNote = 'The worker did not answer within 4 s, so rendering runs on the main thread.';
      resolve();
    }, 4000);
    e.call({ type: 'ping' }).then(function () {
      if (settled) return; settled = true; clearTimeout(to);
      Engine.api = e; Engine.mode = 'worker';
      Engine.bootNote = 'Animation code runs in a worker with no DOM access.';
      resolve();
    }).catch(function (err) {
      if (settled) return; settled = true; clearTimeout(to);
      Engine.api = mainEngine(); Engine.mode = 'main';
      Engine.bootNote = 'The worker failed (' + (err.message || err) + '), so rendering runs on the main thread.';
      resolve();
    });
  });
}

/* ============================================================
   TRILYVA LIBRARY — Prism Flowers + Living Emojis
   ============================================================ */
function setStage(name){S.stage=name;$$('#strip .st[data-stage]').forEach(n=>{const st=n.dataset.stage; n.classList.toggle('on',st===name);n.classList.toggle('done',['PREVIEW','RENDER','SETTINGS','CONFIRM','RENDERING','COMPLETE'].includes(name)&&['CODE','PREVIEW','RENDER','SETTINGS','CONFIRM','RENDERING'].includes(st)&&st!==name);});$('#stripMsg').textContent=name;$('#statusText').textContent=name;}
function markDirty(v){S.dirty=!!v;$('#dirtyStat').textContent=S.dirty?'modified':'saved';}
function updateLineNumbers(){const lines=Math.max(1,$('#ta').value.split('\n').length),g=$('#gutter');g.innerHTML='';for(let i=1;i<=lines;i++){const d=document.createElement('div');d.textContent=i;g.appendChild(d);}$('#lineStat').textContent='1:'+lines;$('#charStat').textContent=$('#ta').value.length+' chars';}
function highlight(code){let s=String(code).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');s=s.replace(/(\/\/.*)$/gm,'<span class="tk-com">$1</span>');s=s.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g,'<span class="tk-str">$1</span>');s=s.replace(/\b(const|let|var|function|return|for|if|else|new|class|async|await|throw|true|false|null|Math|canvas|ctx)\b/g,'<span class="tk-key">$1</span>');s=s.replace(/\b(\d+(?:\.\d+)?)\b/g,'<span class="tk-num">$1</span>');return s;}
function syncEditor(){const ta=$('#ta');$('#hl').innerHTML=highlight(ta.value);updateLineNumbers();ta.style.height='auto';ta.style.height=Math.max($('#edscroll').clientHeight,ta.scrollHeight+260)+'px';$('#hl').style.height=ta.style.height;}
function compileSource(){try{const src=$('#ta').value;const f=new Function('TAU','motion','ctx','width','height','time','frame','fps',src+'\nif(typeof renderFrame!==\"function\")throw new Error(\"Code must define renderFrame(time, frame, fps, ctx, width, height).\");\nreturn renderFrame(time,frame,fps,ctx,width,height,motion);');S.compiled=f;return {ok:true};}catch(e){S.compiled=null;return {ok:false,error:e};}}
function drawCurrent(){const c=$('#view'),ctx=c.getContext('2d');if(!ctx)return;const m=buildMotion(S.frame,S.fps,S.duration,Math.min(c.width/1920,c.height/1080,1));if(!S.compiled){const r=compileSource();if(!r.ok){showError('CODE ERROR',r.error.message);return;}}try{ctx.clearRect(0,0,c.width,c.height);S.compiled(TAU,m,ctx,c.width,c.height,m.time,S.frame,S.fps);S.lastError=null;}catch(e){showError('RENDER ERROR',e.message);S.lastError=e;}updateHUD(m);}
function updateHUD(m){$('#hudFrame').textContent=String(m.frame).padStart(4,'0');$('#hudTime').textContent=m.time.toFixed(2)+'s';$('#hudFps').textContent=S.fps;$('#hudRes').textContent=S.width+'×'+S.height;$('#hudAspect').textContent='16:9';$('#tlFrame').textContent=String(m.frame).padStart(4,'0');$('#tlTime').textContent=m.time.toFixed(2);$('#tlRange').textContent='0 — '+(S.fps*S.duration-1);$('#playhead').style.left=((m.frame/Math.max(1,S.fps*S.duration-1))*100)+'%';$('#frameCount').textContent=S.fps*S.duration;$('#frameTime').textContent=(1000/S.fps).toFixed(3)+' ms';$('#projectReadout').textContent=S.name;$('#projectDur').textContent=S.duration+' s';$('#projectFps').textContent=S.fps;$('#projectRes').textContent=S.width+'×'+S.height;$('#sampleCount').textContent=samples.length;}
function showError(title,detail){$('#stageMsg').classList.add('on');$('#msgTitle').textContent=title;$('#msgDetail').textContent=detail||'';$('#statusDetail').textContent=detail||'Error';}
function clearError(){$('#stageMsg').classList.remove('on');$('#msgDetail').textContent='';$('#statusDetail').textContent='Browser / local';}
function setViewSize(){const c=$('#view');c.width=PREVIEW_WIDTH;c.height=PREVIEW_HEIGHT;const frame=$('#canvasFrame');const stage=$('#stage');const pad=32;let baseW=PREVIEW_WIDTH,baseH=PREVIEW_HEIGHT;if(S.zoom==='fit'){const maxW=Math.max(1,stage.clientWidth-pad),maxH=Math.max(1,stage.clientHeight-pad);baseW=Math.min(maxW,maxH*PREVIEW_ASPECT);baseH=baseW/PREVIEW_ASPECT;}else{const z=Math.max(.05,Number(S.zoom)/100);baseW=PREVIEW_WIDTH*z;baseH=PREVIEW_HEIGHT*z;}frame.style.width=Math.max(1,Math.round(baseW))+'px';frame.style.height=Math.max(1,Math.round(baseH))+'px';drawCurrent();}
function installCode(code){$('#ta').value=code;syncEditor();S.compiled=null;S.frame=0;clearError();const c=$('#view'),ctx=c.getContext('2d');if(ctx)ctx.clearRect(0,0,PREVIEW_WIDTH,PREVIEW_HEIGHT);markDirty(false);setViewSize();setStage('CODE');}
function newProject(){if(!confirmDiscard())return;S.name='untitled';$('#projName').value=S.name;installCode(DEFAULT_CODE);}
function confirmDiscard(){return !S.dirty || window.confirm('Current changes are unsaved. Continue without saving?');}
function loadSample(s){if(!confirmDiscard())return;S.name=s.title.toLowerCase().replace(/[^a-z0-9]+/g,'-');$('#projName').value=S.name;installCode(s.code);markDirty(true);}
function sampleCards(){const box=$('#sampleList');box.innerHTML='';samples.forEach(s=>{const n=document.createElement('div');n.className='sample';n.innerHTML='<h5>'+s.title+'</h5><p>'+s.desc+'</p>';n.addEventListener('click',()=>loadSample(s));box.appendChild(n);});}
const PRISM_LIBRARY_URL='./library/prism-library.json';
let prismLibraryCache=null;
const PRISM_EXTRA_LIBRARY=[
{name:'Prism Radiant Daisy',id:'prism-radiant-daisy',desc:'Procedural translucent daisy study.',code:`function renderFrame(time,frame,fps,ctx,width,height,motion){const a=motion.loopProgress*TAU,s=motion.scale;ctx.fillStyle="#050506";ctx.fillRect(0,0,width,height);ctx.save();ctx.translate(width/2,height/2);for(let i=0;i<18;i++){const q=i*TAU/18+a*.25;ctx.save();ctx.rotate(q);ctx.fillStyle="hsla(12,95%,70%,.28)";ctx.beginPath();ctx.ellipse(0,-105*s,30*s,105*s,0,0,TAU);ctx.fill();ctx.restore();}ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(0,0,28*s,0,TAU);ctx.fill();ctx.restore();}`},
{name:'Prism Moon Lotus',id:'prism-moon-lotus',desc:'Layered translucent lotus study.',code:`function renderFrame(time,frame,fps,ctx,width,height,motion){const a=motion.loopProgress*TAU,s=motion.scale;ctx.fillStyle="#050506";ctx.fillRect(0,0,width,height);ctx.save();ctx.translate(width/2,height/2);for(let ring=0;ring<2;ring++)for(let i=0;i<9;i++){const q=(i+(ring?.5:0))*TAU/9+a*.22;ctx.save();ctx.rotate(q);ctx.translate(0,ring?18*s:0);ctx.fillStyle=ring?"rgba(110,190,255,.35)":"rgba(210,240,255,.55)";ctx.beginPath();ctx.ellipse(0,-80*s,34*s,82*s,0,0,TAU);ctx.fill();ctx.restore();}ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(0,0,26*s,0,TAU);ctx.fill();ctx.restore();}`},
{name:'Prism Dahlia Spiral',id:'prism-dahlia-spiral',desc:'Radial spiral dahlia study.',code:`function renderFrame(time,frame,fps,ctx,width,height,motion){const a=motion.loopProgress*TAU,s=motion.scale;ctx.fillStyle="#050506";ctx.fillRect(0,0,width,height);ctx.save();ctx.translate(width/2,height/2);for(let i=0;i<32;i++){const q=i*TAU/32+a*.35,r=(55+i*5)*s,x=Math.cos(q)*r,y=Math.sin(q)*r;ctx.fillStyle="hsla(330,90%,"+(50+i*.9)+"%,.7)";ctx.beginPath();ctx.ellipse(x,y,38*s,12*s,q+.5,0,TAU);ctx.fill();}ctx.restore();}`}
];
async function loadPrismLibrary(){
  if(prismLibraryCache)return prismLibraryCache;
  const r=await fetch(PRISM_LIBRARY_URL,{cache:'no-store'});
  if(!r.ok)throw new Error('Prism library request failed: '+r.status);
  const raw=await r.json();
  if(!Array.isArray(raw))throw new Error('Prism library payload is not an array.');
  const source=raw.filter(f=>f&&typeof f.code==='string'&&f.title);
  const seen=new Set(source.map(f=>String(f.id||f.title)));
  const extras=PRISM_EXTRA_LIBRARY.filter(f=>!seen.has(f.id));
  prismLibraryCache=[...source,...extras];
  return prismLibraryCache;
}

const TRILYVA_PRISM_LIBRARY_URL='./library/prism-library.json';
let trilyvaPrismCache=null;

async function loadTrilyvaPrismLibrary(){
  if(trilyvaPrismCache)return trilyvaPrismCache;
  const r=await fetch(TRILYVA_PRISM_LIBRARY_URL,{cache:'no-store'});
  if(!r.ok)throw new Error('Prism library request failed: '+r.status);
  const raw=await r.json();
  if(!Array.isArray(raw))throw new Error('Prism library payload is not an array.');
  trilyvaPrismCache=raw
    .filter(f=>f&&f.title)
    .map(f=>{
      const code=typeof f.code==='string'?f.code:
        (typeof f.source==='string'?f.source:
        (typeof f.renderCode==='string'?f.renderCode:''));
      return Object.assign({},f,{code});
    })
    .filter(f=>typeof f.code==='string'&&f.code.trim());
  return trilyvaPrismCache;
}
function trilyvaLibraryEscape(v){return String(v??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
async function trilyvaLoadLibraryCode(title,code){
  const name=String(title||'untitled').trim()||'untitled';
  const source=String(code||'').replace(/\r/g,'');
  if(!source.trim()){
    $('#stMsg').textContent='Library item has no executable render code.';
    return {ok:false};
  }
  S.name=name;
  $('#projName').value=S.name;
  if(!S.comp) S.comp=CORE.composition({});
  S.meta=merge(defaultMeta(),S.meta||{});
  S.meta.title=name;
  S.meta.composition=S.meta.composition||'Comp 1';
  S.frame=0;
  S.compiled=false;
  S.lastError=null;
  edSetValue(source);
  S.code=source;
  syncMetaUI();
  syncFileName();
  markDirty(true);
  const result=await run();
  if(result&&result.ok){
    closeModal();
    $('#stMsg').textContent='Loaded library item · '+name;
    setStage('IDLE');
  }else{
    $('#stMsg').textContent='Library item failed to compile · '+name;
  }
  return result||{ok:false};
}
function openTrilyvaLibrary(){
  var body=document.createElement('div');
  body.style.cssText='display:flex;flex-direction:column;gap:9px;min-height:0;';
  openModal('TRILYVA / LIBRARY',body,[{label:'Close',fn:closeModal}]);

  var registry=window.TRILYVA_LIBRARY;
  if(!registry){
    body.innerHTML='<div class="empty">LIBRARY REGISTRY NOT READY</div>';
    return;
  }

  body.innerHTML='<div class="empty">LOADING LIBRARY INDEX…</div>';
  registry.ready.then(function(){
    var toolbar=document.createElement('div');
    toolbar.style.cssText='display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;';
    var tabs=document.createElement('div');
    tabs.style.cssText='display:flex;gap:4px;flex-wrap:wrap;';
    var search=document.createElement('input');
    search.type='search'; search.placeholder='Search library…'; search.autocomplete='off';
    search.style.cssText='width:100%;background:#09090b;border:1px solid var(--rule);padding:7px 8px;font:10px var(--mono);outline:none;';
    toolbar.append(tabs,search);

    var list=document.createElement('div');
    list.className='list';
    list.style.cssText='max-height:52vh;overflow:auto;';

    body.replaceChildren(toolbar,list);

    var libs=registry.all();
    var active=libs[0]||null;
    var data=[];
    var loaded=false;

    function setTabs(){
      tabs.replaceChildren();
      libs.forEach(function(lib){
        var btn=document.createElement('button');
        btn.type='button';
        btn.textContent=lib.title;
        btn.style.cssText='border:1px solid var(--rule);padding:6px 9px;background:'+(active===lib?'#fff':'#0a0a0c')+';color:'+(active===lib?'#000':'var(--mut)')+';font:9px var(--mono);letter-spacing:.08em;cursor:pointer;';
        btn.title=lib.description||'';
        btn.onclick=function(){active=lib;loaded=false;setTabs();loadActive();};
        tabs.appendChild(btn);
      });
    }

    function render(){
      var q=search.value.trim().toLowerCase();
      var items=data.map(function(x,i){return {x:x,i:i};}).filter(function(o){
        var x=o.x||{};
        var hay=String(x.title||'')+' '+String(x.id||'')+' '+String(x.category||x.cat||'');
        return !q||hay.toLowerCase().indexOf(q)>=0;
      });
      if(!items.length){
        list.innerHTML='<div class="empty">NO MATCHES</div>';
        return;
      }
      var frag=document.createDocumentFragment();
      items.forEach(function(o){
        var x=o.x;
        var it=document.createElement('div');
        it.className='it';
        it.tabIndex=0;
        var text=document.createElement('div');
        text.style.cssText='min-width:0;flex:1;';
        text.innerHTML='<h5>'+trilyvaLibraryEscape(x.title||'Untitled')+'</h5><p>'+trilyvaLibraryEscape(x.id||('item-'+o.i))+'</p>';
        var load=document.createElement('button');
        load.className='x'; load.type='button'; load.textContent='LOAD';
        function activate(){trilyvaLoadLibraryCode(x.title,x.code).catch(function(e){$('#stMsg').textContent='Library load failed · '+String(e.message||e);});}
        it.onclick=function(ev){if(ev.target===load||load.contains(ev.target))return;activate();};
        it.onkeydown=function(ev){if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();activate();}};
        load.onclick=function(ev){ev.preventDefault();ev.stopPropagation();activate();};
        it.append(text,load);
        frag.appendChild(it);
      });
      list.replaceChildren(frag);
    }

    async function loadActive(){
      if(!active){
        list.innerHTML='<div class="empty">NO LIBRARIES REGISTERED</div>';
        return;
      }
      list.innerHTML='<div class="empty">LOADING '+trilyvaLibraryEscape(active.title)+'…</div>';
      search.value='';
      try{
        data=await active.load();
        loaded=true;
        render();
      }catch(e){
        loaded=false;
        list.innerHTML='<div class="empty">LIBRARY LOAD FAILED<br><br>'+trilyvaLibraryEscape(e.message)+'</div>';
      }
    }

    search.oninput=function(){if(loaded)render();};
    setTabs();
    loadActive();
  }).catch(function(e){
    body.innerHTML='<div class="empty">LIBRARY INDEX FAILED<br><br>'+trilyvaLibraryEscape(e.message)+'</div>';
  });
}

/* ============================================================
   State
   ============================================================ */
var S = {
  id: null, name: 'Untitled', version: 1, dirty: false,
  code: '', comp: null, meta: null, assets: [],
  frame: 0, playing: false, loopPlayback: true,
  compiled: false, lastError: null, hash: '',
  previewBusy: false, previewFps: 0, previewRaster: { w: 0, h: 0, s: 1 },
  compareMode: false, compareSplit: 0.5, compareBitmap: null,
  rendering: false, queue: [], results: [], caps: {}, stage: 'IDLE',
  exportFormat: 'mp4', quality: 'standard', timebase: 'ms', checksums: true, pngTarget: 'zip', customBitrateMbps: 25
};

var STAGES = ['IDLE', 'VALIDATING', 'PREPARING', 'ANALYSING', 'RENDERING', 'ENCODING', 'FINALISING', 'VERIFYING', 'COMPLETE'];
function setStage(name, err) {
  S.stage = name;
  var strip = $('#strip');
  strip.innerHTML = '';
  var idx = STAGES.indexOf(name);
  STAGES.forEach(function (st, i) {
    if (i) strip.appendChild(el('span', 'st-sep'));
    var d = el('span', 'st');
    d.appendChild(el('i'));
    d.appendChild(el('span', null, st));
    if (err && i === idx) d.className = 'st err';
    else if (i < idx) d.className = 'st done';
    else if (i === idx) d.className = 'st on';
    strip.appendChild(d);
  });
  if (err) {
    var e2 = el('span', 'st err'); e2.appendChild(el('i')); e2.appendChild(el('span', null, 'ERROR'));
    strip.appendChild(el('span', 'st-sep')); strip.appendChild(e2);
  }
}

function markDirty(v) {
  S.dirty = v !== false;
  $('#projWrap').classList.toggle('dirty', S.dirty);
}

function defaultMeta() {
  return {
    title: 'Untitled', creator: 'Tamasrazim', composition: 'Comp 1', description: '',
    language: 'en', software: SOFTWARE, softwareVersion: APP_VERSION,
    created: new Date().toISOString(), modified: new Date().toISOString(), sourceHash: ''
  };
}

/* ============================================================
   Editor
   ============================================================ */
var Ed = {
  ta: null, hl: null, gutter: null, nums: null, curMark: null, errMark: null,
  lineH: 19, chW: 7.2, undo: [], redo: [], lastSnap: 0, hlOn: true, errLine: null,
  matches: [], matchIdx: -1
};

var KEYWORDS = /^(const|let|var|function|return|if|else|for|while|do|break|continue|new|class|extends|super|typeof|instanceof|of|in|null|undefined|true|false|this|switch|case|default|try|catch|finally|throw|yield|async|await|delete|void|static|get|set)$/;
var APIWORDS = /^(motion|ctx|TAU|PI|Math|lerp|clamp|map|mix|smoothstep|smootherstep|ease|easings|spring|noise|fbm|random|randomRange|randomInt|pick|wrap|pingpong|renderFrame|setup|window)$/;
var TOKEN = /(\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|`(?:[^`\\]|\\.)*`?)|(\b0[xX][0-9a-fA-F]+\b|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_$][\w$]*)(\s*\()?|([{}()[\];,.:+\-*/%<>=!&|?~^]+)/g;

function highlight(code) {
  var out = '', last = 0, m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code))) {
    if (m.index > last) out += esc(code.slice(last, m.index));
    if (m[1]) out += '<span class="tk-com">' + esc(m[1]) + '</span>';
    else if (m[2]) out += '<span class="tk-str">' + esc(m[2]) + '</span>';
    else if (m[3]) out += '<span class="tk-num">' + esc(m[3]) + '</span>';
    else if (m[4]) {
      var w = m[4], cls = KEYWORDS.test(w) ? 'tk-key' : APIWORDS.test(w) ? 'tk-api' : (m[5] ? 'tk-fn' : '');
      out += (cls ? '<span class="' + cls + '">' + esc(w) + '</span>' : esc(w)) + (m[5] ? esc(m[5]) : '');
    }
    else if (m[6]) out += '<span class="tk-pun">' + esc(m[6]) + '</span>';
    last = m.index + m[0].length;
  }
  out += esc(code.slice(last));
  return out;
}

function edLines() { return Ed.ta.value.split('\n'); }
function edCaretLine() {
  var v = Ed.ta.value.slice(0, Ed.ta.selectionStart);
  var l = v.split('\n');
  return { line: l.length, col: l[l.length - 1].length + 1 };
}
function edLayout() {
  var lines = edLines(), n = lines.length, maxLen = 0;
  for (var i = 0; i < n; i++) if (lines[i].length > maxLen) maxLen = lines[i].length;
  Ed.nums.textContent = Array.from({ length: n }, function (_, i) { return i + 1; }).join('\n');
  var h = n * Ed.lineH;
  Ed.ta.style.height = h + 'px';
  Ed.hl.style.minHeight = h + 'px';
  $('#edbox').style.minWidth = Math.max(40, maxLen * Ed.chW + 34) + 'px';
  $('#edLines').textContent = n + (n === 1 ? ' line' : ' lines');
  $('#edBytes').textContent = fmtBytes(new Blob([Ed.ta.value]).size);
}
function edPaint() {
  var code = Ed.ta.value;
  Ed.hlOn = code.length < 260000;
  $('#edHl').textContent = Ed.hlOn ? 'highlight on' : 'highlight paused (large file)';
  Ed.hl.innerHTML = Ed.hlOn ? highlight(code) : esc(code);
  edLayout();
  edMarks();
}
function edMarks() {
  var c = edCaretLine();
  $('#edPos').textContent = c.line + ':' + c.col;
  Ed.curMark.style.top = ((c.line - 1) * Ed.lineH + 10) + 'px';
  if (Ed.errLine) {
    Ed.errMark.style.display = 'block';
    Ed.errMark.style.top = ((Ed.errLine - 1) * Ed.lineH + 10) + 'px';
  } else Ed.errMark.style.display = 'none';
}
var paintTimer = null;
function edChanged(immediate) {
  markDirty(true);
  edLayout();
  clearTimeout(paintTimer);
  if (immediate) edPaint();
  else paintTimer = setTimeout(edPaint, 110);
}
function edSnapshot(force) {
  var now = Date.now();
  if (!force && now - Ed.lastSnap < 500 && Ed.undo.length) { Ed.undo[Ed.undo.length - 1].v = Ed.ta.value; Ed.undo[Ed.undo.length - 1].s = Ed.ta.selectionStart; return; }
  Ed.lastSnap = now;
  Ed.undo.push({ v: Ed.ta.value, s: Ed.ta.selectionStart });
  if (Ed.undo.length > 220) Ed.undo.shift();
  Ed.redo.length = 0;
}
function edUndo() {
  if (Ed.undo.length < 2) return;
  var cur = Ed.undo.pop();
  Ed.redo.push(cur);
  var prev = Ed.undo[Ed.undo.length - 1];
  Ed.ta.value = prev.v; Ed.ta.selectionStart = Ed.ta.selectionEnd = prev.s;
  edChanged(true);
}
function edRedo() {
  if (!Ed.redo.length) return;
  var n = Ed.redo.pop();
  Ed.undo.push(n);
  Ed.ta.value = n.v; Ed.ta.selectionStart = Ed.ta.selectionEnd = n.s;
  edChanged(true);
}
function edInsert(text, selStart, selEnd) {
  var ta = Ed.ta, s = selStart === undefined ? ta.selectionStart : selStart, e = selEnd === undefined ? ta.selectionEnd : selEnd;
  edSnapshot(true);
  ta.setRangeText(text, s, e, 'end');
  edChanged(true);
}
function edSetValue(v) {
  Ed.ta.value = v; Ed.undo = [{ v: v, s: 0 }]; Ed.redo = [];
  Ed.ta.selectionStart = Ed.ta.selectionEnd = 0;
  edPaint();
}
function edGoToLine(n) {
  var lines = edLines(), pos = 0;
  for (var i = 0; i < Math.min(n - 1, lines.length); i++) pos += lines[i].length + 1;
  Ed.ta.focus();
  Ed.ta.selectionStart = Ed.ta.selectionEnd = pos;
  $('#edscroll').scrollTop = Math.max(0, (n - 4) * Ed.lineH);
  edMarks();
}

function analyzeSource() {
  showTab('p-render');
  showMobile('rail');
  identifyFrame();
}
function clearSource() {
  if (!Ed.ta) return;
  var hadCode = !!Ed.ta.value;
  if (!hadCode) {
    $('#stMsg').textContent = 'animation source is already empty';
    Ed.ta.focus();
    return;
  }
  edSnapshot(true);
  Ed.ta.value = '';
  Ed.ta.selectionStart = Ed.ta.selectionEnd = 0;
  S.compiled = false;
  S.lastError = null;
  edChanged(true);
  $('#edState').textContent = 'cleared — run to apply';
  $('#stMsg').textContent = 'animation source cleared';
  Ed.ta.focus();
}
async function pasteSource() {
  if (!Ed.ta) return;
  if (!navigator.clipboard || !navigator.clipboard.readText) {
    $('#stMsg').textContent = 'clipboard read is unavailable in this browser — use Ctrl+V / ⌘V';
    Ed.ta.focus();
    return;
  }
  try {
    var text = await navigator.clipboard.readText();
    if (!text) {
      $('#stMsg').textContent = 'clipboard is empty';
      Ed.ta.focus();
      return;
    }
    edInsert(text);
    $('#stMsg').textContent = 'pasted ' + text.length + ' characters';
    Ed.ta.focus();
    edMarks();
  } catch (e) {
    $('#stMsg').textContent = 'clipboard permission denied — use Ctrl+V / ⌘V';
    Ed.ta.focus();
  }
}
function initEditor() {
  Ed.ta = $('#ta'); Ed.hl = $('#hl'); Ed.gutter = $('#gutter');
  Ed.gutter.innerHTML = '';
  Ed.nums = document.createElement('pre');
  Ed.nums.style.cssText = 'margin:0;font:inherit;line-height:19px;white-space:pre;color:inherit';
  Ed.curMark = document.createElement('div');
  Ed.curMark.style.cssText = 'position:absolute;left:0;right:0;height:19px;background:rgba(255,255,255,.06);pointer-events:none';
  Ed.errMark = document.createElement('div');
  Ed.errMark.style.cssText = 'position:absolute;left:0;right:0;height:19px;background:#fff;opacity:.18;display:none;pointer-events:none';
  Ed.gutter.appendChild(Ed.curMark); Ed.gutter.appendChild(Ed.errMark); Ed.gutter.appendChild(Ed.nums);

  var probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;font-family:var(--mono);font-size:12px;white-space:pre';
  probe.textContent = '0123456789';
  document.body.appendChild(probe);
  Ed.chW = probe.getBoundingClientRect().width / 10 || 7.2;
  document.body.removeChild(probe);

  Ed.ta.addEventListener('input', function () { edSnapshot(); S.compiled = false; $('#edState').textContent = 'edited — run to apply'; edChanged(); });
  Ed.ta.addEventListener('keyup', edMarks);
  Ed.ta.addEventListener('click', edMarks);
  Ed.ta.addEventListener('scroll', function () { Ed.ta.scrollTop = 0; Ed.ta.scrollLeft = 0; });

  Ed.ta.addEventListener('keydown', function (ev) {
    var ta = Ed.ta, meta = ev.metaKey || ev.ctrlKey;
    if (meta && ev.key.toLowerCase() === 'z') { ev.preventDefault(); ev.shiftKey ? edRedo() : edUndo(); return; }
    if (meta && ev.key.toLowerCase() === 'y') { ev.preventDefault(); edRedo(); return; }
    if (meta && ev.key.toLowerCase() === 'f') { ev.preventDefault(); openFind(); return; }
    if (ev.key === 'Tab') {
      ev.preventDefault();
      var s = ta.selectionStart, e = ta.selectionEnd;
      if (s === e && !ev.shiftKey) { edInsert('  '); return; }
      var v = ta.value, ls = v.lastIndexOf('\n', s - 1) + 1;
      var block = v.slice(ls, e);
      var next = ev.shiftKey ? block.replace(/^ {1,2}/gm, '') : block.replace(/^/gm, '  ');
      edSnapshot(true);
      ta.setRangeText(next, ls, e, 'select');
      edChanged(true);
      return;
    }
    if (ev.key === 'Enter') {
      ev.preventDefault();
      var v2 = ta.value, s2 = ta.selectionStart;
      var lineStart = v2.lastIndexOf('\n', s2 - 1) + 1;
      var line = v2.slice(lineStart, s2);
      var ind = (line.match(/^[ \t]*/) || [''])[0];
      var extra = /[{([]\s*$/.test(line) ? '  ' : '';
      var closing = /^[ \t]*[}\])]/.test(v2.slice(s2));
      var ins = '\n' + ind + extra + (extra && closing ? '\n' + ind : '');
      edSnapshot(true);
      ta.setRangeText(ins, s2, ta.selectionEnd, 'end');
      if (extra && closing) ta.selectionStart = ta.selectionEnd = s2 + 1 + ind.length + 2;
      edChanged(true);
      return;
    }
    var pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
    if (pairs[ev.key] && ta.selectionStart === ta.selectionEnd) {
      var after = ta.value[ta.selectionStart] || '';
      if (!/[\w$]/.test(after)) {
        ev.preventDefault();
        var p = ta.selectionStart;
        edSnapshot(true);
        ta.setRangeText(ev.key + pairs[ev.key], p, p, 'end');
        ta.selectionStart = ta.selectionEnd = p + 1;
        edChanged(true);
        return;
      }
    }
    if ((ev.key === ')' || ev.key === ']' || ev.key === '}' || ev.key === '"' || ev.key === "'") &&
      ta.value[ta.selectionStart] === ev.key && ta.selectionStart === ta.selectionEnd) {
      ev.preventDefault(); ta.selectionStart = ta.selectionEnd = ta.selectionStart + 1; return;
    }
  });
}

/* ---- find / replace ---- */
function openFind() { $('#find').classList.remove('hide'); $('#findQ').focus(); $('#findQ').select(); runFind(); }
function closeFind() { $('#find').classList.add('hide'); Ed.ta.focus(); }
function runFind() {
  var q = $('#findQ').value;
  Ed.matches = [];
  if (q) {
    var v = Ed.ta.value, i = v.indexOf(q);
    while (i >= 0 && Ed.matches.length < 5000) { Ed.matches.push(i); i = v.indexOf(q, i + Math.max(1, q.length)); }
  }
  Ed.matchIdx = Ed.matches.length ? 0 : -1;
  $('#findCount').textContent = Ed.matches.length ? (Ed.matchIdx + 1) + '/' + Ed.matches.length : '0/0';
  if (Ed.matchIdx >= 0) selectMatch();
}
function selectMatch() {
  var q = $('#findQ').value, p = Ed.matches[Ed.matchIdx];
  Ed.ta.focus();
  Ed.ta.setSelectionRange(p, p + q.length);
  var line = Ed.ta.value.slice(0, p).split('\n').length;
  $('#edscroll').scrollTop = Math.max(0, (line - 6) * Ed.lineH);
  $('#findCount').textContent = (Ed.matchIdx + 1) + '/' + Ed.matches.length;
  edMarks();
}
function stepMatch(d) {
  if (!Ed.matches.length) return;
  Ed.matchIdx = (Ed.matchIdx + d + Ed.matches.length) % Ed.matches.length;
  selectMatch();
}

/* ============================================================
   Preview
   ============================================================ */
var view = $('#view'), vctx = view.getContext('2d', { alpha: true });
var cmpCanvas = $('#cmp'), cmpCtx = cmpCanvas.getContext('2d');
var fpsWin = [];

function computeRaster() {
  var c = S.comp;
  var stage = $('#stage').getBoundingClientRect();
  var availW = Math.max(120, stage.width - 36), availH = Math.max(80, stage.height - 36);
  var sel = $('#pvScale').value;
  var s;
  if (sel === 'auto') {
    s = Math.min(availW / c.width, availH / c.height, 1);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    s = Math.min(1, s * dpr);
    if (c.width * s > 2200) s = 2200 / c.width;
  } else s = Math.min(1, parseFloat(sel));
  var w = Math.max(2, Math.round(c.width * s)), h = Math.max(2, Math.round(c.height * s));
  S.previewRaster = { w: w, h: h, s: w / c.width };
  return S.previewRaster;
}
function sizeCanvasFrame() {
  var c = S.comp, r = S.previewRaster;
  if (view.width !== r.w || view.height !== r.h) { view.width = r.w; view.height = r.h; }
  var stage = $('#stage').getBoundingClientRect();
  var availW = Math.max(60, stage.width - 36), availH = Math.max(40, stage.height - 36);
  var fit = Math.min(availW / c.width, availH / c.height);
  var dw = Math.max(20, Math.round(c.width * fit)), dh = Math.max(20, Math.round(c.height * fit));
  var f = $('#canvasFrame');
  f.style.width = dw + 'px'; f.style.height = dh + 'px';
  view.style.width = dw + 'px'; view.style.height = dh + 'px';
  cmpCanvas.style.width = dw + 'px'; cmpCanvas.style.height = dh + 'px';
  f.classList.toggle('alpha', !!c.transparent);
  $('#hPres').textContent = r.w + '×' + r.h;
  $('#hEres').textContent = c.width + '×' + c.height;
}

function paintResult(r) {
  if (r.bitmap) {
    vctx.setTransform(1, 0, 0, 1, 0, 0);
    vctx.clearRect(0, 0, view.width, view.height);
    vctx.drawImage(r.bitmap, 0, 0);
    r.bitmap.close();
  } else if (r.canvas) {
    vctx.setTransform(1, 0, 0, 1, 0, 0);
    vctx.clearRect(0, 0, view.width, view.height);
    vctx.drawImage(r.canvas, 0, 0);
  }
  var t = performance.now();
  fpsWin.push(t);
  while (fpsWin.length && t - fpsWin[0] > 1000) fpsWin.shift();
  S.previewFps = fpsWin.length;
}

function requestPreview(force) {
  if (!S.compiled || S.previewBusy) return;
  if (!force && S.lastPainted === S.frame) return;
  var r = S.previewRaster;
  S.previewBusy = true;
  var want = S.frame;
  Engine.api.preview(want, r.w, r.h, r.s).then(function (res) {
    S.previewBusy = false;
    if (!res.ok) { showRuntimeError(res.error); return; }
    hideStageMsg();
    S.lastPainted = want;
    paintResult(res);
    if (S.playing || S.pendingPaint) { S.pendingPaint = false; requestPreview(); }
  }).catch(function (e) {
    S.previewBusy = false;
    showRuntimeError({ name: 'EngineError', message: String(e.message || e), stage: 'preview' });
  });
}

function showRuntimeError(err) {
  S.lastError = err;
  Ed.errLine = err.line || null; edMarks();
  var box = $('#stageMsg');
  var where = err.stage === 'render' ? 'RENDER ERROR' : err.stage === 'compile' ? 'COMPILE ERROR' : err.stage === 'contract' ? 'CONTRACT INCOMPLETE' : 'PREVIEW ERROR';
  var html = '<h5>' + where + '</h5>';
  html += '<div class="ln">' + esc(err.name + ': ' + err.message) + '</div>';
  var bits = [];
  if (err.line) bits.push('line ' + err.line + (err.column ? ':' + err.column : ''));
  if (err.frame !== undefined && err.frame !== null) bits.push('frame ' + err.frame);
  if (err.time !== undefined && err.time !== null) bits.push('t = ' + err.time.toFixed(3) + ' s');
  if (bits.length) html += '<div class="ln" style="margin-top:4px">' + bits.join('  ·  ') + '</div>';
  if (err.detail) html += '<div class="fix">' + esc(err.detail) + '</div>';
  if (err.hint) html += '<div class="fix">' + esc(err.hint) + '</div>';
  if (err.line) html += '<div class="fix"><button class="ib" data-act="gotoErr" style="width:auto;padding:0 8px;border:1px solid var(--rule-hi)">Go to line ' + err.line + '</button></div>';
  box.innerHTML = html;
  box.classList.add('on');
  $('#edState').textContent = 'error on line ' + (err.line || '?');
  $('#stMsg').textContent = err.name + ': ' + err.message;
}
function hideStageMsg() {
  $('#stageMsg').classList.remove('on');
  if (Ed.errLine) { Ed.errLine = null; edMarks(); }
  $('#stMsg').textContent = 'ready';
}

/* ---- playback ---- */
var rafId = null, playAnchor = 0, playFrom = 0;
function loopRange() {
  var c = S.comp;
  if (!c.loop) return { a: 0, b: c.frameCount };
  var n = Math.max(1, Math.round(c.loopDuration * c.fps / c.speed));
  return { a: 0, b: Math.min(c.frameCount, n) };
}
function tick() {
  if (!S.playing) return;
  var c = S.comp;
  var elapsed = (performance.now() - playAnchor) / 1000;
  var f = playFrom + Math.floor(elapsed * c.fps);
  var r = S.loopPlayback ? loopRange() : { a: 0, b: c.frameCount };
  if (f >= r.b) {
    if (S.loopPlayback) { f = r.a + ((f - r.a) % Math.max(1, r.b - r.a)); }
    else { f = c.frameCount - 1; setFrame(f); pause(); return; }
  }
  if (f !== S.frame) { S.frame = f; syncFrameUI(); requestPreview(); }
  else if (!S.previewBusy) requestPreview();
  rafId = requestAnimationFrame(tick);
}
function play() {
  if (!S.compiled) { run(); return; }
  S.playing = true; playAnchor = performance.now(); playFrom = S.frame;
  $$('[data-act=play]').forEach(function (b) { b.innerHTML = '<svg viewBox="0 0 16 16"><path d="M4 3h3v10H4zM9 3h3v10H9z"/></svg>'; b.setAttribute('aria-label', 'Pause'); });
  rafId = requestAnimationFrame(tick);
}
function pause() {
  S.playing = false;
  if (rafId) cancelAnimationFrame(rafId);
  $$('[data-act=play]').forEach(function (b) { b.innerHTML = '<svg viewBox="0 0 16 16"><path d="M4 3l9 5-9 5z"/></svg>'; b.setAttribute('aria-label', 'Play'); });
}
function togglePlay() { S.playing ? pause() : play(); }
function setFrame(f, noPreview) {
  var c = S.comp;
  S.frame = Math.max(0, Math.min(c.frameCount - 1, Math.round(f)));
  if (S.playing) { playAnchor = performance.now(); playFrom = S.frame; }
  syncFrameUI();
  if (!noPreview) requestPreview();
}

function syncFrameUI() {
  var c = S.comp, f = S.frame;
  var t = CORE.frameToTime(c, f), st = CORE.frameToSourceTime(c, f);
  $('#hFrame').textContent = f;
  $('#hTime').textContent = st.toFixed(3);
  $('#hPfps').textContent = S.previewFps;
  $('#hCfps').textContent = c.fps;
  $('#tFrame').textContent = f;
  $('#tTotal').textContent = c.frameCount;
  $('#tTime').textContent = st.toFixed(3);
  $('#tTc').textContent = timecode(f, c.fps);
  $('#tAnim').textContent = t.toFixed(3);
  var track = $('#track');
  var w = track.clientWidth;
  $('#ph').style.transform = 'translateX(' + (f / c.frameCount * w) + 'px)';
  track.setAttribute('aria-valuenow', f);
  track.setAttribute('aria-valuemax', c.frameCount - 1);
  track.setAttribute('aria-valuetext', 'frame ' + f + ', ' + st.toFixed(3) + ' seconds');
  $('#stFrames').textContent = f + ' / ' + c.frameCount;
  if (S.compareMode) updateCompare();
}

/* ---- timeline ruler ---- */
function drawRuler() {
  var track = $('#track'), cv = $('#ruler');
  var w = track.clientWidth, h = track.clientHeight;
  if (!w || !h) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  var g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  var c = S.comp, dur = c.frameCount / c.fps;
  var steps = [1 / c.fps, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  var step = steps[steps.length - 1];
  for (var i = 0; i < steps.length; i++) { if (dur / steps[i] <= Math.max(6, w / 64)) { step = steps[i]; break; } }
  g.font = '9px ui-monospace, monospace';
  g.textBaseline = 'top';
  var framePx = w / c.frameCount;
  if (framePx > 5) {
    g.strokeStyle = 'rgba(255,255,255,.05)';
    g.beginPath();
    for (var f = 0; f <= c.frameCount; f++) { var x = Math.round(f * framePx) + .5; g.moveTo(x, h - 6); g.lineTo(x, h); }
    g.stroke();
  }
  for (var t = 0; t <= dur + 1e-6; t += step) {
    var x2 = Math.round(t / dur * w) + .5;
    g.strokeStyle = 'rgba(255,255,255,.22)';
    g.beginPath(); g.moveTo(x2, 0); g.lineTo(x2, h * .38); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.45)';
    var label = step >= 1 ? t.toFixed(0) + 's' : t.toFixed(2) + 's';
    if (x2 + 28 < w) g.fillText(label, x2 + 3, 3);
  }
  g.strokeStyle = 'rgba(255,255,255,.1)';
  g.beginPath(); g.moveTo(0, h * .5 + .5); g.lineTo(w, h * .5 + .5); g.stroke();
  var band = $('#loopband');
  if (c.loop) {
    var r = loopRange();
    band.classList.add('on');
    band.style.left = (r.a / c.frameCount * w) + 'px';
    band.style.width = ((r.b - r.a) / c.frameCount * w) + 'px';
  } else band.classList.remove('on');
}

function initTimeline() {
  var track = $('#track'), dragging = false;
  function frameAt(ev) {
    var b = track.getBoundingClientRect();
    var x = (ev.clientX !== undefined ? ev.clientX : (ev.touches && ev.touches[0].clientX)) - b.left;
    var p = Math.max(0, Math.min(1, x / b.width));
    return Math.min(S.comp.frameCount - 1, Math.floor(p * S.comp.frameCount));
  }
  track.addEventListener('pointerdown', function (ev) {
    dragging = true; track.setPointerCapture(ev.pointerId);
    $('#ph').classList.add('scrub');
    var t0 = performance.now();
    setFrame(frameAt(ev));
    $('#tSeekMs').textContent = (performance.now() - t0).toFixed(1) + ' ms';
  });
  track.addEventListener('pointermove', function (ev) { if (dragging) setFrame(frameAt(ev)); });
  track.addEventListener('pointerup', function () { dragging = false; $('#ph').classList.remove('scrub'); });
  track.addEventListener('pointercancel', function () { dragging = false; $('#ph').classList.remove('scrub'); });
  track.addEventListener('keydown', function (ev) {
    var k = ev.key;
    if (k === 'ArrowLeft') { setFrame(S.frame - (ev.shiftKey ? S.comp.fps : 1)); ev.preventDefault(); }
    if (k === 'ArrowRight') { setFrame(S.frame + (ev.shiftKey ? S.comp.fps : 1)); ev.preventDefault(); }
    if (k === 'Home') { setFrame(0); ev.preventDefault(); }
    if (k === 'End') { setFrame(S.comp.frameCount - 1); ev.preventDefault(); }
  });
}

/* ---- compare preview vs export ---- */
function updateCompare() {
  if (!S.compareBitmap) return;
  cmpCanvas.width = view.width; cmpCanvas.height = view.height;
  cmpCtx.setTransform(1, 0, 0, 1, 0, 0);
  cmpCtx.clearRect(0, 0, cmpCanvas.width, cmpCanvas.height);
  cmpCtx.save();
  cmpCtx.beginPath();
  cmpCtx.rect(cmpCanvas.width * S.compareSplit, 0, cmpCanvas.width, cmpCanvas.height);
  cmpCtx.clip();
  cmpCtx.drawImage(S.compareBitmap, 0, 0, cmpCanvas.width, cmpCanvas.height);
  cmpCtx.restore();
  view.style.clipPath = 'inset(0 ' + ((1 - S.compareSplit) * 100) + '% 0 0)';
  $('#cmpLine').style.left = (S.compareSplit * 100) + '%';
}
function toggleCompare() {
  S.compareMode = !S.compareMode;
  $('#cmpBtn').classList.toggle('act', S.compareMode);
  $('#cmpLine').style.display = S.compareMode ? 'block' : 'none';
  if (!S.compareMode) {
    view.style.clipPath = '';
    cmpCtx.clearRect(0, 0, cmpCanvas.width, cmpCanvas.height);
    if (S.compareBitmap && S.compareBitmap.close) S.compareBitmap.close();
    S.compareBitmap = null;
    return;
  }
  refreshCompare();
}
function refreshCompare() {
  if (!S.compareMode || !S.compiled) return;
  var c = S.comp;
  Engine.api.renderOne(S.frame, c.width, c.height).then(function (r) {
    if (!r.ok) { showRuntimeError(r.error); return; }
    if (S.compareBitmap && S.compareBitmap.close) S.compareBitmap.close();
    if (r.bitmap) S.compareBitmap = r.bitmap;
    else { var cc = document.createElement('canvas'); cc.width = r.canvas.width; cc.height = r.canvas.height; cc.getContext('2d').drawImage(r.canvas, 0, 0); S.compareBitmap = cc; }
    updateCompare();
    $('#stMsg').textContent = 'compare: left = preview raster ' + S.previewRaster.w + '×' + S.previewRaster.h + ', right = export raster ' + c.width + '×' + c.height;
  });
}

/* ============================================================
   Panels — rail tabs and mobile sections
   ============================================================ */
var TABS = [
  ['p-comp', 'COMP'], ['p-time', 'LOOP · TIME'], ['p-meta', 'METADATA'],
  ['p-render', 'RENDER'], ['p-queue', 'QUEUE'], ['p-diag', 'DIAGNOSTICS'], ['p-docs', 'DOCS']
];
function initTabs() {
  var host = $('#tabs');
  host.innerHTML = '';
  TABS.forEach(function (t) {
    var b = el('button', null, t[1]);
    b.setAttribute('role', 'tab');
    b.dataset.tab = t[0];
    b.addEventListener('click', function () { showTab(t[0]); });
    host.appendChild(b);
  });
  showTab('p-comp');

  var mt = $('#mtabs');
  mt.innerHTML = '';
  [['preview', 'PREVIEW'], ['code', 'CODE'], ['time', 'TIMELINE'], ['rail', 'PANELS']].forEach(function (m) {
    var b = el('button', null, m[1]);
    b.dataset.m = m[0];
    b.addEventListener('click', function () { showMobile(m[0]); });
    mt.appendChild(b);
  });
  showMobile('preview');
}
function showTab(id) {
  $$('#tabs button').forEach(function (b) {
    var on = b.dataset.tab === id;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  $$('#railBody .panel').forEach(function (p) { p.classList.toggle('on', p.id === id); });
  S.tab = id;
  if (id === 'p-diag') refreshDiag();
}
function showMobile(m) {
  S.mobileSection = m;
  $$('[data-m]').forEach(function (p) { p.classList.toggle('mon', p.dataset.m === m); });
  $$('#mtabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.m === m); });
  if (m === 'preview') { computeRaster(); sizeCanvasFrame(); requestPreview(true); }
  if (m === 'time') drawRuler();
  if (m === 'code') edLayout();
}

/* small helpers */
function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; if (b) for (k in b) if (b[k] !== undefined) o[k] = b[k]; return o; }
function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
function buildSeg(host, items, onPick) {
  host.innerHTML = '';
  items.forEach(function (it) {
    var b = el('button', null, it.label);
    b.dataset.v = String(it.value);
    if (it.title) b.title = it.title;
    if (it.disabled) { b.disabled = true; b.style.opacity = '.4'; b.style.cursor = 'not-allowed'; }
    b.addEventListener('click', function () { if (!b.disabled) onPick(it.value, it); });
    host.appendChild(b);
  });
}
function segMark(host, value) {
  $$('button', host).forEach(function (b) { b.classList.toggle('on', b.dataset.v === String(value)); });
}

/* ============================================================
   Composition panel
   ============================================================ */
var RES_PRESETS = [
  { label: '720p', value: '1280x720' }, { label: '1080p', value: '1920x1080' },
  { label: '1440p', value: '2560x1440' }, { label: '4K', value: '3840x2160' },
  { label: '8K', value: '7680x4320' }, { label: '16K', value: '15360x8640' },
  { label: '1:1', value: '1080x1080' }, { label: '9:16', value: '1080x1920' }
];
var FPS_PRESETS = [24, 30, 60, 90, 120, 144, 165, 180, 240];
var DUR_PRESETS = [4, 10, 15, 20, 30, 60];
var LOOPDUR_PRESETS = [2, 4, 5, 6, 8, 10, 15, 20, 30, 60];
var SPEED_PRESETS = [0.25, 0.5, 1, 2, 4];

function initComp() {
  buildSeg($('#segRes'), RES_PRESETS, function (v) {
    var p = v.split('x');
    applyComp({ width: +p[0], height: +p[1] });
  });
  buildSeg($('#segFps'), FPS_PRESETS.map(function (f) { return { label: f + '', value: f }; }), function (v) { applyComp({ fps: v }); });
  buildSeg($('#segDur'), DUR_PRESETS.map(function (d) { return { label: d + 's', value: d }; }), function (v) { applyComp({ duration: v }); });
  buildSeg($('#segLoopDur'), LOOPDUR_PRESETS.map(function (d) { return { label: d + 's', value: d }; }), function (v) { applyComp({ loopDuration: v }); });
  buildSeg($('#segSpeed'), SPEED_PRESETS.map(function (s) { return { label: s + '×', value: s }; }), function (v) { applyComp({ speed: v }); });

  $$('#segBg button').forEach(function (b) {
    b.addEventListener('click', function () { applyComp({ transparent: b.dataset.bg === 'transparent' }); });
  });
  $$('#segLoop button').forEach(function (b) {
    b.addEventListener('click', function () { applyComp({ loop: b.dataset.loop === '1' }); });
  });

  function numField(sel, key, opts) {
    var inp = $(sel);
    inp.addEventListener('change', function () {
      var v = parseFloat(inp.value);
      if (!isFinite(v)) { syncCompUI(); return; }
      if (opts && opts.min !== undefined) v = Math.max(opts.min, v);
      if (opts && opts.max !== undefined) v = Math.min(opts.max, v);
      var patch = {}; patch[key] = v; applyComp(patch);
    });
  }
  numField('#cW', 'width', { min: 2, max: 16384 });
  numField('#cH', 'height', { min: 2, max: 16384 });
  numField('#cFps', 'fps', { min: 1, max: 240 });
  numField('#cDur', 'duration', { min: 0.05, max: 3600 });
  numField('#cLoopDur', 'loopDuration', { min: 0.05, max: 3600 });
  numField('#cSpeed', 'speed', { min: 0.01, max: 16 });
  numField('#cSeed', 'seed', {});
  $('#cBgColor').addEventListener('change', function () { applyComp({ background: $('#cBgColor').value.trim() || '#000000' }); });
  $('#cReverse').addEventListener('change', function () { applyComp({ reverse: $('#cReverse').checked }); });
  $('#pvScale').addEventListener('change', function () { computeRaster(); sizeCanvasFrame(); requestPreview(true); });
}

function applyComp(patch) {
  var before = S.comp;
  S.comp = CORE.composition(merge(S.comp, patch));
  if (S.frame > S.comp.frameCount - 1) S.frame = S.comp.frameCount - 1;
  syncCompUI();
  computeRaster();
  sizeCanvasFrame();
  drawRuler();
  syncFrameUI();
  markDirty();
  if (!Engine.api) return;
  Engine.api.setComposition(S.comp);
  S.lastPainted = -1;
  requestPreview(true);
  if (S.compareMode) refreshCompare();
  var sizeChanged = before.width !== S.comp.width || before.height !== S.comp.height;
  if (sizeChanged) $('#stMsg').textContent = 'composition is now ' + S.comp.width + '×' + S.comp.height + ' — export raster changed, preview raster follows the scale setting';
}

function syncCompUI() {
  var c = S.comp;
  segMark($('#segRes'), c.width + 'x' + c.height);
  segMark($('#segFps'), c.fps);
  segMark($('#segDur'), +c.duration.toFixed(6));
  segMark($('#segLoopDur'), +c.loopDuration.toFixed(6));
  segMark($('#segSpeed'), c.speed);
  $$('#segBg button').forEach(function (b) { b.classList.toggle('on', (b.dataset.bg === 'transparent') === !!c.transparent); });
  $$('#segLoop button').forEach(function (b) { b.classList.toggle('on', (b.dataset.loop === '1') === !!c.loop); });

  $('#cW').value = c.width; $('#cH').value = c.height;
  $('#cFps').value = c.fps; $('#cDur').value = +c.duration.toFixed(4);
  $('#cLoopDur').value = +c.loopDuration.toFixed(4);
  $('#cSpeed').value = c.speed; $('#cSeed').value = c.seed;
  $('#cBgColor').value = c.background;
  $('#cReverse').checked = !!c.reverse;
  $('#cBgColor').parentNode.style.opacity = c.transparent ? '.4' : '1';
  $('#cBgColor').disabled = !!c.transparent;

  var g = gcd(c.width, c.height) || 1;
  $('#cAspect').textContent = (c.width / g) + ':' + (c.height / g) + ' · ' + c.aspect.toFixed(4);
  $('#cMp').textContent = (c.width * c.height / 1e6).toFixed(2) + ' MP';
  $('#cFrames').textContent = c.frameCount;
  $('#cLast').textContent = (c.frameCount - 1) + ' @ ' + ((c.frameCount - 1) / c.fps).toFixed(3) + ' s';
  $('#cOut').textContent = (c.frameCount / c.fps).toFixed(3) + ' s';

  var loopFrames = Math.max(1, Math.round(c.loopDuration * c.fps / c.speed));
  $('#cCycles').textContent = c.loop
    ? (c.frameCount / loopFrames).toFixed(2) + ' × ' + loopFrames + ' frames'
    : 'loop off';
  $('#rmA').textContent = 't = ' + CORE.frameToTime(c, 0).toFixed(3);
  $('#rmB').textContent = 't = ' + CORE.frameToTime(c, c.frameCount - 1).toFixed(3) +
    (c.reverse ? ' (reversed)' : '') + (c.speed !== 1 ? ' · ' + c.speed + '×' : '');
  $('#rdSpeed').textContent = c.speed + '×' + (c.reverse ? ' rev' : '');
  $('#hLoop').textContent = c.loop ? 'LOOP ' + c.loopDuration.toFixed(2) + 's' : 'LOOP OFF';
  $('#hLoop').style.color = c.loop ? '#fff' : '';
  $('#tRange').textContent = '0 → ' + ((c.frameCount - 1) / c.fps).toFixed(3) + ' s';
  $('#tComp').textContent = c.width + '×' + c.height + ' · ' + c.fps + ' fps · ' + (c.frameCount / c.fps).toFixed(2) + ' s';
  $('#tTotal').textContent = c.frameCount;
  $('#hCfps').textContent = c.fps;
  $('#stFrames').textContent = S.frame + ' / ' + c.frameCount;
  syncFileName();
  syncMetaSupport();
  if (typeof refreshMedia === 'function') refreshMedia();
}

/* ============================================================
   Loop seam analyser
   ============================================================ */
function analyseLoop() {
  var box = $('#loopResult');
  box.innerHTML = '<div class="note">measuring frame 0 against the wrap frame…</div>';
  withCompiled().then(function (ok) {
    if (!ok) { box.innerHTML = '<div class="warnbox"><b>Contract invalid</b>The animation does not compile, so there is nothing to compare.</div>'; return null; }
    return Engine.api.loopSeam(buildJob());
  }).then(function (r) {
    if (!r) return;
    if (!r.ok) { box.innerHTML = '<div class="warnbox"><b>Could not analyse</b>' + esc(r.error.name + ': ' + r.error.message) + '</div>'; return; }
    var verdictText = {
      MATCH: 'The wrap frame is pixel-identical to frame 0 at the sampled resolution. This loop is seamless.',
      CLOSE: 'The wrap frame is close to frame 0 but not identical. A soft seam may be visible on flat areas.',
      MISMATCH: 'The wrap frame is clearly different from frame 0. This animation does not loop on its own — it needs periodic maths, not a shorter duration.'
    }[r.verdict];
    var html = '<dl class="kv">';
    html += '<dt>Verdict</dt><dd class="' + (r.verdict === 'MATCH' ? 'ok' : r.verdict === 'CLOSE' ? 'warn' : 'no') + '">' + r.verdict + '</dd>';
    html += '<dt>Compared</dt><dd>frame 0 ↔ frame ' + r.wrapFrame + '</dd>';
    html += '<dt>Loop length</dt><dd>' + r.loopFrames + ' frames</dd>';
    html += '<dt>Seam difference</dt><dd>' + (r.seamDiff * 100).toFixed(4) + ' %</dd>';
    if (r.neighbourDiff !== null && r.neighbourDiff !== undefined)
      html += '<dt>Frame-to-frame change</dt><dd>' + (r.neighbourDiff * 100).toFixed(4) + ' %</dd>';
    html += '</dl><p class="note">' + verdictText + ' Measured on a 160 px render of both frames — it proves a mismatch, and a match at that scale is strong evidence, not a formal proof.</p>';
    box.innerHTML = html;
  }).catch(function (e) {
    box.innerHTML = '<div class="warnbox"><b>Analyser failed</b>' + esc(String(e.message || e)) + '</div>';
  });
}

/* ============================================================
   Metadata panel
   ============================================================ */
function initMeta() {
  [['#mTitle', 'title'], ['#mCreator', 'creator'], ['#mComp', 'composition'],
  ['#mDesc', 'description'], ['#mLang', 'language']].forEach(function (p) {
    $(p[0]).addEventListener('input', function () {
      S.meta[p[1]] = $(p[0]).value;
      S.meta.modified = new Date().toISOString();
      markDirty();
      if (p[1] === 'title') syncFileName();
    });
  });
}
function syncMetaUI() {
  $('#mTitle').value = S.meta.title;
  $('#mCreator').value = S.meta.creator;
  $('#mComp').value = S.meta.composition;
  $('#mDesc').value = S.meta.description;
  $('#mLang').value = S.meta.language;
  $('#mSoft').textContent = S.meta.software;
  $('#mVer').textContent = S.meta.softwareVersion;
  $('#mLines').textContent = S.code.split('\n').length;
  $('#mHash').textContent = S.hash || '— run the code to hash it —';
  syncMetaSupport();
}

/* Honest per-format metadata table. WebM rows mirror exactly what the muxer writes. */
function metaRows(fmt) {
  if (fmt === 'mp4') return [
    ['Project name', 'EMBEDDED', 'udta \u25B8 meta \u25B8 ilst \u25B8 \u00A9nam'],
    ['Creator', 'EMBEDDED', '\u00A9ART atom'],
    ['Description', 'EMBEDDED', '\u00A9cmt atom'],
    ['Software + version', 'EMBEDDED', '\u00A9too atom'],
    ['Render date', 'EMBEDDED', '\u00A9day atom'],
    ['Resolution', 'EMBEDDED', 'tkhd width/height and the avc1 sample entry'],
    ['Frame rate', 'EMBEDDED', 'mdhd timescale with a constant stts delta'],
    ['Duration', 'EMBEDDED', 'mvhd and mdhd duration'],
    ['Frame count', 'EMBEDDED', 'stsz / stts sample count'],
    ['Codec configuration', 'EMBEDDED', 'avcC, written verbatim from the encoder'],
    ['Keyframes', 'EMBEDDED', 'stss sync sample table'],
    ['Pixel aspect ratio', 'EMBEDDED', 'pasp box, 1:1'],
    ['Source SHA-256', 'EMBEDDED', 'freeform ---- atom, SOURCE_SHA256'],
    ['Loop, seed, time rate', 'EMBEDDED', 'freeform ---- atoms'],
    ['Codec string', 'EMBEDDED', 'freeform ---- atom, CODEC'],
    ['Colour space', 'UNSUPPORTED', 'no colr box is written \u2014 this pipeline cannot honestly declare a matrix or transfer function'],
    ['Composition name', 'PROJECT-ONLY', 'no track name box is written'],
    ['Created / modified dates', 'PROJECT-ONLY', '.tmotion file; mvhd creation time is left at zero rather than guessed']
  ];
  if (fmt === 'webm') return [
    ['Project name', 'EMBEDDED', 'Info › Title, and a TITLE tag'],
    ['Creator', 'EMBEDDED', 'ARTIST tag'],
    ['Description', 'EMBEDDED', 'DESCRIPTION tag'],
    ['Software + version', 'EMBEDDED', 'MuxingApp / WritingApp, and an ENCODER tag'],
    ['Composition name', 'EMBEDDED', 'Track › Name'],
    ['Resolution', 'EMBEDDED', 'Video › PixelWidth / PixelHeight'],
    ['Frame rate', 'EMBEDDED', 'Track › DefaultDuration (1 / fps in ns)'],
    ['Duration', 'EMBEDDED', 'Info › Duration, written after the last frame'],
    ['Frame count', 'EMBEDDED', 'FRAME_COUNT tag, and countable as blocks'],
    ['Source SHA-256', 'EMBEDDED', 'SOURCE_SHA256 tag'],
    ['Loop + loop length', 'EMBEDDED', 'LOOP / LOOP_DURATION tags'],
    ['Time rate + reverse', 'EMBEDDED', 'TIME_RATE / TIME_REVERSE tags'],
    ['Random seed', 'EMBEDDED', 'SEED tag'],
    ['Render date', 'EMBEDDED', 'DATE_ENCODED tag'],
    ['Colour space', 'UNSUPPORTED', 'no Colour element is written — this pipeline cannot honestly declare a matrix or transfer function'],
    ['Pixel aspect ratio', 'PROJECT-ONLY', 'always 1.00 here; no DisplayWidth override is written'],
    ['Created / modified dates', 'PROJECT-ONLY', '.tmotion file']
  ];
  if (fmt === 'zip') return [
    ['Resolution', 'EMBEDDED', 'in every PNG header'],
    ['Frame numbering', 'EMBEDDED', 'the file names themselves'],
    ['Alpha channel', 'EMBEDDED', 'PNG RGBA when the background is transparent'],
    ['Everything else', 'PROJECT-ONLY', 'manifest.json inside the archive: composition, loop, time model, metadata, source hash and per-frame checksums'],
    ['Frame rate', 'PROJECT-ONLY', 'a PNG sequence has no timebase — manifest.json and README.txt carry it'],
    ['Colour space', 'UNSUPPORTED', 'no ICC or cICP chunk is written; the canvas encodes untagged sRGB']
  ];
  return [
    ['Resolution', 'EMBEDDED', 'in every PNG header'],
    ['Frame numbering', 'EMBEDDED', 'the file names themselves'],
    ['Everything else', 'PROJECT-ONLY', 'manifest.json written beside the frames'],
    ['Frame rate', 'PROJECT-ONLY', 'a folder of frames has no timebase'],
    ['Colour space', 'UNSUPPORTED', 'no ICC or cICP chunk is written']
  ];
}
function syncMetaSupport() {
  var dl = $('#metaSupport');
  dl.innerHTML = '';
  metaRows(S.exportFormat).forEach(function (r) {
    dl.appendChild(el('dt', null, r[0]));
    var dd = el('dd', r[1] === 'EMBEDDED' ? 'ok' : r[1] === 'UNSUPPORTED' ? 'no' : 'warn');
    dd.innerHTML = '<span class="tag ' + (r[1] === 'EMBEDDED' ? 'ok' : r[1] === 'UNSUPPORTED' ? 'no' : '') + '">' + r[1] + '</span> ' + esc(r[2]);
    dl.appendChild(dd);
  });
}
function metadataReceipt() {
  var c = S.comp;
  return {
    software: S.meta.software, softwareVersion: S.meta.softwareVersion,
    project: { name: S.name, version: S.version, id: S.id },
    title: S.meta.title, creator: S.meta.creator, compositionName: S.meta.composition,
    description: S.meta.description, language: S.meta.language,
    composition: {
      width: c.width, height: c.height, aspect: +c.aspect.toFixed(6),
      fps: c.fps, frameCount: c.frameCount, duration: +(c.frameCount / c.fps).toFixed(6),
      pixelAspect: 1, colorSpace: 'sRGB (untagged canvas output)',
      background: c.transparent ? 'transparent' : c.background, seed: c.seed
    },
    loop: { enabled: !!c.loop, duration: c.loopDuration, frames: Math.round(c.loopDuration * c.fps / c.speed) },
    timeModel: { frameTime: 'frame / fps', rate: c.speed, reverse: !!c.reverse },
    source: { language: 'JavaScript', lines: S.code.split('\n').length, sha256: S.hash || null },
    exportFormat: S.exportFormat,
    created: S.meta.created, modified: S.meta.modified
  };
}
function buildTags(comp, meta) {
  return [
    { name: 'TITLE', value: meta.title },
    { name: 'ARTIST', value: meta.creator },
    { name: 'DESCRIPTION', value: meta.description || '' },
    { name: 'ENCODER', value: meta.software + ' ' + meta.softwareVersion },
    { name: 'DATE_ENCODED', value: new Date().toISOString() },
    { name: 'SOURCE_SHA256', value: meta.sourceHash || 'not-hashed' },
    { name: 'FRAME_COUNT', value: comp.frameCount },
    { name: 'FRAME_RATE', value: comp.fps },
    { name: 'SEED', value: comp.seed },
    { name: 'LOOP', value: comp.loop ? 'yes' : 'no' },
    { name: 'LOOP_DURATION', value: comp.loop ? comp.loopDuration + ' s' : 'n/a' },
    { name: 'TIME_RATE', value: comp.speed },
    { name: 'TIME_REVERSE', value: comp.reverse ? 'yes' : 'no' }
  ].filter(function (t) { return String(t.value).length > 0; });
}

/* ============================================================
   Compile / run
   ============================================================ */
function run() {
  var cmp=$('#cmp'); if(cmp){var cc=cmp.getContext('2d'); if(cc) cc.clearRect(0,0,cmp.width,cmp.height);}

  S.code = Ed.ta.value;
  $('#edState').textContent = 'compiling…';
  setStage('VALIDATING');
  $('#stDot').className = 'dot busy';
  return Engine.api.compile(S.code, S.comp).then(function (res) {
    $('#stDot').className = 'dot ok';
    if (!res.ok) {
      S.compiled = false;
      $('#stContract').textContent = 'INVALID';
      showRuntimeError(res.error);
      setStage('IDLE', true);
      return res;
    }
    S.compiled = true;
    S.lastError = null;
    hideStageMsg();
    $('#stContract').textContent = 'VALID · ' + res.arity + ' arg' + (res.arity === 1 ? '' : 's');
    $('#edState').textContent = 'compiled · ' + new Date().toLocaleTimeString();
    setStage('IDLE');
    S.lastPainted = -1;
    requestPreview(true);
    if (S.compareMode) refreshCompare();
    return sha256(S.code).then(function (h) {
      S.hash = h; S.meta.sourceHash = h; syncMetaUI(); syncFileName();
      return res;
    });
  }).catch(function (e) {
    $('#stDot').className = 'dot';
    showRuntimeError({ name: 'EngineError', message: String(e.message || e), stage: 'compile', detail: 'The render engine did not answer. Reload the page to rebuild it.' });
    setStage('IDLE', true);
    return { ok: false };
  });
}
function withCompiled() {
  if (S.compiled && S.code === Ed.ta.value) return Promise.resolve(true);
  return run().then(function (r) { return !!(r && r.ok); });
}

/* ============================================================
   Render panel
   ============================================================ */
var FMT = [
  { label: 'MP4', value: 'mp4', title: 'H.264 through WebCodecs, muxed here into a real ISO-BMFF MP4' },
  { label: 'WebM', value: 'webm', title: 'VP9/VP8 through WebCodecs, muxed here into Matroska' },
  { label: 'PNG\u00B7ZIP', value: 'zip', title: 'Every frame as a PNG inside one archive' },
  { label: 'PNG\u00B7DIR', value: 'dir', title: 'Every frame written straight to a folder you choose' }
];
function requestedBitrate(width, height, fps) {
  var custom = Number(S.customBitrateMbps);
  if (isFinite(custom) && custom > 0) return custom * 1000000;
  return ENC.bitrateFor(width, height, fps, S.quality);
}
function initRenderPanel() {
  var dirOk = typeof window.showDirectoryPicker === 'function';
  buildSeg($('#segFmt'), FMT.map(function (f) {
    if (f.value === 'dir' && !dirOk) return merge(f, { disabled: true, title: 'This browser has no File System Access API' });
    return f;
  }), function (v) {
    S.exportFormat = v;
    segMark($('#segFmt'), v);
    $('#oTimebase').disabled = v !== 'webm';
    syncMetaSupport(); syncFileName(); refreshMedia(); markDirty();
  });
  segMark($('#segFmt'), S.exportFormat);
  $('#oQuality').value = S.quality;
  $('#oTimebase').value = S.timebase;
  $('#oChecksum').value = S.checksums ? 'on' : 'off';
  $('#oBitrate').value = S.customBitrateMbps;
  $('#oBitrate').value = Number.isFinite(Number(S.customBitrateMbps)) ? S.customBitrateMbps : 25;
  $('#oQuality').addEventListener('change', function () { S.quality = $('#oQuality').value; refreshMedia(); markDirty(); });
  $('#oBitrate').addEventListener('change', function () {
    var v = parseFloat($('#oBitrate').value);
    if (!isFinite(v) || v < 0) v = 0;
    v = Math.min(2000, v);
    S.customBitrateMbps = v;
    $('#oBitrate').value = v;
    refreshMedia(); markDirty();
  });
  $('#oTimebase').addEventListener('change', function () { S.timebase = $('#oTimebase').value; markDirty(); });
  $('#oChecksum').addEventListener('change', function () { S.checksums = $('#oChecksum').value === 'on'; markDirty(); });
  syncFileName();
}
function extFor(fmt) { return fmt === 'mp4' ? '.mp4' : fmt === 'webm' ? '.webm' : fmt === 'zip' ? '.zip' : '/'; }
function stampNow() {
  var d = new Date();
  return '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' +
    pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
}
function fileNameFor(comp, name, fmt, stamp) {
  if (fmt === 'mp4') return 'tamasrazim-animation-' + (stamp || stampNow()) + '.mp4';
  var secs = comp.frameCount / comp.fps;
  var dur = (Math.abs(secs - Math.round(secs)) < 1e-6) ? Math.round(secs) + 's' : secs.toFixed(2) + 's';
  return slugify(name || 'untitled') + '_' + comp.width + 'x' + comp.height + '_' + comp.fps + 'fps_' + dur + extFor(fmt);
}
function syncFileName() {
  if (!S.comp) return;
  $('#oName').textContent = fileNameFor(S.comp, S.meta ? (S.meta.title || S.name) : S.name, S.exportFormat, '<timestamp>');
}

/* ---------------- media status — driven by an actual encoder probe ---------------- */
var mediaSeq = 0;
function mediaRow(label, state, cls) {
  return '<div class="mrow"><b>' + esc(label) + '</b><em class="' + cls + '">' + esc(state) + '</em></div>';
}
function refreshMedia() {
  var box = $('#media'), c = S.comp, seq = ++mediaSeq;
  if (!box || !c) return;
  var fmt = S.exportFormat;
  if (fmt === 'zip' || fmt === 'dir') {
    var dirMissing = fmt === 'dir' && typeof window.showDirectoryPicker !== 'function';
    box.innerHTML = mediaRow('PNG', 'READY', 'ok') +
      mediaRow(fmt === 'zip' ? 'ZIP' : 'FOLDER', dirMissing ? 'UNAVAILABLE' : 'READY', dirMissing ? 'no' : 'ok') +
      '<small>Lossless frames, no encoder involved — this path works wherever canvas does.</small>';
    return;
  }
  box.innerHTML = mediaRow(fmt === 'mp4' ? 'H.264 / AVC' : 'VP9 / VP8', 'CHECKING', 'busy') +
    mediaRow(fmt === 'mp4' ? 'MP4' : 'WEBM', 'CHECKING', 'busy') +
    '<small>probing ' + c.width + ' \u00D7 ' + c.height + ' / ' + c.fps + ' fps against this browser\u2026</small>';
  if (fmt === 'webm') {
    ENC.probeEncoders(c.width, c.height, c.fps).then(function (p) {
      if (seq !== mediaSeq) return;
      box.innerHTML = mediaRow('VP9 / VP8', p.available ? 'READY' : 'UNAVAILABLE', p.available ? 'ok' : 'no') +
        mediaRow('WEBM', p.available ? 'READY' : 'UNAVAILABLE', p.available ? 'ok' : 'no') +
        '<small>' + esc(p.available ? p.supported[0].id + ' at ' + c.width + '\u00D7' + c.height + ' / ' + c.fps + ' fps' : p.reason) + '</small>';
    });
    return;
  }
  var br = requestedBitrate(c.width, c.height, c.fps);
  ENC.probeH264(c.width, c.height, c.fps, br).then(function (p) {
    if (seq !== mediaSeq) return;
    S.h264 = p;
    var head = mediaRow('H.264 / AVC', p.available ? 'READY' : 'UNAVAILABLE', p.available ? 'ok' : 'no') +
      mediaRow('MP4', p.available ? 'READY' : 'UNAVAILABLE', p.available ? 'ok' : 'no');
    if (p.available) {
      box.innerHTML = head + '<small>' + esc(p.selected.id + ' \u00B7 ' + p.selected.label + ' \u00B7 ' +
        c.width + '\u00D7' + c.height + ' / ' + c.fps + ' fps / ' + Math.round(p.bitrate / 1000) + ' kbps') + '</small>';
      return;
    }
    box.innerHTML = head + '<small>H.264 unavailable at ' + c.width + '\u00D7' + c.height + ' / ' + c.fps +
      ' FPS. ' + esc(p.reason) + '</small>';
    suggestH264(c).then(function (alts) {
      if (seq !== mediaSeq || !alts.length) return;
      var wrap = el('small');
      wrap.appendChild(document.createTextNode('Accepted by this browser: '));
      alts.forEach(function (a, i) {
        if (i) wrap.appendChild(document.createTextNode(' \u00B7 '));
        var b = el('button', 'btn', a.label);
        b.style.cssText = 'padding:2px 6px;font-size:9px;margin:2px 0';
        b.addEventListener('click', function () {
          applyComp(a.patch);
          if (a.probeBitrate) {
            S.customBitrateMbps = +(a.probeBitrate / 1000000).toFixed(1);
            $('#oBitrate').value = S.customBitrateMbps;
            markDirty();
            refreshMedia();
            $('#stMsg').textContent = 'H.264 fallback applied · ' + a.label;
          }
        });
        wrap.appendChild(b);
      });
      box.appendChild(wrap);
    });
  });
}
/* Only offers a fallback the browser has actually accepted — nothing is assumed.
   Fallback probes use a codec-safe bitrate ceiling so a high custom bitrate does
   not hide otherwise valid resolution / frame-rate alternatives. */
function suggestH264(c) {
  var tries = [];
  if (c.width > 1920) tries.push({ label: '1920×1080 / ' + c.fps + ' fps', w: 1920, h: 1080, fps: c.fps, patch: { width: 1920, height: 1080 } });
  if (c.fps > 30) tries.push({ label: c.width + '×' + c.height + ' / 30 fps', w: c.width, h: c.height, fps: 30, patch: { fps: 30 } });
  if (c.width > 1920 && c.fps > 30) tries.push({ label: '1920×1080 / 30 fps', w: 1920, h: 1080, fps: 30, patch: { width: 1920, height: 1080, fps: 30 } });
  if (c.width > 1280) tries.push({ label: '1280×720 / 30 fps', w: 1280, h: 720, fps: 30, patch: { width: 1280, height: 720, fps: 30 } });
  function fallbackBitrate(w, h, fps) {
    var auto = ENC.bitrateFor(w, h, fps, S.quality);
    var requested = requestedBitrate(w, h, fps);
    return Math.min(H264_L62_MAX_BITRATE, Math.max(500000, Math.min(requested, auto * 4)));
  }
  return Promise.all(tries.map(function (t) {
    return ENC.probeH264(t.w, t.h, t.fps, fallbackBitrate(t.w, t.h, t.fps))
      .then(function (p) {
        if (!p.available) return null;
        t.probeBitrate = p.bitrate;
        t.label += ' · ' + Math.round(p.bitrate / 1000000) + ' Mbps';
        return t;
      });
  })).then(function (rs) { return rs.filter(Boolean); });
}


var jobCounter = 0;
function newJobId() {
  var d = new Date();
  jobCounter++;
  return 'RND-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(jobCounter, 4);
}
/* A job is a frozen snapshot. Editing the project afterwards cannot reach it. */
function buildJob(over) {
  over = over || {};
  var comp = CORE.composition(merge(S.comp, over.composition));
  var meta = merge(S.meta, { slug: slugify(S.meta.title || S.name), sourceHash: S.hash });
  var fmt = over.exportFormat || S.exportFormat;
  var job = {
    id: newJobId(),
    label: S.meta.title || S.name,
    projectId: S.id, projectVersion: S.version,
    code: S.code,
    composition: comp,
    metadata: meta,
    format: fmt === 'mp4' ? 'mp4' : fmt === 'webm' ? 'webm' : 'png',
    target: fmt === 'dir' ? 'dir' : 'zip',
    exportFormat: fmt,
    quality: S.quality, timebase: S.timebase, checksums: S.checksums,
    bitrate: ENC.sanitiseBitrate(requestedBitrate(comp.width, comp.height, comp.fps), comp.width, comp.height, comp.fps),
    tags: buildTags(comp, meta),
    createdAt: new Date().toISOString(),
    test: over.test || null
  };
  job.fileName = fileNameFor(comp, meta.title || S.name, fmt, stampNow());
  return job;
}

/* ---------------- render log ---------------- */
function clearLog() { $('#log').innerHTML = ''; S.logLines = []; }
function logLine(msg, hi) {
  var t = S.renderStart ? (Date.now() - S.renderStart) : 0;
  var line = el('div', hi ? 'hi' : null);
  line.appendChild(el('time', null, fmtClock(t / 1000)));
  line.appendChild(el('span', null, msg));
  var box = $('#log');
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
  S.logLines = S.logLines || [];
  S.logLines.push(fmtClock(t / 1000) + '  ' + msg);
  while (box.childNodes.length > 400) box.removeChild(box.firstChild);
}

/* ---------------- analyse ---------------- */
function analyseJob() {
  var box = $('#analysis');
  box.innerHTML = '<div class="note">measuring…</div>';
  withCompiled().then(function (ok) {
    if (!ok) { box.innerHTML = '<div class="warnbox"><b>Contract invalid</b>The animation does not compile, so nothing can be analysed. Fix the error shown on the preview.</div>'; return; }
    var job = buildJob(), c = job.composition;
    setStage('ANALYSING');
    var probeTask = job.format === 'mp4'
      ? ENC.probeH264(c.width, c.height, c.fps, job.bitrate)
      : ENC.probeEncoders(c.width, c.height, c.fps);
    return probeTask.then(function (probe) {
      return Engine.api.timing(job, Math.min(8, c.frameCount)).then(function (t) {
        setStage('IDLE');
        var rows = [];
        var warn = [];
        rows.push(['Composition', c.width + ' × ' + c.height + ' · ' + c.aspect.toFixed(4)]);
        rows.push(['Frame rate', c.fps + ' fps']);
        rows.push(['Duration', (c.frameCount / c.fps).toFixed(3) + ' s']);
        rows.push(['Frames', c.frameCount + ' (0 … ' + (c.frameCount - 1) + ')']);
        rows.push(['Loop', c.loop ? 'yes · ' + c.loopDuration + ' s' : 'no']);
        rows.push(['Time model', 'frame / fps' + (c.speed !== 1 ? ' × ' + c.speed : '') + (c.reverse ? ' · reversed' : '')]);
        rows.push(['Background', c.transparent ? 'transparent (alpha kept)' : c.background]);
        rows.push(['Output', job.format === 'mp4' ? 'MP4 (ISO-BMFF) with an H.264 track'
          : job.format === 'webm' ? 'WebM' : (job.target === 'dir' ? 'PNG frames → folder' : 'PNG frames → ZIP')]);
        rows.push(['Render contract', 'VALID']);
        rows.push(['Engine', Engine.mode === 'worker' ? 'worker + OffscreenCanvas' : 'main thread (fallback)']);
        rows.push(['Worker', typeof Worker !== 'undefined' ? 'SUPPORTED' : 'MISSING']);
        rows.push(['OffscreenCanvas', typeof OffscreenCanvas !== 'undefined' ? 'SUPPORTED' : 'MISSING']);
        if (job.format === 'mp4') {
          rows.push(['H.264 encoder', probe.available ? probe.selected.id + ' · ' + probe.selected.label : 'NOT AVAILABLE']);
          rows.push(['Profiles accepted', probe.tried.filter(function (t) { return t.supported; }).length + ' of ' + probe.tried.length + ' probed']);
          rows.push(['Bitrate', Math.round(job.bitrate / 1000) + ' kbps (validated)']);
          rows.push(['Keyframe interval', Math.max(1, Math.round(c.fps * 2)) + ' frames · frame 0 is always a keyframe']);
          rows.push(['Muxer', 'ISO-BMFF written here — ftyp, mdat, moov with avcC, stts, stss, stsc, stsz, stco']);
          rows.push(['Media timescale', Math.round(c.fps * 1000) + ' ticks/s · every sample lasts exactly 1000']);
          rows.push(['Render target', Engine.mode === 'worker' ? 'OffscreenCanvas in the worker' : 'canvas#render-target in the document']);
          if (!probe.available) {
            warn.push('H.264 unavailable at ' + c.width + '×' + c.height + ' / ' + c.fps + ' FPS. ' + probe.reason);
            warn.push('The renderer itself is still valid at this composition. The codec probe blocks only this MP4 path; PNG sequence export remains available.');
            warn.push('Nothing will be written under a false name: pick a configuration the probe accepts, or export the PNG sequence and mux it with ffmpeg.');
          }
        } else if (job.format === 'webm') {
          rows.push(['Video encoder', probe.available ? probe.supported.map(function (s) { return s.label; }).join(', ') : 'NOT AVAILABLE']);
          if (!probe.available) warn.push('This browser cannot encode WebM at ' + c.width + '×' + c.height + ': ' + probe.reason + ' Render a PNG sequence instead.');
        } else {
          rows.push(['PNG encoder', 'canvas toBlob — always available']);
          if (job.target === 'zip') {
            var est = Math.round(c.frameCount * c.width * c.height * (c.transparent ? 1.3 : 0.9) * 0.28);
            rows.push(['Archive estimate', '≈ ' + fmtBytes(est) + ' (rough, PNG compresses by content)']);
            if (est > 3.2e9) warn.push('The archive is heading past the 4 GB ZIP limit. Write the frames to a folder instead.');
          }
        }
        if (t && t.ok) {
          var total = t.avgMs * c.frameCount;
          rows.push(['Measured frame time', t.avgMs.toFixed(1) + ' ms avg · ' + t.minMs.toFixed(1) + '–' + t.maxMs.toFixed(1) + ' ms over ' + t.sampled + ' samples']);
          rows.push(['Render time estimate', fmtClock(total / 1000) + ' (ESTIMATE from ' + t.sampled + ' measured frames, encoding not included)']);
        } else if (t && t.error) {
          warn.push('Timing samples failed: ' + t.error.name + ': ' + t.error.message);
        }
        var px = c.width * c.height;
        if (px >= 3840 * 2160) warn.push('4K frames are ' + (px / 1e6).toFixed(1) + ' MP each. Expect heavy memory use and a long render; the renderer keeps only one frame in RAM at a time, but the encoder still needs room.');
        if (c.fps >= 90) warn.push(c.fps + ' fps means ' + c.frameCount + ' frames for ' + (c.frameCount / c.fps).toFixed(1) + ' s of footage. Nothing is skipped — the render simply takes as long as it takes.');
        if (c.frameCount > 5000) warn.push(c.frameCount + ' frames is a long job. Leave the tab open; a background tab may be throttled by the browser.');
        if (c.transparent && job.format === 'webm') warn.push('VP9 alpha is not written by this pipeline. A transparent WebM would silently become opaque, so export a PNG sequence if you need the alpha channel.');
        if (c.transparent && job.format === 'mp4') warn.push('H.264 in MP4 has no alpha channel here. A transparent composition would be flattened onto black, so export a PNG sequence if you need the alpha.');
        if (job.format === 'mp4' && c.frameCount * c.width * c.height > 4e9) warn.push('The encoded stream is buffered in memory until the moov box can be written. At this size, keep other heavy tabs closed.');

        var html = '<dl class="kv">';
        rows.forEach(function (r) { html += '<dt>' + esc(r[0]) + '</dt><dd>' + esc(String(r[1])) + '</dd>'; });
        html += '</dl>';
        warn.forEach(function (w) { html += '<div class="warnbox"><b>Check this</b>' + esc(w) + '</div>'; });
        var blocking = (job.format === 'webm' || job.format === 'mp4') && !probe.available;
        html += '<dl class="kv"><dt>Status</dt><dd class="' + (blocking ? 'no' : warn.length ? 'warn' : 'ok') + '">' +
          (blocking ? 'BLOCKED' : warn.length ? 'READY — WITH WARNINGS' : 'READY') + '</dd></dl>';
        box.innerHTML = html;
        S.analysis = { at: Date.now(), blocking: blocking, probe: probe, timing: t };
      });
    });
  }).catch(function (e) {
    setStage('IDLE', true);
    box.innerHTML = '<div class="warnbox"><b>Analysis failed</b>' + esc(String(e.message || e)) + '</div>';
  });
}

/* ---------------- test render menu ---------------- */
function testMenu() {
  var c = S.comp;
  var opts = [
    { label: '1 frame', frames: 1 },
    { label: '10 frames', frames: Math.min(10, c.frameCount) },
    { label: '1 second (' + c.fps + ' frames)', frames: Math.min(c.fps, c.frameCount) },
    { label: 'Full render (' + c.frameCount + ' frames)', frames: c.frameCount }
  ];
  var body = el('div');
  body.appendChild(elHTML('<p class="note">A test render runs the whole pipeline — render, encode, mux, verify — over a shortened composition. Everything else stays identical, so it tells you what a full render will cost.</p>'));
  var list = el('div', 'list');
  opts.forEach(function (o) {
    var it = el('div', 'it');
    it.appendChild(el('h5', null, o.label));
    it.appendChild(el('p', null, (o.frames / c.fps).toFixed(3) + ' s of output at ' + c.fps + ' fps · ' + c.width + '×' + c.height));
    it.addEventListener('click', function () {
      closeModal();
      withCompiled().then(function (ok) {
        if (!ok) return;
        startRender(buildJob({
          composition: { duration: o.frames / c.fps },
          test: o.frames === c.frameCount ? null : o.label
        }));
      });
    });
    list.appendChild(it);
  });
  body.appendChild(list);
  openModal('TEST RENDER', body, []);
}

/* ---------------- render driver ---------------- */
function pickDirectory() {
  if (typeof window.showDirectoryPicker !== 'function') {
    return Promise.reject(new Error('This browser has no File System Access API, so frames cannot be written to a folder. Choose PNG → ZIP instead.'));
  }
  return window.showDirectoryPicker({ mode: 'readwrite', id: 'trilyva-frames' });
}

function renderStat(p, job) {
  var c = job.composition;
  var pct = p.total ? (p.done / p.total) : 0;
  $('#rprog').querySelector('i').style.width = (pct * 100).toFixed(2) + '%';
  var etaMs = (p.msPerFrame && p.done) ? p.msPerFrame * (p.total - p.done) : null;
  var html = '<div class="bignum">' + p.done + ' <small>/ ' + p.total + ' frames</small></div>';
  html += '<dl class="kv">';
  html += '<dt>Progress</dt><dd>' + (pct * 100).toFixed(2) + ' %</dd>';
  html += '<dt>Frame</dt><dd>' + p.frame + ' · t = ' + (p.frame / c.fps).toFixed(3) + ' s</dd>';
  html += '<dt>Render rate</dt><dd>' + (p.renderFps || 0).toFixed(2) + ' fps · ' + (p.msPerFrame || 0).toFixed(1) + ' ms/frame</dd>';
  html += '<dt>Elapsed</dt><dd>' + fmtClock((p.elapsedMs || 0) / 1000) + '</dd>';
  html += '<dt>ETA estimate</dt><dd>' + (etaMs === null ? '—' : fmtClock(etaMs / 1000) + ' (ESTIMATE)') + '</dd>';
  html += '<dt>Written so far</dt><dd>' + fmtBytes(p.bytes || 0) + '</dd>';
  html += '<dt>Output</dt><dd>' + c.width + '×' + c.height + ' ' + (job.format === 'mp4' ? 'MP4' : job.format === 'webm' ? 'WebM' : 'PNG') + '</dd>';
  html += '</dl>';
  $('#rstat').innerHTML = html;
}

function renderPreflight(job) {
  if (!job || job.format === 'png') return Promise.resolve({ ok: true });
  var c = job.composition;
  var task = job.format === 'mp4'
    ? ENC.probeH264(c.width, c.height, c.fps, job.bitrate)
    : ENC.probeEncoders(c.width, c.height, c.fps, job.bitrate);
  return task.then(function (p) {
    if (job.format === 'mp4') S.h264 = p;
    if (p && p.available) return { ok: true, probe: p };
    var label = job.format === 'mp4' ? 'H.264 / AVC' : 'VP9 / VP8';
    var reason = p && p.reason ? p.reason : ('No accepted ' + label + ' configuration was found.');
    return {
      ok: false,
      probe: p,
      error: {
        name: 'CodecUnavailable',
        message: label + ' is unavailable for ' + c.width + '×' + c.height + ' at ' + c.fps + ' fps.',
        detail: reason + ' Export the PNG sequence, or change the composition to a configuration accepted by the browser probe.'
      }
    };
  }).catch(function (e) {
    return {
      ok: false,
      error: {
        name: e && e.name || 'CodecProbeError',
        message: String(e && e.message || e),
        detail: 'The codec capability probe failed before rendering, so no media file was started. PNG sequence export remains available.'
      }
    };
  });
}
function showPreflightFailure(job, pre) {
  setStage('VALIDATING', true);
  $('#stDot').className = 'dot';
  logLine('VALIDATION FAILED — ' + pre.error.name + ': ' + pre.error.message, true);
  var c = job.composition;
  $('#rstat').innerHTML = '<div class="warnbox"><b>WHAT · export blocked before rendering</b>' +
    'FORMAT · ' + esc(job.format.toUpperCase()) + '\n' +
    'CONFIG · ' + esc(c.width + '×' + c.height + ' · ' + c.fps + ' fps') + '\n' +
    'WHY · ' + esc(pre.error.message) + '\n' +
    'DETAIL · ' + esc(pre.error.detail) +
    '</div>';
  $('#stMsg').textContent = pre.error.message;
}
function startRender(job, opts) {
  if (S.rendering) return Promise.resolve(null);
  return renderPreflight(job).then(function (pre) {
    if (!pre.ok) {
      showPreflightFailure(job, pre);
      return { ok: false, stage: 'validate', error: pre.error, probe: pre.probe || null };
    }
    return startRenderNow(job, opts);
  });
}
function startRenderNow(job, opts) {
  opts = opts || {};
  if (S.rendering) return Promise.resolve(null);
  S.rendering = true;
  S.renderStart = Date.now();
  S.activeJob = job;
  $('#cancelBtn').disabled = false;
  $$('[data-act=startRender], [data-act=queueRun]').forEach(function (b) { b.disabled = true; });
  $('#stDot').className = 'dot busy';
  showTab('p-render');
  clearLog();
  setStage('VALIDATING');
  var prog = $('#rprog');
  prog.classList.remove('idle'); prog.classList.add('scan');
  prog.querySelector('i').style.width = '0%';
  var c = job.composition;
  logLine('job ' + job.id + (job.test ? ' (test: ' + job.test + ')' : ''), true);
  logLine(c.width + '×' + c.height + ' · ' + c.fps + ' fps · ' + c.frameCount + ' frames · ' + (c.frameCount / c.fps).toFixed(3) + ' s · ' + (job.format === 'mp4' ? 'MP4' : job.format === 'webm' ? 'WebM' : 'PNG ' + job.target));
  logLine('frame 0 renders at t = 0.000 s, frame ' + (c.frameCount - 1) + ' at t = ' + ((c.frameCount - 1) / c.fps).toFixed(3) + ' s');
  renderStat({ frame: 0, done: 0, total: c.frameCount, elapsedMs: 0, renderFps: 0, msPerFrame: 0, bytes: 0 }, job);
  toyShow(true);

  var dirHandle = null;
  var pre = (job.format === 'png' && job.target === 'dir')
    ? pickDirectory().then(function (h) { dirHandle = h; logLine('writing frames into folder "' + h.name + '"'); })
    : Promise.resolve();

  var sawFirstFrame = false;
  function onLog(msg) {
    logLine(msg);
    if (/encoder configured/.test(msg)) setStage('RENDERING');
    if (/flushing encoder/.test(msg)) setStage('ENCODING');
    if (/^muxed /.test(msg)) setStage('FINALISING');
  }
  function onProgress(p) {
    if (!sawFirstFrame) { sawFirstFrame = true; setStage('RENDERING'); prog.classList.remove('scan'); }
    S.lastProgress = p;
    renderStat(p, job);
    $('#stMsg').textContent = 'rendering frame ' + p.frame + ' of ' + p.total;
    if (p.done === 1 || p.done % Math.max(1, Math.round(p.total / 12)) === 0) logLine('frame ' + p.frame + ' rendered');
  }

  return pre.then(function () {
    setStage('PREPARING');
    logLine('engine: ' + (Engine.mode === 'worker' ? 'worker + OffscreenCanvas' : 'main thread fallback'));
    return Engine.api.exportJob(job, 0, dirHandle, null, onLog, onProgress);
  }).then(function (result) {
    return finishRender(job, result, opts);
  }).catch(function (e) {
    return finishRender(job, {
      ok: false, stage: 'crash',
      error: { name: e.name || 'Error', message: String(e.message || e), detail: 'The render did not start. Nothing was written.' }
    }, opts);
  });
}

function finishRender(job, result, opts) {
  S.rendering = false;
  S.activeJob = null;
  $('#cancelBtn').disabled = true;
  $$('[data-act=startRender], [data-act=queueRun]').forEach(function (b) { b.disabled = false; });
  $('#stDot').className = 'dot ok';
  var prog = $('#rprog');
  prog.classList.remove('scan');
  toyShow(false);

  if (result && result.cancelled) {
    prog.classList.add('idle');
    setStage('IDLE');
    logLine('cancelled by user at frame ' + (S.lastProgress ? S.lastProgress.frame : 0) + ' — no file was produced', true);
    $('#stMsg').textContent = 'render cancelled — project and diagnostics kept';
    $('#rstat').innerHTML = '<div class="warnbox"><b>Cancelled</b>Stopped after ' +
      (S.lastProgress ? S.lastProgress.done : 0) + ' of ' + job.composition.frameCount +
      ' frames. A partial file would have been misleading, so none was written.</div>';
    return result;
  }
  if (!result || !result.ok) {
    var err = (result && result.error) || { name: 'Error', message: 'unknown failure' };
    prog.classList.add('idle');
    setStage(result && result.stage === 'validate' ? 'VALIDATING' : 'RENDERING', true);
    logLine('FAILED — ' + err.name + ': ' + err.message, true);
    var where = [];
    if (result && result.atFrame !== undefined && result.atFrame !== null) where.push('frame ' + result.atFrame);
    if (err.frame !== undefined && err.frame !== null) where.push('frame ' + err.frame);
    if (err.line) where.push('line ' + err.line);
    var h = '<div class="warnbox"><b>WHAT · render failed</b>' +
      (where.length ? 'WHERE · ' + esc(where.join(' · ')) + '\n' : '') +
      'WHY · ' + esc(err.name + ': ' + err.message) + '\n' +
      'HOW TO FIX · ' + esc(err.detail || (err.line ? 'Open line ' + err.line + ' in the editor.' : 'Check the render log above.')) +
      '</div>';
    $('#rstat').innerHTML = h;
    if (err.line || err.stage) showRuntimeError(merge(err, { stage: 'render' }));
    $('#stMsg').textContent = err.name + ': ' + err.message;
    return result;
  }

  setStage('VERIFYING');
  logLine('verifying the bytes that were actually written', true);
  var v = result.verify || { status: 'UNKNOWN', lines: [], problems: ['Nothing to verify.'] };
  var st = result.stats;
  var html = '<dl class="kv">';
  html += '<dt>Sequence</dt><dd class="' + (v.status === 'VALID' ? 'ok' : v.status === 'PARTIAL' ? 'warn' : 'no') + '">' + v.status + '</dd>';
  v.lines.forEach(function (l) { html += '<dt>' + esc(l[0]) + '</dt><dd>' + esc(String(l[1])) + '</dd>'; });
  html += '<dt>Wall clock</dt><dd>' + fmtClock(result.wallMs / 1000) + '</dd>';
  html += '<dt>Average frame</dt><dd>' + st.renderMs.avg.toFixed(1) + ' ms (' + st.renderMs.min.toFixed(1) + '–' + st.renderMs.max.toFixed(1) + ')</dd>';
  html += '<dt>Processing rate</dt><dd>' + st.avgProcessFps.toFixed(2) + ' frames/s</dd>';
  html += '<dt>Codec</dt><dd>' + esc(st.codec) + '</dd>';
  html += '</dl>';
  v.problems.forEach(function (p) { html += '<div class="warnbox"><b>Verification problem</b>' + esc(p) + '</div>'; });
  $('#rstat').innerHTML = html;
  logLine('verification: ' + v.status + (v.problems.length ? ' — ' + v.problems.length + ' problem(s)' : ''), true);

  setTimeout(function () {
    setStage(v.status === 'INVALID' ? 'VERIFYING' : 'COMPLETE', v.status === 'INVALID');
    $('#rprog').querySelector('i').style.width = '100%';
  }, 220);

  var rec = {
    id: job.id, job: job, result: result, verify: v, at: new Date(),
    blob: result.blob || null, dir: !!result.dir,
    log: (S.logLines || []).slice()
  };
  S.results.unshift(rec);
  renderResults();
  $('#stMsg').textContent = 'render complete — ' + v.status + ' · ' + fmtBytes(st.bytes);
  if (!opts.silent) showCompletion(rec);
  return result;
}

function cancelRender() {
  if (!S.rendering) return;
  Engine.api.cancel();
  S.queueStop = true;
  logLine('cancel requested — finishing the frame in flight, then stopping');
  $('#cancelBtn').disabled = true;
}

/* ---------------- completion ---------------- */
function showCompletion(rec) {
  var job = rec.job, c = job.composition, st = rec.result.stats, v = rec.verify;
  var body = el('div');
  var h = '<dl class="kv">';
  h += '<dt>Project</dt><dd>' + esc(job.label) + '</dd>';
  h += '<dt>Job</dt><dd>' + job.id + '</dd>';
  h += '<dt>Composition</dt><dd>' + c.width + ' × ' + c.height + ' · ' + c.fps + ' fps · ' + (c.frameCount / c.fps).toFixed(3) + ' s</dd>';
  h += '<dt>Frames</dt><dd>' + st.framesGenerated + ' generated of ' + st.framesRequested + ' requested</dd>';
  h += '<dt>Sequence</dt><dd class="' + (v.status === 'VALID' ? 'ok' : v.status === 'PARTIAL' ? 'warn' : 'no') + '">' + v.status + '</dd>';
  h += '<dt>Output</dt><dd>' + (job.format === 'mp4' ? 'MP4 · ' + esc(st.codec) + ' · ' + esc(st.codecId || '')
    : job.format === 'webm' ? 'WebM · ' + esc(st.codec)
      : (job.target === 'dir' ? 'PNG frames in a folder' : 'PNG sequence in a ZIP')) + '</dd>';
  if (st.bitrate) h += '<dt>Bitrate</dt><dd>' + Math.round(st.bitrate / 1000) + ' kbps requested</dd>';
  if (st.framesEncoded !== null && st.framesEncoded !== undefined) h += '<dt>Frames encoded</dt><dd>' + st.framesEncoded + '</dd>';
  h += '<dt>Size</dt><dd>' + fmtBytes(st.bytes) + '</dd>';
  h += '<dt>Render time</dt><dd>' + fmtClock(rec.result.wallMs / 1000) + ' · ' + st.avgProcessFps.toFixed(2) + ' frames/s</dd>';
  h += '<dt>Metadata</dt><dd>' + (job.format === 'webm' || job.format === 'mp4'
    ? 'EMBEDDED (title, creator, software, source hash, loop, seed) + PROJECT-ONLY (colour space, dates)'
    : 'PROJECT-ONLY in manifest.json') + '</dd>';
  h += '<dt>File name</dt><dd style="word-break:break-all">' + esc(job.fileName) + '</dd>';
  h += '</dl>';
  if (v.problems.length) v.problems.forEach(function (p) { h += '<div class="warnbox"><b>Verification problem</b>' + esc(p) + '</div>'; });
  else h += '<p class="note">The file was re-read after writing: the frame count, dimensions, duration and timestamp order above come from parsing the actual bytes, not from the renderer\'s own counters.</p>';
  body.appendChild(elHTML(h));
  if (v.status === 'VALID' && job.format === 'mp4' && rec.result.parsed) {
    var pv = rec.result.parsed;
    body.insertBefore(elHTML(
      '<div class="verified"><b>EXPORT VERIFIED</b>' +
      '<span>' + esc(pv.codec === 'avc1' ? 'H.264 / AVC' : pv.codec) + '</span>' +
      '<span>MP4</span>' +
      '<span>' + pv.width + '\u00D7' + pv.height + '</span>' +
      '<span>' + c.fps + ' FPS</span>' +
      '<span>' + pv.samples + ' FRAMES</span>' +
      '<span>' + pv.durationSec.toFixed(3) + ' S</span></div>'
    ), body.firstChild);
  }

  var foot = [];
  if (rec.blob) {
    foot.push({ label: 'Download ' + (job.format === 'mp4' ? 'MP4' : job.format === 'webm' ? 'WebM' : 'ZIP'), solid: true, fn: function () { download(rec.blob, job.fileName); } });
    if (job.format === 'webm' || job.format === 'mp4') foot.push({ label: 'View output', fn: function () { viewOutput(rec); } });
  } else if (rec.dir) {
    foot.push({ label: 'Frames are already in your folder', solid: true, fn: function () { closeModal(); } });
  }
  foot.push({ label: 'Copy metadata', fn: function () { copyText(JSON.stringify(receiptFor(rec), null, 2), 'metadata receipt copied'); } });
  foot.push({ label: 'Render again', fn: function () { closeModal(); startRender(buildJob()); } });
  foot.push({ label: 'Close', fn: closeModal });
  openModal('RENDER ' + (v.status === 'VALID' ? 'COMPLETE' : 'FINISHED — CHECK VERIFICATION'), body, foot);
}
function receiptFor(rec) {
  var job = rec.job, c = job.composition;
  return {
    jobId: job.id, renderedAt: rec.at.toISOString(),
    software: job.metadata.software + ' ' + job.metadata.softwareVersion,
    title: job.metadata.title, creator: job.metadata.creator,
    composition: { width: c.width, height: c.height, fps: c.fps, frameCount: c.frameCount, duration: +(c.frameCount / c.fps).toFixed(6), background: c.transparent ? 'transparent' : c.background, seed: c.seed },
    loop: { enabled: !!c.loop, duration: c.loopDuration },
    timeModel: { frameTime: 'frame / fps', rate: c.speed, reverse: !!c.reverse },
    sourceSha256: job.metadata.sourceHash,
    output: {
      format: job.exportFormat, fileName: job.fileName, bytes: rec.result.stats.bytes,
      codec: rec.result.stats.codec, codecString: rec.result.stats.codecId || null,
      bitrate: rec.result.stats.bitrate || null, framesEncoded: rec.result.stats.framesEncoded
    },
    verification: { status: rec.verify.status, lines: rec.verify.lines, problems: rec.verify.problems },
    statistics: {
      framesRequested: rec.result.stats.framesRequested,
      framesGenerated: rec.result.stats.framesGenerated,
      identicalNeighbours: rec.result.stats.duplicateNeighbours,
      avgFrameMs: +rec.result.stats.renderMs.avg.toFixed(3),
      wallMs: rec.result.wallMs
    }
  };
}
function viewOutput(rec) {
  var url = URL.createObjectURL(rec.blob);
  var body = el('div');
  body.appendChild(elHTML('<p class="note">Played back by the browser from the file that was just written. If it plays here, the container is readable.</p>'));
  var vid = document.createElement('video');
  vid.src = url; vid.controls = true; vid.loop = !!rec.job.composition.loop; vid.autoplay = true;
  vid.style.cssText = 'width:100%;background:#000;border:1px solid var(--rule)';
  body.appendChild(vid);
  openModal('OUTPUT · ' + rec.job.fileName, body, [
    { label: 'Download', solid: true, fn: function () { download(rec.blob, rec.job.fileName); } },
    { label: 'Open in a new tab', fn: function () { window.open(url, '_blank'); } },
    { label: 'Close', fn: function () { closeModal(); } }
  ]);
}

/* ---------------- results ---------------- */
function renderResults() {
  var box = $('#results');
  box.innerHTML = '';
  if (!S.results.length) { box.appendChild(el('div', 'empty', 'Nothing rendered yet.')); return; }
  S.results.forEach(function (rec) {
    var it = el('div', 'it');
    var head = el('h5', null, rec.job.fileName);
    it.appendChild(head);
    var c = rec.job.composition;
    it.appendChild(el('p', null, c.width + '×' + c.height + ' · ' + c.fps + ' fps · ' + c.frameCount + ' frames · ' +
      fmtBytes(rec.result.stats.bytes) + ' · ' + rec.verify.status + ' · ' + rec.at.toLocaleTimeString()));
    var row = el('div', 'btn-row');
    if (rec.blob) {
      var d = el('button', 'btn', 'Download');
      d.addEventListener('click', function (ev) { ev.stopPropagation(); download(rec.blob, rec.job.fileName); });
      row.appendChild(d);
    }
    var m = el('button', 'btn', 'Receipt');
    m.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var pre = el('pre'); pre.textContent = JSON.stringify(receiptFor(rec), null, 2);
      pre.style.cssText = 'white-space:pre-wrap;font:11px/1.5 var(--mono);color:var(--ink-2);max-height:50vh;overflow:auto';
      var b = el('div'); b.appendChild(pre);
      openModal('RECEIPT · ' + rec.job.id, b, [
        { label: 'Copy', solid: true, fn: function () { copyText(pre.textContent, 'receipt copied'); } },
        { label: 'Close', fn: closeModal }
      ]);
    });
    row.appendChild(m);
    var lg = el('button', 'btn', 'Log');
    lg.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var pre = el('pre'); pre.textContent = rec.log.join('\n');
      pre.style.cssText = 'white-space:pre-wrap;font:11px/1.5 var(--mono);color:var(--ink-2);max-height:50vh;overflow:auto';
      var b = el('div'); b.appendChild(pre);
      openModal('RENDER LOG · ' + rec.job.id, b, [{ label: 'Close', fn: closeModal }]);
    });
    row.appendChild(lg);
    it.appendChild(row);
    box.appendChild(it);
  });
}

/* ---------------- queue ---------------- */
function queueAdd() {
  withCompiled().then(function (ok) {
    if (!ok) return;
    var job = buildJob();
    job.status = 'READY';
    S.queue.push(job);
    renderQueue();
    showTab('p-queue');
    $('#stMsg').textContent = 'queued ' + job.id + ' — its settings are frozen now';
  });
}
function renderQueue() {
  var box = $('#queue');
  box.innerHTML = '';
  if (!S.queue.length) { box.appendChild(el('div', 'empty', 'The queue is empty. "Add to queue" freezes the current code and settings as a job.')); }
  S.queue.forEach(function (job, i) {
    var d = el('div', 'job' + (job.status === 'RENDERING' ? ' run' : ''));
    d.appendChild(el('h5', null, job.label + '  ·  ' + job.id));
    var c = job.composition;
    d.appendChild(el('p', null, c.width + '×' + c.height + ' · ' + c.fps + ' fps · ' + (c.frameCount / c.fps).toFixed(2) + ' s · ' +
      c.frameCount + ' frames · ' + (job.format === 'mp4' ? 'MP4' : job.format === 'webm' ? 'WebM' : 'PNG ' + job.target) + ' · ' + job.status));
    if (job.status === 'READY' || job.status === 'DONE' || job.status === 'FAILED') {
      var x = el('button', 'x', '✕');
      x.title = 'Remove from queue';
      x.addEventListener('click', function () { S.queue.splice(i, 1); renderQueue(); });
      d.appendChild(x);
    }
    box.appendChild(d);
  });
  $('#queueRunBtn').disabled = !S.queue.some(function (j) { return j.status === 'READY'; });
}
function runQueue() {
  if (S.rendering) return;
  S.queueStop = false;
  var pending = S.queue.filter(function (j) { return j.status === 'READY'; });
  if (!pending.length) return;
  var i = 0;
  function next() {
    if (S.queueStop || i >= pending.length) {
      renderQueue();
      $('#stMsg').textContent = S.queueStop ? 'queue stopped' : 'queue finished — ' + pending.length + ' job(s)';
      return Promise.resolve();
    }
    var job = pending[i++];
    job.status = 'RENDERING';
    renderQueue();
    return startRender(job, { silent: i < pending.length }).then(function (r) {
      job.status = (r && r.ok) ? 'DONE' : (r && r.cancelled) ? 'CANCELLED' : 'FAILED';
      renderQueue();
      return next();
    });
  }
  next();
}

/* ============================================================
   Modal + clipboard
   ============================================================ */
function elHTML(html) { var d = document.createElement('div'); d.innerHTML = html; return d; }
function openModal(title, bodyNode, buttons) {
  $('#modalTitle').textContent = title;
  var b = $('#modalBody'); b.innerHTML = ''; b.appendChild(bodyNode);
  var f = $('#modalFoot'); f.innerHTML = '';
  (buttons || []).forEach(function (cfg) {
    var btn = el('button', 'btn' + (cfg.solid ? ' solid' : ''), cfg.label);
    btn.addEventListener('click', cfg.fn);
    f.appendChild(btn);
  });
  $('#modal').classList.add('on');
  S.modalOpen = true;
  var first = f.querySelector('button') || b.querySelector('input,button');
  if (first) setTimeout(function () { first.focus(); }, 20);
}
function closeModal() { $('#modal').classList.remove('on'); S.modalOpen = false; }
function copyText(text, msg) {
  function done() { $('#stMsg').textContent = msg || 'copied'; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, fallback);
  } else fallback();
  function fallback() {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { $('#stMsg').textContent = 'copy failed — select the text manually'; }
    document.body.removeChild(ta);
  }
}
function prompt2(title, label, value, onOk) {
  var body = el('div');
  var row = el('div', 'row');
  row.appendChild(el('label', null, label));
  var inp = document.createElement('input');
  inp.type = 'text'; inp.value = value; inp.spellcheck = false;
  row.appendChild(inp);
  body.appendChild(row);
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { closeModal(); onOk(inp.value.trim()); } });
  openModal(title, body, [
    { label: 'OK', solid: true, fn: function () { closeModal(); onOk(inp.value.trim()); } },
    { label: 'Cancel', fn: closeModal }
  ]);
  setTimeout(function () { inp.focus(); inp.select(); }, 30);
}

/* ============================================================
   Capabilities + diagnostics
   ============================================================ */
function detectCaps() {
  var c = {};
  var probe = document.createElement('canvas');
  c.canvas2d = !!probe.getContext('2d');
  c.offscreen = typeof OffscreenCanvas !== 'undefined';
  c.offscreenCtx = c.offscreen && typeof OffscreenCanvas.prototype.getContext === 'function';
  c.transferBitmap = c.offscreen && typeof OffscreenCanvas.prototype.transferToImageBitmap === 'function';
  c.workers = typeof Worker !== 'undefined';
  c.webcodecs = typeof VideoEncoder !== 'undefined';
  c.mediaRecorder = typeof MediaRecorder !== 'undefined';
  c.fsa = typeof window.showDirectoryPicker === 'function';
  c.idb = !!window.indexedDB;
  c.subtle = !!(window.crypto && window.crypto.subtle && window.crypto.subtle.digest);
  c.serviceWorker = 'serviceWorker' in navigator;
  c.secure = !!window.isSecureContext;
  c.standalone = !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  c.newFunction = EVAL_OK;
  try { c.webgl2 = !!probe.getContext('webgl2'); } catch (e) { c.webgl2 = false; }
  c.webgpu = !!navigator.gpu;
  c.cores = navigator.hardwareConcurrency || null;
  c.memoryGB = navigator.deviceMemory || null;
  c.dpr = window.devicePixelRatio || 1;
  S.caps = c;
  return c;
}
function kvRow(dl, k, v, cls) {
  dl.appendChild(el('dt', null, k));
  dl.appendChild(el('dd', cls || null, v));
}
function yesNo(dl, k, ok, yes, no) {
  kvRow(dl, k, ok ? (yes || 'SUPPORTED') : (no || 'NOT AVAILABLE'), ok ? 'ok' : 'no');
}
function refreshDiag() {
  var c = detectCaps();
  var dl = $('#diagRuntime'); dl.innerHTML = '';
  kvRow(dl, 'Engine', Engine.mode === 'worker' ? 'worker + OffscreenCanvas' : 'main thread', Engine.mode === 'worker' ? 'ok' : 'warn');
  kvRow(dl, 'Isolation', Engine.mode === 'worker'
    ? 'separate thread, no DOM, network + storage globals shadowed'
    : 'same thread as the interface, network + storage globals shadowed', Engine.mode === 'worker' ? 'ok' : 'warn');
  kvRow(dl, 'Boot note', Engine.bootNote || '—');
  kvRow(dl, 'Render contract', S.compiled ? 'VALID' : 'not compiled yet', S.compiled ? 'ok' : 'warn');
  kvRow(dl, 'Preview', S.compiled ? 'READY' : 'idle', S.compiled ? 'ok' : 'warn');
  kvRow(dl, 'Preview raster', S.previewRaster.w + ' × ' + S.previewRaster.h + ' (' + (S.previewRaster.s * 100).toFixed(1) + ' % of export)');
  kvRow(dl, 'Export raster', S.comp.width + ' × ' + S.comp.height);
  kvRow(dl, 'Frame model', 'frameCount = round(duration × fps) = ' + S.comp.frameCount + '; frames 0 … ' + (S.comp.frameCount - 1) + '; time = frame / fps');
  kvRow(dl, 'Last runtime error', S.lastError ? (S.lastError.name + ': ' + S.lastError.message + (S.lastError.line ? ' (line ' + S.lastError.line + ')' : '')) : 'none', S.lastError ? 'no' : 'ok');

  dl = $('#diagCaps'); dl.innerHTML = '';
  yesNo(dl, 'Canvas 2D', c.canvas2d);
  yesNo(dl, 'OffscreenCanvas', c.offscreen);
  yesNo(dl, 'transferToImageBitmap', c.transferBitmap);
  yesNo(dl, 'Web Workers', c.workers);
  yesNo(dl, 'WebCodecs VideoEncoder', c.webcodecs);
  yesNo(dl, 'File System Access', c.fsa, 'SUPPORTED', 'NOT AVAILABLE — PNG folder target is off');
  yesNo(dl, 'IndexedDB', c.idb);
  yesNo(dl, 'Web Crypto (SHA-256)', c.subtle, 'SUPPORTED', 'NOT AVAILABLE — source hashing is off');
  yesNo(dl, 'Secure context', c.secure);
  yesNo(dl, 'WebGL2', c.webgl2, 'SUPPORTED — usable from your code via a second canvas', 'NOT AVAILABLE');
  yesNo(dl, 'WebGPU', c.webgpu);
  kvRow(dl, 'Logical cores', c.cores ? String(c.cores) : 'not reported');
  kvRow(dl, 'Device memory', c.memoryGB ? c.memoryGB + ' GB (browser estimate)' : 'not reported');
  kvRow(dl, 'Device pixel ratio', c.dpr.toFixed(2));
  kvRow(dl, 'Display mode', c.standalone ? 'standalone (installed)' : 'browser tab');

  dl = $('#diagEnc'); dl.innerHTML = '';
  dl.appendChild(el('dt', null, 'H.264 / AVC (WebCodecs)'));
  var ddH = el('dd', 'warn', 'probing…');
  dl.appendChild(ddH);
  var brNow = ENC.bitrateFor(S.comp.width, S.comp.height, S.comp.fps, S.quality);
  ENC.probeH264(S.comp.width, S.comp.height, S.comp.fps, brNow).then(function (p) {
    ddH.className = p.available ? 'ok' : 'no';
    ddH.textContent = p.available
      ? 'SUPPORTED — ' + p.selected.id + ' (' + p.selected.label + ') at ' + S.comp.width + '×' + S.comp.height + ' / ' +
      S.comp.fps + ' fps / ' + Math.round(p.bitrate / 1000) + ' kbps · ' +
      p.tried.filter(function (t) { return t.supported; }).length + ' of ' + p.tried.length + ' profiles accepted'
      : 'NOT AVAILABLE — ' + p.reason;
  });
  kvRow(dl, 'MP4 container', 'SUPPORTED — ISO-BMFF written here: ftyp, mdat, moov with avcC, stts, stss, stsc, stsz and stco/co64. The avcC record comes straight from the encoder, so the sample description and the samples cannot disagree.', 'ok');
  dl.appendChild(el('dt', null, 'WebM (VP9 / VP8)'));
  var dd = el('dd', 'warn', 'probing…');
  dl.appendChild(dd);
  ENC.probeEncoders(S.comp.width, S.comp.height, S.comp.fps).then(function (p) {
    dd.className = p.available ? 'ok' : 'no';
    dd.textContent = p.available
      ? 'SUPPORTED — ' + p.supported.map(function (s) { return s.label; }).join(', ') + ' at ' + S.comp.width + '×' + S.comp.height
      : 'NOT AVAILABLE — ' + p.reason;
  });
  kvRow(dl, 'PNG sequence', 'SUPPORTED — canvas encodes each frame, ZIP is written here', 'ok');
  kvRow(dl, 'ZIP container', 'SUPPORTED — stored (uncompressed) entries, 4 GB ceiling', 'ok');
  kvRow(dl, 'Render target', Engine.mode === 'worker'
    ? 'OffscreenCanvas inside the worker — there is no DOM in there, and VideoFrame is built from that canvas and nothing else.'
    : 'canvas#render-target in this document — VideoFrame is built from that element and nothing else.', 'ok');
  kvRow(dl, 'Alpha in MP4', 'NOT WRITTEN — H.264 here is 4:2:0 with no alpha plane, so a transparent composition must go out as PNG.', 'no');
  kvRow(dl, 'ProRes / professional codecs', 'NOT AVAILABLE — these need a native encoder. The project format is designed so a native renderer could consume it later.', 'no');
  kvRow(dl, 'MediaRecorder', c.mediaRecorder
    ? 'PRESENT BUT DELIBERATELY UNUSED — it records wall-clock time, so it drops and duplicates frames under load. This renderer evaluates exact timestamps instead.'
    : 'not implemented (and not needed here)', 'warn');
  kvRow(dl, 'Alpha in WebM', 'NOT WRITTEN — this muxer emits no BlockAdditions alpha plane, so a transparent composition must go out as PNG.', 'no');

  dl = $('#diagStore'); dl.innerHTML = '';
  kvRow(dl, 'Project store', DB.db ? 'IndexedDB "trilyva" open' : (c.idb ? 'not opened yet' : 'unavailable — projects live in this tab only'), DB.db ? 'ok' : 'warn');
  kvRow(dl, 'Saved projects', S.projectCount === null ? 'counting…' : String(S.projectCount));
  kvRow(dl, 'Saved versions', S.versionCount === null ? 'counting…' : String(S.versionCount));
  var quota = el('dd', null, 'asking the browser…');
  dl.appendChild(el('dt', null, 'Storage estimate')); dl.appendChild(quota);
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(function (e) {
      quota.textContent = fmtBytes(e.usage || 0) + ' used of ' + fmtBytes(e.quota || 0) + ' granted';
    }).catch(function () { quota.textContent = 'not reported'; });
  } else quota.textContent = 'not reported';
  kvRow(dl, 'Service worker', c.serviceWorker
    ? (S.swNote || 'available — but this page is served from a sandboxed artifact origin, so it cannot register one. Download the app and serve it yourself to get offline install.')
    : 'not supported by this browser', 'warn');
  kvRow(dl, 'Offline use', 'The app is one HTML file with no network calls at runtime — save it and it works offline from the file system. PWA install needs your own origin.', 'warn');
  kvRow(dl, 'Network', 'This page makes no requests after load: no CDN, no fonts, no telemetry, no backend.', 'ok');
}

/* ============================================================
   Project store — IndexedDB
   ============================================================ */
var DB = { db: null, err: null };
function openDB() {
  return new Promise(function (res, rej) {
    if (!window.indexedDB) return rej(new Error('IndexedDB is unavailable in this browser.'));
    var rq = indexedDB.open('trilyva', 1);
    rq.onupgradeneeded = function (ev) {
      var db = ev.target.result;
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('versions')) {
        var s = db.createObjectStore('versions', { keyPath: 'vid' });
        s.createIndex('project', 'projectId', { unique: false });
      }
    };
    rq.onsuccess = function () { DB.db = rq.result; res(DB.db); };
    rq.onerror = function () { DB.err = rq.error; rej(rq.error); };
  });
}
function idb(store, mode) { return DB.db.transaction(store, mode).objectStore(store); }
function idbAsk(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
function countStores() {
  if (!DB.db) { S.projectCount = 0; S.versionCount = 0; return Promise.resolve(); }
  return Promise.all([idbAsk(idb('projects').count()), idbAsk(idb('versions').count())])
    .then(function (n) { S.projectCount = n[0]; S.versionCount = n[1]; })
    .catch(function () { S.projectCount = 0; S.versionCount = 0; });
}
function uid(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36); }

function projectRecord() {
  return {
    id: S.id, name: S.name, version: S.version,
    code: Ed.ta.value, comp: S.comp, meta: S.meta,
    exportPrefs: { format: S.exportFormat, quality: S.quality, timebase: S.timebase, checksums: S.checksums, customBitrateMbps: S.customBitrateMbps },
    created: S.created, modified: new Date().toISOString()
  };
}
function saveProject(mode) {
  if (!DB.db) {
    $('#stMsg').textContent = 'cannot save: ' + (DB.err ? DB.err.message : 'IndexedDB is unavailable') + ' — use Export .tmotion instead';
    return Promise.resolve(false);
  }
  S.code = Ed.ta.value;
  function write(rec) {
    rec.modified = new Date().toISOString();
    var snap = merge(rec, {});
    snap.vid = rec.id + ':v' + rec.version;
    snap.projectId = rec.id;
    snap.savedAt = rec.modified;
    return Promise.all([
      idbAsk(idb('projects', 'readwrite').put(rec)),
      idbAsk(idb('versions', 'readwrite').put(snap))
    ]).then(function () {
      S.id = rec.id; S.name = rec.name; S.version = rec.version; S.created = rec.created;
      $('#projName').value = rec.name;
      $('#projVer').textContent = 'v' + rec.version;
      markDirty(false);
      countStores();
      $('#stMsg').textContent = 'saved "' + rec.name + '" as v' + rec.version + ' — earlier versions are kept';
      return true;
    }).catch(function (e) {
      $('#stMsg').textContent = 'save failed: ' + (e.message || e);
      return false;
    });
  }
  if (mode === 'as' || mode === 'duplicate' || !S.id) {
    return new Promise(function (res) {
      prompt2(mode === 'duplicate' ? 'DUPLICATE PROJECT' : 'SAVE PROJECT AS', 'Name', mode === 'duplicate' ? S.name + ' copy' : S.name, function (name) {
        if (!name) return res(false);
        var rec = projectRecord();
        rec.id = uid('prj'); rec.name = name; rec.version = 1;
        rec.created = new Date().toISOString();
        S.meta.title = S.meta.title === S.name ? name : S.meta.title;
        res(write(rec));
      });
    });
  }
  var rec = projectRecord();
  rec.version = S.version + 1;
  return write(rec);
}
function loadProjectRecord(rec) {
  S.id = rec.id; S.name = rec.name; S.version = rec.version;
  S.created = rec.created || new Date().toISOString();
  S.meta = merge(defaultMeta(), rec.meta || {});
  S.comp = CORE.composition(rec.comp || {});
  var p = rec.exportPrefs || {};
  S.exportFormat = p.format || 'webm';
  S.quality = p.quality || 'standard';
  S.timebase = p.timebase || 'ms';
  S.checksums = p.checksums !== false;
  S.customBitrateMbps = isFinite(Number(p.customBitrateMbps)) && Number(p.customBitrateMbps) >= 0 ? Math.min(2000, Number(p.customBitrateMbps)) : 25;
  S.customBitrateMbps = isFinite(Number(p.customBitrateMbps)) && Number(p.customBitrateMbps) >= 0 ? Math.min(2000, Number(p.customBitrateMbps)) : 25;
  S.code = rec.code || '';
  edSetValue(S.code);
  $('#projName').value = S.name;
  $('#projVer').textContent = 'v' + S.version;
  segMark($('#segFmt'), S.exportFormat);
  $('#oQuality').value = S.quality; $('#oTimebase').value = S.timebase;
  $('#oChecksum').value = S.checksums ? 'on' : 'off';
  S.frame = 0;
  applyComp({});
  syncMetaUI();
  markDirty(false);
  return run();
}
function openProjectDialog() {
  if (!DB.db) { $('#stMsg').textContent = 'IndexedDB is unavailable — import a .tmotion file instead'; return; }
  idbAsk(idb('projects').getAll()).then(function (list) {
    list.sort(function (a, b) { return (b.modified || '').localeCompare(a.modified || ''); });
    var body = el('div');
    if (!list.length) body.appendChild(elHTML('<p class="note">No saved projects yet. Save the current one, or import a .tmotion file.</p>'));
    var box = el('div', 'list');
    list.forEach(function (rec) {
      var it = el('div', 'it');
      it.appendChild(el('h5', null, rec.name + '  ·  v' + rec.version));
      var c = rec.comp || {};
      it.appendChild(el('p', null, (c.width || '?') + '×' + (c.height || '?') + ' · ' + (c.fps || '?') + ' fps · ' +
        ((c.frameCount || 0) / (c.fps || 1)).toFixed(2) + ' s · ' + (rec.code || '').split('\n').length + ' lines · ' +
        new Date(rec.modified).toLocaleString()));
      it.addEventListener('click', function () {
        closeModal();
        askDiscard('Open "' + rec.name + '"?', function () { loadProjectRecord(rec); });
      });
      var vs = el('button', 'x', '⋯');
      vs.title = 'Version history';
      vs.addEventListener('click', function (ev) { ev.stopPropagation(); versionDialog(rec); });
      it.appendChild(vs);
      box.appendChild(it);
    });
    body.appendChild(box);
    openModal('OPEN PROJECT', body, [
      { label: 'Import .tmotion', fn: function () { closeModal(); $('#filePick').click(); } },
      { label: 'Close', fn: closeModal }
    ]);
  });
}
function versionDialog(rec) {
  var idx = idb('versions').index('project');
  idbAsk(idx.getAll(rec.id)).then(function (list) {
    list.sort(function (a, b) { return b.version - a.version; });
    var body = el('div');
    body.appendChild(elHTML('<p class="note">Every save writes a new version. Opening one loads it as the working project; saving again appends another version rather than overwriting.</p>'));
    var box = el('div', 'list');
    list.forEach(function (v) {
      var it = el('div', 'it');
      it.appendChild(el('h5', null, 'v' + v.version));
      it.appendChild(el('p', null, new Date(v.savedAt).toLocaleString() + ' · ' + (v.code || '').split('\n').length + ' lines · ' +
        (v.comp ? v.comp.width + '×' + v.comp.height + ' · ' + v.comp.fps + ' fps' : '')));
      it.addEventListener('click', function () {
        closeModal();
        askDiscard('Load v' + v.version + '?', function () { loadProjectRecord(v); });
      });
      box.appendChild(it);
    });
    if (!list.length) box.appendChild(el('div', 'empty', 'No versions stored.'));
    body.appendChild(box);
    openModal('VERSIONS · ' + rec.name, body, [{ label: 'Close', fn: closeModal }]);
  });
}
function newProject(sampleId) {
  S.id = null; S.version = 1; S.created = new Date().toISOString();
  S.name = 'Untitled';
  S.meta = defaultMeta();
  S.results = S.results || [];
  var node = document.getElementById(sampleId || 'sample-starter');
  var src = node.textContent;
  S.name = node.dataset.title || 'Untitled';
  S.meta.title = S.name;
  S.meta.composition = 'Comp 1';
  S.meta.description = node.dataset.desc || '';
  S.comp = CORE.composition({
    duration: +node.dataset.dur || 10,
    loop: node.dataset.loop === '1',
    loopDuration: +node.dataset.loopdur || 10
  });
  $('#projName').value = S.name;
  $('#projVer').textContent = 'v1';
  S.frame = 0;
  edSetValue(src.replace(/^\n/, ''));
  S.code = Ed.ta.value;
  applyComp({});
  syncMetaUI();
  markDirty(false);
  return run();
}

/* ---------------- .tmotion ---------------- */
function toTmotion() {
  var c = S.comp;
  return {
    format: 'tmotion',
    formatVersion: 1,
    app: { name: SOFTWARE, version: APP_VERSION },
    project: { id: S.id, name: S.name, version: S.version, created: S.created, modified: new Date().toISOString() },
    source: { language: 'javascript', code: Ed.ta.value, sha256: S.hash || null },
    composition: {
      width: c.width, height: c.height, fps: c.fps, duration: c.frameCount / c.fps,
      frameCount: c.frameCount, pixelAspect: 1, colorSpace: 'srgb',
      background: c.background, transparent: !!c.transparent, seed: c.seed
    },
    loop: { enabled: !!c.loop, duration: c.loopDuration },
    timeRemap: { rate: c.speed, reverse: !!c.reverse },
    metadata: S.meta,
    exportPrefs: { format: S.exportFormat, quality: S.quality, timebase: S.timebase, checksums: S.checksums, customBitrateMbps: S.customBitrateMbps },
    frameModel: 'frameCount = round(duration * fps); frames 0..frameCount-1; time = frame / fps * rate'
  };
}
function exportProject() {
  var data = JSON.stringify(toTmotion(), null, 2);
  download(new Blob([data], { type: 'application/json' }), slugify(S.name) + '.tmotion');
  $('#stMsg').textContent = 'exported ' + slugify(S.name) + '.tmotion';
}
function importProject(file) {
  var fr = new FileReader();
  fr.onload = function () {
    var d;
    try { d = JSON.parse(fr.result); }
    catch (e) {
      openModal('IMPORT FAILED', elHTML('<div class="warnbox"><b>WHAT · the file is not valid JSON</b>WHY · ' + esc(e.message) +
        '\nHOW TO FIX · a .tmotion file is plain JSON; re-export it from the project that created it.</div>'), [{ label: 'Close', fn: closeModal }]);
      return;
    }
    if (!d || d.format !== 'tmotion') {
      openModal('IMPORT FAILED', elHTML('<div class="warnbox"><b>WHAT · not a TRILYVA project</b>WHY · the file has no <code>"format": "tmotion"</code> marker.' +
        '\nHOW TO FIX · open a file exported by this application. Adobe project files are a different, proprietary format and are not read here.</div>'), [{ label: 'Close', fn: closeModal }]);
      return;
    }
    var c = d.composition || {};
    loadProjectRecord({
      id: null,
      name: (d.project && d.project.name) || 'Imported',
      version: (d.project && d.project.version) || 1,
      created: (d.project && d.project.created) || new Date().toISOString(),
      modified: new Date().toISOString(),
      code: (d.source && d.source.code) || '',
      meta: d.metadata || defaultMeta(),
      comp: merge(c, {
        loop: d.loop ? !!d.loop.enabled : false,
        loopDuration: d.loop ? d.loop.duration : c.duration,
        speed: d.timeRemap ? d.timeRemap.rate : 1,
        reverse: d.timeRemap ? !!d.timeRemap.reverse : false
      }),
      exportPrefs: d.exportPrefs || {}
    });
    S.id = null;
    $('#stMsg').textContent = 'imported "' + S.name + '" — save it to keep it in this browser';
    markDirty(true);
  };
  fr.readAsText(file);
}

/* ============================================================
   Samples
   ============================================================ */
function sampleList() {
  return $$('script[type="text/plain"][id^="sample-"]').map(function (n) {
    return {
      id: n.id, title: n.dataset.title, desc: n.dataset.desc,
      loop: n.dataset.loop === '1', loopdur: +n.dataset.loopdur, dur: +n.dataset.dur,
      lines: n.textContent.replace(/^\n/, '').split('\n').length
    };
  });
}
function samplesDialog() {
  var body = el('div');
  body.appendChild(elHTML('<p class="note">Each example is a complete animation you can read and edit. Loading one replaces the editor contents and sets a matching duration and loop length.</p>'));
  var box = el('div', 'list');
  sampleList().forEach(function (s) {
    var it = el('div', 'it');
    it.appendChild(el('h5', null, s.title));
    it.appendChild(el('p', null, s.desc + ' · ' + s.lines + ' lines · ' + s.dur + ' s' + (s.loop ? ' · loops every ' + s.loopdur + ' s' : '')));
    it.addEventListener('click', function () {
      closeModal();
      askDiscard('Load "' + s.title + '"?', function () { newProject(s.id); });
    });
    box.appendChild(it);
  });
  body.appendChild(box);
  openModal('EXAMPLES', body, [{ label: 'Close', fn: closeModal }]);
}
/* Unsaved work is never dropped without asking. */
function askDiscard(title, onYes) {
  if (!S.dirty) { onYes(); return; }
  var body = elHTML('<p class="note">The current project has changes that are not saved. Saving appends a new version — nothing you already saved is overwritten.</p>');
  openModal(title, body, [
    { label: 'Save first', solid: true, fn: function () { closeModal(); saveProject().then(function () { onYes(); }); } },
    { label: 'Discard changes', fn: function () { closeModal(); onYes(); } },
    { label: 'Cancel', fn: closeModal }
  ]);
}

/* ============================================================
   Editor extras — replace, reindent, inspect, fullscreen
   ============================================================ */
function replaceOne() {
  if (Ed.matchIdx < 0 || !Ed.matches.length) return;
  var q = $('#findQ').value, r = $('#findR').value, p = Ed.matches[Ed.matchIdx];
  edSnapshot(true);
  Ed.ta.setRangeText(r, p, p + q.length, 'end');
  edChanged(true);
  runFind();
}
function replaceAll() {
  var q = $('#findQ').value, r = $('#findR').value;
  if (!q) return;
  edSnapshot(true);
  var n = Ed.matches.length;
  Ed.ta.value = Ed.ta.value.split(q).join(r);
  edChanged(true);
  runFind();
  $('#stMsg').textContent = 'replaced ' + n + ' occurrence' + (n === 1 ? '' : 's');
}
/* Deterministic two-space reindent driven by bracket depth. It never reflows a
   line's contents, so it cannot change what the code does. */
function reindent() {
  /* Changing leading whitespace inside a multi-line template literal would change
     the string itself, so refuse rather than quietly rewrite the animation. */
  if (Ed.ta.value.indexOf('`') >= 0) {
    $('#stMsg').textContent = 'reindent skipped — this file contains a template literal, and re-indenting could change what it holds';
    return;
  }
  var lines = Ed.ta.value.split('\n'), depth = 0, out = [];
  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i].trim();
    var opensAfter = 0, closesBefore = 0, inStr = null, seen = false;
    for (var j = 0; j < raw.length; j++) {
      var ch = raw[j];
      if (inStr) { if (ch === '\\') j++; else if (ch === inStr) inStr = null; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
      if (ch === '/' && raw[j + 1] === '/') break;
      if (ch === '{' || ch === '[' || ch === '(') { opensAfter++; seen = true; }
      if (ch === '}' || ch === ']' || ch === ')') { if (opensAfter > 0) opensAfter--; else if (!seen) closesBefore++; else opensAfter--; }
    }
    var here = Math.max(0, depth - closesBefore);
    if (/^[}\])]/.test(raw)) here = Math.max(0, depth - 1);
    out.push(raw ? new Array(here + 1).join('  ') + raw : '');
    depth = Math.max(0, here + opensAfter + (/^[}\])]/.test(raw) ? 0 : 0));
    if (/^[}\])]/.test(raw)) depth = Math.max(0, here + opensAfter);
  }
  edSnapshot(true);
  var sel = Ed.ta.selectionStart;
  Ed.ta.value = out.join('\n');
  Ed.ta.selectionStart = Ed.ta.selectionEnd = Math.min(sel, Ed.ta.value.length);
  edChanged(true);
  $('#stMsg').textContent = 'reindented ' + out.length + ' lines — nothing else was touched';
}

function inspectFrame() {
  withCompiled().then(function (ok) {
    if (!ok) return;
    var c = S.comp, f = S.frame;
    $('#stMsg').textContent = 'rendering frame ' + f + ' at full export resolution…';
    return Engine.api.renderOne(f, c.width, c.height).then(function (r) {
      if (!r.ok) { showRuntimeError(merge(r.error, { stage: 'render' })); return; }
      var cv = document.createElement('canvas');
      cv.width = c.width; cv.height = c.height;
      var g = cv.getContext('2d');
      if (r.bitmap) { g.drawImage(r.bitmap, 0, 0); r.bitmap.close(); }
      else g.drawImage(r.canvas, 0, 0);
      var tw = 64, th = Math.max(1, Math.round(64 * c.height / c.width));
      var tc = document.createElement('canvas'); tc.width = tw; tc.height = th;
      var tg = tc.getContext('2d'); tg.drawImage(cv, 0, 0, tw, th);
      var sum = ENC.fnv1a(tg.getImageData(0, 0, tw, th).data);

      var body = el('div');
      cv.style.cssText = 'width:100%;height:auto;display:block;border:1px solid var(--rule);background:' + (c.transparent ? 'transparent' : '#000');
      body.appendChild(cv);
      var h = '<dl class="kv">';
      h += '<dt>Frame</dt><dd>' + f + ' of ' + c.frameCount + '</dd>';
      h += '<dt>Source time</dt><dd>' + CORE.frameToSourceTime(c, f).toFixed(6) + ' s (frame / fps)</dd>';
      h += '<dt>Animation time</dt><dd>' + CORE.frameToTime(c, f).toFixed(6) + ' s' + (c.speed !== 1 ? ' (× ' + c.speed + ')' : '') + (c.reverse ? ' · reversed' : '') + '</dd>';
      h += '<dt>Timecode</dt><dd>' + timecode(f, c.fps) + '</dd>';
      h += '<dt>Raster</dt><dd>' + c.width + ' × ' + c.height + ' — the exact pixels an export would write</dd>';
      h += '<dt>Render time</dt><dd>' + (r.ms || 0).toFixed(2) + ' ms</dd>';
      h += '<dt>Fingerprint</dt><dd>' + sum + ' (FNV-1a over a 64 px thumbnail)</dd>';
      h += '<dt>Seed</dt><dd>' + c.seed + ' — reseeded at the start of this frame</dd>';
      h += '</dl><p class="note">This is the render path, not the preview path: the same call the exporter makes, at composition resolution.</p>';
      body.appendChild(elHTML(h));
      openModal('FRAME ' + f, body, [
        {
          label: 'Save this frame as PNG', solid: true, fn: function () {
            cv.toBlob(function (b) { download(b, slugify(S.name) + '_' + ('000000' + f).slice(-6) + '.png'); }, 'image/png');
          }
        },
        { label: 'Close', fn: closeModal }
      ]);
      $('#stMsg').textContent = 'frame ' + f + ' inspected at ' + c.width + '×' + c.height;
    });
  });
}

/* ---------------- frame intelligence ---------------- */
var FrameIntel = {
  cache: Object.create(null),
  categoryOrder: [
    'Abstract','Animals Wildlife','Arts','Backgrounds Textures','Beauty Fashion',
    'Buildings Landmarks','Business Finance','Celebrities','Education','Food Drink',
    'Healthcare Medical','Holidays','Industrial','Interiors','Miscellaneous','Nature',
    'Objects','Parks Outdoor','People','Religion','Science','Signs Symbols',
    'Sports Recreation','Technology','Transportation','Vintage'
  ],
  categoryTerms: {
    'Abstract':['abstract','geometry','geometric','gradient','fractal','prism','particle','kaleidoscope','symmetry','vortex','fluid','wave','glow'],
    'Animals Wildlife':['animal','wildlife','bird','cat','dog','horse','fish','butterfly','insect','mammal','reptile','panda','penguin','owl'],
    'Arts':['art','artistic','painting','drawing','sculpture','canvas','brush','watercolor','sketch','gallery','museum','illustration'],
    'Backgrounds Textures':['background','texture','pattern','wallpaper','backdrop','surface','seamless','grain','marble','fabric','paper','abstract'],
    'Beauty Fashion':['fashion','beauty','clothing','makeup','cosmetic','jewelry','dress','model','portrait','skincare','perfume'],
    'Buildings Landmarks':['building','architecture','landmark','skyscraper','tower','bridge','monument','house','office','hotel','city','skyline'],
    'Business Finance':['business','finance','office','startup','investment','banking','money','currency','accounting','commerce','marketing'],
    'Celebrities':['celebrity','actor','actress','singer','musician','performer','athlete','premiere','concert','entertainment','portrait'],
    'Education':['education','school','classroom','student','teacher','learning','study','book','library','university','graduation'],
    'Food Drink':['food','drink','meal','cooking','recipe','restaurant','fruit','vegetable','dessert','coffee','tea','bakery'],
    'Healthcare Medical':['healthcare','medical','medicine','doctor','nurse','hospital','clinic','patient','laboratory','wellness','pharmacy'],
    'Holidays':['holiday','christmas','halloween','easter','ramadan','diwali','wedding','birthday','festival','celebration','gift'],
    'Industrial':['industrial','factory','manufacturing','construction','engineering','machine','worker','steel','warehouse','logistics'],
    'Interiors':['interior','room','livingroom','bedroom','kitchen','bathroom','office','studio','furniture','decor','home'],
    'Miscellaneous':['object','item','collection','assortment','utility','household','product','package','tool','container'],
    'Nature':['nature','plant','flower','leaf','tree','forest','mountain','ocean','water','river','lake','garden','botanical','landscape'],
    'Objects':['object','bottle','box','book','cup','glass','vase','clock','phone','camera','laptop','keyboard','tool','package'],
    'Parks Outdoor':['park','outdoor','camping','hiking','trekking','picnic','gardening','playground','beach','trail','adventure'],
    'People':['person','people','portrait','woman','man','child','family','group','worker','professional','face','hand','community'],
    'Religion':['religion','spirituality','faith','prayer','worship','church','mosque','temple','synagogue','candle','cross','crescent'],
    'Science':['science','laboratory','chemistry','biology','physics','astronomy','microscope','molecule','atom','dna','planet','research'],
    'Signs Symbols':['sign','symbol','icon','logo','flag','arrow','badge','warning','direction','interface','emoji','emblem','pictogram'],
    'Sports Recreation':['sport','fitness','running','cycling','swimming','soccer','football','basketball','tennis','yoga','gym','athlete'],
    'Technology':['technology','computer','laptop','smartphone','software','code','programming','ai','robotics','network','database','server','circuit'],
    'Transportation':['transportation','car','automobile','truck','bus','train','airplane','aircraft','boat','ship','bicycle','motorcycle','road'],
    'Vintage':['vintage','retro','antique','classic','oldfashioned','sepia','nostalgia','heritage','historic','analog','film','grunge']
  }
};

function intelClamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function intelHsl(r,g,b){
  r/=255;g/=255;b/=255;
  var mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,h=0,s=0,l=(mx+mn)/2;
  if(d){
    s=l>.5?d/(2-mx-mn):d/(mx+mn);
    if(mx===r) h=(g-b)/d+(g<b?6:0);
    else if(mx===g) h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h/=6;
  }
  return [h,s,l];
}
function intelAnalyzePixels(data,w,h){
  var n=w*h, sumR=0,sumG=0,sumB=0,opaque=0,alphaMass=0,edge=0,bright=0,satSum=0;
  var bins=new Array(12).fill(0), occ=new Uint8Array(32*32), cx=0,cy=0,weight=0;
  for(var y=0;y<h;y++){
    for(var x=0;x<w;x++){
      var i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2],a=data[i+3]/255;
      if(a>.08){
        opaque++; alphaMass+=a; cx+=x*a; cy+=y*a; weight+=a;
        var hs=intelHsl(r,g,b); bins[Math.floor(hs[0]*12)%12]+=a;
        satSum+=hs[1]; bright+=hs[2];
      }
      var gx=Math.min(w-1,x+1), gy=Math.min(h-1,y+1);
      var j=(y*w+gx)*4,k=(gy*w+x)*4;
      edge+=Math.abs(r-data[j])+Math.abs(g-data[j+1])+Math.abs(b-data[j+2]);
      edge+=Math.abs(r-data[k])+Math.abs(g-data[k+1])+Math.abs(b-data[k+2]);
      if(a>.20) occ[Math.min(31,Math.floor(x/w*32))+Math.min(31,Math.floor(y/h*32))*32]=1;
    }
  }
  var components=0,seen=new Uint8Array(1024),q=new Int16Array(1024);
  for(var p=0;p<1024;p++){
    if(!occ[p]||seen[p])continue;
    components++; var head=0,tail=0;q[tail++]=p;seen[p]=1;
    while(head<tail){
      var z=q[head++],zx=z%32,zy=(z/32)|0;
      var nb=[z-1,z+1,z-32,z+32];
      for(var ni=0;ni<4;ni++){var zz=nb[ni];if(zz<0||zz>=1024)continue;var nx=zz%32,ny=(zz/32)|0;if(Math.abs(nx-zx)+Math.abs(ny-zy)!==1)continue;if(occ[zz]&&!seen[zz]){seen[zz]=1;q[tail++]=zz;}}
    }
  }
  var radial=0,samples=0;
  var cxp=weight?cx/weight:w/2,cyp=weight?cy/weight:h/2;
  for(var ry=1;ry<=12;ry++){
    for(var k2=0;k2<16;k2++){
      var ang=Math.PI*2*k2/16, x1=Math.round(cxp+Math.cos(ang)*ry*w/24), y1=Math.round(cyp+Math.sin(ang)*ry*h/24);
      var x2=Math.round(cxp-Math.cos(ang)*ry*w/24), y2=Math.round(cyp-Math.sin(ang)*ry*h/24);
      if(x1>=0&&x1<w&&y1>=0&&y1<h&&x2>=0&&x2<w&&y2>=0&&y2<h){
        var p1=(y1*w+x1)*4,p2=(y2*w+x2)*4;
        var a1=data[p1+3]/255,a2=data[p2+3]/255;
        var lum1=(.299*data[p1]+.587*data[p1+1]+.114*data[p1+2])/255;
        var lum2=(.299*data[p2]+.587*data[p2+1]+.114*data[p2+2])/255;
        radial += (1-Math.abs(lum1-lum2))*.82 + (1-Math.abs(a1-a2))*.18; samples++;
      }
    }
  }
  radial=samples?radial/samples:0;
  var huePeaks=[];
  for(var bi=0;bi<12;bi++) if(bins[bi] > n*.01) huePeaks.push(bi);
  var green=(bins[3]+bins[4]+bins[5])/(Math.max(1,alphaMass)),
      blue=(bins[7]+bins[8]+bins[9])/(Math.max(1,alphaMass)),
      warm=(bins[0]+bins[1]+bins[11])/(Math.max(1,alphaMass)),
      sat=satSum/Math.max(1,opaque), lum=bright/Math.max(1,opaque);
  var edgeNorm=edge/(Math.max(1,n)*1530*2);
  var transparency=1-opaque/n;
  var rectLike=intelClamp(1-Math.abs(components-1)/10,0,1);
  return {
    transparency:transparency, edgeDensity:intelClamp(edgeNorm,0,1),
    radialSymmetry:radial, components:components, saturation:intelClamp(sat,0,1),
    luminance:intelClamp(lum,0,1), greenRatio:intelClamp(green,0,1),
    blueRatio:intelClamp(blue,0,1), warmRatio:intelClamp(warm,0,1),
    centered:intelClamp(1-Math.hypot((cxp/w-.5)*2,(cyp/h-.5)*2),0,1),
    hueBins:huePeaks
  };
}
function intelClassify(f){
  var scores={};
  FrameIntel.categoryOrder.forEach(function(c){scores[c]=0;});
  scores['Abstract'] += f.radialSymmetry*5 + f.saturation*1.5 + (f.edgeDensity>.08?1:0) + (f.transparency>.15?1.5:0);
  scores['Nature'] += f.greenRatio*4 + f.blueRatio*1.5 + f.centered*0.5;
  scores['Animals Wildlife'] += f.warmRatio*1 + f.greenRatio*1.2 + (f.components>2?1:0);
  scores['People'] += f.warmRatio*1.8 + f.centered*1.2 + (f.edgeDensity>.05?1:0);
  scores['Technology'] += f.edgeDensity*5 + (f.saturation<.35?1.2:0) + (f.blueRatio*2);
  scores['Buildings Landmarks'] += f.edgeDensity*4 + (f.saturation<.4?1:0) + (f.components<5?1:0);
  scores['Backgrounds Textures'] += (f.edgeDensity<.055?3:0) + f.transparency*2 + (f.components>8?1:0);
  scores['Objects'] += f.centered*2 + (f.components<=3?2:0) + f.edgeDensity*2;
  scores['Arts'] += f.saturation*1.5 + f.edgeDensity*2;
  scores['Science'] += f.edgeDensity*1.5 + f.blueRatio*1.5;
  scores['Signs Symbols'] += f.centered*1.8 + f.edgeDensity*2 + (f.components<=4?1:0);
  scores['Sports Recreation'] += f.edgeDensity*1.2 + f.warmRatio*0.8;
  var best=FrameIntel.categoryOrder.slice().sort(function(a,b){return scores[b]-scores[a];});
  var top=best[0], second=best[1];
  var margin=scores[top]-scores[second];
  var confidence=intelClamp(.42+margin/8+f.radialSymmetry*.2,0.3,.97);
  var subject;
  if(top==='Nature' && f.greenRatio>.3) subject='botanical / natural visual';
  else if(top==='Technology' && f.edgeDensity>.12) subject='digital / technological graphic';
  else if(top==='Buildings Landmarks' && f.edgeDensity>.14) subject='architectural / structural scene';
  else if(top==='People' && f.warmRatio>.18) subject='portrait / human-centered visual';
  else if(top==='Animals Wildlife') subject='animal / wildlife-like visual';
  else if(top==='Objects') subject='isolated object / product-like visual';
  else if(top==='Abstract') subject=f.radialSymmetry>.72?'radial geometric abstract':'abstract graphic';
  else if(top==='Backgrounds Textures') subject='background / texture visual';
  else subject=top.toLowerCase()+' visual';
  return {category:top,runnerUp:second,confidence:confidence,subject:subject,scores:scores};
}
function intelHints(profile,f){
  var arr=[];
  arr.push(profile.subject);
  arr.push(profile.category.toLowerCase());
  if(f.radialSymmetry>.68) arr.push('symmetrical','radial','geometric');
  if(f.transparency>.12) arr.push('transparent','translucent','isolated');
  if(f.saturation>.58) arr.push('colorful','vibrant','multicolor');
  if(f.edgeDensity>.12) arr.push('detailed','high contrast','graphic');
  if(f.edgeDensity<.055) arr.push('soft','minimal','background');
  if(f.greenRatio>.28) arr.push('green','botanical','organic');
  if(f.blueRatio>.28) arr.push('blue','cool tones','luminous');
  if(f.warmRatio>.28) arr.push('warm colors','golden','red');
  if(f.centered>.76) arr.push('centered','isolated','composition');
  return arr;
}
function intelKeywordCandidates(profile,hints){
  var out=[],seen=Object.create(null);
  var terms=(FrameIntel.categoryTerms[profile.category]||[]).concat(hints.map(function(x){return x.toLowerCase();}));
  function add(q,score){
    q=String(q||'').trim().replace(/\\s+/g,' ');
    if(!q||q.length<3||seen[q])return;
    seen[q]=1;out.push({q:q,score:score});
  }
  terms.forEach(function(t,i){ add(t,100-i); });
  var pairs=[
    ['abstract','geometric'],['translucent','gradient'],['digital','creative'],
    ['nature','botanical'],['modern','minimal'],['luminous','glowing'],
    ['isolated','copy space'],['vibrant','colorful'],['symmetrical','centered'],
    ['professional','design'],['background','texture']
  ];
  pairs.forEach(function(p){ if(terms.indexOf(p[0])>=0||terms.indexOf(p[1])>=0) add(p[0]+' '+p[1],60); });
  return out;
}
async function intelCorpusPhrases(profile,hints){
  var catIndex=FrameIntel.categoryOrder.indexOf(profile.category);
  if(catIndex<0) return [];
  var start=catIndex*200000, end=start+199999;
  var first=Math.floor(start/500000)+1,last=Math.floor(end/500000)+1;
  var urls=[];
  for(var si=first;si<=last;si++) urls.push('./keyword-library/keywords_'+('0'+si).slice(-2)+'.txt');
  var want=hints.map(function(x){return x.toLowerCase();}).concat(FrameIntel.categoryTerms[profile.category]||[]);
  var hits=[];
  for(var ui=0;ui<urls.length;ui++){
    try{
      var resp=await fetch(urls[ui],{cache:'force-cache'});
      if(!resp.ok) continue;
      if(!resp.body) continue;
      var reader=resp.body.getReader(),decoder=new TextDecoder(),buf='',lineNo=0;
      while(true){
        var chunk=await reader.read();
        if(chunk.done){buf+=decoder.decode();} else buf+=decoder.decode(chunk.value,{stream:true});
        var lines=buf.split(/\\r?\\n/); buf=lines.pop()||'';
        for(var li=0;li<lines.length;li++){
          var line=lines[li].trim(); lineNo++;
          if(!line)continue;
          var low=line.toLowerCase(),score=0;
          want.forEach(function(term){ if(term && low.indexOf(term)>=0) score+= term.length>8?3:2; });
          if(low.indexOf(profile.category.toLowerCase().split(' ')[0])>=0) score+=3;
          if(score>0) hits.push({q:line,score:score+(1/(1+line.length/100))});
        }
        if(chunk.done) break;
        if(hits.length>2400) break;
      }
      try{await reader.cancel();}catch(_){}
    }catch(_){}
  }
  hits.sort(function(a,b){return b.score-a.score;});
  var seen=Object.create(null),ded=[];
  for(var i=0;i<hits.length&&ded.length<50;i++) if(!seen[hits[i].q]){seen[hits[i].q]=1;ded.push(hits[i]);}
  return ded;
}
async function identifyFrame(){
  var box=$('#frameIntel'),btn=$('#identifyFrameBtn');
  if(!box||!S.comp)return;
  btn.disabled=true; btn.textContent='ANALYZING FRAME…';
  box.innerHTML='<div class="note">Rendering the exact current frame and reading its pixels…</div>';
  try{
    var ok=await withCompiled();
    if(!ok) throw new Error('Animation does not compile.');
    var c=S.comp,f=S.frame,w=256,h=Math.max(1,Math.round(256*c.height/c.width));
    var r=await Engine.api.renderOne(f,w,h);
    if(!r||!r.ok) throw new Error(r&&r.error?r.error.message:'Frame render failed.');
    var cv=document.createElement('canvas');cv.width=w;cv.height=h;
    var g=cv.getContext('2d',{willReadFrequently:true});
    if(r.bitmap){g.drawImage(r.bitmap,0,0,w,h);r.bitmap.close();}else if(r.canvas)g.drawImage(r.canvas,0,0,w,h);else throw new Error('Renderer returned no pixels.');
    var features=intelAnalyzePixels(g.getImageData(0,0,w,h).data,w,h);
    var cls=intelClassify(features),hints=intelHints(cls,features);
    var corpus=await intelCorpusPhrases(cls,hints);
    var candidates=corpus.length?corpus:intelKeywordCandidates(cls,hints);
    while(candidates.length<50){
      var fallback=intelKeywordCandidates(cls,hints);
      for(var k=0;k<fallback.length&&candidates.length<50;k++){
        if(!candidates.some(function(x){return x.q===fallback[k].q;})) candidates.push(fallback[k]);
      }
      if(candidates.length>=50)break;
      var extras=['stock','commercial','creative','visual','design','artwork','motion','animation','4k','high quality','copy space'];
      extras.forEach(function(x){if(candidates.length<50&&!candidates.some(function(y){return y.q===x;}))candidates.push({q:x,score:5});});
      break;
    }
    candidates=candidates.slice(0,50);
    var html='<div class="intel-card"><div class="intel-title">'+esc(cls.subject)+'</div>';
    html+='<dl class="kv"><dt>Category</dt><dd>'+esc(cls.category)+'</dd>';
    html+='<dt>Confidence</dt><dd>'+Math.round(cls.confidence*100)+'%</dd>';
    html+='<dt>Runner-up</dt><dd>'+esc(cls.runnerUp)+'</dd>';
    html+='<dt>Transparency</dt><dd>'+Math.round(features.transparency*100)+'%</dd>';
    html+='<dt>Edge density</dt><dd>'+features.edgeDensity.toFixed(3)+'</dd>';
    html+='<dt>Radial symmetry</dt><dd>'+features.radialSymmetry.toFixed(3)+'</dd>';
    html+='<dt>Objects/regions</dt><dd>'+features.components+'</dd>';
    html+='</dl><div class="intel-title" style="margin-top:10px">VISUAL HINTS</div><div class="intel-chips">';
    hints.forEach(function(h){html+='<span class="intel-chip">'+esc(h)+'</span>';});
    html+='</div><div class="intel-title" style="margin-top:10px">50 STOCK KEYWORDS / PHRASES</div><div class="intel-keywords">';
    candidates.forEach(function(k,i){html+='<div><b>'+String(i+1).padStart(2,'0')+'</b>'+esc(k.q)+'</div>';});
    html+='</div></div>';
    box.innerHTML=html;
    S.frameIntel={frame:f,features:features,classification:cls,hints:hints,keywords:candidates.map(function(x){return x.q;}),source:corpus.length?'5M corpus':'heuristic fallback'};
    $('#stMsg').textContent='identified frame '+f+' · '+cls.subject+' · '+(corpus.length?'5M keyword corpus':'fallback keyword set');
  }catch(e){
    box.innerHTML='<div class="warnbox"><b>IDENTIFIER FAILED</b>'+esc(String(e&&e.message||e))+'</div>';
    $('#stMsg').textContent='frame intelligence failed';
  }finally{
    btn.disabled=false;btn.textContent='IDENTIFY CURRENT FRAME';
  }
}

function toggleFullscreen() {
  var t = $('#panePreview');
  if (document.fullscreenElement) { document.exitFullscreen(); return; }
  if (t.requestFullscreen) t.requestFullscreen().then(function () {
    setTimeout(function () { computeRaster(); sizeCanvasFrame(); requestPreview(true); }, 120);
  }).catch(function (e) { $('#stMsg').textContent = 'fullscreen refused: ' + e.message; });
  else $('#stMsg').textContent = 'this browser does not expose the Fullscreen API';
}

/* ============================================================
   Optional toy — runs on the idle main thread only
   ============================================================ */
var Toy = { on: false, raf: 0, last: 0, px: .5, py: .5, dots: [], score: 0, best: 0, t: 0 };
function toyShow(on) {
  var wrap = $('#toyWrap');
  if (on) {
    if (S.toyEnabled === false) return;
    if (!S.activeJob || S.activeJob.composition.frameCount < 90) return;
    wrap.style.display = '';
    $('#toyNote').textContent = Engine.mode === 'worker'
      ? 'The renderer owns a separate thread. This runs on the idle main thread and cannot slow it down.'
      : 'This browser has no worker path, so the renderer is sharing this thread — the toy is capped to a few frames a second and yields to every rendered frame.';
    toyStart();
  } else { wrap.style.display = 'none'; toyStop(); }
}
function toyStart() {
  if (Toy.on) return;
  Toy.on = true; Toy.score = 0; Toy.t = 0; Toy.dots = [];
  var cv = $('#toy');
  cv.addEventListener('pointermove', toyMove);
  cv.addEventListener('pointerdown', toyMove);
  Toy.raf = requestAnimationFrame(toyTick);
}
function toyStop() {
  Toy.on = false;
  if (Toy.raf) cancelAnimationFrame(Toy.raf);
  var cv = $('#toy');
  cv.removeEventListener('pointermove', toyMove);
  cv.removeEventListener('pointerdown', toyMove);
}
function toyMove(ev) {
  var b = $('#toy').getBoundingClientRect();
  Toy.px = (ev.clientX - b.left) / b.width;
  Toy.py = (ev.clientY - b.top) / b.height;
}
function toyTick(ts) {
  if (!Toy.on) return;
  Toy.raf = requestAnimationFrame(toyTick);
  var budget = Engine.mode === 'worker' ? 33 : 120;
  if (ts - Toy.last < budget) return;
  var dt = Math.min(0.2, (ts - Toy.last) / 1000);
  Toy.last = ts;
  Toy.t += dt;
  var cv = $('#toy'), g = cv.getContext('2d');
  var W = cv.width, H = cv.height;
  if (Toy.dots.length < 26 && Math.random() < 0.55) {
    Toy.dots.push({ x: Math.random() * W, y: -12, v: 40 + Math.random() * 90, r: 3 + Math.random() * 7, d: (Math.random() - 0.5) * 30 });
  }
  g.fillStyle = '#08080a'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.07)';
  g.beginPath();
  for (var gx = 0; gx <= W; gx += 30) { g.moveTo(gx + .5, 0); g.lineTo(gx + .5, H); }
  g.stroke();
  var cx = Toy.px * W, cy = Toy.py * H, hit = false;
  for (var i = Toy.dots.length - 1; i >= 0; i--) {
    var d = Toy.dots[i];
    d.y += d.v * dt; d.x += d.d * dt;
    if (d.y > H + 14) { Toy.dots.splice(i, 1); Toy.score++; continue; }
    var dx = d.x - cx, dy = d.y - cy;
    if (dx * dx + dy * dy < (d.r + 5) * (d.r + 5)) hit = true;
    g.fillStyle = 'rgba(255,255,255,' + (0.25 + d.r / 20) + ')';
    g.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
  }
  if (hit) { Toy.best = Math.max(Toy.best, Toy.score); Toy.score = 0; Toy.dots.length = 0; }
  g.fillStyle = hit ? '#000' : '#fff';
  g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.55)';
  g.font = '11px ui-monospace, monospace';
  g.fillText('DODGED ' + Toy.score + '   BEST ' + Toy.best, 8, 16);
}

/* ============================================================
   Layout — splitters, resize, cursor
   ============================================================ */
function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
function initSplitters() {
  var work = $('#work');
  var codeW = 0, railW = 344;
  function apply() {
    if (window.innerWidth <= 860) { work.style.gridTemplateColumns = ''; return; }
    work.style.gridTemplateColumns = codeW + 'px 1px minmax(240px,1fr) 1px ' + railW + 'px';
    computeRaster(); sizeCanvasFrame(); edLayout(); drawRuler();
  }
  function drag(rule, onMove) {
    rule.addEventListener('pointerdown', function (ev) {
      if (window.innerWidth <= 860) return;
      if (!codeW) codeW = Math.round($('#paneCode').getBoundingClientRect().width);
      rule.setPointerCapture(ev.pointerId);
      rule.classList.add('drag');
      var startX = ev.clientX, c0 = codeW, r0 = railW;
      function move(e) { onMove(e.clientX - startX, c0, r0); apply(); }
      function up() {
        rule.classList.remove('drag');
        rule.removeEventListener('pointermove', move);
        rule.removeEventListener('pointerup', up);
      }
      rule.addEventListener('pointermove', move);
      rule.addEventListener('pointerup', up);
    });
  }
  drag($('#rule1'), function (dx, c0) { codeW = cl(c0 + dx, 200, work.clientWidth - railW - 280); });
  drag($('#rule2'), function (dx, c0, r0) { railW = cl(r0 - dx, 280, Math.min(640, work.clientWidth - codeW - 280)); });
}
function initCursor() {
  var cur = $('#cursor');
  document.addEventListener('pointermove', function (e) {
    if (!S.cursorOn) return;
    cur.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
  }, { passive: true });
  $('#uiCursor').addEventListener('change', function () {
    S.cursorOn = $('#uiCursor').checked;
    document.body.classList.toggle('has-cursor', S.cursorOn);
    document.body.style.cursor = S.cursorOn ? 'none' : '';
  });
  $('#uiMotion').addEventListener('change', function () {
    document.body.classList.toggle('noui-motion', !$('#uiMotion').checked);
  });
}

/* ============================================================
   Keyboard
   ============================================================ */
function typing(t) {
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}
function initShortcuts() {
  document.addEventListener('keydown', function (ev) {
    var meta = ev.metaKey || ev.ctrlKey, k = ev.key;
    if (k === 'Escape') {
      if (S.modalOpen) { closeModal(); return; }
      if (!$('#find').classList.contains('hide')) { closeFind(); return; }
    }
    if (meta && k === 'Enter') { ev.preventDefault(); run(); return; }
    if (meta && k.toLowerCase() === 's') { ev.preventDefault(); saveProject(ev.shiftKey ? 'as' : null); return; }
    if (meta && k.toLowerCase() === 'o') { ev.preventDefault(); openProjectDialog(); return; }
    if (meta && k.toLowerCase() === 'r' && ev.shiftKey) {
      ev.preventDefault();
      withCompiled().then(function (ok) { if (ok) startRender(buildJob()); });
      return;
    }
    if (typing(ev.target)) return;
    if (k === ' ') { ev.preventDefault(); togglePlay(); return; }
    if (k === 'ArrowLeft') { ev.preventDefault(); setFrame(S.frame - (ev.shiftKey ? S.comp.fps : 1)); return; }
    if (k === 'ArrowRight') { ev.preventDefault(); setFrame(S.frame + (ev.shiftKey ? S.comp.fps : 1)); return; }
    if (k === 'Home') { ev.preventDefault(); setFrame(0); return; }
    if (k === 'End') { ev.preventDefault(); setFrame(S.comp.frameCount - 1); return; }
    if (k === '[') { setFrame(S.frame - S.comp.fps); return; }
    if (k === ']') { setFrame(S.frame + S.comp.fps); return; }
  });
}

/* ============================================================
   Docs
   ============================================================ */
var DOCS = [
  '<h5>THE ONE RULE</h5>',
  '<p>The live preview is not the render. The preview draws whatever frame it can, as fast as it can, at whatever raster fits your screen. The render walks <code>frame = 0 … frameCount-1</code> and evaluates your code at <code>time = frame / fps</code> for every single one. Slow is fine. Wrong is not.</p>',

  '<h5>QUICK START</h5>',
  '<p>Write a function, press Run, scrub the timeline, press Render. Open <b>Examples</b> for ten complete animations to read or take apart.</p>',
  '<pre>window.renderFrame = function (time, frame, fps, ctx, width, height) {\n  ctx.fillStyle = "#000";\n  ctx.fillRect(0, 0, width, height);\n  var x = width * 0.5 + Math.cos(time * 2) * 200;\n  ctx.fillStyle = "#fff";\n  ctx.beginPath();\n  ctx.arc(x, height * 0.5, 40, 0, Math.PI * 2);\n  ctx.fill();\n};</pre>',
  '<p>Fewer arguments are fine — <code>function (time, frame, fps, ctx, width, height)</code> is the full contract, and you can declare only the ones you need. An optional <code>window.setup(ctx, width, height)</code> runs once per compile.</p>',

  '<h5>THE MOTION API</h5>',
  '<p>Everything below is available as a global inside your animation. None of it is required — plain <code>Math</code> and the 2D context are enough.</p>',
  '<table><tr><th>Call</th><th>Does</th></tr>',
  '<tr><td><code>motion.time</code> · <code>motion.frame</code> · <code>motion.fps</code></td><td>Current animation time (seconds), frame index, frame rate.</td></tr>',
  '<tr><td><code>motion.duration</code> · <code>motion.frameCount</code></td><td>Composition length in seconds and in frames.</td></tr>',
  '<tr><td><code>motion.progress</code></td><td>0 → 1 across the whole composition.</td></tr>',
  '<tr><td><code>motion.loopProgress</code></td><td>0 → 1 across one loop, never reaching 1, so the wrap frame is not a duplicate.</td></tr>',
  '<tr><td><code>motion.width</code> · <code>motion.height</code> · <code>motion.center</code></td><td>Composition pixels — always composition size, even while the preview rasterises smaller.</td></tr>',
  '<tr><td><code>random()</code> · <code>randomRange(a,b)</code> · <code>randomInt(a,b)</code> · <code>pick(arr)</code></td><td>Seeded generator, reseeded at the start of every frame.</td></tr>',
  '<tr><td><code>noise(x,y,z)</code> · <code>fbm(x,y,z,octaves)</code></td><td>Deterministic value noise and fractal sum, −1 → 1.</td></tr>',
  '<tr><td><code>lerp</code> · <code>clamp</code> · <code>map</code> · <code>mix</code> · <code>wrap</code> · <code>pingpong</code></td><td>The usual arithmetic helpers.</td></tr>',
  '<tr><td><code>smoothstep</code> · <code>smootherstep</code></td><td>Hermite ramps.</td></tr>',
  '<tr><td><code>ease(name, t)</code> · <code>easings</code></td><td>Sine, quad, cubic, quart, quint, expo, circ, back, elastic and bounce, in in/out/inOut form.</td></tr>',
  '<tr><td><code>spring(t, opts)</code></td><td>Analytic damped spring — evaluated from <code>t</code> alone, so it is the same value at any point in any order.</td></tr>',
  '<tr><td><code>motion.simulation(step, state)</code></td><td>Fixed-step physics at exactly 1/fps. Scrubbing backwards replays from frame 0 so the result never depends on how you got there.</td></tr>',
  '<tr><td><code>TAU</code> · <code>PI</code></td><td>Constants.</td></tr>',
  '</table>',

  '<h5>DETERMINISM</h5>',
  '<p>Any frame must be renderable on its own. The generator is reseeded at the start of every frame from <code>seed + frame</code>, so <code>random()</code> returns the same sequence for frame 900 whether you scrubbed to it, played into it, or exported straight to it. Reading <code>Date.now()</code>, <code>Math.random()</code> or your own accumulating variables breaks that, and the render will not match the preview.</p>',
  '<p><code>motion.simulation()</code> exists for real physics: it steps a fixed <code>1/fps</code> and rebuilds from frame 0 whenever you move backwards. It is slower to scrub and exactly reproducible.</p>',

  '<h5>THE COMPOSITION MODEL</h5>',
  '<p>One model feeds the preview, the timeline, the analyser and the exporter — there is no second copy to drift.</p>',
  '<pre>frameCount = round(duration × fps)\nframes     = 0 … frameCount − 1\nsourceTime = frame / fps\ntime       = sourceTime × rate      (reversed if requested)\noutput len = frameCount / fps</pre>',
  '<p>At 60 fps for 30 s that is 1800 frames, the last one at 29.983 s, and a file 30.000 s long. The wrap frame — index <code>frameCount</code> — is deliberately never rendered, because writing it would duplicate frame 0 on every loop.</p>',

  '<h5>LOOPING</h5>',
  '<p>Turning loop on does not make an animation loop. It tells your code how long the cycle is, through <code>motion.loopProgress</code>, and marks the band on the timeline. An animation loops only if every term in it is periodic over that length — sample angles on a circle, use <code>noise</code> on a circular path, avoid anything that only ever grows.</p>',
  '<p><b>Analyse seam</b> renders frame 0 and the wrap frame and compares them pixel by pixel. MATCH means identical at the sampled resolution. MISMATCH means the animation genuinely does not close — shortening the duration will not fix it.</p>',

  '<h5>TIME REMAPPING</h5>',
  '<p>Rate and reverse are part of the time model, not playback tricks. At 0.25× the exporter still writes every frame at the full frame rate; it simply evaluates your code at a quarter of the time. Frame 0 and the last frame are shown in the Loop · Time panel so you can see exactly what will be sampled.</p>',

  '<h5>EXPORT — WHAT IS REAL</h5>',
  '<table><tr><th>Format</th><th>Status</th></tr>',
  '<tr><td>MP4 (H.264 / AVC)</td><td>Real. Frames go to the browser\'s WebCodecs H.264 encoder one at a time, and the ISO-BMFF container is written here \u2014 ftyp, mdat and a moov whose sample tables are built from the encoder\'s own output. The avcC record is copied verbatim from the encoder, so the sample description cannot disagree with the samples.</td></tr>',
  '<tr><td>WebM (VP9 / VP8)</td><td>Real. Frames go to the browser\'s WebCodecs encoder one at a time with timestamps derived from the frame index, and the Matroska container is written here — clusters, cues, duration and tags.</td></tr>',
  '<tr><td>PNG sequence → ZIP</td><td>Real. Every frame encoded losslessly, stored in a ZIP written here, with <code>manifest.json</code> and a README carrying the frame rate and an ffmpeg line. 4 GB ceiling.</td></tr>',
  '<tr><td>PNG sequence → folder</td><td>Real where the File System Access API exists. Frames are written straight to disk, so size is limited only by the drive.</td></tr>',
  '<tr><td>GIF</td><td>Not available. A real GIF needs quantisation and dithering that would change your pixels without telling you.</td></tr>',
  '<tr><td>Transparent WebM or MP4</td><td>Not available. Neither muxer writes an alpha plane, so a transparent composition must be exported as PNG.</td></tr>',
  '<tr><td>MediaRecorder capture</td><td>Present in the browser, deliberately unused. It records wall-clock time and drops or repeats frames under load.</td></tr>',
  '</table>',

  '<h5>THE MP4 PATH</h5>',
  '<p>H.264 support is a runtime fact, not an assumption. Before anything is rendered the app asks the browser about the real composition \u2014 width, height, frame rate and the validated bitrate \u2014 walking High, Main and Constrained Baseline at descending levels through <code>VideoEncoder.isConfigSupported</code>. The first configuration the browser actually accepts is the one used, and its exact codec string is shown in the Render panel and in Diagnostics. If nothing is accepted, the panel says so with the resolution and frame rate that were refused, and offers only the alternatives it has just confirmed on this machine.</p>',
  '<p>Each frame is drawn to the export render target \u2014 <code>canvas#render-target</code> on the main-thread path, an OffscreenCanvas inside the worker \u2014 and a <code>VideoFrame</code> is built from that canvas, never from the document, an iframe or any other DOM node. Its timestamp is <code>round(frame \u00D7 1000000 / fps)</code>, so no rounded milliseconds are ever accumulated. The frame is closed immediately after <code>encode()</code>: only the compressed samples are kept, never 1800 bitmaps.</p>',
  '<p>The encode queue is watched rather than flooded. The renderer waits whenever <code>encodeQueueSize</code> rises above a few frames, which is what keeps 4K at 60 fps inside memory instead of building a queue thousands of frames deep.</p>',
  '<p>Frame 0 is always a keyframe; after that one lands every two seconds. The media timescale is <code>fps \u00D7 1000</code> and every sample lasts exactly 1000 ticks, so 1800 frames at 60 fps declare 30.000 s and not 30.6 s.</p>',
  '<p>If the encoder returns a different number of samples than the renderer produced, no file is written at all \u2014 a container with the wrong sample count would be wrong in a way nobody would notice until much later.</p>',

  '<h5>VERIFICATION</h5>',
  '<p>When a render finishes, the file is read back and parsed. For MP4 that means walking the box tree of the bytes that were just written: ftyp, mdat and moov must all be present, the sample description must be an <code>avc1</code> entry carrying an <code>avcC</code> record, and the sample count in <code>stsz</code>, the sample count in <code>stts</code> and the number of entries in <code>stco</code> must all agree with the number of frames requested. Every chunk offset is checked to land inside mdat and to ascend, every sample duration is checked to be positive, the declared duration is compared against <code>frameCount / fps</code>, the dimensions are read back out of <code>tkhd</code>, and the first sample must be listed in <code>stss</code>. For WebM it means counting SimpleBlocks in the clusters and checking that timestamps rise monotonically. For a ZIP it means walking the central directory. The numbers shown after a render come from the bytes, not from the renderer\'s own counters \u2014 if they disagree, the render is reported INVALID and EXPORT VERIFIED is not shown.</p>',
  '<p>With frame checksums on, every frame is fingerprinted at 64 px and identical neighbours are counted, which is how a frozen animation shows up even when the frame count is perfect.</p>',

  '<h5>METADATA</h5>',
  '<p>The Metadata panel lists every field as EMBEDDED, PROJECT-ONLY or UNSUPPORTED for the current format, and the list changes when the format does. Nothing is claimed that is not written. Colour space is the honest example: this pipeline has no way to know what the canvas actually produced, so no Colour element is written and the field is marked UNSUPPORTED rather than guessed.</p>',
  '<p>Rendered output contains your frames and nothing else: no watermark, no title card, no interface, no branding.</p>',

  '<h5>QUEUE</h5>',
  '<p>Adding to the queue freezes a copy of the code, composition, loop settings, metadata and output format. Editing the project afterwards has no effect on a job already queued. Jobs run one at a time, and each is verified separately.</p>',

  '<h5>KEYBOARD</h5>',
  '<table><tr><th>Key</th><th>Action</th></tr>',
  '<tr><td><code>⌘ / Ctrl + Enter</code></td><td>Run</td></tr>',
  '<tr><td><code>Space</code></td><td>Play / pause</td></tr>',
  '<tr><td><code>← →</code></td><td>Step one frame  ·  with Shift, one second</td></tr>',
  '<tr><td><code>[ ]</code></td><td>Step one second</td></tr>',
  '<tr><td><code>Home / End</code></td><td>First / last frame</td></tr>',
  '<tr><td><code>⌘ / Ctrl + S</code></td><td>Save  ·  with Shift, Save As</td></tr>',
  '<tr><td><code>⌘ / Ctrl + O</code></td><td>Open</td></tr>',
  '<tr><td><code>⌘ / Ctrl + Shift + R</code></td><td>Render every frame</td></tr>',
  '<tr><td><code>⌘ / Ctrl + F</code></td><td>Find in the editor</td></tr>',
  '<tr><td><code>⌘ / Ctrl + Z</code></td><td>Undo  ·  with Shift, redo</td></tr>',
  '<tr><td><code>Esc</code></td><td>Close a dialog or the find bar</td></tr>',
  '</table>',

  '<h5>STORAGE</h5>',
  '<p>Projects live in IndexedDB in this browser. Every save appends a new version rather than overwriting the last one, so you can go back. Nothing is uploaded anywhere: after the page loads there are no network requests at all.</p>',
  '<p><code>.tmotion</code> is plain JSON — source, composition, loop, time model, metadata and export preferences. It is readable, diffable and designed so another renderer could consume it.</p>',

  '<h5>ISOLATION</h5>',
  '<p>Where the browser allows it, your code runs in a worker with no DOM and draws to an OffscreenCanvas. In both paths the network and storage globals — <code>fetch</code>, <code>XMLHttpRequest</code>, <code>WebSocket</code>, <code>indexedDB</code>, <code>localStorage</code>, <code>document</code>, <code>window</code> and friends — are shadowed inside the animation scope. That is a guard rail against accidents, not an operating-system sandbox: only run code you would be willing to run yourself.</p>',

  '<h5>LIMITS WORTH KNOWING</h5>',
  '<ul>',
  '<li>No audio. There is no audio track, no waveform and no sync, so none is implied.</li>',
  '<li>H.264 is not universal. Where the browser has no H.264 encoder, the MP4 path reports that and the PNG sequence remains the way out.</li>',
  '<li>No GIF, no ProRes, no alpha in MP4 or WebM. See the export table above.</li>',
  '<li>No fonts are loaded. Generic families only, so a render never waits on a network fetch.</li>',
  '<li>Service workers cannot be registered from this hosted page. Download the app and serve it yourself for offline install.</li>',
  '<li>A background tab may be throttled by the browser. Long renders want a visible tab.</li>',
  '<li>Verification proves the container is consistent with the request. It cannot prove that your animation is what you intended.</li>',
  '</ul>',

  '<h5>WHEN SOMETHING BREAKS</h5>',
  '<p>Errors say what happened, where, why and what to do about it. A compile error points at a line; a runtime error names the frame and the time as well as the line, because the same code can be fine at frame 0 and divide by zero at frame 900. If the preview and the export disagree, the cause is almost always non-determinism — search your code for <code>Math.random</code>, <code>Date</code>, or a variable that accumulates between frames.</p>'
].join('');

/* ============================================================
   Actions
   ============================================================ */
var ACTS = {
  'new': function () {
    askDiscard('Start a new project?', function () { newProject('sample-starter'); });
  },
  open: openProjectDialog,
  save: function (ev) { saveProject(ev && ev.shiftKey ? 'as' : null); },
  samples: samplesDialog,
  library: openTrilyvaLibrary,
  run: function () { run(); },
  render: function () {
    showTab('p-render'); showMobile('rail');
    withCompiled().then(function (ok) { if (ok) analyseJob(); });
  },
  startRender: function () { withCompiled().then(function (ok) { if (ok) startRender(buildJob()); }); },
  cancelRender: cancelRender,
  analyze: analyseJob,
  identifyFrame: identifyFrame,
  analyzeSource: analyzeSource,
  clearSource: clearSource,
  pasteSource: pasteSource,
  analyzeLoop: analyseLoop,
  testMenu: testMenu,
  queueAdd: queueAdd,
  queueRun: runQueue,
  queueClear: function () {
    S.queue = S.queue.filter(function (j) { return j.status === 'READY' || j.status === 'RENDERING'; });
    renderQueue();
  },
  copyMeta: function () { copyText(JSON.stringify(metadataReceipt(), null, 2), 'metadata copied as JSON'); },
  exportProject: exportProject,
  importProject: function () { $('#filePick').click(); },
  saveSelf: function () {
    download(new Blob([SELF_SOURCE], { type: 'text/html' }), 'trilyva-tamasrazim.html');
    $('#stMsg').textContent = 'downloaded the application as a single HTML file';
  },
  recheck: function () { refreshDiag(); $('#stMsg').textContent = 're-checked capabilities'; },
  play: togglePlay,
  stepBack: function () { pause(); setFrame(S.frame - 1); },
  stepFwd: function () { pause(); setFrame(S.frame + 1); },
  toStart: function () { setFrame(0); },
  toEnd: function () { setFrame(S.comp.frameCount - 1); },
  loop: function () {
    S.loopPlayback = !S.loopPlayback;
    $('#loopBtn').classList.toggle('on', S.loopPlayback);
    $('#stMsg').textContent = S.loopPlayback ? 'playback loops' : 'playback stops at the last frame';
  },
  cmpToggle: toggleCompare,
  inspect: inspectFrame,
  full: toggleFullscreen,
  find: openFind,
  findClose: closeFind,
  findNext: function () { stepMatch(1); },
  findPrev: function () { stepMatch(-1); },
  replaceOne: replaceOne,
  replaceAll: replaceAll,
  fmtIndent: reindent,
  undo: edUndo,
  redo: edRedo,
  modalClose: closeModal,
  toyOff: function () { S.toyEnabled = false; toyShow(false); },
  gotoErr: function () { if (S.lastError && S.lastError.line) edGoToLine(S.lastError.line); }
};
function initDispatch() {
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    while (t && t !== document.body && !(t.dataset && t.dataset.act)) t = t.parentNode;
    if (!t || !t.dataset || !t.dataset.act) return;
    var fn = ACTS[t.dataset.act];
    if (!fn) return;
    ev.preventDefault();
    fn(ev);
  });
  $('#modal').addEventListener('click', function (ev) { if (ev.target === $('#modal')) closeModal(); });
  $('#filePick').addEventListener('change', function () {
    if (this.files && this.files[0]) importProject(this.files[0]);
    this.value = '';
  });
  $('#findQ').addEventListener('input', runFind);
  $('#findQ').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { ev.preventDefault(); stepMatch(ev.shiftKey ? -1 : 1); }
  });
  $('#projName').addEventListener('input', function () {
    S.name = $('#projName').value || 'Untitled';
    markDirty(); syncFileName();
  });
  $('#cmpLine').addEventListener('pointerdown', function (ev) {
    var frame = $('#canvasFrame');
    function move(e) {
      var b = frame.getBoundingClientRect();
      S.compareSplit = cl((e.clientX - b.left) / b.width, 0.02, 0.98);
      updateCompare();
    }
    function up() { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    ev.preventDefault();
  });
  window.addEventListener('resize', function () {
    clearTimeout(S.resizeTimer);
    S.resizeTimer = setTimeout(function () {
      computeRaster(); sizeCanvasFrame(); drawRuler(); edLayout(); syncFrameUI();
      requestPreview(true);
    }, 90);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && S.playing) pause();
  });
  window.addEventListener('beforeunload', function (ev) {
    if (S.rendering) { ev.preventDefault(); ev.returnValue = ''; return ''; }
    if (S.dirty) { ev.preventDefault(); ev.returnValue = ''; return ''; }
  });
}

/* ============================================================
   Boot
   ============================================================ */
function boot() {
  setStage('IDLE');
  $('#stEngine').textContent = 'starting engine';
  $('#stDot').className = 'dot busy';
  $('#p-docs').innerHTML = DOCS;
  S.projectCount = null; S.versionCount = null;
  S.toyEnabled = true; S.cursorOn = false;
  S.results = []; S.queue = [];

  if (!EVAL_OK) {
    $('#stageMsg').classList.add('on');
    $('#stageMsg').innerHTML = '<h5>BLOCKED BY CONTENT SECURITY POLICY</h5>' +
      '<div class="ln">This page is not allowed to compile the animation function.</div>' +
      '<div class="fix">WHY · the environment forbids <code>new Function</code>, which is how your code becomes a render function.</div>' +
      '<div class="fix">HOW TO FIX · download the application from the Diagnostics panel and open it from your own machine.</div>';
    $('#stEngine').textContent = 'blocked';
    $('#stDot').className = 'dot';
    return;
  }

  bootEngine().then(function () {
    S.comp = CORE.composition({});
    S.meta = defaultMeta();
    S.created = new Date().toISOString();

    initEditor();
    initTabs();
    initComp();
    initMeta();
    initRenderPanel();
    initTimeline();
    initSplitters();
    initCursor();
    initShortcuts();
    initDispatch();
    $('#loopBtn').classList.toggle('on', S.loopPlayback);
    renderQueue();
    renderResults();
    detectCaps();
    refreshMedia();

    $('#stEngine').textContent = Engine.mode === 'worker' ? 'worker engine' : 'main-thread engine';
    $('#stIso').textContent = Engine.mode === 'worker' ? 'WORKER · NO DOM' : 'SHARED THREAD';
    $('#stDot').className = 'dot ok';
    $('#stMsg').textContent = Engine.bootNote;

    return openDB().then(function () { return countStores(); }, function () { return null; });
  }).then(function () {
    return newProject('sample-aurora');
  }).then(function () {
    refreshDiag();
    $('#stMsg').textContent = Engine.bootNote + ' Press Run after editing, or Render when you are ready.';
  }).catch(function (e) {
    $('#stDot').className = 'dot';
    $('#stEngine').textContent = 'engine failed';
    $('#stageMsg').classList.add('on');
    $('#stageMsg').innerHTML = '<h5>THE ENGINE DID NOT START</h5><div class="ln">' + esc(String(e && e.message || e)) +
      '</div><div class="fix">HOW TO FIX · reload the page. If it keeps happening, the browser is missing something the Diagnostics panel would normally list.</div>';
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();

(function(){if(!("serviceWorker" in navigator))return;window.addEventListener("load",function(){navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(function(){});});})();

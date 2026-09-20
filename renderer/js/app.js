(function(){
'use strict';
var $=function(s){return document.querySelector(s)},$$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
var codeEl=$('#code'),canvas=$('#renderCanvas'),ctx=canvas.getContext('2d');
var preset=$('#preset'),fpsEl=$('#fps'),durationEl=$('#duration'),loopMode=$('#loopMode'),loopDurationEl=$('#loopDuration'),timeline=$('#timeline');
var engineState=$('#engineState'),resolutionLabel=$('#resolutionLabel'),canvasInfo=$('#canvasInfo'),lineCount=$('#lineCount');
var progress=$('#progress'),timeLabel=$('#timeLabel'),frameLabel=$('#frameLabel'),checker=$('#checker');
var rendering=$('#rendering'),rFrame=$('#rFrame'),rPct=$('#rPct'),rProgress=$('#rProgress'),rFormat=$('#rFormat'),rRate=$('#rRate'),rQueue=$('#rQueue'),rDropped=$('#rDropped'),rElapsed=$('#rElapsed');
var toastEl=$('#toast'),stillFormat=$('#stillFormat'),transparent=$('#transparent'),stillBtn=$('#stillBtn'),videoBtn=$('#videoBtn'),playBtn=$('#playBtn'),formatSupport=$('#formatSupport');
var videoEngine=$('#videoEngine'),videoCodec=$('#videoCodec'),bitrateEl=$('#bitrate'),hardwareEl=$('#hardwareAcceleration'),keyframeEl=$('#keyframeSeconds'),preflight=$('#preflight');
var projectInput=$('#projectFileInput'),imageInput=$('#imageFileInput');
var imageRuntime={};
var W=3840,H=2160,FPS=60,DURATION=30,frame=0,userFn=null,userSvg=null,playing=false,renderingVideo=false,raf=0,toastTimer=0;
var studioState={active:0,scenes:[{name:'MAIN',code:null,sources:[
  {id:'matte',name:'Solid Matte',kind:'MATTE',visible:false,locked:false,color:'#050505',opacity:1},
  {id:'image',name:'Image File',kind:'IMAGE',visible:false,locked:false,dataUrl:'',opacity:1,fit:'contain'},
  {id:'animation',name:'Animation Code',kind:'CODE',visible:true,locked:true},
  {id:'grid',name:'Grid Guide',kind:'GRID',visible:false,locked:false,previewOnly:true},
  {id:'safe',name:'Safe Area',kind:'SAFE',visible:false,locked:false,previewOnly:true}
]}]};

var DEFAULT_CODE="(function(){\n  var TAU=Math.PI*2;\n\n  window.renderFrame=function(time, frame, fps){\n    var w=canvas.width, h=canvas.height;\n    var ctx=canvas.getContext('2d');\n    var cx=w*.5, cy=h*.5, s=Math.min(w,h);\n\n    ctx.clearRect(0,0,w,h);\n    if(!window.__rendererTransparent){\n      ctx.fillStyle='#050505';\n      ctx.fillRect(0,0,w,h);\n    }\n\n    var glow=ctx.createRadialGradient(cx,cy,0,cx,cy,s*.46);\n    glow.addColorStop(0,'rgba(243,243,239,.055)');\n    glow.addColorStop(1,'rgba(243,243,239,0)');\n    ctx.fillStyle=glow;\n    ctx.beginPath();ctx.arc(cx,cy,s*.46,0,TAU);ctx.fill();\n\n    for(var i=0;i<42;i++){\n      var a=time*.7*(i%2?1:-1)+i*TAU/42;\n      var r=s*(.12+i*.006)+Math.sin(time*1.7+i)*s*.012;\n      var x=cx+Math.cos(a)*r;\n      var y=cy+Math.sin(a)*r*.62;\n      var alpha=.08+.16*Math.pow(Math.sin(i+time*1.4),2);\n      ctx.beginPath();ctx.arc(x,y,Math.max(1.5,s*.0018),0,TAU);\n      ctx.fillStyle='rgba(243,243,239,'+alpha.toFixed(3)+')';ctx.fill();\n    }\n\n    for(var ring=0;ring<9;ring++){\n      var rr=s*(.10+ring*.035)+Math.sin(time*1.15+ring)*s*.006;\n      ctx.beginPath();ctx.arc(cx,cy,rr,0,TAU);\n      ctx.setLineDash([18+ring*4,28+ring*3]);\n      ctx.lineDashOffset=-time*(18+ring*5);\n      ctx.strokeStyle='rgba(243,243,239,'+(.022+ring*.005)+')';\n      ctx.lineWidth=1;ctx.stroke();\n    }\n    ctx.setLineDash([]);\n\n    var pulse=s*(.012+.004*Math.sin(time*3.1));\n    ctx.beginPath();ctx.arc(cx,cy,pulse,0,TAU);\n    ctx.fillStyle='rgba(243,243,239,.16)';ctx.fill();\n  };\n\n  window.renderSVG=function(time, frame, fps){\n    var w=canvas.width,h=canvas.height,s=Math.min(w,h);\n    var bg=window.__rendererTransparent?'':'<rect width=\"'+w+'\" height=\"'+h+'\" fill=\"#050505\"/>';\n    var rings='';\n    for(var i=0;i<9;i++){\n      var r=(s*(.10+i*.035)+Math.sin(time*1.15+i)*s*.006).toFixed(2);\n      rings+='<circle cx=\"'+(w/2).toFixed(2)+'\" cy=\"'+(h/2).toFixed(2)+'\" r=\"'+r+'\" fill=\"none\" stroke=\"#F3F3EF\" stroke-opacity=\"'+(.022+i*.005).toFixed(3)+'\" stroke-width=\"1\" stroke-dasharray=\"'+(18+i*4)+' '+(28+i*3)+'\" stroke-dashoffset=\"'+(-time*(18+i*5)).toFixed(2)+'\"/>';\n    }\n    return '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"'+w+'\" height=\"'+h+'\" viewBox=\"0 0 '+w+' '+h+'\">'+bg+rings+'</svg>';\n  };\n})();";

codeEl.value=DEFAULT_CODE;
function activeScene(){return studioState.scenes[studioState.active]||studioState.scenes[0]}
function sourceById(id){
  var scene=activeScene();
  for(var i=0;i<scene.sources.length;i++)if(scene.sources[i].id===id)return scene.sources[i];
  return null;
}
function saveStudio(){
  var scene=activeScene();
  if(scene)scene.code=codeEl.value;
  try{localStorage.setItem('tamasrazim-renderer-studio',JSON.stringify(studioState))}catch(e){}
}
function loadStudio(){
  try{
    var raw=localStorage.getItem('tamasrazim-renderer-studio');
    if(raw){
      var parsed=JSON.parse(raw);
      if(parsed&&Array.isArray(parsed.scenes)&&parsed.scenes.length)studioState=parsed;
    }
  }catch(e){}
  studioState.active=Math.max(0,Math.min(Number(studioState.active)||0,studioState.scenes.length-1));
  var scene=activeScene();
  if(!scene.sources)scene.sources=[];
  if(!scene.sources.some(function(s){return s.id==='matte'}))scene.sources.unshift({id:'matte',name:'Solid Matte',kind:'MATTE',visible:false,locked:false,color:'#050505',opacity:1});
  if(!scene.sources.some(function(s){return s.id==='image'}))scene.sources.push({id:'image',name:'Image File',kind:'IMAGE',visible:false,locked:false,dataUrl:'',opacity:1,fit:'contain'});
  if(!scene.sources.some(function(s){return s.id==='animation'}))scene.sources.push({id:'animation',name:'Animation Code',kind:'CODE',visible:true,locked:true});
  if(!scene.code)scene.code=DEFAULT_CODE;
  codeEl.value=scene.code;
}
function escapeHTML(v){return String(v).replace(/[&<>]/g,function(x){return x==='&'?'&amp;':x==='<'?'&lt;':'&gt;'})}
function uniqueSceneName(base,ignoreIndex){
  var name=String(base||'SCENE').trim()||'SCENE',candidate=name,n=2;
  while(studioState.scenes.some(function(scene,index){return index!==ignoreIndex&&scene.name.toLowerCase()===candidate.toLowerCase()})){
    candidate=name+' '+n++;
  }
  return candidate.slice(0,48);
}
function renameScene(index){
  var scene=studioState.scenes[index];if(!scene)return;
  if(index===0){toast('MAIN is the protected base scene');return}
  var next=window.prompt('Rename scene',scene.name);
  if(next===null)return;
  next=next.trim();
  if(!next){toast('Scene name cannot be empty');return}
  saveStudio();scene.name=uniqueSceneName(next,index);saveStudio();renderStudioUI();toast('Scene renamed · '+scene.name);
}
function moveScene(index,direction){
  var target=index+direction;
  if(index<=0||target<=0||target>=studioState.scenes.length)return;
  saveStudio();
  var scenes=studioState.scenes,tmp=scenes[index];scenes[index]=scenes[target];scenes[target]=tmp;
  if(studioState.active===index)studioState.active=target;
  else if(studioState.active===target)studioState.active=index;
  saveStudio();renderStudioUI();loadStudio();buildEngine(true);renderAt(Number(timeline.value)||0);
  toast('Scene moved');
}
function deleteScene(index){
  if(index===0){toast('MAIN is the protected base scene');return}
  if(studioState.scenes.length===1)return;
  var scene=studioState.scenes[index];if(!window.confirm('Delete "'+scene.name+'"?'))return;
  saveStudio();
  studioState.scenes.splice(index,1);
  if(studioState.active===index)studioState.active=Math.min(index,studioState.scenes.length-1);
  else if(studioState.active>index)studioState.active--;
  loadStudio();renderStudioUI();buildEngine(true);renderAt(Number(timeline.value)||0);saveStudio();
  toast('Scene deleted');
}
function imageSourceLabel(src){
  return src.dataUrl?'IMAGE':'EMPTY';
}
function getImageRuntime(src){
  if(!src||!src.dataUrl)return null;
  var cached=imageRuntime[src.id];
  if(cached&&cached.dataUrl===src.dataUrl)return cached.image;
  var img=new Image();
  var runtime={image:img,dataUrl:src.dataUrl,ready:false};
  imageRuntime[src.id]=runtime;
  img.onload=function(){runtime.ready=true;renderAt(Number(timeline.value)||0)};
  img.onerror=function(){runtime.ready=false;toast('Image source failed to decode')};
  img.src=src.dataUrl;
  return img;
}
function drawImageSource(src){
  if(!src||!src.visible||!src.dataUrl)return;
  var img=getImageRuntime(src);
  if(!img||!img.complete||!img.naturalWidth)return;
  var opacity=Math.max(0,Math.min(1,Number(src.opacity)));
  if(opacity<=0)return;
  var iw=img.naturalWidth,ih=img.naturalHeight;
  var scaleX=W/iw,scaleY=H/ih,scale;
  if(src.fit==='cover')scale=Math.max(scaleX,scaleY);
  else if(src.fit==='stretch'){scaleX=W/iw;scaleY=H/ih}
  else scale=Math.min(scaleX,scaleY);
  var dw,dh;
  if(src.fit==='stretch'){dw=W;dh=H}
  else {dw=iw*scale;dh=ih*scale}
  var dx=(W-dw)*.5,dy=(H-dh)*.5;
  ctx.save();ctx.globalAlpha=opacity;
  if(src.fit==='cover'){
    var sw=W/scale,sh=H/scale,sx=(iw-sw)*.5,sy=(ih-sh)*.5;
    ctx.drawImage(img,sx,sy,sw,sh,0,0,W,H);
  }else ctx.drawImage(img,dx,dy,dw,dh);
  ctx.restore();
}
function imageAsSvg(src){
  if(!src||!src.visible||!src.dataUrl)return '';
  var opacity=Math.max(0,Math.min(1,Number(src.opacity)));
  if(opacity<=0)return '';
  if(src.fit==='stretch')return '<image href="'+src.dataUrl.replace(/"/g,'&quot;')+'" width="'+W+'" height="'+H+'" preserveAspectRatio="none" opacity="'+opacity.toFixed(3)+'"/>';
  var img=getImageRuntime(src),iw=img&&img.naturalWidth||W,ih=img&&img.naturalHeight||H;
  var scale=src.fit==='cover'?Math.max(W/iw,H/ih):Math.min(W/iw,H/ih);
  var dw=iw*scale,dh=ih*scale,dx=(W-dw)*.5,dy=(H-dh)*.5;
  return '<image href="'+src.dataUrl.replace(/"/g,'&quot;')+'" x="'+dx.toFixed(2)+'" y="'+dy.toFixed(2)+'" width="'+dw.toFixed(2)+'" height="'+dh.toFixed(2)+'" opacity="'+opacity.toFixed(3)+'" preserveAspectRatio="none"/>';
}
function renderStudioUI(){
  var scene=activeScene(),sceneList=$('#sceneList'),sourceList=$('#sourceList');
  if(!scene||!sceneList||!sourceList)return;
  sceneList.innerHTML='';
  studioState.scenes.forEach(function(item,index){
    var row=document.createElement('div');row.className='scene-row'+(index===studioState.active?' active':'');
    var button=document.createElement('button');button.type='button';button.className='scene-select';
    button.innerHTML='<span class="scene-led"></span><span class="scene-name">'+escapeHTML(item.name)+'</span>';
    button.title='Activate '+item.name+' · double-click to rename';
    button.addEventListener('click',function(){
      if(index===studioState.active)return;
      saveStudio();studioState.active=index;loadStudio();renderStudioUI();buildEngine(true);renderAt(Number(timeline.value)||0);toast('Scene switched · '+activeScene().name);
    });
    button.addEventListener('dblclick',function(){
      renameScene(index);
    });
    var actions=document.createElement('div');actions.className='scene-row-actions';
    var rename=document.createElement('button');rename.type='button';rename.className='scene-action';rename.textContent='Rename';rename.addEventListener('click',function(){renameScene(index)});
    var up=document.createElement('button');up.type='button';up.className='scene-action';up.textContent='↑';up.title='Move scene up';
    var down=document.createElement('button');down.type='button';down.className='scene-action';down.textContent='↓';down.title='Move scene down';
    var remove=document.createElement('button');remove.type='button';remove.className='scene-action';remove.textContent='Delete';
    up.disabled=index<=1;
    down.disabled=index<1||index>=studioState.scenes.length-1;
    remove.disabled=index===0||studioState.scenes.length===1;
    up.addEventListener('click',function(){moveScene(index,-1)});
    down.addEventListener('click',function(){moveScene(index,1)});
    remove.addEventListener('click',function(){deleteScene(index)});
    actions.append(rename,up,down,remove);
    row.append(button,actions);sceneList.appendChild(row);
  });
  sourceList.innerHTML='';
  scene.sources.forEach(function(src){
    var row=document.createElement('div');row.className='source-row'+(src.visible?' visible':'');
    var toggle=document.createElement('button');toggle.type='button';toggle.className='source-toggle';toggle.setAttribute('aria-pressed',String(!!src.visible));toggle.textContent=src.visible?'ON':'OFF';
    toggle.addEventListener('click',function(){
      if(src.locked){toast(src.name+' is locked');return}
      src.visible=!src.visible;saveStudio();renderStudioUI();renderAt(Number(timeline.value)||0);
    });
    var info=document.createElement('div');info.className='source-info';
    info.innerHTML='<strong>'+escapeHTML(src.name)+'</strong><span>'+escapeHTML(src.kind)+(src.previewOnly?' · PREVIEW ONLY':' · EXPORT')+'</span>';
    var lock=document.createElement('button');lock.type='button';lock.className='source-lock';lock.textContent=src.locked?'LOCK':'FREE';lock.title=src.locked?'Unlock source controls':'Lock source controls';
    lock.addEventListener('click',function(){src.locked=!src.locked;saveStudio();renderStudioUI()});
    row.append(toggle,info,lock);
    if(src.id==='matte'){
      var controls=document.createElement('div');controls.className='source-controls';
      var colorLabel=document.createElement('label');colorLabel.textContent='Color';
      var color=document.createElement('input');color.type='color';color.value=/^#[0-9a-f]{6}$/i.test(src.color||'')?src.color:'#050505';color.disabled=!!src.locked;
      var opacityLabel=document.createElement('label');opacityLabel.textContent='Opacity';
      var opacity=document.createElement('input');opacity.type='range';opacity.min='0';opacity.max='1';opacity.step='.01';opacity.value=String(Number.isFinite(Number(src.opacity))?src.opacity:1);opacity.disabled=!!src.locked;
      color.addEventListener('input',function(){if(src.locked)return;src.color=color.value;saveStudio();renderAt(Number(timeline.value)||0)});
      opacity.addEventListener('input',function(){if(src.locked)return;src.opacity=Number(opacity.value);saveStudio();renderAt(Number(timeline.value)||0)});
      colorLabel.appendChild(color);opacityLabel.appendChild(opacity);controls.append(colorLabel,opacityLabel);row.appendChild(controls);
    }
    if(src.id==='image'){
      var controls=document.createElement('div');controls.className='source-controls image-controls';
      var file=document.createElement('button');file.type='button';file.className='source-lock';file.textContent=src.dataUrl?'REPLACE':'LOAD';file.disabled=!!src.locked;
      file.addEventListener('click',function(){if(!src.locked&&imageInput){imageInput.dataset.sourceId=src.id;imageInput.click()}});
      var opacityLabel=document.createElement('label');opacityLabel.textContent='Opacity';
      var opacity=document.createElement('input');opacity.type='range';opacity.min='0';opacity.max='1';opacity.step='.01';opacity.value=String(Number.isFinite(Number(src.opacity))?src.opacity:1);opacity.disabled=!!src.locked;
      opacity.addEventListener('input',function(){if(src.locked)return;src.opacity=Number(opacity.value);saveStudio();renderAt(Number(timeline.value)||0)});
      var fitLabel=document.createElement('label');fitLabel.textContent='Fit';
      var fit=document.createElement('select');fit.innerHTML='<option value="contain">Contain</option><option value="cover">Cover</option><option value="stretch">Stretch</option>';fit.value=src.fit||'contain';fit.disabled=!!src.locked;
      fit.addEventListener('change',function(){if(src.locked)return;src.fit=fit.value;saveStudio();renderAt(Number(timeline.value)||0)});
      opacityLabel.appendChild(opacity);fitLabel.appendChild(fit);controls.append(file,opacityLabel,fitLabel);row.appendChild(controls);
    }
    sourceList.appendChild(row);
  });
  $('#activeSceneLabel').textContent=scene.name;
  $('#sourceCount').textContent=String(scene.sources.length);
  $('#studioOutput').textContent=(W>=3840?'4K':W>=1920?'2K':'HD')+' · '+FPS+' FPS';
  $('#studioStatus').textContent=engineState.textContent||'READY';
}
function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){toastEl.classList.remove('show')},2400)}
function setState(s){engineState.textContent=s;var studio=$('#studioStatus');if(studio)studio.textContent=s}
function updateMeta(){lineCount.textContent=codeEl.value.split(/\r?\n/).length+' lines';var scene=activeScene();if(scene){scene.code=codeEl.value;saveStudio()}}
function safeName(){var t=$('#metaTitle').value.trim()||'tamasrazim-animation';return t.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'tamasrazim-animation'}
function effectiveTime(t){t=Math.max(0,Math.min(DURATION,Number(t)||0));if(loopMode.value==='loop')return t%Math.max(.001,Number(loopDurationEl.value)||DURATION);return t}
function effectiveFrame(t){return Math.floor(effectiveTime(t)*FPS)}
function buildEngine(silent){
  updateMeta();userFn=null;userSvg=null;delete window.renderFrame;delete window.renderSVG;
  try{
    var runner=new Function('window','document','canvas','ctx','Math','Date','performance',codeEl.value+'\n;return {frame:typeof window.renderFrame==="function"?window.renderFrame:null,svg:typeof window.renderSVG==="function"?window.renderSVG:null};');
    var m=Object.create(Math),seed=0x13579bdf;m.random=function(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
    var out=runner(window,document,canvas,ctx,m,Date,performance);
    if(typeof out.frame!=='function')throw new Error('Render contract missing: window.renderFrame(time, frame, fps)');
    userFn=out.frame;userSvg=out.svg||null;setState('READY');renderAt(Number(timeline.value)||0);
    stillBtn.disabled=stillFormat.value==='svg'&&!userSvg;if(!silent)toast('Render code compiled locally');return true;
  }catch(e){setState('ERROR');engineState.title=e.message;toast(e.message);return false}
}
function hexToRGB(hex){
  var h=String(hex||'#050505').replace('#','');
  if(h.length!==6)h='050505';
  return {r:parseInt(h.slice(0,2),16)||0,g:parseInt(h.slice(2,4),16)||0,b:parseInt(h.slice(4,6),16)||0};
}
function renderSolidMatte(){
  var matte=sourceById('matte');if(!matte||!matte.visible)return;
  var alpha=Math.max(0,Math.min(1,Number(matte.opacity)));
  if(alpha<=0)return;
  var rgb=hexToRGB(matte.color);
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='rgb('+rgb.r+','+rgb.g+','+rgb.b+')';ctx.fillRect(0,0,W,H);ctx.restore();
}
function injectMatteIntoSVG(svg){
  var matte=sourceById('matte'),image=imageAsSvg(sourceById('image'));
  var prefix='';
  if(matte&&matte.visible){
    var alpha=Math.max(0,Math.min(1,Number(matte.opacity)));
    if(alpha>0){
      var color=/^#[0-9a-f]{6}$/i.test(matte.color||'')?matte.color:'#050505';
      prefix+='<rect width="'+W+'" height="'+H+'" fill="'+color+'" fill-opacity="'+alpha.toFixed(3)+'"/>';
    }
  }
  if(!prefix&&!image)return svg;
  var close=svg.indexOf('>');
  return close<0?svg:svg.slice(0,close+1)+prefix+image+svg.slice(close+1);
}
function renderOutputFrame(t){
  if(!userFn)return false;
  window.__rendererTransparent=transparent.checked;
  if(transparent.checked)ctx.clearRect(0,0,W,H);
  else{ctx.clearRect(0,0,W,H);ctx.fillStyle='#050505';ctx.fillRect(0,0,W,H)}
  renderSolidMatte();
  drawImageSource(sourceById('image'));
  var anim=sourceById('animation');
  if(anim&&anim.visible){
    userFn(effectiveTime(t),effectiveFrame(t),FPS);
  }
  return true;
}
function renderPreviewGuides(){
  var grid=sourceById('grid'),safe=sourceById('safe');
  if(grid&&grid.visible){
    ctx.save();ctx.strokeStyle='rgba(243,243,239,.12)';ctx.lineWidth=Math.max(1,W/2400);
    var step=Math.max(40,Math.round(Math.min(W,H)/12));
    for(var x=step;x<W;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
    for(var y=step;y<H;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    ctx.restore();
  }
  if(safe&&safe.visible){
    ctx.save();ctx.strokeStyle='rgba(243,243,239,.34)';ctx.lineWidth=Math.max(1,W/2200);ctx.setLineDash([12,10]);
    ctx.strokeRect(W*.05,H*.05,W*.9,H*.9);ctx.setLineDash([]);
    ctx.strokeStyle='rgba(243,243,239,.12)';
    ctx.strokeRect(W*.1,H*.1,W*.8,H*.8);ctx.restore();
  }
}
function renderAt(t){
  if(!userFn)return false;
  t=Math.max(0,Math.min(DURATION,Number(t)||0));frame=Math.floor(t*FPS);
  try{
    renderOutputFrame(t);renderPreviewGuides();
    timeline.value=t;timeLabel.textContent=t.toFixed(3)+'s';frameLabel.textContent=frame+' / '+Math.max(1,Math.round(DURATION*FPS));canvasInfo.textContent=timeLabel.textContent+' / frame '+frame;progress.style.transform='scaleX('+(DURATION?t/DURATION:0)+')';
    return true;
  }catch(e){setState('ERROR');engineState.title=e.message;toast('Frame error: '+e.message);return false}
}
function togglePreview(){
  if(renderingVideo)return;if(!userFn&&!buildEngine())return;
  if(playing){playing=false;playBtn.textContent='Preview';cancelAnimationFrame(raf);return}
  playing=true;playBtn.textContent='Stop';var last=performance.now();
  function tick(now){if(!playing)return;var t=(Number(timeline.value)||0)+(now-last)/1000;last=now;if(t>=DURATION){if(loopMode.value==='loop')t=0;else{renderAt(DURATION);playing=false;playBtn.textContent='Preview';return}}renderAt(t);raf=requestAnimationFrame(tick)}
  raf=requestAnimationFrame(tick);
}
function downloadBlob(blob,name){var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},30000)}
function exportStill(){
  if(!userFn&&!buildEngine())return;var t=Number(timeline.value)||0;renderAt(t);var fmt=stillFormat.value;
  if(fmt==='svg'){if(typeof userSvg!=='function'){toast('SVG export requires window.renderSVG(time, frame, fps)');return}try{var svg=injectMatteIntoSVG(userSvg(effectiveTime(t),effectiveFrame(t),FPS));if(typeof svg!=='string'||svg.toLowerCase().indexOf('<svg')<0)throw new Error('renderSVG must return SVG markup');downloadBlob(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),safeName()+'.svg');toast('SVG exported')}catch(e){toast('SVG error: '+e.message)}return}
  renderOutputFrame(t);
  var type=fmt==='jpg'?'image/jpeg':fmt==='webp'?'image/webp':'image/png',quality=fmt==='png'?undefined:.96;
  if(fmt==='jpg'&&transparent.checked){var flat=document.createElement('canvas');flat.width=W;flat.height=H;var fctx=flat.getContext('2d');fctx.fillStyle='#050505';fctx.fillRect(0,0,W,H);fctx.drawImage(canvas,0,0);flat.toBlob(function(blob){if(!blob){toast('JPG export failed');return}downloadBlob(blob,safeName()+'.jpg');toast('JPG exported with opaque background')},'image/jpeg',quality);return}
  canvas.toBlob(function(blob){if(!blob){toast('Raster export failed')}else{downloadBlob(blob,safeName()+'.'+fmt);toast(fmt.toUpperCase()+' exported')}},type,quality);
}
function mediaRecorderMime(){
  if(!window.MediaRecorder)return null;var v=videoCodec.value,choices=[];
  if(v==='avc1')choices=['video/mp4;codecs=avc1.640034','video/mp4;codecs=avc1.4d0034','video/mp4;codecs=avc1.420034'];
  else if(v==='hevc')choices=['video/mp4;codecs=hvc1','video/mp4;codecs=hev1'];
  else if(v==='vp9')choices=['video/webm;codecs=vp9','video/webm'];
  else if(v==='vp8')choices=['video/webm;codecs=vp8','video/webm'];
  else if(v==='av1')choices=['video/webm;codecs=av01'];
  else choices=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
  for(var i=0;i<choices.length;i++)if(MediaRecorder.isTypeSupported(choices[i]))return choices[i];return null;
}
async function exportRealtime(){
  if(!canvas.captureStream||!window.MediaRecorder)throw new Error('MediaRecorder capture is unavailable.');
  var mime=mediaRecorderMime();if(!mime)throw new Error('No compatible MediaRecorder format is available.');
  var stream=canvas.captureStream(FPS),chunks=[],rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:Number(bitrateEl.value)||16000000});
  var total=Math.max(1,Math.round(DURATION*FPS)),i=0,failed=null,start=performance.now();
  try{
    await new Promise(function(resolve,reject){
      rec.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data)};
      rec.onerror=function(){failed=new Error('MediaRecorder encoder error');try{rec.stop()}catch(e){}};
      rec.onstop=function(){failed?reject(failed):resolve()};
      rec.start(250);
      function tick(){if(i>=total){rec.stop();return}if(!renderOutputFrame(i/FPS)){failed=new Error('Render failed during capture');try{rec.stop()}catch(e){}return}
        var pct=i/Math.max(1,total-1);rFrame.textContent=i+' / '+total;rPct.textContent=Math.round(pct*100)+'%';rProgress.style.transform='scaleX('+pct+')';
        rRate.textContent='realtime';rQueue.textContent='—';rDropped.textContent='unknown';rElapsed.textContent=((performance.now()-start)/1000).toFixed(1)+'s';i++;setTimeout(tick,Math.max(0,1000/FPS))}
      tick();
    });
    return {blob:new Blob(chunks,{type:mime}),extension:mime.indexOf('mp4')>=0?'mp4':'webm',mime:mime,deterministic:false};
  }finally{stream.getTracks().forEach(function(t){t.stop()})}
}
var probeTimer=0;
async function probeCapabilities(){
  clearTimeout(probeTimer);probeTimer=setTimeout(async function(){
    var deterministic=window.TamasrazimVideoEngine?await window.TamasrazimVideoEngine.probe({width:W,height:H,fps:FPS,bitrate:Number(bitrateEl.value)||16000000,hardwareAcceleration:hardwareEl.value}):[];
    var fallback=[];
    if(window.MediaRecorder){
      if(MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.640034')||MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.4d0034')||MediaRecorder.isTypeSupported('video/mp4'))fallback.push({value:'avc1',label:'H.264 · MP4 · MediaRecorder fallback',engine:'mediarecorder'});
      if(MediaRecorder.isTypeSupported('video/mp4;codecs=hvc1')||MediaRecorder.isTypeSupported('video/mp4;codecs=hev1'))fallback.push({value:'hevc',label:'HEVC · MP4 · MediaRecorder fallback',engine:'mediarecorder'});
      if(MediaRecorder.isTypeSupported('video/webm;codecs=vp9'))fallback.push({value:'vp9',label:'VP9 · WebM · MediaRecorder fallback',engine:'mediarecorder'});
      if(MediaRecorder.isTypeSupported('video/webm;codecs=vp8'))fallback.push({value:'vp8',label:'VP8 · WebM · MediaRecorder fallback',engine:'mediarecorder'});
    }
    var old=videoCodec.value;videoCodec.innerHTML='';
    deterministic.forEach(function(c){var o=document.createElement('option');o.value=c.id;o.textContent=c.label+' · WebM · deterministic frame-by-frame';o.dataset.engine='webcodecs';o.dataset.codec=c.codec;videoCodec.appendChild(o)});
    fallback.forEach(function(c){var o=document.createElement('option');o.value=c.value;o.textContent=c.label;o.dataset.engine=c.engine;videoCodec.appendChild(o)});
    var match=Array.prototype.slice.call(videoCodec.options).find(function(o){return o.value===old});if(match)videoCodec.value=old;
    else if(videoCodec.options.length)videoCodec.selectedIndex=0;
    formatSupport.textContent=deterministic.length?deterministic.length+' deterministic encoder'+(deterministic.length>1?'s':'')+' detected':(fallback.length?fallback.length+' fallback encoder'+(fallback.length>1?'s':'')+' detected':'No video encoder detected');
    await runPreflight();
  },120);
}
async function runPreflight(){
  var errors=[],warnings=[],total=Math.round(DURATION*FPS),selected=videoCodec.options[videoCodec.selectedIndex];
  if(W*H>67108864)warnings.push('Large canvas may cause browser memory pressure.');
  if(total>7200)warnings.push('More than 7,200 frames: expect a long render.');
  if(loopMode.value==='loop'&&(!(Number(loopDurationEl.value)>0)))errors.push('Loop duration must be greater than 0.');
  if(!selected)errors.push('No supported video encoder detected.');
  if(videoEngine.value==='webcodecs'&&selected&&selected.dataset.engine!=='webcodecs')errors.push('Selected codec is only available through realtime fallback.');
  preflight.className='notice '+(errors.length?'bad':warnings.length?'warn':'good');
  preflight.textContent=errors.length?errors[0]:(warnings.length?warnings[0]:'Preflight passed · '+total.toLocaleString()+' frames · '+W+'×'+H+' · '+FPS+' FPS');
  videoBtn.disabled=errors.length>0;
  return !errors.length;
}
function parseSettings(){
  var p=preset.value.split('x');W=Number(p[0]);H=Number(p[1]);FPS=Number(fpsEl.value);DURATION=Number(durationEl.value);
  if(loopMode.value==='loop'&&Number(loopDurationEl.value)>DURATION)loopDurationEl.value=DURATION.toFixed(3);
  canvas.width=W;canvas.height=H;resolutionLabel.textContent=W+' × '+H;timeline.max=DURATION;frame=Math.min(frame,Math.max(0,Math.round(DURATION*FPS)-1));
  loopDurationEl.disabled=loopMode.value!=='loop';checker.classList.toggle('show',transparent.checked);playing=false;cancelAnimationFrame(raf);playBtn.textContent='Preview';renderAt(Number(timeline.value)||0);probeCapabilities();
}
function startRenderUI(label){renderingVideo=true;playing=false;videoBtn.disabled=true;playBtn.disabled=true;setState('RENDERING');rendering.classList.add('open');rFormat.textContent=label;rFrame.textContent='0';rPct.textContent='0%';rProgress.style.transform='scaleX(0)';rRate.textContent='—';rQueue.textContent='0';rDropped.textContent='0';rElapsed.textContent='0.0s'}
async function exportVideo(){
  if(renderingVideo)return;if(!userFn&&!buildEngine())return;if(!(await runPreflight()))return;
  var selected=videoCodec.options[videoCodec.selectedIndex];if(!selected)return;
  startRenderUI(selected.textContent);var started=performance.now();
  try{
    var result;
    if(videoEngine.value==='webcodecs'){
      if(selected.dataset.engine!=='webcodecs')throw new Error('Choose a WebCodecs codec for deterministic export.');
      result=await window.TamasrazimVideoEngine.render({
        canvas:canvas,width:W,height:H,fps:FPS,duration:DURATION,loopMode:loopMode.value,loopDuration:Number(loopDurationEl.value)||DURATION,
        codec:selected.dataset.codec,bitrate:Number(bitrateEl.value)||16000000,hardwareAcceleration:hardwareEl.value,keyframeSeconds:Number(keyframeEl.value)||2,
        renderFrame:function(t,f,fr){renderOutputFrame(t)},
        onProgress:function(info){rFrame.textContent=info.frame.toLocaleString()+' / '+info.total.toLocaleString();rPct.textContent=Math.round(info.percent)+'%';rProgress.style.transform='scaleX('+(info.percent/100)+')';rRate.textContent=info.renderRate.toFixed(1)+' fps';rQueue.textContent=String(info.encodeQueue);rDropped.textContent=String(info.droppedFrames);rElapsed.textContent=info.renderSeconds.toFixed(1)+'s'}
      });
    }else result=await exportRealtime();
    downloadBlob(result.blob,safeName()+'.'+result.extension);setState('READY');toast((result.deterministic?'Deterministic ':'Realtime fallback ')+result.extension.toUpperCase()+' render complete · '+((performance.now()-started)/1000).toFixed(1)+'s');
  }catch(e){setState('ERROR');engineState.title=e.message;toast('Render failed: '+e.message)}
  finally{renderingVideo=false;videoBtn.disabled=false;playBtn.disabled=false;rendering.classList.remove('open');runPreflight()}
}
function currentRenderSpec(){
  return {
    width:W,height:H,fps:FPS,durationSeconds:DURATION,
    loop:loopMode.value==='loop',
    loopDurationSeconds:loopMode.value==='loop'?(Number(loopDurationEl.value)||DURATION):null,
    transparent:transparent.checked,
    stillFormat:stillFormat.value,
    videoEngine:videoEngine.value,
    videoCodec:videoCodec.value||null,
    bitrate:Number(bitrateEl.value)||16000000,
    keyframeSeconds:Number(keyframeEl.value)||2
  };
}
function collectStockMetadata(){
  var selected=videoCodec.options[videoCodec.selectedIndex];
  return {
    title:$('#metaTitle').value.trim()||'Untitled animation',
    description:$('#metaDescription').value.trim(),
    keywords:$('#metaKeywords').value.split(',').map(function(x){return x.trim()}).filter(Boolean),
    creator:$('#metaCreator').value.trim()||'Tamasrazim',
    category:'Graphics / Animation',
    source:'Animation Renderer — Tamasrazim',
    delivery:Object.assign({},currentRenderSpec(),{animationEncoder:selected?selected.textContent:'Unavailable',deterministic:videoEngine.value==='webcodecs'}),
    generatedAt:new Date().toISOString()
  };
}
function projectPayload(){
  saveStudio();
  return {
    schemaVersion:1,
    app:'Animation Renderer — Tamasrazim',
    fileType:'tamasrazim-render-project',
    exportedAt:new Date().toISOString(),
    activeScene:studioState.active,
    scenes:JSON.parse(JSON.stringify(studioState.scenes)),
    render:currentRenderSpec(),
    stock:collectStockMetadata()
  };
}
function exportProject(){
  var payload=projectPayload();
  var stamp=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  var name=safeName()+'-'+stamp+'.trproj';
  downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),name);
  toast('Project saved · '+studioState.scenes.length+' scene'+(studioState.scenes.length===1?'':'s'));
}
function validProject(data){
  return !!(data&&data.schemaVersion===1&&data.fileType==='tamasrazim-render-project'&&Array.isArray(data.scenes)&&data.scenes.length&&data.scenes.every(function(scene){
    return scene&&typeof scene.name==='string'&&typeof scene.code==='string'&&Array.isArray(scene.sources);
  }));
}
function applyProject(data){
  studioState={
    active:Math.max(0,Math.min(Number(data.activeScene)||0,data.scenes.length-1)),
    scenes:data.scenes
  };
  if(data.render){
    var r=data.render;
    var p=String(Number(r.width)||W)+'x'+String(Number(r.height)||H);
    if(Array.prototype.some.call(preset.options,function(o){return o.value===p}))preset.value=p;
    if([24,25,30,50,60,120].indexOf(Number(r.fps))>=0)fpsEl.value=String(r.fps);
    if([10,15,20,30,60].indexOf(Number(r.durationSeconds))>=0)durationEl.value=String(r.durationSeconds);
    loopMode.value=r.loop?'loop':'record';
    loopDurationEl.value=Number(r.loopDurationSeconds)>0?Number(r.loopDurationSeconds):5;
    transparent.checked=!!r.transparent;
    if(Array.prototype.some.call(stillFormat.options,function(o){return o.value===r.stillFormat}))stillFormat.value=r.stillFormat;
    if(r.videoEngine==='mediarecorder'||r.videoEngine==='webcodecs')videoEngine.value=r.videoEngine;
    bitrateEl.value=String(Math.max(100000,Number(r.bitrate)||24000000));
    keyframeEl.value=String(Math.max(.5,Number(r.keyframeSeconds)||2));
  }
  if(data.stock){
    $('#metaTitle').value=data.stock.title||'';
    $('#metaDescription').value=data.stock.description||'';
    $('#metaKeywords').value=Array.isArray(data.stock.keywords)?data.stock.keywords.join(', '):'';
    $('#metaCreator').value=data.stock.creator||'Tamasrazim';
  }
  loadStudio();renderStudioUI();parseSettings();buildEngine(true);
  var wantedCodec=data.render&&data.render.videoCodec;
  if(wantedCodec)videoCodec.dataset.pendingValue=wantedCodec;
  setTimeout(function(){
    if(wantedCodec&&Array.prototype.some.call(videoCodec.options,function(o){return o.value===wantedCodec}))videoCodec.value=wantedCodec;
    runPreflight();
  },220);
  toast('Project opened · '+activeScene().name);
}
function importProjectFile(file){
  var reader=new FileReader();
  reader.onload=function(){
    try{
      var data=JSON.parse(String(reader.result));
      if(!validProject(data))throw new Error('Invalid .trproj project file');
      applyProject(data);
    }catch(e){toast('Project open failed · '+e.message)}
  };
  reader.onerror=function(){toast('Project open failed · file could not be read')};
  reader.readAsText(file);
}
function exportMetadata(){
  var data=collectStockMetadata();
  downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),safeName()+'.json');
  toast('Metadata JSON exported')
}
$('#newSceneBtn').addEventListener('click',function(){
  saveStudio();
  var name=uniqueSceneName('SCENE');
  studioState.scenes.push({name:name,code:DEFAULT_CODE,sources:[
    {id:'matte',name:'Solid Matte',kind:'MATTE',visible:false,locked:false,color:'#050505',opacity:1},
    {id:'image',name:'Image File',kind:'IMAGE',visible:false,locked:false,dataUrl:'',opacity:1,fit:'contain'},
    {id:'animation',name:'Animation Code',kind:'CODE',visible:true,locked:true},
    {id:'grid',name:'Grid Guide',kind:'GRID',visible:false,locked:false,previewOnly:true},
    {id:'safe',name:'Safe Area',kind:'SAFE',visible:false,locked:false,previewOnly:true}
  ]});
  studioState.active=studioState.scenes.length-1;loadStudio();renderStudioUI();buildEngine(true);toast('New scene · '+name);
});
$('#duplicateSceneBtn').addEventListener('click',function(){
  saveStudio();var src=activeScene(),copy=JSON.parse(JSON.stringify(src)),name=uniqueSceneName(src.name+' COPY');
  copy.name=name;studioState.scenes.push(copy);studioState.active=studioState.scenes.length-1;loadStudio();renderStudioUI();buildEngine(true);toast('Scene duplicated · '+name);
});
$('#addImageBtn').addEventListener('click',function(){
  var src=sourceById('image');
  if(!src){activeScene().sources.push({id:'image',name:'Image File',kind:'IMAGE',visible:true,locked:false,dataUrl:'',opacity:1,fit:'contain'});src=sourceById('image')}
  src.visible=true;src.locked=false;
  saveStudio();renderStudioUI();if(imageInput){imageInput.dataset.sourceId='image';imageInput.click()}
});
if(imageInput)imageInput.addEventListener('change',function(){
  var file=imageInput.files&&imageInput.files[0];if(!file)return;
  var source=sourceById(imageInput.dataset.sourceId||'image');if(!source)return;
  if(!/^image\/(png|jpeg|webp)$/.test(file.type)){toast('Use PNG, JPG or WebP');return}
  var reader=new FileReader();
  reader.onload=function(){
    source.dataUrl=String(reader.result||'');source.visible=true;source.locked=false;source.name=file.name||'Image File';
    delete imageRuntime[source.id];saveStudio();renderStudioUI();renderAt(Number(timeline.value)||0);toast('Image source loaded · '+source.name);
  };
  reader.onerror=function(){toast('Image file could not be read')};
  reader.readAsDataURL(file);
  imageInput.value='';
});
$('#addMatteBtn').addEventListener('click',function(){
  var matte=sourceById('matte');
  if(!matte){
    activeScene().sources.unshift({id:'matte',name:'Solid Matte',kind:'MATTE',visible:true,locked:false,color:'#050505',opacity:1});
  }else{matte.visible=true;matte.locked=false}
  saveStudio();renderStudioUI();renderAt(Number(timeline.value)||0);toast('Solid matte added');
});
$('#addGuideBtn').addEventListener('click',function(){
  var s=sourceById('grid');if(!s)activeScene().sources.push({id:'grid',name:'Grid Guide',kind:'GRID',visible:true,locked:false,previewOnly:true});else s.visible=true;
  saveStudio();renderStudioUI();renderAt(Number(timeline.value)||0);toast('Grid guide enabled');
});
$('#addSafeBtn').addEventListener('click',function(){
  var s=sourceById('safe');if(!s)activeScene().sources.push({id:'safe',name:'Safe Area',kind:'SAFE',visible:true,locked:false,previewOnly:true});else s.visible=true;
  saveStudio();renderStudioUI();renderAt(Number(timeline.value)||0);toast('Safe area enabled');
});
$('.tab').forEach(function(tab){tab.addEventListener('click',function(){$('.tab').forEach(function(x){x.classList.remove('active')});tab.classList.add('active');['scenesPanel','sourcesPanel','codePanel','settingsPanel','stockPanel'].forEach(function(id){$('#'+id).hidden=id!==tab.dataset.tab})})});
$('#exportProjectBtn').addEventListener('click',exportProject);
$('#importProjectBtn').addEventListener('click',function(){projectInput&&projectInput.click()});
if(projectInput)projectInput.addEventListener('change',function(){if(projectInput.files&&projectInput.files[0])importProjectFile(projectInput.files[0]);projectInput.value=''});
$('#renderBtn').addEventListener('click',function(){buildEngine(false)});
$('#loadBtn').addEventListener('click',function(){codeEl.value=DEFAULT_CODE;buildEngine(false)});
codeEl.addEventListener('input',updateMeta);preset.addEventListener('change',parseSettings);fpsEl.addEventListener('change',parseSettings);durationEl.addEventListener('change',parseSettings);
loopMode.addEventListener('change',function(){renderAt(Number(timeline.value)||0);runPreflight()});loopDurationEl.addEventListener('input',function(){renderAt(Number(timeline.value)||0);runPreflight()});
timeline.addEventListener('input',function(){renderAt(Number(timeline.value)||0)});transparent.addEventListener('change',function(){checker.classList.toggle('show',transparent.checked);renderAt(Number(timeline.value)||0)});
stillFormat.addEventListener('change',function(){stillBtn.disabled=stillFormat.value==='svg'&&!userSvg});videoEngine.addEventListener('change',runPreflight);videoCodec.addEventListener('change',runPreflight);
bitrateEl.addEventListener('change',probeCapabilities);hardwareEl.addEventListener('change',probeCapabilities);keyframeEl.addEventListener('change',runPreflight);playBtn.addEventListener('click',togglePreview);stillBtn.addEventListener('click',exportStill);videoBtn.addEventListener('click',exportVideo);$('#metadataBtn').addEventListener('click',exportMetadata);
var score=0,target=$('#gameTarget');function moveTarget(){target.style.left=(8+Math.random()*84)+'%';target.style.top=(12+Math.random()*76)+'%';target.style.display='block'}target.addEventListener('pointerdown',function(){score++;$('#gameScore').textContent='Score '+score;moveTarget()});moveTarget();
var deferredPrompt=null,installBtn=$('#installBtn');if(location.protocol!=='https:'&&location.hostname!=='localhost')installBtn.hidden=true;
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredPrompt=e;installBtn.hidden=false});installBtn.addEventListener('click',async function(){if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installBtn.hidden=true});window.addEventListener('appinstalled',function(){installBtn.hidden=true;toast('Renderer installed')});
if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').then(function(reg){if(reg&&reg.waiting)toast('Renderer update ready — reload to apply');reg&&reg.addEventListener('updatefound',function(){var w=reg.installing;if(!w)return;w.addEventListener('statechange',function(){if(w.state==='installed'&&navigator.serviceWorker.controller)toast('Renderer update ready — reload to apply')})})}).catch(function(){})}
window.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();exportVideo();return}
  if(e.altKey&&!e.ctrlKey&&!e.metaKey){
    var n=Number(e.key);
    if(Number.isInteger(n)&&n>=1&&n<=9&&studioState.scenes[n-1]){
      e.preventDefault();saveStudio();studioState.active=n-1;loadStudio();renderStudioUI();buildEngine(true);renderAt(Number(timeline.value)||0);toast('Scene '+n+' · '+activeScene().name);
    }
  }
});
loadStudio();renderStudioUI();
window.addEventListener('beforeunload',function(){saveStudio()});
parseSettings();buildEngine(true);probeCapabilities();
})();
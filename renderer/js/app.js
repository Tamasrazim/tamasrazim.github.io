
(function(){
'use strict';
var codeEl=document.querySelector('#code'),canvas=document.querySelector('#renderCanvas'),ctx=canvas.getContext('2d');
var $=function(s){return document.querySelector(s)}, $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
var preset=$('#preset'),fpsEl=$('#fps'),durationEl=$('#duration'),loopMode=$('#loopMode'),timeline=$('#timeline');
var engineState=$('#engineState'),resolutionLabel=$('#resolutionLabel'),canvasInfo=$('#canvasInfo'),lineCount=$('#lineCount');
var progress=$('#progress'),timeLabel=$('#timeLabel'),frameLabel=$('#frameLabel'),checker=$('#checker');
var rendering=$('#rendering'),rFrame=$('#rFrame'),rPct=$('#rPct'),rProgress=$('#rProgress'),rFormat=$('#rFormat');
var toastEl=$('#toast'),stillFormat=$('#stillFormat'),transparent=$('#transparent'),stillBtn=$('#stillBtn');
var videoBtn=$('#videoBtn'),playBtn=$('#playBtn'),formatSupport=$('#formatSupport');
var W=3840,H=2160,FPS=60,DURATION=30,frame=0,userFn=null,userSvg=null,playing=false,renderingVideo=false,raf=0,toastTimer=0,videoFailed=false;

codeEl.value="(function(){\n  var TAU=Math.PI*2;\n\n  window.renderFrame=function(time, frame, fps){\n    var w=canvas.width, h=canvas.height;\n    var ctx=canvas.getContext('2d');\n    var cx=w*.5, cy=h*.5;\n    var s=Math.min(w,h);\n    var dark=!window.__rendererTransparent;\n\n    ctx.clearRect(0,0,w,h);\n    if(dark){\n      ctx.fillStyle='#050505';\n      ctx.fillRect(0,0,w,h);\n    }\n\n    var glow=ctx.createRadialGradient(cx,cy,0,cx,cy,s*.46);\n    glow.addColorStop(0,'rgba(243,243,239,.055)');\n    glow.addColorStop(1,'rgba(243,243,239,0)');\n    ctx.fillStyle=glow;\n    ctx.beginPath();\n    ctx.arc(cx,cy,s*.46,0,TAU);\n    ctx.fill();\n\n    for(var i=0;i<42;i++){\n      var a=time*.7*(i%2?1:-1)+i*TAU/42;\n      var r=s*(.12+i*.006)+Math.sin(time*1.7+i)*s*.012;\n      var x=cx+Math.cos(a)*r;\n      var y=cy+Math.sin(a)*r*.62;\n      var alpha=.08+.16*Math.pow(Math.sin(i+time*1.4),2);\n      ctx.beginPath();\n      ctx.arc(x,y,Math.max(1.5,s*.0018),0,TAU);\n      ctx.fillStyle='rgba(243,243,239,'+alpha.toFixed(3)+')';\n      ctx.fill();\n    }\n\n    for(var ring=0;ring<9;ring++){\n      var rr=s*(.10+ring*.035)+Math.sin(time*1.15+ring)*s*.006;\n      ctx.beginPath();\n      ctx.arc(cx,cy,rr,0,TAU);\n      ctx.setLineDash([18+ring*4,28+ring*3]);\n      ctx.lineDashOffset=-time*(18+ring*5);\n      ctx.strokeStyle='rgba(243,243,239,'+(.022+ring*.005)+')';\n      ctx.lineWidth=1;\n      ctx.stroke();\n    }\n    ctx.setLineDash([]);\n\n    var pulse=s*(.012+.004*Math.sin(time*3.1));\n    ctx.beginPath();\n    ctx.arc(cx,cy,pulse,0,TAU);\n    ctx.fillStyle='rgba(243,243,239,.16)';\n    ctx.fill();\n  };\n\n  window.renderSVG=function(time, frame, fps){\n    var w=canvas.width, h=canvas.height;\n    var s=Math.min(w,h);\n    var bg=window.__rendererTransparent?'':'<rect width=\"'+w+'\" height=\"'+h+'\" fill=\"#050505\"/>';\n    var rings='';\n    for(var i=0;i<9;i++){\n      var r=(s*(.10+i*.035)+Math.sin(time*1.15+i)*s*.006).toFixed(2);\n      rings += '<circle cx=\"'+(w/2).toFixed(2)+'\" cy=\"'+(h/2).toFixed(2)+'\" r=\"'+r+'\" fill=\"none\" stroke=\"#F3F3EF\" stroke-opacity=\"'+(.022+i*.005).toFixed(3)+'\" stroke-width=\"1\" stroke-dasharray=\"'+(18+i*4)+' '+(28+i*3)+'\" stroke-dashoffset=\"'+(-time*(18+i*5)).toFixed(2)+'\"/>';\n    }\n    return '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"'+w+'\" height=\"'+h+'\" viewBox=\"0 0 '+w+' '+h+'\">'+bg+rings+'</svg>';\n  };\n})();";

function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){toastEl.classList.remove('show')},2400)}
function setState(s){engineState.textContent=s}
function updateMeta(){lineCount.textContent=codeEl.value.split(/\r?\n/).length+' lines'}
function parseSettings(){
  var p=preset.value.split('x');
  W=+p[0];H=+p[1];FPS=+fpsEl.value;DURATION=+durationEl.value;
  playing=false;cancelAnimationFrame(raf);playBtn.textContent='Preview';
  var pixels=W*H;
  if(!Number.isFinite(pixels)||pixels<1||pixels>67108864){
    setState('ERROR');videoBtn.disabled=true;stillBtn.disabled=true;
    toast('Canvas size is outside the safe browser limit');
    return;
  }
  canvas.width=W;canvas.height=H;
  resolutionLabel.textContent=W+' × '+H;
  timeline.max=DURATION;
  frame=Math.min(frame,Math.max(0,Math.floor(DURATION*FPS)-1));
  checker.classList.toggle('show',transparent.checked);
  buildEngine(true);
}
function buildEngine(silent){
  updateMeta();
  try{
    userFn=null;userSvg=null;
    delete window.renderFrame;
    delete window.renderSVG;
    var runner=new Function('window','document','canvas','ctx','Math','Date','performance',codeEl.value+'\\n;return {frame:typeof window.renderFrame==="function"?window.renderFrame:null,svg:typeof window.renderSVG==="function"?window.renderSVG:null};');
    var out=runner(window,document,canvas,ctx,Math,Date,performance);
    if(typeof out.frame!=='function')throw new Error('Render contract missing: window.renderFrame(time, frame, fps)');
    userFn=out.frame;userSvg=out.svg||null;setState('READY');renderAt(+timeline.value||0);
    if(!silent)toast('Render code compiled locally');
    stillBtn.disabled=stillFormat.value==='svg'&&!userSvg;
    return true;
  }catch(e){setState('ERROR');engineState.title=e.message;toast(e.message);return false}
}
function renderAt(time){
  if(!userFn)return false;
  time=Math.max(0,Math.min(DURATION,+time||0));
  frame=Math.min(Math.floor(time*FPS),Math.max(0,Math.floor(DURATION*FPS)-1));
  window.__rendererTransparent=transparent.checked;
  try{
    userFn(time,frame,FPS);
    timeline.value=time;timeLabel.textContent=time.toFixed(2)+'s';
    frameLabel.textContent=frame+' / '+Math.max(1,Math.floor(DURATION*FPS));
    canvasInfo.textContent=time.toFixed(2)+'s / frame '+frame;
    progress.style.transform='scaleX('+(DURATION?time/DURATION:0)+')';
    return true;
  }catch(e){setState('ERROR');engineState.title=e.message;toast('Frame error: '+e.message);return false}
}
function togglePreview(){
  if(!userFn&& !buildEngine())return;
  if(playing){playing=false;playBtn.textContent='Preview';cancelAnimationFrame(raf);return}
  playing=true;playBtn.textContent='Stop';var last=performance.now();
  function tick(now){
    if(!playing)return;
    var t=(+timeline.value||0)+(now-last)/1000;last=now;
    if(t>=DURATION){t=0;if(loopMode.value==='record'){playing=false;playBtn.textContent='Preview'}}
    renderAt(t);if(playing)raf=requestAnimationFrame(tick);
  }
  raf=requestAnimationFrame(tick);
}
function downloadBlob(blob,name){
  if(!blob)return;var url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url)},30000);
}
function safeName(){
  var title=$('#metaTitle').value.trim()||'tamasrazim-animation';
  return title.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'tamasrazim-animation';
}
function exportStill(){
  if(!userFn&& !buildEngine())return;
  var t=+timeline.value||0;renderAt(t);var fmt=stillFormat.value;
  if(fmt==='svg'){
    if(typeof userSvg!=='function'){toast('SVG export requires window.renderSVG(time, frame, fps)');return}
    try{
      var svg=userSvg(t,frame,FPS);
      if(typeof svg!=='string'||svg.toLowerCase().indexOf('<svg')<0)throw new Error('renderSVG must return SVG markup');
      downloadBlob(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),safeName()+'.svg');toast('SVG exported');
    }catch(e){toast('SVG error: '+e.message)}
    return;
  }
  var type=fmt==='jpg'?'image/jpeg':fmt==='webp'?'image/webp':'image/png',quality=fmt==='png'?undefined:.96;
  if(fmt==='jpg' && transparent.checked){
    var flat=document.createElement('canvas');
    flat.width=W;flat.height=H;
    var fctx=flat.getContext('2d');
    fctx.fillStyle='#050505';fctx.fillRect(0,0,W,H);
    fctx.drawImage(canvas,0,0);
    flat.toBlob(function(blob){
      if(!blob){toast('JPG export failed in this browser');return}
      downloadBlob(blob,safeName()+'.jpg');toast('JPG exported with opaque background');
    },'image/jpeg',quality);
    return;
  }
  canvas.toBlob(function(blob){
    if(!blob){toast('Raster export failed in this browser');return}
    downloadBlob(blob,safeName()+'.'+fmt);toast(fmt.toUpperCase()+' exported');
  },type,quality);
}
function exportVideo(){
  if(renderingVideo)return;
  if(!userFn&& !buildEngine())return;
  if(!canvas.captureStream||!window.MediaRecorder){toast('WebM rendering is unavailable in this browser');return}
  var mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':
  (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')?'video/webm;codecs=vp8':
  (MediaRecorder.isTypeSupported('video/webm')?'video/webm':null));
  if(!mime){toast('No supported WebM encoder is available in this browser');return}
  renderingVideo=true;videoFailed=false;playing=false;setState('RENDERING');videoBtn.disabled=true;rendering.classList.add('open');
  var stream=canvas.captureStream(FPS),rec,chunks=[];
  try{rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:16000000})}
  catch(e){renderingVideo=false;videoBtn.disabled=false;rendering.classList.remove('open');setState('ERROR');toast('Encoder setup failed: '+e.message);return}
  rec.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data)};
  rec.onerror=function(){
    videoFailed=true;
    try{stream.getTracks().forEach(function(t){t.stop()})}catch(err){}
    renderingVideo=false;videoBtn.disabled=false;rendering.classList.remove('open');setState('ERROR');
    toast('WebM encoder error');
  };
  var total=Math.max(1,Math.floor(DURATION*FPS)),i=0,start=performance.now();
  rec.onstop=function(){
    stream.getTracks().forEach(function(t){t.stop()});
    rendering.classList.remove('open');renderingVideo=false;videoBtn.disabled=false;
    if(videoFailed){setState('ERROR');return}
    downloadBlob(new Blob(chunks,{type:mime}),safeName()+'.webm');
    setState('READY');toast('WebM render complete');
  };
  rec.start(250);
  function tick(){
    if(i>=total){rec.stop();return}
    if(!renderAt(i/FPS)){videoFailed=true;try{rec.stop()}catch(e){}return}
    rFrame.textContent=i;
    var pct=i/(total-1||1);rPct.textContent=Math.round(pct*100)+'%';rProgress.style.transform='scaleX('+pct+')';
    i++;
    var due=start+i*1000/FPS,delay=Math.max(0,due-performance.now());
    setTimeout(tick,delay);
  }
  tick();
}
function exportMetadata(){
  var data={
    title:$('#metaTitle').value.trim()||'Untitled animation',
    description:$('#metaDescription').value.trim(),
    keywords:$('#metaKeywords').value.split(',').map(function(x){return x.trim()}).filter(Boolean),
    creator:$('#metaCreator').value.trim()||'Tamasrazim',
    category:'Graphics / Animation',
    source:'Animation Renderer — Tamasrazim',
    delivery:{
      width:W,
      height:H,
      fps:FPS,
      durationSeconds:DURATION,
      loop:loopMode.value==='loop',
      transparent:transparent.checked,
      stillFormat:stillFormat.value,
      animationFormat:'WebM'
    },
    generatedAt:new Date().toISOString()
  };
  downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),safeName()+'.json');toast('Metadata JSON exported');
}
$$('.tab').forEach(function(tab){tab.addEventListener('click',function(){
  $$('.tab').forEach(function(x){x.classList.remove('active')});tab.classList.add('active');
  ['codePanel','settingsPanel','stockPanel'].forEach(function(id){$('#'+id).hidden=id!==tab.dataset.tab});
})});
$('#renderBtn').addEventListener('click',function(){buildEngine(false)});
$('#loadBtn').addEventListener('click',function(){codeEl.value="(function(){\n  var TAU=Math.PI*2;\n\n  window.renderFrame=function(time, frame, fps){\n    var w=canvas.width, h=canvas.height;\n    var ctx=canvas.getContext('2d');\n    var cx=w*.5, cy=h*.5;\n    var s=Math.min(w,h);\n    var dark=!window.__rendererTransparent;\n\n    ctx.clearRect(0,0,w,h);\n    if(dark){\n      ctx.fillStyle='#050505';\n      ctx.fillRect(0,0,w,h);\n    }\n\n    var glow=ctx.createRadialGradient(cx,cy,0,cx,cy,s*.46);\n    glow.addColorStop(0,'rgba(243,243,239,.055)');\n    glow.addColorStop(1,'rgba(243,243,239,0)');\n    ctx.fillStyle=glow;\n    ctx.beginPath();\n    ctx.arc(cx,cy,s*.46,0,TAU);\n    ctx.fill();\n\n    for(var i=0;i<42;i++){\n      var a=time*.7*(i%2?1:-1)+i*TAU/42;\n      var r=s*(.12+i*.006)+Math.sin(time*1.7+i)*s*.012;\n      var x=cx+Math.cos(a)*r;\n      var y=cy+Math.sin(a)*r*.62;\n      var alpha=.08+.16*Math.pow(Math.sin(i+time*1.4),2);\n      ctx.beginPath();\n      ctx.arc(x,y,Math.max(1.5,s*.0018),0,TAU);\n      ctx.fillStyle='rgba(243,243,239,'+alpha.toFixed(3)+')';\n      ctx.fill();\n    }\n\n    for(var ring=0;ring<9;ring++){\n      var rr=s*(.10+ring*.035)+Math.sin(time*1.15+ring)*s*.006;\n      ctx.beginPath();\n      ctx.arc(cx,cy,rr,0,TAU);\n      ctx.setLineDash([18+ring*4,28+ring*3]);\n      ctx.lineDashOffset=-time*(18+ring*5);\n      ctx.strokeStyle='rgba(243,243,239,'+(.022+ring*.005)+')';\n      ctx.lineWidth=1;\n      ctx.stroke();\n    }\n    ctx.setLineDash([]);\n\n    var pulse=s*(.012+.004*Math.sin(time*3.1));\n    ctx.beginPath();\n    ctx.arc(cx,cy,pulse,0,TAU);\n    ctx.fillStyle='rgba(243,243,239,.16)';\n    ctx.fill();\n  };\n\n  window.renderSVG=function(time, frame, fps){\n    var w=canvas.width, h=canvas.height;\n    var s=Math.min(w,h);\n    var bg=window.__rendererTransparent?'':'<rect width=\"'+w+'\" height=\"'+h+'\" fill=\"#050505\"/>';\n    var rings='';\n    for(var i=0;i<9;i++){\n      var r=(s*(.10+i*.035)+Math.sin(time*1.15+i)*s*.006).toFixed(2);\n      rings += '<circle cx=\"'+(w/2).toFixed(2)+'\" cy=\"'+(h/2).toFixed(2)+'\" r=\"'+r+'\" fill=\"none\" stroke=\"#F3F3EF\" stroke-opacity=\"'+(.022+i*.005).toFixed(3)+'\" stroke-width=\"1\" stroke-dasharray=\"'+(18+i*4)+' '+(28+i*3)+'\" stroke-dashoffset=\"'+(-time*(18+i*5)).toFixed(2)+'\"/>';\n    }\n    return '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"'+w+'\" height=\"'+h+'\" viewBox=\"0 0 '+w+' '+h+'\">'+bg+rings+'</svg>';\n  };\n})();";buildEngine(false)});
codeEl.addEventListener('input',updateMeta);preset.addEventListener('change',parseSettings);fpsEl.addEventListener('change',parseSettings);durationEl.addEventListener('change',parseSettings);
timeline.addEventListener('input',function(){renderAt(+timeline.value||0)});
transparent.addEventListener('change',function(){checker.classList.toggle('show',transparent.checked);renderAt(+timeline.value||0)});
stillFormat.addEventListener('change',function(){stillBtn.disabled=stillFormat.value==='svg'&&!userSvg});
playBtn.addEventListener('click',togglePreview);stillBtn.addEventListener('click',exportStill);videoBtn.addEventListener('click',exportVideo);$('#metadataBtn').addEventListener('click',exportMetadata);

var gameScore=0,gameTarget=$('#gameTarget'),gameBox=$('#gameBox');
function moveTarget(){gameTarget.style.left=(8+Math.random()*84)+'%';gameTarget.style.top=(12+Math.random()*76)+'%';gameTarget.style.display='block'}
gameTarget.addEventListener('pointerdown',function(){gameScore++;$('#gameScore').textContent='Score '+gameScore;moveTarget()});moveTarget();

(function(){
  var vp9=window.MediaRecorder&&MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
  var vp8=window.MediaRecorder&&MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
  var webm=window.MediaRecorder&&MediaRecorder.isTypeSupported('video/webm');
  formatSupport.textContent=window.MediaRecorder&&canvas.captureStream&&(vp9||vp8||webm)?'WebM encoder detected':'WebM encoder unavailable';
})();

var deferredPrompt=null,installBtn=$('#installBtn');
if(location.protocol!=='https:' && location.hostname!=='localhost'){
  installBtn.hidden=true;
}
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredPrompt=e;installBtn.hidden=false});
installBtn.addEventListener('click',async function(){if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installBtn.hidden=true});
window.addEventListener('appinstalled',function(){installBtn.hidden=true;toast('Renderer installed')});

if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(function(){});

parseSettings();
})();

(function(){
"use strict";
var body=document.body;
if(!body||!body.classList.contains("home-v6"))return;
var menu=document.getElementById("menuButton"),nav=document.getElementById("siteNav");
function setMenu(open,restoreFocus){
  if(!menu||!nav)return;
  menu.setAttribute("aria-expanded",String(open));
  menu.setAttribute("aria-label",open?"Close navigation":"Open navigation");
  nav.classList.toggle("is-open",open);
  if(!open&&restoreFocus)menu.focus();
}
if(menu&&nav){
  menu.addEventListener("click",function(){setMenu(menu.getAttribute("aria-expanded")!=="true",false);});
  nav.querySelectorAll("a").forEach(function(a){a.addEventListener("click",function(){setMenu(false,false);});});
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&menu.getAttribute("aria-expanded")==="true")setMenu(false,true);});
  document.addEventListener("pointerdown",function(e){if(menu.getAttribute("aria-expanded")==="true"&&!nav.contains(e.target)&&!menu.contains(e.target))setMenu(false,false);});
  window.addEventListener("resize",function(){if(window.innerWidth>900)setMenu(false,false);},{passive:true});
}
var reduceQuery=window.matchMedia?window.matchMedia("(prefers-reduced-motion: reduce)"):null;
var reduce=!!(reduceQuery&&reduceQuery.matches);
var year=document.getElementById("homeYear");if(year)year.textContent=String(new Date().getFullYear());
var progress=document.getElementById("scrollProgress");
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function updateProgress(){if(!progress)return;var max=document.documentElement.scrollHeight-window.innerHeight;progress.style.transform="scaleX("+(max>0?clamp(window.scrollY/max,0,1):0)+")";}
window.addEventListener("scroll",updateProgress,{passive:true});window.addEventListener("resize",updateProgress,{passive:true});updateProgress();

function criticalSpring(state,target,omega,dt){
  var error=state.value-target,c=state.velocity+omega*error,decay=Math.exp(-omega*dt);
  state.value=target+(error+c*dt)*decay;
  state.velocity=(state.velocity-omega*c*dt)*decay;
}
function rotatePoint(p,rx,ry,rz){
  var cx=Math.cos(rx),sx=Math.sin(rx),y=p.y*cx-p.z*sx,z=p.y*sx+p.z*cx;
  var cy=Math.cos(ry),sy=Math.sin(ry),x=p.x*cy+z*sy;z=-p.x*sy+z*cy;
  var cz=Math.cos(rz),sz=Math.sin(rz);
  return{x:x*cz-y*sz,y:x*sz+y*cz,z:z};
}
function projectPoint(p,w,h,yaw,pitch,scale){
  var q=rotatePoint(p,pitch,yaw,.07*Math.sin(yaw*.5)),camera=4.6;
  var focal=Math.min(w,h)*.43*scale,depth=camera-q.z,factor=focal/depth;
  return{x:w*.5+q.x*factor,y:h*.49-q.y*factor,z:q.z};
}
function drawOrbital(ctx,w,h,time,yaw,pitch,preset){
  if(!ctx||w<1||h<1)return;
  ctx.clearRect(0,0,w,h);
  var cx=w*.5,cy=h*.49,radiusScale=clamp(Math.min(w,h)/560,.66,1.22);
  var backdrop=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(w,h)*.62);
  backdrop.addColorStop(0,"rgba(255,255,255,.055)");backdrop.addColorStop(.55,"rgba(255,255,255,.018)");backdrop.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=backdrop;ctx.fillRect(0,0,w,h);
  var ringCount=3+(preset%3),rings=[];
  for(var r=0;r<ringCount;r++){
    var rx=.42+r*.71+Math.sin(time*.52+r)*.13,ry=.26+r*.49+Math.cos(time*.37+r)*.11;
    var rz=(r-ringCount*.5)*.36+time*(.18+(r%2)*.075),rad=(1.02+r*.13+((preset%4)*.025))*radiusScale,points=[];
    for(var i=0;i<=180;i++){
      var a=(i/180)*Math.PI*2,local={x:rad*Math.cos(a),y:rad*Math.sin(a),z:.11*Math.sin(a*2+r)};
      points.push(projectPoint(rotatePoint(local,rx+time*.32*(r+1),ry+time*.22*(r+1),rz),w,h,yaw,pitch,1));
    }
    rings.push({points:points,index:r});
  }
  var centerZ=function(points){var sum=0,count=0;for(var i=0;i<points.length;i+=12){sum+=points[i].z;count++;}return sum/count;};
  rings.sort(function(a,b){return centerZ(a.points)-centerZ(b.points);});
  for(var ri=0;ri<rings.length;ri++){
    var ring=rings[ri],pts=ring.points;
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(var p=1;p<pts.length;p++)ctx.lineTo(pts[p].x,pts[p].y);
    ctx.strokeStyle="rgba(242,242,236,"+(.34+ri*.055)+")";ctx.lineWidth=ri===Math.floor(rings.length/2)?1.35:.75;ctx.stroke();
    var arcStart=Math.floor(((time*.24*(ring.index+1))%1)*180);
    ctx.beginPath();for(var q=0;q<=27;q++){var point=pts[(arcStart+q)%180];if(q===0)ctx.moveTo(point.x,point.y);else ctx.lineTo(point.x,point.y);}
    ctx.strokeStyle="rgba(255,255,250,.92)";ctx.lineWidth=1.8;ctx.stroke();
    var satellite=pts[(arcStart+13)%180],glow=ctx.createRadialGradient(satellite.x,satellite.y,0,satellite.x,satellite.y,12*radiusScale);
    glow.addColorStop(0,"rgba(255,255,255,.8)");glow.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(satellite.x,satellite.y,12*radiusScale,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#f4f3ed";ctx.beginPath();ctx.arc(satellite.x,satellite.y,2.1*radiusScale,0,Math.PI*2);ctx.fill();
  }
  var pulse=.86+.14*Math.sin(time*2.4),core=ctx.createRadialGradient(cx-w*.025,cy-h*.035,1,cx,cy,Math.min(w,h)*.14*pulse);
  core.addColorStop(0,"rgba(255,255,255,.48)");core.addColorStop(.2,"rgba(185,185,180,.17)");core.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=core;ctx.beginPath();ctx.arc(cx,cy,Math.min(w,h)*.14*pulse,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(cx,cy,Math.min(w,h)*.14*pulse,0,Math.PI*2);ctx.strokeStyle="rgba(255,255,255,.22)";ctx.lineWidth=.7;ctx.stroke();
  for(var spoke=0;spoke<8;spoke++){
    var angle=spoke*Math.PI/4+time*.24,x1=cx+Math.cos(angle)*Math.min(w,h)*.19,y1=cy+Math.sin(angle)*Math.min(w,h)*.19;
    var x2=cx+Math.cos(angle)*Math.min(w,h)*.37,y2=cy+Math.sin(angle)*Math.min(w,h)*.37;
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle="rgba(255,255,255,.07)";ctx.lineWidth=.6;ctx.stroke();
  }
}
function createScene(canvas,preset,interaction){
  var ctx=canvas&&canvas.getContext?canvas.getContext("2d",{alpha:true,desynchronized:true}):null;if(!ctx)return null;
  var w=1,h=1,dpr=1,visible=false,last=0,elapsed=0,raf=0;
  var yaw={value:.22,velocity:0},pitch={value:-.24,velocity:0};
  var pointer={x:0,y:0,active:false,down:false,dragYaw:0,dragPitch:0};
  function drawStatic(){drawOrbital(ctx,w,h,elapsed,yaw.value,pitch.value,preset());}
  function resize(){
    var rect=canvas.getBoundingClientRect();w=Math.max(1,rect.width);h=Math.max(1,rect.height);dpr=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);drawStatic();
  }
  if("ResizeObserver"in window){var ro=new ResizeObserver(resize);ro.observe(canvas);}else window.addEventListener("resize",resize,{passive:true});
  resize();
  var interactionFrame=canvas.parentElement||canvas;
  interactionFrame.addEventListener("pointermove",function(e){
    var rect=interactionFrame.getBoundingClientRect();pointer.x=clamp((e.clientX-rect.left)/rect.width,0,1)*2-1;pointer.y=clamp((e.clientY-rect.top)/rect.height,0,1)*2-1;pointer.active=true;
    if(pointer.down){pointer.dragYaw+=e.movementX*.003;pointer.dragPitch+=e.movementY*.003;}
  },{passive:true});
  interactionFrame.addEventListener("pointerleave",function(){pointer.active=false;pointer.down=false;},{passive:true});
  interactionFrame.addEventListener("pointerdown",function(e){
    if(!interaction)return;pointer.down=true;
    if(interactionFrame.setPointerCapture)try{interactionFrame.setPointerCapture(e.pointerId);}catch(ignore){}
  });
  interactionFrame.addEventListener("pointerup",function(){pointer.down=false;},{passive:true});
  function tick(now){
    raf=0;if(document.hidden||!visible||reduce){last=0;if(!reduce)drawStatic();return;}
    if(last&&now-last<1000/45){raf=requestAnimationFrame(tick);return;}
    var dt=last?Math.min(.032,(now-last)/1000):1/45;last=now;elapsed+=dt;
    criticalSpring(yaw,.22+(pointer.active?pointer.x*.52:0)+pointer.dragYaw,7.8,dt);
    criticalSpring(pitch,-.24+(pointer.active?pointer.y*.25:0)+pointer.dragPitch,7.8,dt);
    drawOrbital(ctx,w,h,elapsed,yaw.value,pitch.value,preset());raf=requestAnimationFrame(tick);
  }
  function start(){if(visible&&!reduce&&!document.hidden&&!raf){last=0;raf=requestAnimationFrame(tick);}}
  if("IntersectionObserver"in window){
    var io=new IntersectionObserver(function(records){visible=!!records[0].isIntersecting;if(visible)start();},{threshold:0});io.observe(interactionFrame);
  }else{visible=true;start();}
  document.addEventListener("visibilitychange",function(){if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;last=0;}else start();});
  if(reduce)drawStatic();else start();
  return{drawStatic:drawStatic,setPreset:drawStatic,setReducedMotion:function(value){if(value){if(raf)cancelAnimationFrame(raf);raf=0;drawStatic();}else start();}};
}
var heroScene=createScene(document.getElementById("heroCanvas"),function(){return 1;},true);
var activePreset=0,projectScene=createScene(document.getElementById("projectCanvas"),function(){return activePreset;},true);
var spotlight=document.getElementById("projectSpotlight"),stageNumber=document.getElementById("stageNumber");
var stageType=document.getElementById("stageType"),stageTitle=document.getElementById("stageTitle");
var stageDescription=document.getElementById("stageDescription"),stageCta=document.getElementById("stageCta");
var entries=Array.prototype.slice.call(document.querySelectorAll("[data-project-entry]"));
var countLabel=document.getElementById("projectCount");if(countLabel)countLabel.textContent=String(entries.length+1).padStart(2,"0");
function activateProject(entry,index){
  if(!entry)return;
  var title=entry.getAttribute("data-project-title")||"",detail=entry.getAttribute("data-project-detail")||"";
  var type=entry.getAttribute("data-project-type")||"",href=entry.getAttribute("data-project-href")||entry.getAttribute("href")||"/projects/";
  activePreset=index+2;if(stageNumber)stageNumber.textContent=String(index+2).padStart(2,"0");
  if(stageType)stageType.textContent=type;if(stageTitle)stageTitle.textContent=title;
  if(stageDescription)stageDescription.textContent=detail;if(stageCta)stageCta.textContent="Explore "+title;
  if(spotlight){spotlight.href=href;spotlight.setAttribute("aria-label","Explore "+title+": "+detail);}
  entries.forEach(function(item){item.classList.toggle("is-active",item===entry);});
  if(projectScene)projectScene.setPreset();
}
entries.forEach(function(entry,index){
  entry.addEventListener("mouseenter",function(){activateProject(entry,index);},{passive:true});
  entry.addEventListener("focusin",function(){activateProject(entry,index);});
});
var revealElements=document.querySelectorAll("[data-v6-reveal]");
if(reduce){revealElements.forEach(function(el){el.classList.add("is-v6-visible");});}
else if("IntersectionObserver"in window){
  var revealObserver=new IntersectionObserver(function(records){records.forEach(function(record){if(record.isIntersecting){record.target.classList.add("is-v6-visible");revealObserver.unobserve(record.target);}});},{threshold:.12,rootMargin:"0px 0px -5% 0px"});
  revealElements.forEach(function(el){revealObserver.observe(el);});
}else revealElements.forEach(function(el){el.classList.add("is-v6-visible");});
if(reduceQuery&&typeof reduceQuery.addEventListener==="function"){
  reduceQuery.addEventListener("change",function(e){
    reduce=!!e.matches;
    if(reduce){revealElements.forEach(function(el){el.classList.add("is-v6-visible");});if(heroScene)heroScene.setReducedMotion(true);if(projectScene)projectScene.setReducedMotion(true);}
    else{if(heroScene)heroScene.setReducedMotion(false);if(projectScene)projectScene.setReducedMotion(false);}
  });
}
})();
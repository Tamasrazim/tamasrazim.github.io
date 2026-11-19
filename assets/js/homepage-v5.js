(function(){
"use strict";
var body=document.body;
if(!body||!body.classList.contains("home-v5"))return;

var menu=document.getElementById("menuButton");
var nav=document.getElementById("siteNav");
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
  document.addEventListener("pointerdown",function(e){
    if(menu.getAttribute("aria-expanded")==="true"&&!nav.contains(e.target)&&!menu.contains(e.target))setMenu(false,false);
  });
  window.addEventListener("resize",function(){if(window.innerWidth>820)setMenu(false,false);},{passive:true});
}

var reduceQuery=window.matchMedia?window.matchMedia("(prefers-reduced-motion: reduce)"):null;
var reduce=!!(reduceQuery&&reduceQuery.matches);
var canvas=document.getElementById("mobiusCanvas");
var frame=document.getElementById("heroObject");
var ctx=canvas&&canvas.getContext?canvas.getContext("2d",{alpha:true,desynchronized:true}):null;
var width=0,height=0,dpr=1,visible=true,last=0,time=0;
var yaw=0.25,pitch=-0.32,roll=0,yawV=0,pitchV=0,rollV=0;
var targetYaw=0.25,targetPitch=-0.32,pointerDown=false;
var pointer={x:0,y:0,active:false};
var scrollProgress=document.getElementById("scrollProgress");
var year=document.getElementById("homeYear");
if(year)year.textContent=String(new Date().getFullYear());
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function resize(){
  if(!canvas||!frame||!ctx)return;
  var r=frame.getBoundingClientRect();
  width=Math.max(1,r.width);height=Math.max(1,r.height);
  dpr=Math.min(window.devicePixelRatio||1,1.5);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  render(0);
}
if(frame&&canvas&&ctx){
  if("ResizeObserver"in window){var ro=new ResizeObserver(resize);ro.observe(frame);}
  else window.addEventListener("resize",resize,{passive:true});
  resize();
  if("IntersectionObserver"in window){
    var io=new IntersectionObserver(function(entries){visible=!!entries[0].isIntersecting;},{threshold:0});
    io.observe(frame);
  }
  frame.addEventListener("pointermove",function(e){
    var r=frame.getBoundingClientRect();
    pointer.x=clamp((e.clientX-r.left)/r.width,0,1)*2-1;
    pointer.y=clamp((e.clientY-r.top)/r.height,0,1)*2-1;
    pointer.active=true;
    if(pointerDown){targetYaw+=e.movementX*.002;targetPitch+=e.movementY*.002;}
  },{passive:true});
  frame.addEventListener("pointerleave",function(){pointer.active=false;pointerDown=false;},{passive:true});
  frame.addEventListener("pointerdown",function(e){
    pointerDown=true;
    if(frame.setPointerCapture)try{frame.setPointerCapture(e.pointerId);}catch(ignore){}
  });
  frame.addEventListener("pointerup",function(){pointerDown=false;});
}

function rotate(p){
  var cy=Math.cos(yaw),sy=Math.sin(yaw);
  var x=p.x*cy-p.z*sy,z=p.x*sy+p.z*cy;
  var cp=Math.cos(pitch),sp=Math.sin(pitch);
  var y=p.y*cp-z*sp;z=p.y*sp+z*cp;
  var cr=Math.cos(roll),sr=Math.sin(roll);
  return{x:x*cr-y*sr,y:x*sr+y*cr,z:z};
}
function surface(u,v){
  var major=1.58,half=.68;
  var x=(major+v*Math.cos(u*.5))*Math.cos(u);
  var y=(major+v*Math.cos(u*.5))*Math.sin(u);
  var z=v*Math.sin(u*.5);
  return{x:x*half,y:y*half,z:z*half};
}
function project(p){
  var q=rotate(p);
  var camera=5.4,focal=Math.min(width,height)*1.17;
  var depth=camera+q.z;
  var s=focal/depth;
  return{x:width*.5+q.x*s,y:height*.49+q.y*s,z:q.z,scale:s};
}
function normal(a,b,c){
  var ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z;
  var vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z;
  var nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  var d=Math.hypot(nx,ny,nz)||1;
  return{x:nx/d,y:ny/d,z:nz/d};
}
function render(now){
  if(!ctx||!width||!height)return;
  ctx.clearRect(0,0,width,height);
  var bg=ctx.createRadialGradient(width*.5,height*.47,0,width*.5,height*.47,Math.max(width,height)*.75);
  bg.addColorStop(0,"rgba(255,255,255,.055)");
  bg.addColorStop(.52,"rgba(255,255,255,.018)");
  bg.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);

  var U=84,V=12,verts=[],faces=[],u,v;
  for(var i=0;i<=U;i++){
    u=(i/U)*Math.PI*2;
    var row=[];
    for(var j=0;j<=V;j++){
      v=-1+(j/V)*2;
      row.push(project(surface(u,v)));
    }
    verts.push(row);
  }
  for(var ui=0;ui<U;ui++){
    for(var vi=0;vi<V;vi++){
      var a=verts[ui][vi],b=verts[ui+1][vi],c=verts[ui+1][vi+1],d=verts[ui][vi+1];
      var avg=(a.z+b.z+c.z+d.z)*.25;
      var n=normal(surface((ui+.5)/U*Math.PI*2,-1+vi/V*2),surface((ui+1)/U*Math.PI*2,-1+vi/V*2),surface((ui+1)/U*Math.PI*2,-1+(vi+1)/V*2));
      var light=Math.abs(n.x*(-.38)+n.y*(-.5)+n.z*.78);
      faces.push({a:a,b:b,c:c,d:d,z:avg,light:light});
    }
  }
  faces.sort(function(a,b){return a.z-b.z;});
  for(var f=0;f<faces.length;f++){
    var face=faces[f],shade=clamp(.16+face.light*.43+(face.z+1.3)*.035,.12,.66);
    ctx.beginPath();
    ctx.moveTo(face.a.x,face.a.y);ctx.lineTo(face.b.x,face.b.y);
    ctx.lineTo(face.c.x,face.c.y);ctx.lineTo(face.d.x,face.d.y);ctx.closePath();
    ctx.fillStyle="rgba(240,240,234,"+shade+")";ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,"+(.12+face.light*.22)+")";
    ctx.lineWidth=.52;ctx.stroke();
  }

  // Longitudinal seams reveal the single continuous half-twist.
  for(var seam=0;seam<=V;seam+=2){
    ctx.beginPath();
    for(var k=0;k<=U;k++){
      var point=verts[k][seam];
      if(k===0)ctx.moveTo(point.x,point.y);else ctx.lineTo(point.x,point.y);
    }
    ctx.strokeStyle=seam===0||seam===V?"rgba(255,255,255,.62)":"rgba(255,255,255,.25)";
    ctx.lineWidth=seam===0||seam===V?1.05:.65;ctx.stroke();
  }
  ctx.beginPath();
  for(var cross=0;cross<U;cross+=7){
    var p=verts[cross][0],q=verts[cross][V];
    ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
  }
  ctx.strokeStyle="rgba(255,255,255,.22)";ctx.lineWidth=.55;ctx.stroke();

  var cx=width*.5,cy=height*.49;
  var glow=ctx.createRadialGradient(cx,cy,Math.min(width,height)*.16,cx,cy,Math.min(width,height)*.48);
  glow.addColorStop(0,"rgba(255,255,255,.05)");glow.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
}
function updateProgress(){
  if(!scrollProgress)return;
  var max=document.documentElement.scrollHeight-window.innerHeight;
  var p=max>0?clamp(window.scrollY/max,0,1):0;
  scrollProgress.style.transform="scaleX("+p+")";
}
window.addEventListener("scroll",updateProgress,{passive:true});
window.addEventListener("resize",updateProgress,{passive:true});
updateProgress();

var revealElements=document.querySelectorAll("[data-v5-reveal]");
if(reduce){
  revealElements.forEach(function(el){el.classList.add("is-v5-visible");});
}else if("IntersectionObserver"in window){
  var revealObserver=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add("is-v5-visible");revealObserver.unobserve(entry.target);}});
  },{threshold:.13,rootMargin:"0px 0px -5% 0px"});
  revealElements.forEach(function(el){revealObserver.observe(el);});
}else revealElements.forEach(function(el){el.classList.add("is-v5-visible");});

var cards=[];
document.querySelectorAll("[data-v5-card]").forEach(function(el){
  var state={el:el,x:0,y:0,vx:0,vy:0,tx:0,ty:0};
  cards.push(state);
  if(!reduce&&window.matchMedia&&window.matchMedia("(pointer:fine)").matches){
    el.addEventListener("pointermove",function(e){
      var r=el.getBoundingClientRect();
      state.tx=-(clamp((e.clientY-r.top)/r.height,0,1)-.5)*4;
      state.ty=(clamp((e.clientX-r.left)/r.width,0,1)-.5)*4;
    },{passive:true});
    el.addEventListener("pointerleave",function(){state.tx=0;state.ty=0;},{passive:true});
  }
});

if(reduce){render(0);return;}
function tick(now){
  var dt=last?Math.min(.035,(now-last)/1000):1/60;
  last=now;
  if(document.hidden){requestAnimationFrame(tick);return;}
  time+=dt;
  targetYaw+=Math.sin(time*.22)*dt*.025;
  if(pointer.active&&!pointerDown){
    targetYaw+=pointer.x*dt*.11;
    targetPitch+=pointer.y*dt*.045;
  }
  targetYaw=clamp(targetYaw,-1.5,1.5);
  targetPitch=clamp(targetPitch,-1.15,.55);
  var stiffness=24,damping=9.2;
  yawV+=(stiffness*(targetYaw-yaw)-damping*yawV)*dt;
  pitchV+=(stiffness*(targetPitch-pitch)-damping*pitchV)*dt;
  rollV+=(stiffness*(Math.sin(time*.18)*.08-roll)-damping*rollV)*dt;
  yaw+=yawV*dt;pitch+=pitchV*dt;roll+=rollV*dt;
  if(visible)render(time);

  for(var i=0;i<cards.length;i++){
    var c=cards[i],k=95,d=18;
    c.vx+=(k*(c.tx-c.x)-d*c.vx)*dt;
    c.vy+=(k*(c.ty-c.y)-d*c.vy)*dt;
    c.x+=c.vx*dt;c.y+=c.vy*dt;
    c.el.style.transform="perspective(1100px) rotateX("+c.x.toFixed(3)+"deg) rotateY("+c.y.toFixed(3)+"deg)";
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
document.addEventListener("visibilitychange",function(){last=0;if(!document.hidden)updateProgress();});
if(reduceQuery&&typeof reduceQuery.addEventListener==="function"){
  reduceQuery.addEventListener("change",function(e){
    if(e.matches){render(0);cards.forEach(function(c){c.el.style.transform="none";});}
  });
}
})();
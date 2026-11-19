(function(){
"use strict";
var body=document.body;
if(!body||!body.classList.contains("home-v4"))return;
body.classList.add("kinetic-ready");

var menu=document.querySelector(".kinetic-menu");
var nav=document.querySelector(".kinetic-nav");
function closeMenu(){
  if(!menu||!nav)return;
  nav.classList.remove("is-open");
  menu.setAttribute("aria-expanded","false");
  menu.setAttribute("aria-label","Open navigation");
}
if(menu&&nav){
  menu.addEventListener("click",function(){
    var open=menu.getAttribute("aria-expanded")!=="true";
    menu.setAttribute("aria-expanded",String(open));
    menu.setAttribute("aria-label",open?"Close navigation":"Open navigation");
    nav.classList.toggle("is-open",open);
  });
  nav.querySelectorAll("a").forEach(function(a){a.addEventListener("click",closeMenu);});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")closeMenu();});
  document.addEventListener("pointerdown",function(e){
    if(nav.classList.contains("is-open")&&!nav.contains(e.target)&&!menu.contains(e.target))closeMenu();
  });
  window.addEventListener("resize",function(){if(window.innerWidth>760)closeMenu();},{passive:true});
}

var reduceQuery=window.matchMedia?window.matchMedia("(prefers-reduced-motion: reduce)"):null;
var reduce=!!(reduceQuery&&reduceQuery.matches);
var canvas=document.getElementById("kineticField");
var stage=document.getElementById("kineticStage");
var hero=document.querySelector(".kinetic-hero");
var ctx=canvas&&canvas.getContext?canvas.getContext("2d",{alpha:false,desynchronized:true}):null;
var width=0,height=0,dpr=1,base=0,stageVisible=true;
var storyTarget=0,storyProgress=0,time=0,lastFrame=0;
var pointer={x:0,y:0,targetX:0,targetY:0,active:false,pulse:0};
var dust=[],orbitPoints=[];
var progress=document.getElementById("scrollProgress");
var titleBlock=document.querySelector(".kinetic-title-block");
var scrollCue=document.querySelector(".kinetic-scroll");
var heroTop=document.querySelector(".kinetic-hero-top");
var heroBottom=document.querySelector(".kinetic-hero-bottom");
var year=document.getElementById("homeYear");
if(year)year.textContent=String(new Date().getFullYear());

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function mix(a,b,t){return a+(b-a)*t;}
function smooth(a,b,t){var x=clamp((t-a)/(b-a),0,1);return x*x*(3-2*x);}
function seed(n){var x=Math.sin(n*127.1+311.7)*43758.5453123;return x-Math.floor(x);}

function resize(){
  if(!canvas||!stage||!ctx)return;
  var rect=stage.getBoundingClientRect();
  width=Math.max(1,rect.width);height=Math.max(1,rect.height);
  base=Math.min(width,height);
  dpr=Math.min(window.devicePixelRatio||1,1.6);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  dust=[];
  for(var i=0;i<120;i++){
    dust.push({x:seed(i+1)*width,y:seed(i+241)*height,r:.35+seed(i+421)*1.15,phase:seed(i+701)*Math.PI*2,speed:.15+seed(i+901)*.4});
  }
  orbitPoints=[];
  for(var ring=0;ring<3;ring++){
    for(var j=0;j<56;j++)orbitPoints.push({ring:ring,angle:(j/56)*Math.PI*2+ring*.11,seed:seed(ring*100+j+29)});
  }
  drawField(0);
}
if(stage&&canvas&&ctx){
  if("ResizeObserver"in window){var resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);}
  else window.addEventListener("resize",resize,{passive:true});
  resize();
  if("IntersectionObserver"in window){
    var stageObserver=new IntersectionObserver(function(entries){stageVisible=!!entries[0].isIntersecting;},{threshold:0});
    stageObserver.observe(stage);
  }
  stage.addEventListener("pointermove",function(e){
    var r=stage.getBoundingClientRect();
    pointer.targetX=clamp((e.clientX-r.left)/r.width,0,1)*2-1;
    pointer.targetY=clamp((e.clientY-r.top)/r.height,0,1)*2-1;
    pointer.active=true;
  },{passive:true});
  stage.addEventListener("pointerleave",function(){
    pointer.targetX=0;pointer.targetY=0;pointer.active=false;
  },{passive:true});
  stage.addEventListener("pointerdown",function(){pointer.pulse=1;},{passive:true});
}

function rotate3D(p,yaw,pitch,roll){
  var cy=Math.cos(yaw),sy=Math.sin(yaw);
  var x=p.x*cy-p.z*sy;
  var z=p.x*sy+p.z*cy;
  var cp=Math.cos(pitch),sp=Math.sin(pitch);
  var y=p.y*cp-z*sp;
  z=p.y*sp+z*cp;
  var cr=Math.cos(roll),sr=Math.sin(roll);
  return{x:x*cr-y*sr,y:x*sr+y*cr,z:z};
}
function project(p,angles,cx,cy){
  var q=rotate3D(p,angles.yaw,angles.pitch,angles.roll);
  var camera=base*2.65;
  var focal=base*1.78;
  var depth=Math.max(base*.45,camera+q.z);
  var scale=focal/depth;
  return{x:cx+q.x*scale,y:cy+q.y*scale,scale:scale,z:q.z};
}
function drawDust(now){
  for(var i=0;i<dust.length;i++){
    var d=dust[i],flicker=.35+.48*(.5+.5*Math.sin(now*d.speed+d.phase));
    ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
    ctx.fillStyle="rgba(238,238,232,"+(flicker*.44)+")";ctx.fill();
  }
}
function ringPoint(ring,a,r){
  if(ring===0)return{x:Math.cos(a)*r,y:Math.sin(a)*r*.67,z:0};
  if(ring===1)return{x:Math.cos(a)*r*.88,y:0,z:Math.sin(a)*r};
  return{x:0,y:Math.cos(a)*r*.67,z:Math.sin(a)*r*.88};
}
function drawOrbits(now,angles,cx,cy,radius){
  for(var ring=0;ring<3;ring++){
    var rotation=[.10,-.075,.06][ring]*now+[0,.44,-.37][ring]+storyProgress*[.8,-.65,.55][ring];
    ctx.beginPath();
    for(var i=0;i<=160;i++){
      var a=(i/160)*Math.PI*2+rotation;
      var s=project(ringPoint(ring,a,radius*(1+ring*.055)),angles,cx,cy);
      if(i===0)ctx.moveTo(s.x,s.y);else ctx.lineTo(s.x,s.y);
    }
    ctx.closePath();
    ctx.strokeStyle="rgba(238,238,232,"+(.11+ring*.025)+")";
    ctx.lineWidth=ring===0?1.05:.75;ctx.stroke();
  }
  for(var j=0;j<orbitPoints.length;j++){
    var n=orbitPoints[j];
    var a=n.angle+[.10,-.075,.06][n.ring]*now+[0,.44,-.37][n.ring]+storyProgress*[.8,-.65,.55][n.ring];
    var p=ringPoint(n.ring,a,radius*(1+n.ring*.055));
    var s=project(p,angles,cx,cy);
    var depthLight=clamp(.54+s.z/(base*2.2),.18,1);
    ctx.beginPath();ctx.arc(s.x,s.y,(.85+n.seed*1.5)*s.scale*1.8,0,Math.PI*2);
    ctx.fillStyle="rgba(245,245,239,"+(depthLight*.64)+")";
    ctx.shadowColor="rgba(255,255,255,.35)";ctx.shadowBlur=5*s.scale;ctx.fill();ctx.shadowBlur=0;
  }
}
function frameLocalPoint(center,x,y,z,ownYaw,ownPitch,ownRoll){
  var p=rotate3D({x:x,y:y,z:z},ownYaw,ownPitch,ownRoll);
  return{x:center.x+p.x,y:center.y+p.y,z:center.z+p.z};
}
function drawFrame(def,index,now,angles,cx,cy,spread,alpha){
  var size=smooth(.07,.42,storyProgress);
  var w=base*def.w*(.42+.58*size),h=base*def.h*(.42+.58*size);
  var offset=base*.48*spread;
  var centers=[
    {x:-offset*.69,y:offset*.10,z:base*.08*spread},
    {x:offset*.72,y:offset*.18,z:-base*.13*spread},
    {x:offset*.02,y:-offset*.76,z:base*.025*spread}
  ];
  var center=centers[index];
  var ownYaw=now*(.12+index*.025)+storyProgress*(index%2?-.5:.65)+index*1.38;
  var ownPitch=Math.sin(now*.24+index*2)*.12+(index-1)*.12;
  var ownRoll=Math.sin(now*.19+index)*.08+(index-1)*.07;
  var depth=base*.022;
  function corners(z){
    var pts=[],pairs=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
    for(var i=0;i<4;i++)pts.push(project(frameLocalPoint(center,pairs[i][0],pairs[i][1],z,ownYaw,ownPitch,ownRoll),angles,cx,cy));
    return pts;
  }
  var front=corners(depth),back=corners(-depth);
  ctx.beginPath();
  front.forEach(function(q,i){if(i===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);});
  ctx.closePath();
  ctx.fillStyle="rgba(239,239,232,"+(.012*alpha)+")";ctx.fill();
  ctx.strokeStyle="rgba(242,242,236,"+(.35*alpha)+")";ctx.lineWidth=1.15;ctx.stroke();
  ctx.beginPath();
  for(var b=0;b<4;b++){
    ctx.moveTo(front[b].x,front[b].y);
    ctx.lineTo(front[(b+1)%4].x,front[(b+1)%4].y);
    ctx.lineTo(back[(b+1)%4].x,back[(b+1)%4].y);
    ctx.moveTo(front[b].x,front[b].y);ctx.lineTo(back[b].x,back[b].y);
  }
  ctx.strokeStyle="rgba(220,220,214,"+(.15*alpha)+")";ctx.lineWidth=.75;ctx.stroke();
  ctx.beginPath();
  for(var k=0;k<4;k++){
    var c=front[k],next=front[(k+1)%4];
    var x=mix(c.x,next.x,.12),y=mix(c.y,next.y,.12);
    if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.closePath();ctx.strokeStyle="rgba(235,235,230,"+(.13*alpha)+")";ctx.lineWidth=.65;ctx.stroke();
  for(var c=0;c<4;c++){
    ctx.beginPath();ctx.arc(front[c].x,front[c].y,1.8,0,Math.PI*2);
    ctx.fillStyle="rgba(250,250,245,"+(.75*alpha)+")";ctx.fill();
  }
  return project(center,angles,cx,cy);
}
function drawCore(now,cx,cy,angles,spread){
  var p=project({x:0,y:0,z:0},angles,cx,cy);
  var radius=base*(.115-.025*spread);
  var glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius*2.7);
  glow.addColorStop(0,"rgba(246,246,240,.16)");
  glow.addColorStop(.26,"rgba(246,246,240,.065)");
  glow.addColorStop(1,"rgba(246,246,240,0)");
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,radius*2.7,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(p.x,p.y,radius*(.29+.025*Math.sin(now*1.4)),0,Math.PI*2);
  ctx.fillStyle="rgba(247,247,242,.8)";ctx.shadowColor="rgba(255,255,255,.65)";ctx.shadowBlur=16;ctx.fill();ctx.shadowBlur=0;
  ctx.beginPath();ctx.arc(p.x,p.y,radius*.76,0,Math.PI*2);
  ctx.strokeStyle="rgba(244,244,238,.27)";ctx.lineWidth=.8;ctx.stroke();
  return p;
}
function drawField(now){
  if(!ctx||!width||!height)return;
  ctx.clearRect(0,0,width,height);
  var bg=ctx.createRadialGradient(width*.58,height*.46,base*.06,width*.58,height*.46,base*1.25);
  bg.addColorStop(0,"#111111");bg.addColorStop(.48,"#090909");bg.addColorStop(1,"#060606");
  ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
  drawDust(now);
  var spread=smooth(.12,.84,storyProgress);
  var collapse=smooth(.84,1,storyProgress);
  spread*=1-.22*collapse;
  var cx=width*(width<620?.56:.59)+storyProgress*base*.018;
  var cy=height*.47+Math.sin(now*.15)*base*.008;
  var angles={
    yaw:now*.075+storyProgress*1.28+pointer.x*.19,
    pitch:-.18+storyProgress*.36+pointer.y*.13,
    roll:Math.sin(now*.12)*.025+storyProgress*.09
  };
  var radius=base*(.34+.14*spread)*(1+pointer.pulse*.035);
  drawOrbits(now,angles,cx,cy,radius);
  var reveal=smooth(.08,.43,storyProgress)*(1-.24*collapse);
  var defs=[{w:.58,h:.33},{w:.36,h:.58},{w:.44,h:.44}],centers=[];
  for(var i=0;i<defs.length;i++)centers.push(drawFrame(defs[i],i,now,angles,cx,cy,spread,reveal));
  if(reveal>.03){
    var core=project({x:0,y:0,z:0},angles,cx,cy);
    ctx.save();ctx.setLineDash([3,8]);ctx.lineDashOffset=-now*17;
    for(var j=0;j<centers.length;j++){
      ctx.beginPath();ctx.moveTo(core.x,core.y);ctx.lineTo(centers[j].x,centers[j].y);
      ctx.strokeStyle="rgba(238,238,232,"+(.12*reveal)+")";ctx.lineWidth=.75;ctx.stroke();
    }
    ctx.restore();
  }
  drawCore(now,cx,cy,angles,spread);
  var halo=ctx.createRadialGradient(cx,cy,base*.20,cx,cy,base*.78);
  halo.addColorStop(0,"rgba(255,255,255,0)");halo.addColorStop(1,"rgba(0,0,0,.28)");
  ctx.fillStyle=halo;ctx.fillRect(0,0,width,height);
}

function updateScroll(){
  if(progress){
    var max=document.documentElement.scrollHeight-window.innerHeight;
    progress.style.transform="scaleX("+(max>0?clamp(window.scrollY/max,0,1):0)+")";
  }
  if(hero&&!reduce){
    var travel=Math.max(1,hero.offsetHeight-window.innerHeight);
    storyTarget=clamp((window.scrollY-hero.offsetTop)/travel,0,1);
  }else storyTarget=0;
}
window.addEventListener("scroll",updateScroll,{passive:true});
window.addEventListener("resize",updateScroll,{passive:true});
updateScroll();

var reveals=[];
document.querySelectorAll("[data-kinetic-reveal]").forEach(function(el,index){
  reveals.push({el:el,p:0,v:0,target:0,startAt:0,mass:1+(index%4)*.08});
});
if(reduce){
  reveals.forEach(function(s){
    s.p=1;s.target=1;s.el.classList.add("is-kinetic-visible");
    s.el.style.opacity="1";s.el.style.setProperty("--reveal-y","0px");s.el.style.setProperty("--reveal-scale","1");
  });
}else if("IntersectionObserver"in window){
  var revealObserver=new IntersectionObserver(function(entries){
    var now=performance.now();
    entries.forEach(function(entry){
      if(!entry.isIntersecting)return;
      var state=reveals.find(function(s){return s.el===entry.target;});
      if(state){state.target=1;state.startAt=now+Math.min(240,reveals.indexOf(state)%7*34);}
      revealObserver.unobserve(entry.target);
    });
  },{threshold:.12,rootMargin:"0px 0px -5% 0px"});
  reveals.forEach(function(s){revealObserver.observe(s.el);});
}else reveals.forEach(function(s){s.target=1;});

var cards=[];
document.querySelectorAll("[data-kinetic-card]").forEach(function(el){
  var state={el:el,x:0,y:0,vx:0,vy:0,tx:0,ty:0};cards.push(state);
  if(!reduce&&window.matchMedia&&window.matchMedia("(pointer:fine)").matches){
    el.addEventListener("pointermove",function(e){
      var r=el.getBoundingClientRect();
      state.tx=- (clamp((e.clientY-r.top)/r.height,0,1)-.5)*8.5;
      state.ty=(clamp((e.clientX-r.left)/r.width,0,1)-.5)*9.5;
    },{passive:true});
    el.addEventListener("pointerleave",function(){state.tx=0;state.ty=0;},{passive:true});
  }
});

if(reduce){drawField(0);return;}
function frame(now){
  var dt=lastFrame?Math.min(.04,(now-lastFrame)/1000):1/60;
  lastFrame=now;
  if(document.hidden){requestAnimationFrame(frame);return;}
  time+=dt;
  storyProgress+=(storyTarget-storyProgress)*(1-Math.exp(-dt*6.5));
  pointer.x+=(pointer.targetX-pointer.x)*(1-Math.exp(-dt*5.2));
  pointer.y+=(pointer.targetY-pointer.y)*(1-Math.exp(-dt*5.2));
  pointer.pulse*=Math.exp(-dt*3.8);
  if(stageVisible)drawField(time);

  var titleFade=1-smooth(.16,.68,storyProgress);
  if(titleBlock){
    titleBlock.style.opacity=String(titleFade);
    titleBlock.style.transform="translate3d("+(-storyProgress*34).toFixed(2)+"px,"+(-storyProgress*26).toFixed(2)+"px,0) scale("+(1-storyProgress*.035).toFixed(4)+")";
  }
  if(scrollCue)scrollCue.style.opacity=String(1-smooth(.03,.20,storyProgress));
  if(heroTop)heroTop.style.opacity=String(1-smooth(.02,.19,storyProgress));
  if(heroBottom)heroBottom.style.opacity=String(smooth(.82,1,storyProgress));
  if(hero)hero.style.setProperty("--story-progress",storyProgress.toFixed(4));

  for(var i=0;i<reveals.length;i++){
    var s=reveals[i];
    if(s.target&&now<s.startAt)continue;
    if(Math.abs(s.target-s.p)>.0005||Math.abs(s.v)>.0005){
      var k=172,c=2*Math.sqrt(k*s.mass)*.79;
      var acceleration=((s.target-s.p)*k-s.v*c)/s.mass;
      s.v+=acceleration*dt;s.p+=s.v*dt;
      if(Math.abs(s.target-s.p)<.0005&&Math.abs(s.v)<.0005){s.p=s.target;s.v=0;}
      var visible=clamp(s.p,0,1);
      s.el.style.opacity=String(visible);
      s.el.style.setProperty("--reveal-y",((1-s.p)*54).toFixed(2)+"px");
      s.el.style.setProperty("--reveal-scale",(0.975+0.025*s.p).toFixed(4));
      if(s.p>.995&&Math.abs(s.v)<.01)s.el.classList.add("is-kinetic-visible");
    }
  }
  for(var c=0;c<cards.length;c++){
    var card=cards[c],kCard=115,dCard=22;
    card.vx+=((card.tx-card.x)*kCard-card.vx*dCard)*dt;
    card.vy+=((card.ty-card.y)*kCard-card.vy*dCard)*dt;
    card.x+=card.vx*dt;card.y+=card.vy*dt;
    card.el.style.setProperty("--tilt-x",card.x.toFixed(3)+"deg");
    card.el.style.setProperty("--tilt-y",card.y.toFixed(3)+"deg");
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener("visibilitychange",function(){lastFrame=0;if(!document.hidden)updateScroll();});
})();
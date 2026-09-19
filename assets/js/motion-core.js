(function(){
'use strict';

if(window.__tamasrazimMotionCore)return;
window.__tamasrazimMotionCore=true;

var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var fine=window.matchMedia&&window.matchMedia('(pointer: fine)').matches;
if(reduce)return;

var style=document.createElement('style');
style.textContent=String.raw`
:root{
  --motion-px:0;--motion-py:0;--motion-vx:0;--motion-vy:0;
  --motion-scroll:0;--motion-scroll-v:0;--motion-progress:0;
  --motion-energy:0;
}
.motion-layer{
  --ml-x:0px;--ml-y:0px;--ml-s:1;
  translate:var(--ml-x) var(--ml-y);
  scale:var(--ml-s);
  transform-style:preserve-3d;
  will-change:translate,scale;
}
.motion-text{
  --mt-s:1;--mt-y:0px;--mt-x:0px;
  scale:var(--mt-s);translate:var(--mt-x) var(--mt-y);
  transform-origin:50% 50%;
  will-change:scale,translate;
}
.motion-depth{
  --depth-x:0px;--depth-y:0px;--depth-z:0px;
  translate:var(--depth-x) var(--depth-y);
  transform:translateZ(var(--depth-z));
  will-change:translate;
}
.infinity-field{
  position:relative;isolation:isolate;
  --if-strength:0;--if-x:0px;--if-y:0px;--if-scale:1;
  translate:var(--if-x) var(--if-y);scale:var(--if-scale);
  will-change:translate,scale;
}
.infinity-field:before,.infinity-field:after{
  content:"";position:absolute;left:50%;top:50%;
  border:1px solid currentColor;border-radius:50%;
  pointer-events:none;z-index:-1;
  opacity:calc(var(--if-strength)*.75);
  transform:translate(-50%,-50%) scale(calc(1 + var(--if-strength)*5));
}
.infinity-field:before{width:28px;height:28px}
.infinity-field:after{width:76px;height:76px;opacity:calc(var(--if-strength)*.2);filter:blur(.5px)}
.motion-ready .project-card,
.motion-ready .id-card,
.motion-ready .contact-panel,
.motion-ready .social-link{transform-style:preserve-3d}
@media(pointer:coarse){
  .motion-layer,.motion-text,.motion-depth,.infinity-field{
    translate:none!important;scale:1!important;transform:none!important
  }
  .infinity-field:before,.infinity-field:after{display:none}
}
`;
document.head.appendChild(style);

var root=document.documentElement;
root.classList.add('motion-ready');

var pointer={
  x:innerWidth*.5,y:innerHeight*.5,
  tx:innerWidth*.5,ty:innerHeight*.5,
  vx:0,vy:0,px:innerWidth*.5,py:innerHeight*.5
};
var scroll={y:window.scrollY||0,target:window.scrollY||0,velocity:0,last:window.scrollY||0};
var nodes=[],texts=[],email=null;
var boundsDirty=true,last=performance.now(),raf=0;

function qa(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function ease(v){v=clamp(v,0,1);return v*v*(3-2*v)}
function smooth(a,b,k){return a+(b-a)*k}

function add(selector,type,strength){
  qa(selector).forEach(function(el){
    if(el.dataset.motionCore)return;
    el.dataset.motionCore='1';
    el.classList.add('motion-layer');
    nodes.push({el:el,type:type,strength:strength,x:0,y:0,scale:1,w:1,h:1,cx:0,cy:0});
  });
}

add('.hero-title','hero',1.35);
add('.hero-kicker,.hero-alias,.hero-copy,.hero-actions','hero',.7);
add('.about-copy','about',.48);
add('.id-card','card',1.15);
add('.project-card','card',1.05);
add('.social-link','social',.8);
add('.contact-panel','contact',.78);
add('.renderer-mini','surface',.82);
add('.brand,.header-contact,.button,.project-link,.copy','control',.5);

qa('.hero-title,.section-title,.social-name,.project-body h3,.id-name,.id-alias,.email-link').forEach(function(el){
  if(el.dataset.motionText)return;
  el.dataset.motionText='1';
  el.classList.add('motion-text');
  texts.push({el:el,s:1,x:0,y:0,cx:0,cy:0,w:1,h:1});
});

email=document.querySelector('.email-link');
if(email)email.classList.add('infinity-field');

function refreshBounds(){
  var sy=window.scrollY||0;
  nodes.forEach(function(n){
    var r=n.el.getBoundingClientRect();
    n.w=r.width||1;n.h=r.height||1;
    n.cx=r.left+n.w*.5;n.cy=r.top+n.h*.5+sy;
  });
  texts.forEach(function(t){
    var r=t.el.getBoundingClientRect();
    t.w=r.width||1;t.h=r.height||1;
    t.cx=r.left+t.w*.5;t.cy=r.top+t.h*.5+sy;
  });
  boundsDirty=false;
}

function invalidate(){boundsDirty=true}
window.addEventListener('resize',invalidate,{passive:true});
window.addEventListener('load',invalidate,{once:true});
window.addEventListener('pointermove',function(e){pointer.tx=e.clientX;pointer.ty=e.clientY},{passive:true});
window.addEventListener('blur',function(){pointer.tx=innerWidth*.5;pointer.ty=innerHeight*.5},{passive:true});
window.addEventListener('scroll',function(){scroll.target=window.scrollY||0;invalidate()},{passive:true});

function frame(now){
  var dt=Math.min(.05,Math.max(.008,(now-last)/1000));last=now;
  if(boundsDirty)refreshBounds();

  var pk=1-Math.exp(-dt*13);
  pointer.x=smooth(pointer.x,pointer.tx,pk);
  pointer.y=smooth(pointer.y,pointer.ty,pk);
  pointer.vx=smooth(pointer.vx,(pointer.x-pointer.px)/Math.max(dt,.008),.2);
  pointer.vy=smooth(pointer.vy,(pointer.y-pointer.py)/Math.max(dt,.008),.2);
  pointer.px=pointer.x;pointer.py=pointer.y;

  scroll.y=smooth(scroll.y,scroll.target,1-Math.exp(-dt*18));
  scroll.velocity=smooth(scroll.velocity,(scroll.y-scroll.last)/Math.max(dt,.008),.16);
  scroll.last=scroll.y;

  var nx=(pointer.x/Math.max(1,innerWidth)-.5)*2;
  var ny=(pointer.y/Math.max(1,innerHeight)-.5)*2;
  var maxScroll=Math.max(1,document.documentElement.scrollHeight-innerHeight);
  var progress=clamp(scroll.y/maxScroll,0,1);
  var energy=clamp(Math.hypot(pointer.vx,pointer.vy)*.0025+Math.abs(scroll.velocity)*.00045,0,1);

  root.style.setProperty('--motion-px',nx.toFixed(4));
  root.style.setProperty('--motion-py',ny.toFixed(4));
  root.style.setProperty('--motion-vx',pointer.vx.toFixed(2));
  root.style.setProperty('--motion-vy',pointer.vy.toFixed(2));
  root.style.setProperty('--motion-scroll',scroll.y.toFixed(2));
  root.style.setProperty('--motion-scroll-v',scroll.velocity.toFixed(2));
  root.style.setProperty('--motion-progress',progress.toFixed(4));
  root.style.setProperty('--motion-energy',energy.toFixed(4));

  nodes.forEach(function(n){
    var localY=n.cy-scroll.y;
    if(localY < -innerHeight*.4 || localY > innerHeight*1.4)return;

    var dx=pointer.x-n.cx,dy=pointer.y-localY;
    var radius=Math.max(120,Math.min(500,Math.max(n.w,n.h)*1.2));
    var influence=ease(1-Math.hypot(dx,dy)/radius);
    var s=n.strength;

    var ax=n.type==='hero'?8:n.type==='card'?5:n.type==='social'?3:n.type==='control'?2:n.type==='about'?2.4:2.6;
    var ay=n.type==='hero'?4.8:n.type==='card'?3.2:n.type==='social'?2:n.type==='control'?1.4:n.type==='about'?1.8:1.7;

    var viewport=(innerHeight*.58-localY)/innerHeight;
    var localScroll=clamp(viewport,-1,1);
    var scrollPower=n.type==='hero'?localScroll*.85:
      n.type==='card'?localScroll*1.1:
      n.type==='contact'?localScroll*.85:
      n.type==='social'?localScroll*.55:
      n.type==='about'?localScroll*.42:localScroll*.3;

    var vx=pointer.vx*.0035*s;
    var vy=pointer.vy*.0025*s;
    var tx=nx*ax*s*influence+vx;
    var ty=ny*ay*s*influence+vy+scrollPower*5;
    var targetScale=1+influence*(.014+.012*s)+energy*.008;

    n.x=smooth(n.x,tx,1-Math.exp(-dt*(9+influence*13)));
    n.y=smooth(n.y,ty,1-Math.exp(-dt*(9+influence*13)));
    n.scale=smooth(n.scale,targetScale,1-Math.exp(-dt*10));

    n.el.style.setProperty('--ml-x',n.x.toFixed(2)+'px');
    n.el.style.setProperty('--ml-y',n.y.toFixed(2)+'px');
    n.el.style.setProperty('--ml-s',n.scale.toFixed(4));
    n.el.style.setProperty('--motion-proximity',influence.toFixed(3));
  });

  texts.forEach(function(t){
    var localY=t.cy-scroll.y;
    if(localY < -innerHeight*.35 || localY > innerHeight*1.35)return;
    var dist=Math.hypot(pointer.x-t.cx,pointer.y-localY);
    var radius=Math.max(110,Math.min(300,Math.max(t.w,t.h)*1.18));
    var f=ease(1-dist/radius);
    t.s=smooth(t.s,1+f*.065,1-Math.exp(-dt*14));
    t.y=smooth(t.y,-f*(2.2+energy*2),1-Math.exp(-dt*13));
    t.x=smooth(t.x,(pointer.x-t.cx)/Math.max(1,t.w)*f*2.2,1-Math.exp(-dt*11));
    t.el.style.setProperty('--mt-s',t.s.toFixed(4));
    t.el.style.setProperty('--mt-y',t.y.toFixed(2)+'px');
    t.el.style.setProperty('--mt-x',t.x.toFixed(2)+'px');
  });

  if(email){
    var er=email.getBoundingClientRect();
    var ex=pointer.x-(er.left+er.width*.5),ey=pointer.y-(er.top+er.height*.5);
    var dist=Math.hypot(ex,ey);
    var radius=Math.max(150,Math.min(390,er.width*1.8));
    var f=ease(1-dist/radius),res=f*f;
    var mag=Math.max(1,dist);
    email.style.setProperty('--if-strength',f.toFixed(3));
    email.style.setProperty('--if-x',(-ex/mag*res*(18+energy*12)).toFixed(2)+'px');
    email.style.setProperty('--if-y',(-ey/mag*res*(12+energy*8)).toFixed(2)+'px');
    email.style.setProperty('--if-scale',(1+res*(.035+energy*.02)).toFixed(4));
  }

  raf=requestAnimationFrame(frame);
}
raf=requestAnimationFrame(frame);
})();
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
/* ---------- Tamasrazim Scene Engine: continuous motion ---------- */
(function(){
  var sceneReduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(sceneReduced)return;
  var style=document.createElement('style');
  style.textContent=
    ':root{--scene-cx:0;--scene-cy:0;--scene-vx:0;--scene-vy:0;--scene-energy:0;--scene-progress:0;--scene-tilt:0}' +
    'body::before{content:"";position:fixed;inset:-18vmax;z-index:0;pointer-events:none;opacity:.22;background:radial-gradient(circle at calc(50% + var(--scene-cx)*8%) calc(50% + var(--scene-cy)*8%),rgba(243,243,239,.085),transparent 18%),repeating-linear-gradient(90deg,transparent 0 11vw,rgba(243,243,239,.018) 11vw 11.08vw),repeating-linear-gradient(0deg,transparent 0 15vh,rgba(243,243,239,.014) 15vh 15.08vh);transform:translate3d(calc(var(--scene-cx)*-10px),calc(var(--scene-cy)*-7px),0) rotate(calc(var(--scene-tilt)*.22deg));will-change:transform}' +
    '.scene-bridge{position:fixed;inset:0;z-index:1;pointer-events:none;overflow:hidden;opacity:calc(.18 + var(--scene-energy)*.22);mix-blend-mode:screen}' +
    '.scene-bridge:before,.scene-bridge:after{content:"";position:absolute;left:50%;top:50%;border:1px solid rgba(243,243,239,.09);border-radius:50%;transform:translate(-50%,-50%) scale(calc(1 + var(--scene-progress)*.85 + var(--scene-energy)*.2))}' +
    '.scene-bridge:before{width:34vw;height:34vw}.scene-bridge:after{width:64vw;height:64vw;opacity:.42}' +
    '.scene-mark{position:absolute;width:1px;height:42vh;left:calc(50% + var(--scene-cx)*18vw);top:29%;background:linear-gradient(transparent,rgba(243,243,239,.22),transparent);transform:rotate(calc(var(--scene-tilt)*2.2deg + var(--scene-progress)*22deg));transform-origin:50% 50%}' +
    '.scene-reactive{--sr-x:0px;--sr-y:0px;--sr-r:0deg;position:relative;transform:translate3d(var(--sr-x),var(--sr-y),0) rotate(var(--sr-r));will-change:transform}' +
    '@media(pointer:coarse){body:before,.scene-bridge{display:none}.scene-reactive{transform:none!important}}';
  document.head.appendChild(style);
  var bridge=document.createElement('div');bridge.className='scene-bridge';bridge.setAttribute('aria-hidden','true');
  var mark=document.createElement('span');mark.className='scene-mark';bridge.appendChild(mark);document.body.appendChild(bridge);
  var root=document.documentElement;
  var sections=Array.prototype.slice.call(document.querySelectorAll('main > section'));
  var cards=Array.prototype.slice.call(document.querySelectorAll('.project-card'));
  var hero=document.querySelector('.hero-inner');
  var about=document.querySelector('.about-grid');
  var bands=Array.prototype.slice.call(document.querySelectorAll('.band-track'));
  var state={x:innerWidth*.5,y:innerHeight*.5,vx:0,vy:0,scroll:window.scrollY||0,scrollV:0,lastScroll:window.scrollY||0,px:innerWidth*.5,py:innerHeight*.5};
  var target={x:state.x,y:state.y,scroll:state.scroll},last=performance.now();
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function smooth(a,b,k){return a+(b-a)*k}
  function ease(v){v=clamp(v,0,1);return v*v*(3-2*v)}
  sections.forEach(function(el){el.classList.add('scene-reactive')});
  if(hero)hero.classList.add('scene-reactive');
  if(about)about.classList.add('scene-reactive');
  cards.forEach(function(el){el.classList.add('scene-reactive')});
  window.addEventListener('pointermove',function(e){target.x=e.clientX;target.y=e.clientY},{passive:true});
  window.addEventListener('scroll',function(){target.scroll=window.scrollY||0},{passive:true});
  window.addEventListener('blur',function(){target.x=innerWidth*.5;target.y=innerHeight*.5},{passive:true});
  function tick(now){
    var dt=Math.min(.033,Math.max(.008,(now-last)/1000));last=now;
    var k=1-Math.exp(-dt*8.5);
    state.x=smooth(state.x,target.x,k);state.y=smooth(state.y,target.y,k);
    state.vx=smooth(state.vx,(state.x-state.px)/dt,.18);state.vy=smooth(state.vy,(state.y-state.py)/dt,.18);
    state.px=state.x;state.py=state.y;state.scroll=smooth(state.scroll,target.scroll,1-Math.exp(-dt*12));
    state.scrollV=smooth(state.scrollV,(state.scroll-state.lastScroll)/dt,.14);state.lastScroll=state.scroll;
    var nx=(state.x/Math.max(1,innerWidth)-.5)*2,ny=(state.y/Math.max(1,innerHeight)-.5)*2;
    var maxScroll=Math.max(1,document.documentElement.scrollHeight-innerHeight),progress=clamp(state.scroll/maxScroll,0,1);
    var energy=clamp(Math.hypot(state.vx,state.vy)*.0022+Math.abs(state.scrollV)*.00042,0,1);
    root.style.setProperty('--scene-cx',nx.toFixed(4));root.style.setProperty('--scene-cy',ny.toFixed(4));
    root.style.setProperty('--scene-vx',state.vx.toFixed(2));root.style.setProperty('--scene-vy',state.vy.toFixed(2));
    root.style.setProperty('--scene-energy',energy.toFixed(4));root.style.setProperty('--scene-progress',progress.toFixed(4));
    root.style.setProperty('--scene-tilt',(nx*2.2+state.vx*.004).toFixed(3));
    sections.forEach(function(section){
      var r=section.getBoundingClientRect(),center=r.top+r.height*.5,focus=ease(clamp(1-Math.abs(center-innerHeight*.5)/(innerHeight*.95),0,1)),local=(center-innerHeight*.5)/Math.max(innerHeight,r.height);
      section.style.setProperty('--sr-x',(nx*(1.5+focus*2.8)+state.vx*.0012*focus).toFixed(2)+'px');
      section.style.setProperty('--sr-y',(-local*(1.2+focus*1.6)+state.vy*.0008*focus).toFixed(2)+'px');
      section.style.setProperty('--sr-r',(nx*(.22+focus*.42)+state.vx*.0006).toFixed(3)+'deg');
      section.style.setProperty('--scene-focus',focus.toFixed(3));
    });
    if(hero){var hr=hero.getBoundingClientRect(),hf=ease(clamp(1-Math.abs((hr.top+hr.height*.5)-innerHeight*.5)/(innerHeight*.9),0,1));hero.style.setProperty('--hero-scene-depth',(hf*14+energy*8).toFixed(2)+'px')}
    if(about){var ar=about.getBoundingClientRect(),af=ease(clamp(1-Math.abs((ar.top+ar.height*.5)-innerHeight*.5)/(innerHeight*1.05),0,1));about.style.setProperty('--about-scene-progress',af.toFixed(3))}
    cards.forEach(function(card,index){
      var r=card.getBoundingClientRect(),cx=r.left+r.width*.5,cy=r.top+r.height*.5,dist=Math.hypot(state.x-cx,state.y-cy),near=ease(1-dist/Math.max(260,Math.min(760,Math.max(r.width,r.height)*1.8)));
      card.style.setProperty('--sr-x',((state.x-cx)*.018*near+nx*(2.5+near*7)+state.vx*.0015*near).toFixed(2)+'px');
      card.style.setProperty('--sr-y',((state.y-cy)*.012*near+state.vy*.001*near).toFixed(2)+'px');
      card.style.setProperty('--sr-r',((state.x-cx)*.0035*near+nx*1.2).toFixed(3)+'deg');
      card.style.setProperty('--scene-card-near',near.toFixed(3));card.style.setProperty('--scene-card-energy',energy.toFixed(3));
    });
    bands.forEach(function(track,index){track.style.setProperty('--scene-band-x',((index%2?-1:1)*(progress*120+nx*14)).toFixed(2)+'px');track.style.setProperty('--scene-band-skew',(nx*.7+state.vx*.0015).toFixed(3)+'deg')});
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
/* ---------- Tamasrazim Scene Environment: depth + adaptive quality ---------- */
(function(){
  var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine=window.matchMedia&&window.matchMedia('(pointer: fine)').matches;
  if(reduced||!fine)return;

  var root=document.documentElement;
  var style=document.createElement('style');
  style.textContent=
    ':root{--scene-quality:1;--scene-depth:0;--scene-section:0;--scene-blend:0}' +
    '.scene-environment{position:fixed;inset:0;z-index:2;pointer-events:none;overflow:hidden;perspective:1100px;opacity:calc(.26 + var(--scene-quality)*.12)}' +
    '.scene-environment .scene-plane{position:absolute;left:50%;top:50%;width:68vmin;height:68vmin;border:1px solid rgba(243,243,239,.055);border-radius:50%;transform:translate(-50%,-50%) rotateX(calc(62deg + var(--scene-cy)*7deg)) rotateZ(calc(var(--scene-progress)*34deg + var(--scene-cx)*9deg)) translateZ(calc(var(--scene-depth)*1px));box-shadow:0 0 80px rgba(243,243,239,.025),inset 0 0 80px rgba(243,243,239,.018);will-change:transform}' +
    '.scene-environment .scene-plane:before,.scene-environment .scene-plane:after{content:"";position:absolute;inset:10%;border:1px solid rgba(243,243,239,.035);border-radius:50%;transform:rotate(calc(var(--scene-progress)*-70deg)) scale(calc(.72 + var(--scene-energy)*.16));}' +
    '.scene-environment .scene-plane:after{inset:25%;border-style:dashed;opacity:.7}' +
    '.scene-environment .scene-axis{position:absolute;left:50%;top:12%;width:1px;height:76%;background:linear-gradient(transparent,rgba(243,243,239,.10),transparent);transform-origin:50% 50%;transform:translateX(-50%) rotate(calc(var(--scene-cx)*5deg + var(--scene-vx)*.006deg));opacity:calc(.18 + var(--scene-energy)*.35)}' +
    '.scene-environment .scene-horizon{position:absolute;left:-10%;right:-10%;top:50%;height:1px;background:linear-gradient(90deg,transparent,rgba(243,243,239,.09),transparent);transform:translateY(calc(var(--scene-cy)*16px + var(--scene-progress)*22px)) rotate(calc(var(--scene-vy)*.004deg));opacity:.8}' +
    '@media(pointer:coarse){.scene-environment{display:none}}';
  document.head.appendChild(style);

  var env=document.createElement('div');
  env.className='scene-environment';
  env.setAttribute('aria-hidden','true');
  env.innerHTML='<span class="scene-plane"></span><span class="scene-axis"></span><span class="scene-horizon"></span>';
  document.body.appendChild(env);

  var samples=[],last=performance.now(),quality=1,good=0,bad=0;
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function activeSection(){
    var sections=[].slice.call(document.querySelectorAll('main > section'));
    var best=0,score=-1;
    sections.forEach(function(s,i){
      var r=s.getBoundingClientRect(),center=r.top+r.height*.5;
      var focus=1-Math.min(1,Math.abs(center-innerHeight*.5)/Math.max(innerHeight,r.height));
      if(focus>score){score=focus;best=i}
    });
    return {index:best,blend:clamp(score,0,1)};
  }
  function tick(now){
    var dt=now-last;last=now;
    if(dt>0&&dt<100){
      samples.push(dt);
      if(samples.length>45)samples.shift();
      var avg=samples.reduce(function(a,b){return a+b},0)/samples.length;
      if(avg>18){bad++;good=0}else if(avg<13){good++;bad=0}else{good=0;bad=0}
      if(bad>18){quality=clamp(quality-.08,.55,1);bad=0}
      if(good>30){quality=clamp(quality+.05,.55,1);good=0}
      root.style.setProperty('--scene-quality',quality.toFixed(2));
    }
    var depth=(1-quality)*-18+(parseFloat(getComputedStyle(root).getPropertyValue('--scene-energy'))||0)*28;
    root.style.setProperty('--scene-depth',depth.toFixed(2));
    var section=activeSection();
    root.style.setProperty('--scene-section',section.index.toFixed(2));
    root.style.setProperty('--scene-blend',section.blend.toFixed(3));
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
})();
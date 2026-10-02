(function(){
'use strict';
var root=document.documentElement, body=document.body;
var reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
var fine=!!(window.matchMedia&&window.matchMedia('(pointer:fine)').matches);
var p={x:innerWidth/2,y:innerHeight/2,tx:innerWidth/2,ty:innerHeight/2,vx:0,vy:0,px:innerWidth/2,py:innerHeight/2};
var dot=document.getElementById('cursorDot'),ring=document.getElementById('cursorRing');
var last=performance.now(), hidden=document.hidden;
function q(s){return document.querySelector(s)}
function qa(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function smooth(a,b,k){return a+(b-a)*k}
function ease(v){v=clamp(v,0,1);return v*v*(3-2*v)}
root.classList.remove('no-js'); root.classList.add('js','tz-motion');

var st=document.createElement('style');
st.textContent=
'.tz-motion .pointer-drift{transform:translate3d(var(--pd-x,0px),var(--pd-y,0px),0) rotateX(var(--pd-rx,0deg)) rotateY(var(--pd-ry,0deg));transform-style:preserve-3d;will-change:transform}' +
'.tz-motion .pointer-soft{transform:translate3d(var(--pd-x,0px),var(--pd-y,0px),0);will-change:transform}' +
'.tz-motion .text-reactive{transform:translate3d(0,var(--text-y,0px),0) scale(var(--text-scale,1));transform-origin:center;will-change:transform}' +
'.tz-motion .project-card.tz-tilt{transform:perspective(1100px) rotateX(var(--card-x,0deg)) rotateY(var(--card-y,0deg)) translate3d(0,var(--card-z,0px),0);transform-style:preserve-3d}' +
'.tz-ripple{position:fixed;left:0;top:0;width:8px;height:8px;margin:-4px;border:1px solid rgba(243,243,239,.55);border-radius:50%;pointer-events:none;z-index:2100;transform:scale(.3);opacity:.7;transition:transform .62s cubic-bezier(.2,.8,.2,1),opacity .7s ease}' +
'.tz-ripple.is-live{transform:scale(18);opacity:0}' +
'@media(pointer:coarse){.tz-motion .cursor-dot,.tz-motion .cursor-ring{display:none!important}.tz-motion .pointer-drift,.tz-motion .pointer-soft,.tz-motion .text-reactive,.tz-motion .project-card.tz-tilt{transform:none!important}}';
document.head.appendChild(st);

window.addEventListener('pointermove',function(e){
 p.tx=e.clientX;p.ty=e.clientY;
 if(dot){dot.style.opacity='1';dot.style.transform='translate3d('+e.clientX+'px,'+e.clientY+'px,0) translate(-50%,-50%)'}
 if(ring){ring.style.opacity='1';ring.style.transform='translate3d('+e.clientX+'px,'+e.clientY+'px,0) translate(-50%,-50%)'}
},{passive:true});
window.addEventListener('pointerleave',function(){p.tx=innerWidth/2;p.ty=innerHeight/2});
window.addEventListener('blur',function(){p.tx=innerWidth/2;p.ty=innerHeight/2;if(dot)dot.style.opacity='0';if(ring)ring.style.opacity='0'});
document.addEventListener('visibilitychange',function(){hidden=document.hidden;last=performance.now()},{passive:true});

qa('a,button,.project-card,.id-card,.email-link').forEach(function(el){
 el.addEventListener('pointerenter',function(){if(ring)ring.classList.add('is-active')},{passive:true});
 el.addEventListener('pointerleave',function(){if(ring)ring.classList.remove('is-active')},{passive:true});
});

var targets=[];
[
 ['.hero-title','pointer-drift',8,4,2.2,3.4],
 ['.hero-kicker,.hero-alias,.hero-copy,.hero-actions','pointer-soft',3.2,2,0,0],
 ['.about-copy','pointer-soft',2.8,2,0,0],
 ['.id-card','pointer-drift',6,3.5,2.2,3.6],
 ['.social-link','pointer-soft',2.8,2,0,0],
 ['.contact-panel','pointer-drift',4.2,2.7,1.5,2.4]
].forEach(function(spec){
 qa(spec[0]).forEach(function(el){el.classList.add(spec[1]);targets.push({el:el,mx:spec[2],my:spec[3],rx:spec[4],ry:spec[5],x:0,y:0,rxv:0,ryv:0})});
});
var texts=qa('.hero-title,.section-title,.social-name,.project-body h3,.id-name,.id-alias,.email-link');
texts.forEach(function(el){el.classList.add('text-reactive')});
var cards=qa('.project-card');
cards.forEach(function(el){el.classList.add('tz-tilt')});

function motion(dt){
 if(reduce||hidden)return;
 var k=1-Math.exp(-dt*14);
 p.x=smooth(p.x,p.tx,k);p.y=smooth(p.y,p.ty,k);
 p.vx=smooth(p.vx,(p.x-p.px)/Math.max(dt,.008),.22);p.vy=smooth(p.vy,(p.y-p.py)/Math.max(dt,.008),.22);
 p.px=p.x;p.py=p.y;
 var nx=(p.x/Math.max(1,innerWidth)-.5)*2,ny=(p.y/Math.max(1,innerHeight)-.5)*2;
 root.style.setProperty('--motion-px',nx.toFixed(4));
 root.style.setProperty('--motion-py',ny.toFixed(4));
 root.style.setProperty('--motion-vx',p.vx.toFixed(2));
 root.style.setProperty('--motion-vy',p.vy.toFixed(2));
 targets.forEach(function(n){
   var r=n.el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
   var f=ease(1-Math.hypot(p.x-cx,p.y-cy)/Math.max(150,Math.min(620,Math.max(r.width,r.height)*1.3)));
   n.x=smooth(n.x,nx*n.mx*f+p.vx*.0025*n.mx*f,1-Math.exp(-dt*11));
   n.y=smooth(n.y,ny*n.my*f+p.vy*.002*n.my*f,1-Math.exp(-dt*11));
   n.rxv=smooth(n.rxv,-ny*n.rx*f,1-Math.exp(-dt*10));
   n.ryv=smooth(n.ryv,nx*n.ry*f,1-Math.exp(-dt*10));
   n.el.style.setProperty('--pd-x',n.x.toFixed(2)+'px');
   n.el.style.setProperty('--pd-y',n.y.toFixed(2)+'px');
   n.el.style.setProperty('--pd-rx',n.rxv.toFixed(3)+'deg');
   n.el.style.setProperty('--pd-ry',n.ryv.toFixed(3)+'deg');
 });
 texts.forEach(function(el){
   var r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
   var f=ease(1-Math.hypot(p.x-cx,p.y-cy)/Math.max(110,Math.min(340,Math.max(r.width,r.height)*1.2)));
   var s=1+f*.065;
   el.style.setProperty('--text-scale',s.toFixed(4));
   el.style.setProperty('--text-y',(-f*2.2).toFixed(2)+'px');
 });
 cards.forEach(function(card){
   var r=card.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
   var f=ease(1-Math.hypot(p.x-cx,p.y-cy)/Math.max(260,Math.min(760,Math.max(r.width,r.height)*1.7)));
   card.style.setProperty('--card-x',(-clamp((p.y-cy)/Math.max(1,r.height),-1,1)*5.5*f).toFixed(2)+'deg');
   card.style.setProperty('--card-y',(clamp((p.x-cx)/Math.max(1,r.width),-1,1)*7*f).toFixed(2)+'deg');
   card.style.setProperty('--card-z',(f*2.5).toFixed(2)+'px');
 });
}

qa('[data-reveal]').forEach(function(el){if(reduce)el.classList.add('is-visible')});
if(!reduce&&'IntersectionObserver' in window){
 var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}})},{threshold:.06});
 qa('[data-reveal]').forEach(function(el){io.observe(el)});
}else qa('[data-reveal]').forEach(function(el){el.classList.add('is-visible')});

function scramble(el,target,dur){
 if(!el||reduce)return;
 var chars='!<>-_[]{}=+*#01/\\',start=performance.now();
 function step(now){
   var f=clamp((now-start)/dur,0,1),n=Math.floor(target.length*f),out='';
   for(var i=0;i<target.length;i++)out+=i<n?target[i]:chars[Math.floor(Math.random()*chars.length)];
   el.textContent=out;
   if(f<1)requestAnimationFrame(step);else el.textContent=target;
 }
 requestAnimationFrame(step);
}
var alias=q('#aliasText'),idAlias=q('#idAlias');
if(alias){setTimeout(function(){scramble(alias,'TAMASRAZIM',520)},700);alias.addEventListener('pointerenter',function(){scramble(alias,'TAMASRAZIM',360)})}
if(idAlias)idAlias.addEventListener('pointerenter',function(){scramble(idAlias,'TAMASRAZIM',320)});

qa('.magnetic').forEach(function(el){
 el.addEventListener('pointermove',function(e){
   if(reduce||!fine)return;
   var r=el.getBoundingClientRect();
   el.style.setProperty('--mag-x',(clamp((e.clientX-(r.left+r.width/2))/(r.width/2),-1,1)*7).toFixed(2)+'px');
   el.style.setProperty('--mag-y',(clamp((e.clientY-(r.top+r.height/2))/(r.height/2),-1,1)*5).toFixed(2)+'px');
 },{passive:true});
 el.addEventListener('pointerleave',function(){el.style.setProperty('--mag-x','0px');el.style.setProperty('--mag-y','0px')},{passive:true});
});

if(!reduce){
 window.addEventListener('pointerdown',function(e){
   if(e.button!==0)return;
   var x=document.createElement('span');
   x.className='tz-ripple';x.style.left=e.clientX+'px';x.style.top=e.clientY+'px';
   body.appendChild(x);requestAnimationFrame(function(){x.classList.add('is-live')});
   setTimeout(function(){x.remove()},720);
 },{passive:true});
}

var copy=q('#copyButton'),email=q('#emailLink'),status=q('#copyStatus');
if(copy&&email){
 copy.addEventListener('click',function(){
   var value=email.textContent.trim();
   function done(){copy.textContent='Copied';if(status)status.textContent='Copied / ready to paste';setTimeout(function(){copy.textContent='Copy email';if(status)status.textContent='Direct contact / email'},1400)}
   if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(value).then(done).catch(fallback);else fallback();
   function fallback(){
     var a=document.createElement('textarea');a.value=value;a.style.position='fixed';a.style.opacity='0';body.appendChild(a);a.select();
     try{document.execCommand('copy')}catch(_e){} a.remove();done();
   }
 });
}

var menu=q('#menuButton'),mobile=q('#mobileNav');
if(menu&&mobile){
 function close(){mobile.classList.remove('is-open');menu.setAttribute('aria-expanded','false');body.classList.remove('is-locked')}
 menu.addEventListener('click',function(){var on=!mobile.classList.contains('is-open');mobile.classList.toggle('is-open',on);menu.setAttribute('aria-expanded',String(on));body.classList.toggle('is-locked',on)});
 qa('a',mobile).forEach(function(a){a.addEventListener('click',close)});
 document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
}

var secret=q('#secretNode'),reveal=q('#secretReveal'),secretClose=q('#secretClose'),bubble=q('#secretBubble');
if(secret&&reveal){
 secret.addEventListener('click',function(){reveal.hidden=false;requestAnimationFrame(function(){reveal.classList.add('show')});if(bubble){bubble.textContent='origin file opened';bubble.classList.add('show')}});
 function shut(){reveal.classList.remove('show');setTimeout(function(){reveal.hidden=true},360);if(bubble)bubble.classList.remove('show')}
 if(secretClose)secretClose.addEventListener('click',shut);
 reveal.addEventListener('click',function(e){if(e.target===reveal)shut()});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!reveal.hidden)shut()});
}

var clockEl=q('#clock');
function clock(){
 if(!clockEl)return;
 var d=new Date();
 clockEl.textContent=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
}
clock();setInterval(clock,1000);

var field=document.getElementById('field'),ctx=field&&field.getContext?field.getContext('2d'):null,particles=[];
function resizeField(){
 if(!ctx)return;
 var dpr=Math.min(devicePixelRatio||1,2);
 field.width=Math.floor(innerWidth*dpr);field.height=Math.floor(innerHeight*dpr);
 field.style.width='100%';field.style.height='100%';ctx.setTransform(dpr,0,0,dpr,0,0);
 particles=[];for(var i=0,n=Math.round(clamp(innerWidth*innerHeight/18000,45,100));i<n;i++)particles.push({x:Math.random()*innerWidth,y:Math.random()*innerHeight,s:.25+Math.random()*1.1,a:.05+Math.random()*.22,p:Math.random()*6.28});
}
function drawField(t){
 if(!ctx||reduce)return;
 ctx.clearRect(0,0,innerWidth,innerHeight);
 var nx=(p.x/Math.max(1,innerWidth)-.5)*18,ny=(p.y/Math.max(1,innerHeight)-.5)*14;
 particles.forEach(function(v,i){
   var x=(v.x+Math.sin(t*.00035+v.p)*9+nx)%innerWidth;if(x<0)x+=innerWidth;
   var y=(v.y+Math.cos(t*.00028+v.p)*7+ny)%innerHeight;if(y<0)y+=innerHeight;
   var a=v.a*(.72+.28*Math.sin(t*.0015+v.p+i));
   ctx.fillStyle='rgba(243,243,239,'+a.toFixed(3)+')';
   ctx.beginPath();ctx.arc(x,y,v.s,0,Math.PI*2);ctx.fill();
 });
}
if(ctx&&!reduce){resizeField();window.addEventListener('resize',resizeField,{passive:true})}

function frame(now){
 var dt=Math.min(.05,Math.max(.008,(now-last)/1000));last=now;
 if(!hidden){motion(dt);drawField(now)}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__tamasrazimSiteEffectsReady=true;
window.__tamasrazimMotionRebuilt=true;
})();
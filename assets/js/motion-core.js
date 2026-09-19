(function(){
'use strict';
if(window.__tamasrazimMotionCore)return;
window.__tamasrazimMotionCore=true;
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var fine=window.matchMedia&&window.matchMedia('(pointer: fine)').matches;
if(reduce)return;

var style=document.createElement('style');
style.textContent=String.raw\`
:root{--motion-px:0;--motion-py:0;--motion-vx:0;--motion-vy:0;--motion-scroll-v:0}
.motion-layer{--ml-x:0px;--ml-y:0px;--ml-rx:0deg;--ml-ry:0deg;--ml-s:1;translate:var(--ml-x) var(--ml-y);scale:var(--ml-s);transform-style:preserve-3d;will-change:translate,rotate,scale}
.motion-text{--mt-s:1;--mt-y:0px;--mt-x:0px;scale:var(--mt-s);translate:var(--mt-x) var(--mt-y);transform-origin:50% 50%;will-change:scale,translate}
.infinity-field{position:relative;isolation:isolate;--if-strength:0;--if-x:0px;--if-y:0px;--if-scale:1;translate:var(--if-x) var(--if-y);scale:var(--if-scale);will-change:translate,scale}
.infinity-field:before,.infinity-field:after{content:"";position:absolute;left:50%;top:50%;border:1px solid currentColor;border-radius:50%;pointer-events:none;z-index:-1;opacity:calc(var(--if-strength)*.8);transform:translate(-50%,-50%) scale(calc(1 + var(--if-strength)*5))}
.infinity-field:before{width:28px;height:28px}.infinity-field:after{width:72px;height:72px;opacity:calc(var(--if-strength)*.22);filter:blur(.5px)}
@media(pointer:coarse){.motion-layer,.motion-text,.infinity-field{translate:none!important;rotate:none!important;scale:1!important}.infinity-field:before,.infinity-field:after{display:none}}
\`;
document.head.appendChild(style);

var root=document.documentElement;
var pointer={x:innerWidth*.5,y:innerHeight*.5,tx:innerWidth*.5,ty:innerHeight*.5,vx:0,vy:0,sx:innerWidth*.5,sy:innerHeight*.5};
var nodes=[],texts=[],email=document.querySelector('.email-link'),last=performance.now();

function qa(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function ease(v){return v*v*(3-2*v)}
function smooth(a,b,k){return a+(b-a)*k}
function add(s,type,strength){
  qa(s).forEach(function(el){
    if(el.dataset.motionCore)return;
    el.dataset.motionCore='1';el.classList.add('motion-layer');
    nodes.push({el:el,type:type,strength:strength,x:0,y:0,rx:0,ry:0,scale:1});
  });
}
add('.hero-title','hero',1.2);
add('.hero-kicker,.hero-alias,.hero-copy,.hero-actions','hero',.65);
add('.id-card','card',1.1);
add('.project-card','card',1);
add('.social-link','social',.75);
add('.contact-panel','contact',.7);
add('.renderer-mini','surface',.8);
add('.brand,.header-contact,.button','control',.5);

qa('.hero-title,.section-title,.social-name,.project-body h3,.id-name,.id-alias,.email-link').forEach(function(el){
  if(el.dataset.motionText)return;
  el.dataset.motionText='1';el.classList.add('motion-text');
  texts.push({el:el,s:1,x:0,y:0});
});
if(email)email.classList.add('infinity-field');

window.addEventListener('pointermove',function(e){pointer.tx=e.clientX;pointer.ty=e.clientY},{passive:true});
window.addEventListener('blur',function(){pointer.tx=innerWidth*.5;pointer.ty=innerHeight*.5},{passive:true});

function frame(now){
  var dt=Math.min(.05,Math.max(.008,(now-last)/1000));last=now;
  var k=1-Math.exp(-dt*12);
  pointer.x=smooth(pointer.x,pointer.tx,k);pointer.y=smooth(pointer.y,pointer.ty,k);
  pointer.vx=smooth(pointer.vx,(pointer.x-pointer.sx)/Math.max(dt,.008),.18);
  pointer.vy=smooth(pointer.vy,(pointer.y-pointer.sy)/Math.max(dt,.008),.18);
  pointer.sx=pointer.x;pointer.sy=pointer.y;

  var nx=(pointer.x/Math.max(1,innerWidth)-.5)*2;
  var ny=(pointer.y/Math.max(1,innerHeight)-.5)*2;
  root.style.setProperty('--motion-px',nx.toFixed(4));
  root.style.setProperty('--motion-py',ny.toFixed(4));
  root.style.setProperty('--motion-vx',pointer.vx.toFixed(2));
  root.style.setProperty('--motion-vy',pointer.vy.toFixed(2));

  nodes.forEach(function(n){
    var r=n.el.getBoundingClientRect();if(r.width<2||r.height<2)return;
    var cx=r.left+r.width*.5,cy=r.top+r.height*.5;
    var d=Math.hypot(pointer.x-cx,pointer.y-cy);
    var p=ease(clamp(1-d/Math.max(120,Math.min(460,Math.max(r.width,r.height)*1.15)),0,1));
    var s=n.strength;
    var ax=n.type==='hero'?7:n.type==='card'?4.2:n.type==='social'?2.6:n.type==='control'?1.8:2.2;
    var ay=n.type==='hero'?4:n.type==='card'?2.8:n.type==='social'?1.8:n.type==='control'?1.2:1.5;
    var tx=nx*ax*s*p+pointer.vx*.003*s;
    var ty=ny*ay*s*p+pointer.vy*.002*s;
    var rx=ny*(n.type==='card'?-2.5:-1.1)*s*p;
    var ry=nx*(n.type==='card'?3.4:1.6)*s*p;
    n.x=smooth(n.x,tx,1-Math.exp(-dt*(8+p*10)));
    n.y=smooth(n.y,ty,1-Math.exp(-dt*(8+p*10)));
    n.rx=smooth(n.rx,rx,1-Math.exp(-dt*10));
    n.ry=smooth(n.ry,ry,1-Math.exp(-dt*10));
    n.scale=smooth(n.scale,1+p*.018*s,1-Math.exp(-dt*9));
    n.el.style.setProperty('--ml-x',n.x.toFixed(2)+'px');
    n.el.style.setProperty('--ml-y',n.y.toFixed(2)+'px');
    n.el.style.setProperty('--ml-rx',n.rx.toFixed(3)+'deg');
    n.el.style.setProperty('--ml-ry',n.ry.toFixed(3)+'deg');
    n.el.style.setProperty('--ml-s',n.scale.toFixed(4));
  });

  texts.forEach(function(t){
    var r=t.el.getBoundingClientRect();if(r.width<2)return;
    var d=Math.hypot(pointer.x-(r.left+r.width*.5),pointer.y-(r.top+r.height*.5));
    var f=ease(clamp(1-d/Math.max(110,Math.min(280,Math.max(r.width,r.height)*1.2)),0,1));
    t.s=smooth(t.s,1+f*.055,.22);
    t.y=smooth(t.y,-f*2.2,.22);
    t.el.style.setProperty('--mt-s',t.s.toFixed(4));
    t.el.style.setProperty('--mt-y',t.y.toFixed(2)+'px');
  });

  if(email){
    var er=email.getBoundingClientRect(),ex=pointer.x-(er.left+er.width*.5),ey=pointer.y-(er.top+er.height*.5);
    var ed=Math.hypot(ex,ey),ef=ease(clamp(1-ed/Math.max(150,Math.min(360,er.width*1.7)),0,1)),mag=Math.max(1,ed),res=ef*ef;
    email.style.setProperty('--if-strength',ef.toFixed(3));
    email.style.setProperty('--if-x',(-ex/mag*res*18).toFixed(2)+'px');
    email.style.setProperty('--if-y',(-ey/mag*res*12).toFixed(2)+'px');
    email.style.setProperty('--if-scale',(1+res*.035).toFixed(4));
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if(fine){
  var field=document.querySelector('#field');
  if(field){
    var ctx=field.getContext('2d'),dpr=Math.min(1.5,devicePixelRatio||1),pts=[];
    function resize(){dpr=Math.min(1.5,devicePixelRatio||1);field.width=Math.floor(innerWidth*dpr);field.height=Math.floor(innerHeight*dpr);field.style.width=innerWidth+'px';field.style.height=innerHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
    for(var i=0;i<36;i++)pts.push({x:Math.random(),y:Math.random(),p:Math.random()*6.28,s:.5+Math.random()});
    resize();addEventListener('resize',resize,{passive:true});
    function draw(){
      if(document.hidden){requestAnimationFrame(draw);return}
      ctx.clearRect(0,0,innerWidth,innerHeight);
      pts.forEach(function(p,i){
        p.p+=.002+(i%3)*.0007;
        var x=p.x*innerWidth+Math.sin(p.p)*18,y=p.y*innerHeight+Math.cos(p.p*.8)*14;
        var dx=pointer.x-x,dy=pointer.y-y,inf=ease(clamp(1-Math.hypot(dx,dy)/220,0,1));
        x+=dx*inf*.045;y+=dy*inf*.045;
        ctx.fillStyle='rgba(243,243,239,'+(0.018+inf*.045)+')';ctx.fillRect(x,y,p.s,p.s);
      });
      requestAnimationFrame(draw);
    }
    draw();
  }
}
})();
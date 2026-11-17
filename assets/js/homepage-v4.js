
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
  document.addEventListener("pointerdown",function(e){if(nav.classList.contains("is-open")&&!nav.contains(e.target)&&!menu.contains(e.target))closeMenu();});
  window.addEventListener("resize",function(){if(window.innerWidth>760)closeMenu();},{passive:true});
}

var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var canvas=document.getElementById("kineticField");
var stage=document.getElementById("kineticStage");
var ctx=canvas&&canvas.getContext?canvas.getContext("2d",{alpha:false,desynchronized:true}):null;
var width=0,height=0,dpr=1,nodes=[],links=[],pointer={x:0,y:0,active:false,down:false};
var simVisible=true,simTime=0,accumulator=0,lastFrame=0;
var FIXED_DT=1/120,COUNT=18,RADII=[0.31,0.59,0.88];
var progress=document.getElementById("scrollProgress");
var year=document.getElementById("homeYear");
if(year)year.textContent=String(new Date().getFullYear());

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function makeNodes(){
  nodes=[];links=[];
  if(!width||!height)return;
  var cx=width*.57,cy=height*.48,base=Math.min(width,height)*.45;
  for(var ring=0;ring<3;ring++){
    for(var i=0;i<COUNT;i++){
      var a=(Math.PI*2*i/COUNT)+(ring*.095);
      var r=base*RADII[ring];
      var x=cx+Math.cos(a)*r;
      var y=cy+Math.sin(a)*r*.62;
      nodes.push({
        ring:ring,index:i,angle:a,radius:r,
        x:x,y:y,px:x,py:y,
        vx:Math.cos(a+ring)*((ring%2)?-4:4),
        vy:Math.sin(a+ring)*3,
        fx:0,fy:0,mass:1+(ring*.12),
        size:1.25+(ring*.42)
      });
    }
  }
  function add(a,b,k,d){
    var dx=nodes[b].x-nodes[a].x,dy=nodes[b].y-nodes[a].y;
    links.push({a:a,b:b,rest:Math.hypot(dx,dy),k:k,d:d});
  }
  for(var r=0;r<3;r++){
    var baseIndex=r*COUNT;
    for(var n=0;n<COUNT;n++)add(baseIndex+n,baseIndex+((n+1)%COUNT),27,1.25);
  }
  for(var rr=0;rr<2;rr++){
    var inner=rr*COUNT,outer=(rr+1)*COUNT;
    for(var j=0;j<COUNT;j++){
      add(inner+j,outer+j,18,1.05);
      add(inner+j,outer+((j+3)%COUNT),9,.72);
    }
  }
}

function resize(){
  if(!canvas||!stage||!ctx)return;
  var rect=stage.getBoundingClientRect();
  width=Math.max(1,rect.width);height=Math.max(1,rect.height);
  dpr=Math.min(window.devicePixelRatio||1,1.75);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle="#070707";ctx.fillRect(0,0,width,height);
  makeNodes();
  drawField();
}
if(stage&&canvas&&ctx){
  if("ResizeObserver"in window){var ro=new ResizeObserver(resize);ro.observe(stage);}
  else window.addEventListener("resize",resize,{passive:true});
  resize();
  if("IntersectionObserver"in window){
    var visibilityObserver=new IntersectionObserver(function(entries){
      simVisible=entries[0].isIntersecting;
      if(!simVisible)accumulator=0;
    },{threshold:0});
    visibilityObserver.observe(stage);
  }
  stage.addEventListener("pointermove",function(e){
    var r=stage.getBoundingClientRect();
    pointer.x=e.clientX-r.left;
    pointer.y=e.clientY-r.top;
    pointer.active=true;
  },{passive:true});
  stage.addEventListener("pointerleave",function(){pointer.active=false;pointer.down=false;},{passive:true});
  stage.addEventListener("pointerdown",function(e){
    var r=stage.getBoundingClientRect();
    pointer.x=e.clientX-r.left;pointer.y=e.clientY-r.top;
    pointer.active=true;pointer.down=true;
    for(var i=0;i<nodes.length;i++){
      var n=nodes[i],dx=n.x-pointer.x,dy=n.y-pointer.y,d=Math.hypot(dx,dy)||1;
      if(d<210){var impulse=(1-d/210)*150;n.vx+=(dx/d)*impulse/n.mass;n.vy+=(dy/d)*impulse/n.mass;}
    }
  });
  stage.addEventListener("pointerup",function(){pointer.down=false;});
}

function stepPhysics(dt){
  simTime+=dt;
  var cx=width*.57,cy=height*.48,base=Math.min(width,height)*.45;
  for(var i=0;i<nodes.length;i++){nodes[i].fx=0;nodes[i].fy=0;}
  for(var i2=0;i2<nodes.length;i2++){
    var n=nodes[i2];
    var speed=[.13,-.09,.065][n.ring];
    var a=n.angle+simTime*speed;
    var targetX=cx+Math.cos(a)*base*RADII[n.ring];
    var targetY=cy+Math.sin(a)*base*RADII[n.ring]*.62;
    var anchorK=13.5,anchorD=2.2;
    n.fx+=(targetX-n.x)*anchorK-n.vx*anchorD;
    n.fy+=(targetY-n.y)*anchorK-n.vy*anchorD;
    if(pointer.active){
      var dx=n.x-pointer.x,dy=n.y-pointer.y,dist=Math.hypot(dx,dy)||1;
      var range=235;
      if(dist<range){
        var fall=Math.pow(1-dist/range,2);
        var force=(pointer.down?1650:980)*fall;
        n.fx+=(dx/dist)*force;
        n.fy+=(dy/dist)*force;
      }
    }
  }
  for(var l=0;l<links.length;l++){
    var link=links[l],aNode=nodes[link.a],bNode=nodes[link.b];
    var dx=bNode.x-aNode.x,dy=bNode.y-aNode.y,dist=Math.hypot(dx,dy)||.0001;
    var nx=dx/dist,ny=dy/dist;
    var relative=(bNode.vx-aNode.vx)*nx+(bNode.vy-aNode.vy)*ny;
    var f=link.k*(dist-link.rest)+link.d*relative;
    var fx=f*nx,fy=f*ny;
    aNode.fx+=fx;aNode.fy+=fy;bNode.fx-=fx;bNode.fy-=fy;
  }

  // Soft particle contacts prevent the spring lattice from passing through itself.
  for(var ci=0;ci<nodes.length;ci++){
    var ca=nodes[ci];
    for(var cj=ci+1;cj<nodes.length;cj++){
      var cb=nodes[cj],cdx=cb.x-ca.x,cdy=cb.y-ca.y,cd=Math.hypot(cdx,cdy)||.0001;
      var contact=(ca.size+cb.size)*2.8;
      if(cd<contact){
        var cnx=cdx/cd,cny=cdy/cd;
        var closing=(cb.vx-ca.vx)*cnx+(cb.vy-ca.vy)*cny;
        var contactForce=(contact-cd)*38+Math.max(0,-closing)*1.6;
        var cfx=cnx*contactForce,cfy=cny*contactForce;
        ca.fx-=cfx;ca.fy-=cfy;cb.fx+=cfx;cb.fy+=cfy;
      }
    }
  }
  for(var p=0;p<nodes.length;p++){
    var node=nodes[p];
    node.vx=(node.vx+node.fx/node.mass*dt)*Math.exp(-.13*dt);
    node.vy=(node.vy+node.fy/node.mass*dt)*Math.exp(-.13*dt);
    node.px=node.x;node.py=node.y;
    node.x+=node.vx*dt;node.y+=node.vy*dt;
    var pad=32;
    if(node.x<pad){node.x=pad;node.vx=Math.abs(node.vx)*.55;}
    else if(node.x>width-pad){node.x=width-pad;node.vx=-Math.abs(node.vx)*.55;}
    if(node.y<pad){node.y=pad;node.vy=Math.abs(node.vy)*.55;}
    else if(node.y>height-pad){node.y=height-pad;node.vy=-Math.abs(node.vy)*.55;}
  }
}

function drawField(){
  if(!ctx||!width||!height)return;
  ctx.fillStyle="rgba(7,7,7,.17)";
  ctx.fillRect(0,0,width,height);
  var cx=width*.57,cy=height*.48,base=Math.min(width,height)*.45;
  ctx.save();
  ctx.translate(cx,cy);
  ctx.strokeStyle="rgba(240,240,235,.08)";
  ctx.lineWidth=.7;
  ctx.beginPath();ctx.ellipse(0,0,base*.95,base*.95*.62,simTime*.025,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.ellipse(0,0,base*.66,base*.66*.62,-simTime*.03,0,Math.PI*2);ctx.stroke();
  ctx.restore();

  for(var l=0;l<links.length;l++){
    var link=links[l],a=nodes[link.a],b=nodes[link.b];
    var velocity=Math.min(1,(Math.hypot(a.vx+b.vx,a.vy+b.vy))*.003);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
    ctx.strokeStyle="rgba(230,230,225,"+(link.k>20?.19:.095)+")";
    ctx.lineWidth=link.k>20?.8:.65;ctx.stroke();
    if(velocity>.16){
      ctx.beginPath();ctx.moveTo(a.px,a.py);ctx.lineTo(a.x,a.y);
      ctx.strokeStyle="rgba(255,255,255,"+(velocity*.16)+")";ctx.lineWidth=1.2;ctx.stroke();
    }
  }
  for(var i=0;i<nodes.length;i++){
    var n=nodes[i],depth=(Math.sin(n.angle+simTime*[.13,-.09,.065][n.ring])+1)*.5;
    var radius=n.size+depth*.85;
    ctx.beginPath();ctx.arc(n.x,n.y,radius,0,Math.PI*2);
    ctx.fillStyle="rgba(245,245,240,"+(.38+depth*.48)+")";
    ctx.shadowColor="rgba(255,255,255,.42)";ctx.shadowBlur=3+depth*8;ctx.fill();ctx.shadowBlur=0;
  }
  var pulse=1+Math.sin(simTime*1.4)*.035;
  var core=base*.06*pulse;
  var gradient=ctx.createRadialGradient(cx,cy,0,cx,cy,core*2.4);
  gradient.addColorStop(0,"rgba(255,255,255,.2)");
  gradient.addColorStop(.28,"rgba(255,255,255,.065)");
  gradient.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(cx,cy,core*2.4,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(cx,cy,core*.48,0,Math.PI*2);
  ctx.fillStyle="rgba(245,245,240,.72)";ctx.fill();
}

var reveals=[];
document.querySelectorAll("[data-kinetic-reveal]").forEach(function(el,index){
  var state={el:el,p:0,v:0,target:0,startAt:0,mass:1+(index%4)*.09};
  reveals.push(state);
  if(reduce){state.p=1;state.target=1;el.classList.add("is-kinetic-visible");el.style.opacity="1";el.style.setProperty("--reveal-y","0px");el.style.setProperty("--reveal-scale","1");}
});
if(!reduce&&"IntersectionObserver"in window){
  var revealObserver=new IntersectionObserver(function(entries){
    var now=performance.now();
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        var state=reveals.find(function(s){return s.el===entry.target;});
        if(state){state.target=1;state.startAt=now+Math.min(220,reveals.indexOf(state)%6*32);}
        revealObserver.unobserve(entry.target);
      }
    });
  },{threshold:.12,rootMargin:"0px 0px -5% 0px"});
  reveals.forEach(function(s){revealObserver.observe(s.el);});
}else if(!reduce){
  reveals.forEach(function(s){s.target=1;});
}

var cards=[];
document.querySelectorAll("[data-kinetic-card]").forEach(function(el){
  var state={el:el,x:0,y:0,vx:0,vy:0,tx:0,ty:0};
  cards.push(state);
  if(!reduce&&window.matchMedia&&window.matchMedia("(pointer:fine)").matches){
    el.addEventListener("pointermove",function(e){
      var r=el.getBoundingClientRect();
      var nx=clamp((e.clientX-r.left)/r.width,0,1)-.5;
      var ny=clamp((e.clientY-r.top)/r.height,0,1)-.5;
      state.tx=-ny*8.5;state.ty=nx*9.5;
    },{passive:true});
    el.addEventListener("pointerleave",function(){state.tx=0;state.ty=0;},{passive:true});
  }
});

var lastScrollY=window.scrollY||0;
function updateProgress(){
  if(!progress)return;
  var max=document.documentElement.scrollHeight-window.innerHeight;
  var value=max>0?clamp((window.scrollY||0)/max,0,1):0;
  progress.style.transform="scaleX("+value+")";
}
window.addEventListener("scroll",updateProgress,{passive:true});
window.addEventListener("resize",updateProgress,{passive:true});
updateProgress();

function frame(now){
  var elapsed=lastFrame?Math.min(.04,(now-lastFrame)/1000):1/60;
  lastFrame=now;
  if(document.hidden){requestAnimationFrame(frame);return;}
  if(!reduce&&simVisible&&nodes.length){
    accumulator=Math.min(accumulator+elapsed,.05);
    var steps=0;
    while(accumulator>=FIXED_DT&&steps<6){
      stepPhysics(FIXED_DT);accumulator-=FIXED_DT;steps++;
    }
    drawField();
  }
  var dt=Math.min(elapsed,.032);
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
  if(!reduce){
    for(var c=0;c<cards.length;c++){
      var card=cards[c];
      var kCard=115,dCard=22;
      card.vx+=((card.tx-card.x)*kCard-card.vx*dCard)*dt;
      card.vy+=((card.ty-card.y)*kCard-card.vy*dCard)*dt;
      card.x+=card.vx*dt;card.y+=card.vy*dt;
      card.el.style.setProperty("--tilt-x",card.x.toFixed(3)+"deg");
      card.el.style.setProperty("--tilt-y",card.y.toFixed(3)+"deg");
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener("visibilitychange",function(){lastFrame=0;accumulator=0;});
})();

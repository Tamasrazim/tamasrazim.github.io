(function(){
  'use strict';
  var desktop=window.innerWidth>1050;
  if(!desktop)return;

  var started=false,lastFrame=0,raf=0;
  function q(s){return document.querySelector(s)}
  function qa(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function smooth(a,b,k){return a+(b-a)*k}

  function start(){
    if(started)return;
    started=true;
    document.documentElement.classList.add('desktop-motion-rescue');

    var style=document.createElement('style');
    style.textContent='.desktop-motion-rescue body{cursor:none}.desktop-motion-rescue .cursor-dot,.desktop-motion-rescue .cursor-ring{display:block}';
    document.head.appendChild(style);

    var dot=q('#cursorDot'),ring=q('#cursorRing');
    var px=innerWidth*.5,py=innerHeight*.5,tx=px,ty=py;
    var nodes=[];
    var specs=[
      ['.hero-title','drift',7,4],
      ['.hero-kicker','soft',3,2],
      ['.hero-alias','soft',3.5,2],
      ['.hero-copy','soft',2.5,1.5],
      ['.hero-actions','soft',2.5,1.5],
      ['.about-copy','soft',2.5,2],
      ['.id-card','drift',5,3],
      ['.social-link','soft',2.5,2],
      ['.contact-panel','drift',3.5,2.5]
    ];

    specs.forEach(function(spec){
      qa(spec[0]).forEach(function(el){
        el.classList.add(spec[1]==='drift'?'pointer-drift':'pointer-soft');
        nodes.push({el:el,dx:0,dy:0,rx:0,ry:0,mx:spec[2],my:spec[3],drift:spec[1]==='drift'});
      });
    });

    var textNodes=qa('.hero-title,.section-title,.social-name,.project-body h3,.id-name,.id-alias,.email-link');
    textNodes.forEach(function(el){el.classList.add('text-reactive')});

    function onMove(e){
      tx=e.clientX;ty=e.clientY;
      if(dot){
        dot.style.opacity='1';
        dot.style.transform='translate3d('+tx+'px,'+ty+'px,0) translate(-50%,-50%)';
      }
      if(ring){
        ring.style.opacity='1';
        ring.style.transform='translate3d('+tx+'px,'+ty+'px,0) translate(-50%,-50%)';
      }
      if(!raf)raf=requestAnimationFrame(frame);
    }
    function frame(now){
      raf=0;
      if(now-lastFrame<16.2){raf=requestAnimationFrame(frame);return}
      lastFrame=now;
      var k=.18;
      px=smooth(px,tx,k);py=smooth(py,ty,k);
      var nx=(tx/Math.max(1,innerWidth)-.5)*2;
      var ny=(ty/Math.max(1,innerHeight)-.5)*2;
      document.documentElement.style.setProperty('--motion-px',nx.toFixed(3));
      document.documentElement.style.setProperty('--motion-py',ny.toFixed(3));

      nodes.forEach(function(n){
        var r=n.el.getBoundingClientRect();
        var cx=r.left+r.width*.5,cy=r.top+r.height*.5;
        var d=Math.hypot(tx-cx,ty-cy);
        var influence=clamp(1-d/Math.max(160,Math.min(520,Math.max(r.width,r.height)*1.35)),0,1);
        var x=nx*n.mx*influence,y=ny*n.my*influence;
        n.dx=smooth(n.dx,x,.22);n.dy=smooth(n.dy,y,.22);
        n.el.style.setProperty('--pd-x',n.dx.toFixed(2)+'px');
        n.el.style.setProperty('--pd-y',n.dy.toFixed(2)+'px');
        if(n.drift){
          n.rx=smooth(n.rx,-ny*2.2*influence,.18);
          n.ry=smooth(n.ry,nx*3*influence,.18);
          n.el.style.setProperty('--pd-rx',n.rx.toFixed(3)+'deg');
          n.el.style.setProperty('--pd-ry',n.ry.toFixed(3)+'deg');
        }
      });

      textNodes.forEach(function(el){
        var r=el.getBoundingClientRect(),cx=r.left+r.width*.5,cy=r.top+r.height*.5;
        var d=Math.hypot(tx-cx,ty-cy);
        var f=clamp(1-d/Math.max(100,Math.min(280,Math.max(r.width,r.height)*1.15)),0,1);
        f=f*f*(3-2*f);
        el.style.setProperty('--text-scale',(1+.08*f).toFixed(4));
        el.style.setProperty('--text-y',(-2.2*f).toFixed(2)+'px');
      });
    }

    window.addEventListener('pointermove',onMove,{passive:true});
    window.addEventListener('blur',function(){
      tx=innerWidth*.5;ty=innerHeight*.5;
      if(dot)dot.style.opacity='0';
      if(ring)ring.style.opacity='0';
    },{passive:true});

    qa('a,button,.project-card,.id-card,.email-link').forEach(function(el){
      if(!ring)return;
      el.addEventListener('mouseenter',function(){ring.classList.add('is-active')});
      el.addEventListener('mouseleave',function(){ring.classList.remove('is-active')});
    });

    qa('[data-reveal]').forEach(function(el){el.classList.add('is-visible')});

    var alias=q('#aliasText');
    if(alias){
      var chars='!<>-_[]{}=+*#01/\\';
      function scramble(){
        var target='TAMASRAZIM',start=performance.now();
        function step(now){
          var p=clamp((now-start)/420,0,1),out='';
          for(var i=0;i<target.length;i++)out+=i<Math.floor(target.length*p)?target[i]:chars[Math.floor(Math.random()*chars.length)];
          alias.textContent=out;
          if(p<1)requestAnimationFrame(step);else alias.textContent=target;
        }
        requestAnimationFrame(step);
      }
      setTimeout(scramble,900);
    }
  }

  /* Give the normal engine time to initialize. If it did not mark the page as motion-ready,
     activate the rescue stack. */
  setTimeout(function(){
    if(window.__tamasrazimSiteEffectsReady!==true)start();
  },700);
})();


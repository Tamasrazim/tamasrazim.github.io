
  (function(){
    'use strict';

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

    function q(selector, root){ return (root || document).querySelector(selector); }
    function qa(selector, root){ return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

    function markLoaded(){ document.documentElement.classList.add('loaded'); }
    if(document.readyState === 'complete') markLoaded();
    else window.addEventListener('load', markLoaded, {once:true});

    /* ---------- Mobile navigation ---------- */
    var menuButton = q('#menuButton');
    var mobileNav = q('#mobileNav');

    function closeMenu(){
      if(!menuButton || !mobileNav) return;
      mobileNav.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded','false');
      menuButton.setAttribute('aria-label','Open menu');
      document.body.classList.remove('is-locked');
    }

    if(menuButton && mobileNav){
      menuButton.addEventListener('click', function(){
        var open = mobileNav.classList.toggle('is-open');
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        document.body.classList.toggle('is-locked', open);
      });
      qa('a', mobileNav).forEach(function(link){ link.addEventListener('click', closeMenu); });
      window.addEventListener('resize', function(){ if(window.innerWidth > 1050) closeMenu(); }, {passive:true});
    }

    /* ---------- Local time ---------- */
    var clock = q('#clock');
    function updateClock(){
      if(!clock) return;
      clock.textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    }
    updateClock();
    window.setInterval(updateClock, 1000);

    /* ---------- Scroll progress ---------- */
    var progressFill = q('#progressFill');
    var progressTick = false;
    function updateProgress(){
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      var amount = Math.max(0, Math.min(1, window.scrollY / max));
      if(progressFill) progressFill.style.transform = 'scaleX(' + amount + ')';
      progressTick = false;
    }
    window.addEventListener('scroll', function(){
      if(!progressTick){ progressTick = true; window.requestAnimationFrame(updateProgress); }
    }, {passive:true});
    updateProgress();

    /* ---------- Reveal ---------- */
    var revealItems = qa('[data-reveal]');
    if(!reduced && 'IntersectionObserver' in window){
      var observer = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, {threshold:.12, rootMargin:'0px 0px -7% 0px'});
      revealItems.forEach(function(el){ observer.observe(el); });
    }else{
      revealItems.forEach(function(el){ el.classList.add('is-visible'); });
    }

    /* ---------- Scramble text ---------- */
    var scramble = '!<>-_[]{}=+*#01/\\\\';
    function scrambleTo(el, target, duration){
      if(!el || reduced) return;
      duration = duration || 360;
      var start = performance.now();
      function frame(now){
        var progress = Math.min(1, (now - start) / duration);
        var reveal = Math.floor(target.length * progress);
        var output = '';
        for(var i=0;i<target.length;i++){
          if(target[i] === ' ') output += ' ';
          else output += i < reveal ? target[i] : scramble[Math.floor(Math.random()*scramble.length)];
        }
        el.textContent = output;
        if(progress < 1) requestAnimationFrame(frame);
        else el.textContent = target;
      }
      requestAnimationFrame(frame);
    }

    var alias = q('#aliasText');
    var idAlias = q('#idAlias');
    if(alias){
      window.setTimeout(function(){ scrambleTo(alias,'TAMASRAZIM',420); }, 900);
      alias.addEventListener('mouseenter', function(){ scrambleTo(alias,'TAMASRAZIM',280); });
    }
    if(idAlias) idAlias.addEventListener('mouseenter', function(){ scrambleTo(idAlias,'TAMASRAZIM',260); });

    /* ---------- Magnetic interaction ---------- */
    if(!reduced && finePointer){
      qa('.magnetic').forEach(function(el){
        el.addEventListener('mousemove', function(e){
          var r = el.getBoundingClientRect();
          var x = (e.clientX - r.left - r.width/2) * .16;
          var y = (e.clientY - r.top - r.height/2) * .16;
          el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
        });
        el.addEventListener('mouseleave', function(){ el.style.transform = ''; });
      });
    }

    /* ---------- Cursor ---------- */
    var dot = q('#cursorDot');
    var ring = q('#cursorRing');
    if(finePointer && !reduced && dot && ring){
      var mx=0,my=0,rx=0,ry=0,hasMoved=false;
      window.addEventListener('mousemove', function(e){
        mx=e.clientX;my=e.clientY;
        dot.style.opacity='1';
        dot.style.transform='translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
        if(!hasMoved){
          rx=mx;ry=my;hasMoved=true;ring.style.opacity='1';
        }
      }, {passive:true});
      qa('a,button,.project-card,.id-card,.email-link').forEach(function(el){
        el.addEventListener('mouseenter', function(){ ring.classList.add('is-active'); });
        el.addEventListener('mouseleave', function(){ ring.classList.remove('is-active'); });
      });
      function syncCursor(){
        rx=mx;
        ry=my;
        ring.style.transform='translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
      }
      window.addEventListener('mousemove', syncCursor, {passive:true});
      syncCursor();
    }

    /* ---------- Tap ripple ---------- */
    window.addEventListener('pointerdown', function(e){
      if(reduced) return;
      var ripple=document.createElement('span');
      ripple.className='tap-ripple';
      ripple.style.left=e.clientX+'px';
      ripple.style.top=e.clientY+'px';

      for(var n=0;n<4;n++){
        ripple.appendChild(document.createElement('i'));
      }

      document.body.appendChild(ripple);
      window.setTimeout(function(){ ripple.remove(); }, 620);
    }, {passive:true});

    /* ---------- Tilt ---------- */
    if(!reduced && finePointer){
      qa('.tilt').forEach(function(el){
        el.addEventListener('pointermove', function(e){
          var r=el.getBoundingClientRect();
          var x=(e.clientX-r.left)/r.width-.5;
          var y=(e.clientY-r.top)/r.height-.5;
          el.style.setProperty('--rx',(-y*4.5).toFixed(2)+'deg');
          el.style.setProperty('--ry',(x*5.2).toFixed(2)+'deg');
        });
        el.addEventListener('pointerleave', function(){
          el.style.setProperty('--rx','0deg');
          el.style.setProperty('--ry','0deg');
        });
      });
    }

    /* ---------- Copy email ---------- */
    var copyButton=q('#copyButton');
    var copyStatus=q('#copyStatus');
    var email=q('#emailLink');
    if(copyButton && email){
      copyButton.addEventListener('click', function(){
        var value=email.textContent.trim();
        function done(){
          var original=copyButton.textContent;
          copyButton.textContent='Copied';
          if(copyStatus) copyStatus.textContent='Email copied to clipboard';
          window.setTimeout(function(){
            copyButton.textContent=original;
            if(copyStatus) copyStatus.textContent='Direct contact / email';
          },1800);
        }
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(value).then(done).catch(function(){ fallbackCopy(value,done); });
        }else{
          fallbackCopy(value,done);
        }
      });
    }
    function fallbackCopy(value,done){
      var input=document.createElement('textarea');
      input.value=value;input.setAttribute('readonly','');input.style.position='fixed';input.style.opacity='0';
      document.body.appendChild(input);input.select();
      try{ document.execCommand('copy'); done(); }catch(err){}
      input.remove();
    }

    /* ---------- Page-level pointer motion ---------- */
    if(!reduced && finePointer){
      var hero=q('.hero');
      if(hero){
        var heroTitle=q('.hero-title',hero);
        var heroKicker=q('.hero-kicker',hero);
        var heroCopy=q('.hero-copy',hero);
        hero.addEventListener('pointermove',function(e){
          var r=hero.getBoundingClientRect();
          var x=(e.clientX-r.left)/r.width-.5;
          var y=(e.clientY-r.top)/r.height-.5;
          if(heroTitle) heroTitle.style.transform='translate3d('+(x*7).toFixed(2)+'px,'+(y*4).toFixed(2)+'px,0)';
          if(heroKicker) heroKicker.style.transform='translate3d('+(x*3).toFixed(2)+'px,'+(y*2).toFixed(2)+'px,0)';
          if(heroCopy) heroCopy.style.transform='translate3d('+(x*2.5).toFixed(2)+'px,'+(y*1.5).toFixed(2)+'px,0)';
        });
        hero.addEventListener('pointerleave',function(){
          if(heroTitle) heroTitle.style.transform='';
          if(heroKicker) heroKicker.style.transform='';
          if(heroCopy) heroCopy.style.transform='';
        });
      }
    }

    /* ---------- Renderer live project preview ---------- */
    (function initRendererPreview(){
      var canvas=q('#rendererPreviewCanvas');
      if(!canvas || reduced) return;
      var ctx=canvas.getContext('2d');
      var w=canvas.width,h=canvas.height,started=performance.now();
      function frame(now){
        var t=(now-started)/1000, cx=w*.5, cy=h*.52, s=Math.min(w,h);
        ctx.clearRect(0,0,w,h);
        ctx.fillStyle='#050505';
        ctx.fillRect(0,0,w,h);

        var g=ctx.createRadialGradient(cx,cy,0,cx,cy,s*.46);
        g.addColorStop(0,'rgba(243,243,239,.07)');
        g.addColorStop(1,'rgba(243,243,239,0)');
        ctx.fillStyle=g;
        ctx.beginPath();ctx.arc(cx,cy,s*.46,0,Math.PI*2);ctx.fill();

        for(var r=0;r<7;r++){
          var rr=s*(.15+r*.06)+Math.sin(t*1.2+r)*4;
          ctx.beginPath();
          ctx.arc(cx,cy,rr,0,Math.PI*2);
          ctx.setLineDash([10+r*3,18+r*4]);
          ctx.lineDashOffset=-t*(28+r*7);
          ctx.strokeStyle='rgba(243,243,239,'+(.035+r*.006)+')';
          ctx.lineWidth=1;
          ctx.stroke();
        }
        ctx.setLineDash([]);

        for(var i=0;i<32;i++){
          var a=t*(i%2?0.45:-0.38)+i*Math.PI*2/32;
          var rr=s*(.13+i*.007)+Math.sin(t*1.6+i)*4;
          var x=cx+Math.cos(a)*rr;
          var y=cy+Math.sin(a)*rr*.6;
          ctx.beginPath();
          ctx.arc(x,y,1.1+(Math.sin(t*3+i)*.4+.4),0,Math.PI*2);
          ctx.fillStyle='rgba(243,243,239,'+(.12+Math.pow(Math.sin(t*1.6+i),2)*.18).toFixed(3)+')';
          ctx.fill();
        }

        var beam=((t*58)%(h+80))-40;
        ctx.fillStyle='rgba(243,243,239,.045)';
        ctx.fillRect(0,beam,w,1);

        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    })();

    /* ---------- Global motion field ---------- */
    var canvas=q('#field');
    if(canvas && !reduced){
      var ctx=canvas.getContext('2d',{alpha:true});
      var width=0,height=0,dpr=1;
      var particles=[], streaks=[];
      var pointer={x:0,y:0,tx:0,ty:0,active:false};
      var last=performance.now();
      var running=true;
      var sectionPulse=0;

      function resizeField(){
        width=window.innerWidth;
        height=window.innerHeight;
        dpr=Math.min(window.devicePixelRatio||1,1.5);
        canvas.width=Math.round(width*dpr);
        canvas.height=Math.round(height*dpr);
        canvas.style.width=width+'px';
        canvas.style.height=height+'px';
        ctx.setTransform(dpr,0,0,dpr,0,0);

        var count=width<700?72:Math.min(155,Math.max(72,Math.floor((width*height)/14500)));
        particles=[];
        for(var i=0;i<count;i++){
          var radius=Math.random()*Math.min(width,height)*.62+18;
          particles.push({
            angle:Math.random()*Math.PI*2,
            radius:radius,
            speed:(Math.random()*.00065+.00018)*(Math.random()>.48?1:-1),
            drift:Math.random()*1.4+.35,
            size:Math.random()*1.5+.35,
            phase:Math.random()*Math.PI*2
          });
        }
        streaks=[];
        for(var s=0;s<18;s++){
          streaks.push({
            angle:Math.random()*Math.PI*2,
            radius:Math.random()*Math.min(width,height)*.56+80,
            speed:(Math.random()*.0009+.00045)*(Math.random()>.5?1:-1),
            length:Math.random()*34+12,
            alpha:Math.random()*.14+.04
          });
        }
      }

      function drawArc(x,y,r,start,end,alpha,widthLine,dash,offset){
        ctx.save();
        ctx.translate(x,y);
        ctx.rotate(offset||0);
        if(dash) ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.arc(0,0,r,start,end);
        ctx.strokeStyle='rgba(255,255,255,'+alpha+')';
        ctx.lineWidth=widthLine||1;
        ctx.stroke();
        ctx.restore();
      }

      function stepField(now){
        if(!running){last=now;requestAnimationFrame(stepField);return;}
        var dt=Math.min(32,now-last);last=now;
        sectionPulse += dt*.0007;

        pointer.x += (pointer.tx-pointer.x)*.075;
        pointer.y += (pointer.ty-pointer.y)*.075;

        var baseX=width*.72;
        var baseY=height*.42;
        var cx=pointer.active ? pointer.x : baseX+Math.cos(now*.00023)*width*.035;
        var cy=pointer.active ? pointer.y : baseY+Math.sin(now*.0002)*height*.045;

        ctx.clearRect(0,0,width,height);

        /* Slow-moving orbital architecture */
        for(var r=0;r<8;r++){
          var rr=42+r*31+Math.sin(sectionPulse+r)*3.5;
          var rotation=sectionPulse*(r%2?-0.32:.22)+r*.41;
          drawArc(cx,cy,rr,-.65+Math.sin(sectionPulse*.7+r)*.32,2.3+Math.cos(sectionPulse*.55+r)*.22,.022+.012*(r%2),1,[2,8],rotation);
        }

        /* Offset scanning arcs */
        drawArc(cx,cy,Math.min(width,height)*.27,-1.2,1.35,.08,1.1,[18,12],sectionPulse*.36);
        drawArc(cx,cy,Math.min(width,height)*.41,1.6,4.4,.045,.9,[3,14],-sectionPulse*.21);

        /* Orbiting nodes */
        for(var n=0;n<5;n++){
          var na=sectionPulse*(.7+n*.08)+n*Math.PI*2/5;
          var nr=108+n*24;
          var nx=cx+Math.cos(na)*nr;
          var ny=cy+Math.sin(na)*nr;
          var pulse=.55+.45*Math.sin(now*.003+n);
          ctx.beginPath();
          ctx.arc(nx,ny,1.5+pulse*1.2,0,Math.PI*2);
          ctx.fillStyle='rgba(255,255,255,'+(0.14+pulse*.25).toFixed(3)+')';
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(nx,ny);
          ctx.lineTo(cx,cy);
          ctx.strokeStyle='rgba(255,255,255,'+(0.018+pulse*.012).toFixed(3)+')';
          ctx.lineWidth=.6;
          ctx.stroke();
        }

        /* Flowing particles */
        for(var i=0;i<particles.length;i++){
          var p=particles[i];
          p.angle += p.speed*dt;
          var wobble=Math.sin(now*.0007+p.phase)*7*p.drift;
          var rad=p.radius+wobble;
          var px=cx+Math.cos(p.angle)*rad;
          var py=cy+Math.sin(p.angle)*rad*.72;

          if(pointer.active){
            var dx=pointer.x-px,dy=pointer.y-py;
            var d2=dx*dx+dy*dy;
            if(d2<36000){
              p.angle += (.00035*(1-Math.sqrt(d2)/190))*dt;
            }
          }

          var alpha=.065+Math.sin(now*.0012+p.phase)*.035;
          ctx.beginPath();
          ctx.arc(px,py,p.size,0,Math.PI*2);
          ctx.fillStyle='rgba(255,255,255,'+Math.max(.025,alpha).toFixed(3)+')';
          ctx.fill();
        }

        /* Directional streaks */
        for(var j=0;j<streaks.length;j++){
          var st=streaks[j];
          st.angle += st.speed*dt;
          var sx=cx+Math.cos(st.angle)*st.radius;
          var sy=cy+Math.sin(st.angle)*st.radius*.62;
          var ex=cx+Math.cos(st.angle+st.length*.004)* (st.radius+st.length);
          var ey=cy+Math.sin(st.angle+st.length*.004)* (st.radius+st.length)*.62;
          ctx.beginPath();
          ctx.moveTo(sx,sy);
          ctx.lineTo(ex,ey);
          ctx.strokeStyle='rgba(255,255,255,'+st.alpha.toFixed(3)+')';
          ctx.lineWidth=.75;
          ctx.stroke();
        }

        /* Traveling scan beam */
        var beamY=(now*.075)% (height+180)-90;
        var beamAlpha=.035+.02*Math.sin(now*.002);
        ctx.fillStyle='rgba(255,255,255,'+beamAlpha.toFixed(3)+')';
        ctx.fillRect(0,beamY,width,1);

        /* Pointer bloom */
        if(pointer.active){
          var g=ctx.createRadialGradient(pointer.x,pointer.y,0,pointer.x,pointer.y,145);
          g.addColorStop(0,'rgba(255,255,255,.08)');
          g.addColorStop(.45,'rgba(255,255,255,.025)');
          g.addColorStop(1,'rgba(255,255,255,0)');
          ctx.fillStyle=g;
          ctx.beginPath();
          ctx.arc(pointer.x,pointer.y,145,0,Math.PI*2);
          ctx.fill();
        }

        requestAnimationFrame(stepField);
      }

      window.addEventListener('resize',resizeField,{passive:true});
      window.addEventListener('pointermove',function(e){
        pointer.tx=e.clientX;
        pointer.ty=e.clientY;
        pointer.active=true;
      },{passive:true});
      window.addEventListener('pointerleave',function(){pointer.active=false},{passive:true});
      document.addEventListener('visibilitychange',function(){running=!document.hidden});

      resizeField();
      pointer.x=width*.72;
      pointer.y=height*.42;
      pointer.tx=pointer.x;
      pointer.ty=pointer.y;
      requestAnimationFrame(stepField);
    }
    /* ---------- Keep the page quiet when offscreen ---------- */
    var bands=qa('.band-track');
    if(bands.length && reduced){bands.forEach(function(el){el.style.animation='none';})}
  })();
  
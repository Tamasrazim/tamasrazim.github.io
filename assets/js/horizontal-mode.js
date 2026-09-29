
(function(){
  'use strict';

  var content=document.getElementById('content');
  if(!content)return;

  var fine=window.matchMedia && window.matchMedia('(pointer:fine)').matches;
  var reduce=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var progressFill=document.getElementById('progressFill');
  var progressControl=document.getElementById('siteProgress');
  var scroller=document.getElementById('axisScroller') || document.scrollingElement || document.documentElement;
  var stateNode=document.body;
  scroller.dataset.horizontalMode='true';
  stateNode.dataset.horizontalMode='true';
  scroller.setAttribute('tabindex','-1');
  document.documentElement.style.setProperty('--axis-velocity','0');
  document.documentElement.style.setProperty('--axis-velocity-abs','0');
  var readout=null;
  var liveStatus=null;
  var lastActiveIndex=-1;
  var raf=0;
  var motionLast=0;
  var motionLastTime=performance.now();

  function maxHorizontal(){
    return Math.max(0,scroller.scrollWidth-window.innerWidth);
  }

  function progress(){
    var max=maxHorizontal();
    var amount=max?Math.max(0,Math.min(1,scroller.scrollLeft/max)):0;
    var now=performance.now();
    var delta=scroller.scrollLeft-motionLast;
    var elapsed=Math.max(16,now-motionLastTime);
    var speed=Math.min(1,Math.abs(delta)/Math.max(1,window.innerWidth)*1000/elapsed);

    if(progressFill){
      progressFill.style.transform='scaleX('+amount+')';
      progressFill.style.setProperty('--axis-speed',speed.toFixed(3));
    }
    if(progressControl){
      var percent=Math.round(amount*100);
      progressControl.setAttribute('aria-valuenow',String(percent));
      var activeSection=readout && readout.dataset.name ? readout.dataset.name : 'page';
      progressControl.setAttribute('aria-valuetext',percent+'% · '+activeSection);
    }

    if(Math.abs(delta)>0.5){
      stateNode.dataset.axisDirection=delta>0?'right':'left';
      stateNode.dataset.axisSpeed=speed>.035?'fast':speed>.012?'moving':'settled';
    }else{
      stateNode.dataset.axisSpeed='settled';
    }

    var measuredVelocity=(delta/Math.max(1,elapsed))*1000;
    var measuredNormalized=Math.max(-1,Math.min(1,measuredVelocity/1800));
    document.documentElement.style.setProperty('--axis-progress',amount.toFixed(4));
    document.documentElement.style.setProperty('--axis-speed',speed.toFixed(4));
    if(!wheelRAF){
      document.documentElement.style.setProperty('--axis-velocity',measuredNormalized.toFixed(4));
      document.documentElement.style.setProperty('--axis-velocity-abs',Math.abs(measuredNormalized).toFixed(4));
    }
    window.clearTimeout(velocityResetTimer);
    velocityResetTimer=window.setTimeout(function(){
      if(!wheelRAF){
        document.documentElement.style.setProperty('--axis-velocity','0');
        document.documentElement.style.setProperty('--axis-velocity-abs','0');
      }
    },140);
    window.clearTimeout(speedTimer);
    speedTimer=window.setTimeout(function(){
      stateNode.dataset.axisSpeed='settled';
      document.documentElement.style.setProperty('--axis-speed','0');
    },220);

    motionLast=scroller.scrollLeft;
    motionLastTime=now;
    raf=0;
  }

  function scheduleProgress(){
    if(!raf)raf=requestAnimationFrame(progress);
  }

  scroller.addEventListener('scroll',scheduleProgress,{passive:true});
  scroller.addEventListener('scroll',function(){
    if(stateNode.dataset.axisSpeed!=='settled')scheduleProgress();
  },{passive:true});
  window.addEventListener('resize',function(){
    scheduleProgress();
    scheduleSectionState();
  },{passive:true});

  function isEditable(target){
    if(!target)return false;
    var tag=(target.tagName||'').toLowerCase();
    return tag==='input'||tag==='textarea'||tag==='select'||target.isContentEditable;
  }

  function horizontalTarget(el){
    if(!el)return 0;
    /* Use layout coordinates, not transformed visual coordinates.
       The scene engine intentionally translates sections for depth. */
    var left=0;
    var node=el;
    while(node && node!==scroller){
      left+=node.offsetLeft||0;
      node=node.offsetParent;
    }
    return Math.max(0,Math.min(maxHorizontal(),left));
  }

  function goTo(el,smooth){
    cancelWheel();
    var left=horizontalTarget(el);
    scroller.scrollTo({
      left:left,
      top:0,
      behavior:smooth?'smooth':'auto'
    });
  }

  /* Mouse wheel becomes horizontal page travel. Native horizontal trackpads remain native. */
  var speedTimer=0;
  var velocityResetTimer=0;
  var wheelRAF=0;
  var wheelVelocity=0;
  var wheelLastTime=0;

  function getScrollablePanel(target){
    if(!target || !target.closest)return null;
    var panel=target.closest('main#content > section, main#content > .band');
    if(!panel || panel.scrollHeight<=panel.clientHeight+1)return null;
    return panel;
  }

  function canConsumeVertical(panel,delta){
    if(!panel || Math.abs(delta)<0.5)return false;
    var top=panel.scrollTop;
    var max=Math.max(0,panel.scrollHeight-panel.clientHeight);
    if(delta>0)return top < max-1;
    if(delta<0)return top > 1;
    return false;
  }

  function normalizeWheelDelta(e){
    if(e.deltaMode===1)return e.deltaY*16;
    if(e.deltaMode===2)return e.deltaY*window.innerHeight;
    return e.deltaY;
  }

  function cancelWheel(){
    if(wheelRAF){
      cancelAnimationFrame(wheelRAF);
      wheelRAF=0;
    }
    wheelVelocity=0;
    wheelLastTime=0;
  }

  function animateWheel(now){
    if(!wheelRAF)return;

    if(!wheelLastTime)wheelLastTime=now;
    var dt=Math.min(.05,Math.max(.008,(now-wheelLastTime)/1000));
    wheelLastTime=now;

    var velocity=wheelVelocity;
    var visualVelocity=Math.max(-1,Math.min(1,velocity/1800));
    document.documentElement.style.setProperty('--axis-velocity',visualVelocity.toFixed(4));
    document.documentElement.style.setProperty('--axis-velocity-abs',Math.abs(visualVelocity).toFixed(4));
    var friction=Math.exp(-8.5*dt);
    var current=scroller.scrollLeft;
    var next=current+velocity*dt;
    var max=maxHorizontal();

    if(next<=0 || next>=max){
      next=Math.max(0,Math.min(max,next));
      wheelVelocity=0;
    }else{
      wheelVelocity=velocity*friction;
    }

    scroller.scrollLeft=next;
    scheduleProgress();
    scheduleSectionState();

    if(Math.abs(wheelVelocity)<4){
      wheelVelocity=0;
      document.documentElement.style.setProperty('--axis-velocity','0');
      document.documentElement.style.setProperty('--axis-velocity-abs','0');
      wheelRAF=0;
      wheelLastTime=0;
      scheduleProgress();
      scheduleSectionState();
      return;
    }

    wheelRAF=requestAnimationFrame(animateWheel);
  }

  function pushWheel(delta){
    wheelVelocity += delta*10.5;
    wheelVelocity=Math.max(-4200,Math.min(4200,wheelVelocity));
    if(!wheelRAF){
      wheelLastTime=0;
      wheelRAF=requestAnimationFrame(animateWheel);
    }
  }

  window.addEventListener('wheel',function(e){
    if(e.ctrlKey || isEditable(e.target))return;

    var wheelY=normalizeWheelDelta(e);
    var wheelX=e.deltaX;
    var panel=getScrollablePanel(e.target);

    /* A section owns vertical wheel input while it still has room to move.
       Once the section reaches its top/bottom, the same wheel gesture returns
       control to the horizontal page axis. */
    if(panel && Math.abs(wheelY)>=Math.abs(wheelX) && canConsumeVertical(panel,wheelY)){
      e.preventDefault();
      panel.scrollTop=Math.max(0,Math.min(
        panel.scrollHeight-panel.clientHeight,
        panel.scrollTop+wheelY
      ));
      return;
    }

    var delta=Math.abs(wheelX)>Math.abs(wheelY) ? wheelX : wheelY;
    if(Math.abs(delta)<0.5)return;

    e.preventDefault();
    pushWheel(delta);
  },{passive:false,capture:true});

  /* Desktop drag-to-pan: only starts from non-interactive page surfaces. */
  var drag={active:false,startX:0,startScroll:0,pointerId:null,moved:false};

  function isDragExcluded(target){
    if(!target || !target.closest)return true;
    return !!target.closest('a,button,input,textarea,select,summary,[contenteditable="true"],[draggable="true"],.site-progress');
  }

  if(fine && !reduce){
    scroller.addEventListener('pointerdown',function(e){
      if(e.button!==0 || isDragExcluded(e.target))return;
      cancelWheel();
      drag.active=true;
      drag.startX=e.clientX;
      drag.startScroll=scroller.scrollLeft;
      drag.pointerId=e.pointerId;
      drag.moved=false;
      stateNode.classList.add('axis-dragging');
      try{scroller.setPointerCapture(e.pointerId);}catch(_err){}
    });

    scroller.addEventListener('pointermove',function(e){
      if(!drag.active || e.pointerId!==drag.pointerId)return;
      var delta=e.clientX-drag.startX;
      if(Math.abs(delta)>4)drag.moved=true;
      if(!drag.moved)return;
      scroller.scrollLeft=drag.startScroll-delta;
      e.preventDefault();
    });

    function endDrag(e){
      if(!drag.active || (e && e.pointerId!==drag.pointerId))return;
      drag.active=false;
      drag.pointerId=null;
      stateNode.classList.remove('axis-dragging');
      if(drag.moved)scheduleProgress();
    }

    scroller.addEventListener('pointerup',endDrag);
    scroller.addEventListener('pointercancel',endDrag);
    scroller.addEventListener('lostpointercapture',function(){endDrag();});
  }

  /* Interactive page-axis scrubber. */
  if(progressControl){
    var scrub={active:false,pointerId:null};

    function setProgressFromClientX(clientX){
      var rect=progressControl.getBoundingClientRect();
      var ratio=(clientX-rect.left)/Math.max(1,rect.width);
      ratio=Math.max(0,Math.min(1,ratio));
      scroller.scrollTo({left:maxHorizontal()*ratio,top:0,behavior:'auto'});
      scheduleProgress();
      scheduleSectionState();
    }

    progressControl.setAttribute('aria-orientation','horizontal');

    progressControl.addEventListener('pointerdown',function(e){
      if(e.button!==0)return;
      cancelWheel();
      scrub.active=true;
      scrub.pointerId=e.pointerId;
      stateNode.classList.add('is-scrubbing');
      try{progressControl.setPointerCapture(e.pointerId);}catch(_err){}
      setProgressFromClientX(e.clientX);
      stateNode.dataset.axisSpeed='fast';
      e.preventDefault();
      e.stopPropagation();
    });

    progressControl.addEventListener('pointermove',function(e){
      if(!scrub.active || e.pointerId!==scrub.pointerId)return;
      setProgressFromClientX(e.clientX);
      stateNode.dataset.axisSpeed='fast';
      e.preventDefault();
      e.stopPropagation();
    });

    function endScrub(e){
      if(!scrub.active || (e && e.pointerId!==scrub.pointerId))return;
      scrub.active=false;
      scrub.pointerId=null;
      stateNode.classList.remove('is-scrubbing');
    }

    progressControl.addEventListener('pointerup',endScrub);
    progressControl.addEventListener('pointercancel',endScrub);
    progressControl.addEventListener('lostpointercapture',function(){endScrub();});

    progressControl.addEventListener('keydown',function(e){
      var current=maxHorizontal() ? scroller.scrollLeft/maxHorizontal() : 0;
      var step=e.shiftKey ? .1 : .025;
      var next=current;

      if(e.key==='ArrowRight' || e.key==='ArrowUp')next=Math.min(1,current+step);
      else if(e.key==='ArrowLeft' || e.key==='ArrowDown')next=Math.max(0,current-step);
      else if(e.key==='Home')next=0;
      else if(e.key==='End')next=1;
      else return;

      e.preventDefault();
      scroller.scrollTo({left:maxHorizontal()*next,top:0,behavior:'smooth'});
      scheduleProgress();
      scheduleSectionState();
    });
  }

  /* Hero next-section control. */
  var axisNext=document.getElementById('axisNext');
  if(axisNext){
    axisNext.addEventListener('click',function(){
      var activeIndex=0;
      pageItems.forEach(function(item,index){
        var left=item.offsetLeft||0;
        var width=item.offsetWidth||window.innerWidth;
        var center=left-scroller.scrollLeft+Math.min(width,window.innerWidth)*.5;
        if(Math.abs(center-window.innerWidth*.5)<Math.abs((pageItems[activeIndex].offsetLeft||0)-scroller.scrollLeft+Math.min(pageItems[activeIndex].offsetWidth||window.innerWidth,window.innerWidth)*.5-window.innerWidth*.5)){
          activeIndex=index;
        }
      });
      var nextIndex=Math.min(pageItems.length-1,activeIndex+1);
      if(nextIndex===activeIndex)return;
      goTo(pageItems[nextIndex],!reduce);
      var id=pageItems[nextIndex].id||'';
      if(id && history.pushState){
        var hash='#'+encodeURIComponent(id);
        if(location.hash!==hash)history.pushState(null,'',hash);
      }
    });
  }

  /* Keep in-page navigation horizontal and predictable. */
  document.addEventListener('click',function(e){
    cancelWheel();
    var anchor=e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if(!anchor)return;

    var href=anchor.getAttribute('href');
    if(!href || href==='#')return;

    var id=decodeURIComponent(href.slice(1));
    var target=document.getElementById(id);
    if(!target)return;

    e.preventDefault();
    var nextHash='#'+encodeURIComponent(id);
    if(history.pushState){
      if(location.hash!==nextHash)history.pushState(null,'',nextHash);
    }else{
      location.hash=id;
    }
    goTo(target,!reduce);
  });

  function goToHash(){
    cancelWheel();
    var id=decodeURIComponent(location.hash.replace(/^#/,''));
    if(!id){
      goTo(document.getElementById('top'),!reduce);
      return;
    }
    var target=document.getElementById(id);
    if(target)goTo(target,!reduce);
  }

  window.addEventListener('hashchange',goToHash);
  window.addEventListener('popstate',goToHash);

  /* Desktop keyboard navigation follows the same hybrid rule:
     vertical keys move inside an overflowing section before the page axis. */
  window.addEventListener('keydown',function(e){
    if(isEditable(e.target) || document.body.classList.contains('is-locked'))return;

    var key=e.key;
    var current=scroller.scrollLeft;
    var max=maxHorizontal();
    var panel=getScrollablePanel(e.target);

    if(panel && (key==='ArrowDown'||key==='ArrowUp'||key==='PageDown'||key==='PageUp')){
      var amount=(key==='ArrowDown'||key==='PageDown')
        ? (key==='PageDown'?window.innerHeight*.82:Math.max(120,window.innerHeight*.14))
        : -(key==='PageUp'?window.innerHeight*.82:Math.max(120,window.innerHeight*.14));
      var nextTop=Math.max(0,Math.min(
        panel.scrollHeight-panel.clientHeight,
        panel.scrollTop+amount
      ));

      if(Math.abs(nextTop-panel.scrollTop)>0.5){
        e.preventDefault();
        panel.scrollTo({top:nextTop,left:0,behavior:reduce?'auto':'smooth'});
        return;
      }
    }

    if(!e.ctrlKey && !e.metaKey && !e.altKey && /^\d$/.test(key)){
      var sectionIndex=Number(key)-1;
      if(sectionIndex>=0 && sectionIndex<pageItems.length){
        e.preventDefault();
        goTo(pageItems[sectionIndex],!reduce);
        var sectionId=pageItems[sectionIndex].id||'';
        if(sectionId && history.pushState){
          history.pushState(null,'','#'+encodeURIComponent(sectionId));
        }
        return;
      }
    }

    if(!e.ctrlKey && !e.metaKey && !e.altKey && key==='0'){
      e.preventDefault();
      goTo(pageItems[0],!reduce);
      return;
    }

    if(!e.ctrlKey && !e.metaKey && !e.altKey && (key==='[' || key===']')){
      var activeIndex=0;
      var activeHash=location.hash ? decodeURIComponent(location.hash.slice(1)) : '';
      pageItems.forEach(function(item,index){
        if((item.id||'')===activeHash)activeIndex=index;
      });
      var nextIndex=key==='['?Math.max(0,activeIndex-1):Math.min(pageItems.length-1,activeIndex+1);
      e.preventDefault();
      goTo(pageItems[nextIndex],!reduce);
      var nextId=pageItems[nextIndex].id||'';
      if(nextId && history.pushState){
        history.pushState(null,'','#'+encodeURIComponent(nextId));
      }
      return;
    }

    if(key===' ' && !e.shiftKey){
      e.preventDefault();
      scroller.scrollTo({left:Math.min(max,current+window.innerWidth*.92),top:0,behavior:'smooth'});
      return;
    }
    if(key===' ' && e.shiftKey){
      e.preventDefault();
      scroller.scrollTo({left:Math.max(0,current-window.innerWidth*.92),top:0,behavior:'smooth'});
      return;
    }

    if(key==='ArrowRight'){
      e.preventDefault();
      scroller.scrollTo({left:Math.min(max,current+Math.max(280,Math.round(window.innerWidth*.86))),top:0,behavior:'smooth'});
    }else if(key==='ArrowLeft'){
      e.preventDefault();
      scroller.scrollTo({left:Math.max(0,current-Math.max(280,Math.round(window.innerWidth*.86))),top:0,behavior:'smooth'});
    }else if(key==='PageDown'){
      e.preventDefault();
      scroller.scrollTo({left:Math.min(max,current+window.innerWidth*.92),top:0,behavior:'smooth'});
    }else if(key==='PageUp'){
      e.preventDefault();
      scroller.scrollTo({left:Math.max(0,current-window.innerWidth*.92),top:0,behavior:'smooth'});
    }else if(key==='Home'){
      e.preventDefault();
      scroller.scrollTo({left:0,top:0,behavior:'smooth'});
    }else if(key==='End'){
      e.preventDefault();
      scroller.scrollTo({left:max,top:0,behavior:'smooth'});
    }
  });

  window.addEventListener('blur',function(){
    cancelWheel();
    if(typeof drag!=='undefined'){
      drag.active=false;
      drag.pointerId=null;
    }
    if(typeof scrub!=='undefined'){
      scrub.active=false;
      scrub.pointerId=null;
    }
    stateNode.classList.remove('axis-dragging','is-scrubbing');
  },{passive:true});

  document.addEventListener('visibilitychange',function(){
    if(document.hidden){
      window.clearTimeout(speedTimer);
    }
  },{passive:true});

  window.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    cancelWheel();
    if(typeof drag!=='undefined'){
      drag.active=false;
      drag.pointerId=null;
    }
    if(typeof scrub!=='undefined'){
      scrub.active=false;
      scrub.pointerId=null;
    }
    stateNode.classList.remove('axis-dragging','is-scrubbing');
  });

  /* Keep the axis continuous: the cue describes motion, never a page stop. */
  var cue=document.querySelector('.scroll-cue');
  if(cue){
    var label=cue.querySelector('.scroll-cue-label');
    if(label)label.textContent='Keep scrolling';
  }


  /* ---------- Section rail / active page state ---------- */
  var pageItems=Array.prototype.slice.call(
    content.querySelectorAll(':scope > section, :scope > .band')
  );
  var footer=document.querySelector('.axis-scroller > .site-footer');
  if(footer)pageItems.push(footer);

  var rail=document.createElement('nav');
  rail.className='horizontal-rail';
  rail.setAttribute('aria-label','Horizontal page sections');

  readout=document.createElement('div');
  readout.className='horizontal-index-readout';
  readout.setAttribute('aria-hidden','true');

  var labels={
    top:'home',
    about:'about',
    projects:'work',
    socials:'social',
    contact:'contact'
  };

  function axisKey(item,index){
    if(item===footer)return 'end';
    if(item.id)return item.id;
    if(item.classList.contains('band'))return 'signal-'+String(index+1);
    return 'section-'+String(index+1);
  }

  function axisName(item,index){
    var id=item && item.id ? item.id : '';
    if(item===footer)return 'end';
    if(id && labels[id])return labels[id];
    if(item && item.classList.contains('band'))return 'signal';
    return 'section '+String(index+1).padStart(2,'0');
  }

  var railButtons=[];
  pageItems.forEach(function(item,index){
    var id=item.id||'';
    var label=labels[id] || (item.classList.contains('band')?'signal':item===footer?'end':'section '+String(index+1).padStart(2,'0'));
    var button=document.createElement('button');
    button.type='button';
    button.setAttribute('aria-label','Go to '+label+' · '+String(index+1)+' of '+String(pageItems.length));
    button.setAttribute('data-label',label);
    button.dataset.index=String(index);
    button.addEventListener('click',function(){
      goTo(item,!reduce);
      if(id && history.pushState){
        var railHash='#'+encodeURIComponent(id);
        if(location.hash!==railHash)history.pushState(null,'',railHash);
      }
    });
    rail.appendChild(button);
    railButtons.push(button);
  });

  document.body.appendChild(rail);
  document.body.appendChild(readout);

  liveStatus=document.createElement('div');
  liveStatus.className='axis-live-status';
  liveStatus.setAttribute('aria-live','polite');
  liveStatus.setAttribute('aria-atomic','true');
  liveStatus.setAttribute('role','status');
  liveStatus.textContent='Home · section 1 of '+String(pageItems.length);
  document.body.appendChild(liveStatus);

  function updateSectionState(){
    if(!pageItems.length)return;

    var center=window.innerWidth*.5;
    var closest=0;
    var closestDistance=Infinity;

    pageItems.forEach(function(item,index){
      /* Active state follows layout position, never the visual parallax transform. */
      var left=item.offsetLeft||0;
      var width=item.offsetWidth||window.innerWidth;
      var itemCenter=left-scroller.scrollLeft+Math.min(width,window.innerWidth)*.5;
      var distance=Math.abs(itemCenter-center);

      if(distance<closestDistance){
        closestDistance=distance;
        closest=index;
      }
    });

    railButtons.forEach(function(button,index){
      var active=index===closest;
      button.classList.toggle('is-active',active);
      if(active)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });

    /* Keep desktop + mobile header navigation visually synchronized with the page axis. */
    var activeItem=pageItems[closest];
    var activeId=activeItem && activeItem.id ? activeItem.id : '';
    var activeKey=axisKey(activeItem,closest);
    var activeName=axisName(activeItem,closest);
    var previousName=closest>0 ? axisName(pageItems[closest-1],closest-1) : '';
    var nextName=closest<pageItems.length-1 ? axisName(pageItems[closest+1],closest+1) : '';

    document.querySelectorAll('.site-header .nav a[href^="#"], .site-header .header-contact[href^="#"], .mobile-nav a[href^="#"]').forEach(function(link){
      var href=link.getAttribute('href')||'';
      var linkId=href.slice(1);
      var active=linkId===activeId;
      link.classList.toggle('axis-active',active);
      if(active)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });

    document.body.dataset.axisSection=activeKey;
    document.body.dataset.axisName=activeName;
    document.body.dataset.axisIndex=String(closest+1);
    document.body.dataset.axisTotal=String(pageItems.length);
    document.body.dataset.axisEdge=closest===0?'start':(closest===pageItems.length-1?'end':'middle');

    /* Reflect the visible section in the URL without creating history entries. */
    if(activeId && activeId!=='top'){
      var nextHash='#'+encodeURIComponent(activeId);
      if(location.hash!==nextHash && !document.body.classList.contains('is-locked')){
        if(history.replaceState)history.replaceState(null,'',nextHash);
      }
    }else if(activeId==='top' && location.hash){
      if(history.replaceState)history.replaceState(null,'',location.pathname+location.search);
    }

    var current=railButtons[closest];
    var number=String(closest+1).padStart(2,'0');
    var total=String(pageItems.length).padStart(2,'0');
    var name=current?current.getAttribute('data-label'):activeName;

    readout.innerHTML='<strong>'+number+'</strong><span>/ '+total+' · '+name+'</span>';
    readout.dataset.section=activeKey;
    readout.dataset.name=activeName;
    readout.dataset.prev=previousName;
    readout.dataset.next=nextName;
    readout.dataset.index=String(closest+1);
    readout.dataset.total=String(pageItems.length);

    pageItems.forEach(function(item,index){
      var distance=Math.abs(index-closest);
      item.classList.toggle('axis-is-active',distance===0);
      item.classList.toggle('axis-is-near',distance===1);
      item.style.setProperty('--axis-distance',String(Math.min(1,distance)));
    });

    if(liveStatus && lastActiveIndex!==closest){
      var spokenName=activeName.charAt(0).toUpperCase()+activeName.slice(1);
      liveStatus.textContent=spokenName+' · section '+String(closest+1)+' of '+String(pageItems.length);
      lastActiveIndex=closest;
    }

    var cueLabel=document.querySelector('.scroll-cue-label');
    if(cueLabel){
      cueLabel.textContent=closest===pageItems.length-1 ? 'End of axis' : 'Keep scrolling';
    }
    if(axisNext){
      var atEnd=closest===pageItems.length-1;
      axisNext.disabled=atEnd;
      axisNext.setAttribute('aria-label',atEnd?'End of horizontal page axis':'Go to '+axisName(pageItems[Math.min(pageItems.length-1,closest+1)],Math.min(pageItems.length-1,closest+1)));
    }
  }

  var stateRAF=0;
  function scheduleSectionState(){
    if(stateRAF)return;
    stateRAF=requestAnimationFrame(function(){
      stateRAF=0;
      updateSectionState();
      scheduleProgress();
    });
  }

  scroller.addEventListener('scroll',scheduleSectionState,{passive:true});
  window.addEventListener('resize',scheduleSectionState,{passive:true});
  scheduleSectionState();

  /* Mobile remains native horizontal touch scrolling. */
  if(!fine){
    document.documentElement.style.scrollBehavior='auto';
  }

  if('onscrollend' in scroller){
    scroller.addEventListener('scrollend',function(){
      stateNode.dataset.axisSpeed='settled';
      scheduleSectionState();
    },{passive:true});
  }

  /* Deep-link to a section after the layout has established its width. */
  if(location.hash){
    window.setTimeout(function(){
      var id=decodeURIComponent(location.hash.replace(/^#/,''));
      var target=document.getElementById(id);
      if(target)goTo(target,false);
    },60);
  }

  scheduleSectionState();
  scheduleProgress();
})();

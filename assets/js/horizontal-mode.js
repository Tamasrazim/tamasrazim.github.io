
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

    document.documentElement.style.setProperty('--axis-progress',amount.toFixed(4));
    document.documentElement.style.setProperty('--axis-speed',speed.toFixed(4));
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
  if('onscrollend' in scroller){
    scroller.addEventListener('scrollend',scheduleSnap,{passive:true});
  }
  window.addEventListener('resize',function(){
    cancelSnap();
    scheduleProgress();
    scheduleSectionState();
  },{passive:true});

  function isEditable(target){
    if(!target)return false;
    var tag=(target.tagName||'').toLowerCase();
    return tag==='input'||tag==='textarea'||tag==='select'||tag==='button'||target.isContentEditable;
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
    var left=horizontalTarget(el);
    scroller.scrollTo({
      left:left,
      top:0,
      behavior:smooth?'smooth':'auto'
    });
  }

  /* Mouse wheel becomes horizontal page travel. Native horizontal trackpads remain native. */
  function verticalPanelCanScroll(target,delta){
    var panel=target && target.closest ? target.closest('main#content > section, main#content > .band') : null;
    if(!panel || panel.scrollHeight<=panel.clientHeight+1)return false;
    if(delta>0)return panel.scrollTop < panel.scrollHeight-panel.clientHeight-1;
    if(delta<0)return panel.scrollTop>1;
    return false;
  }

  var snapTimer=0;
  var speedTimer=0;

  function cancelSnap(){
    window.clearTimeout(snapTimer);
    snapTimer=0;
  }

  function nearestSectionLeft(){
    if(!pageItems.length)return scroller.scrollLeft;
    var center=scroller.scrollLeft+window.innerWidth*.5;
    var bestLeft=scroller.scrollLeft;
    var bestDistance=Infinity;

    pageItems.forEach(function(item){
      var left=item.offsetLeft||0;
      var width=item.offsetWidth||window.innerWidth;
      var distance=Math.abs((left+Math.min(width,window.innerWidth)*.5)-center);
      if(distance<bestDistance){
        bestDistance=distance;
        bestLeft=left;
      }
    });

    return Math.max(0,Math.min(maxHorizontal(),bestLeft));
  }

  function scheduleSnap(){
    if(reduce)return;
    cancelSnap();
    snapTimer=window.setTimeout(function(){
      var current=scroller.scrollLeft;
      var target=nearestSectionLeft();
      var threshold=Math.max(18,window.innerWidth*.012);
      if(Math.abs(target-current)<threshold)return;
      scroller.scrollTo({left:target,top:0,behavior:'smooth'});
    },180);
  }

  function normalizeWheelDelta(e){
    if(e.deltaMode===1)return e.deltaY*16;
    if(e.deltaMode===2)return e.deltaY*window.innerHeight;
    return e.deltaY;
  }

  window.addEventListener('wheel',function(e){
    cancelSnap();
    if(e.ctrlKey || isEditable(e.target))return;

    /* Horizontal mode owns desktop wheel input.
       Hold Shift to deliberately scroll inside a panel vertically. */
    var panel=e.target && e.target.closest ? e.target.closest('main#content > section, main#content > .band') : null;
    var wheelY=normalizeWheelDelta(e);
    var wheelX=e.deltaX;

    if(e.shiftKey && panel && panel.scrollHeight>panel.clientHeight+1 && Math.abs(wheelY)>0.5){
      return;
    }

    var delta=Math.abs(wheelX)>Math.abs(wheelY) ? wheelX : wheelY;
    if(Math.abs(delta)<0.5)return;

    var before=scroller.scrollLeft;
    var next=Math.max(0,Math.min(maxHorizontal(),before+delta));

    if(next!==before){
      scroller.scrollLeft=next;
      scheduleProgress();
      scheduleSectionState();
      scheduleSnap();
      e.preventDefault();
    }
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
      cancelSnap();
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
      if(drag.moved)scheduleSnap();
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
      cancelSnap();
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
      scheduleSnap();
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
      scheduleSnap();
    });
  }

  /* Keep in-page navigation horizontal and predictable. */
  document.addEventListener('click',function(e){
    var anchor=e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if(!anchor)return;

    var href=anchor.getAttribute('href');
    if(!href || href==='#')return;

    var id=decodeURIComponent(href.slice(1));
    var target=document.getElementById(id);
    if(!target)return;

    e.preventDefault();
    cancelSnap();
    var nextHash='#'+encodeURIComponent(id);
    if(history.pushState){
      if(location.hash!==nextHash)history.pushState(null,'',nextHash);
    }else{
      location.hash=id;
    }
    goTo(target,!reduce);
  });

  function goToHash(){
    cancelSnap();
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

  /* Desktop keyboard navigation follows the page axis. */
  window.addEventListener('keydown',function(e){
    if(isEditable(e.target) || document.body.classList.contains('is-locked'))return;

    var step=Math.max(280,Math.round(window.innerWidth*.86));
    var key=e.key;
    var current=scroller.scrollLeft;
    var max=maxHorizontal();

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
      scheduleSnap();
      return;
    }
    if(key===' ' && e.shiftKey){
      e.preventDefault();
      scroller.scrollTo({left:Math.max(0,current-window.innerWidth*.92),top:0,behavior:'smooth'});
      scheduleSnap();
      return;
    }

    if(key==='ArrowRight'){
      e.preventDefault();
      scroller.scrollTo({left:Math.min(max,current+step),top:0,behavior:'smooth'});
      scheduleSnap();
    }else if(key==='ArrowLeft'){
      e.preventDefault();
      scroller.scrollTo({left:Math.max(0,current-step),top:0,behavior:'smooth'});
      scheduleSnap();
    }else if(key==='PageDown'){
      e.preventDefault();
      scroller.scrollTo({left:Math.min(max,current+window.innerWidth*.92),top:0,behavior:'smooth'});
      scheduleSnap();
    }else if(key==='PageUp'){
      e.preventDefault();
      scroller.scrollTo({left:Math.max(0,current-window.innerWidth*.92),top:0,behavior:'smooth'});
      scheduleSnap();
    }else if(key==='Home'){
      e.preventDefault();
      scroller.scrollTo({left:0,top:0,behavior:'smooth'});
      scheduleSnap();
    }else if(key==='End'){
      e.preventDefault();
      scroller.scrollTo({left:max,top:0,behavior:'smooth'});
      scheduleSnap();
    }
  });

  window.addEventListener('blur',function(){
    cancelSnap();
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
      cancelSnap();
      window.clearTimeout(speedTimer);
    }
  },{passive:true});

  window.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    cancelSnap();
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

  /* Add an explicit horizontal cue to the first viewport without changing content. */
  var cue=document.querySelector('.scroll-cue');
  if(cue){
    var label=cue.querySelector('.scroll-cue-label');
    if(label)label.textContent='Scroll horizontally';
  }


  /* ---------- Section rail / active page state ---------- */
  var pageItems=Array.prototype.slice.call(
    content.querySelectorAll(':scope > section, :scope > .band')
  );
  var footer=document.querySelector('body > .site-footer');
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
    if(id && labels[id])return labels[id];
    if(item===footer)return 'end';
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
      cancelSnap();
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
      cueLabel.textContent=closest===0 ? 'Scroll horizontally' : (closest===pageItems.length-1 ? 'End of axis' : 'Continue horizontally');
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
      scheduleSnap();
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

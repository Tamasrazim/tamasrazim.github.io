
(function(){
  'use strict';

  var content=document.getElementById('content');
  if(!content)return;

  var fine=window.matchMedia && window.matchMedia('(pointer:fine)').matches;
  var reduce=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var progressFill=document.getElementById('progressFill');
  var scroller=document.body;
  scroller.dataset.horizontalMode='true';
  var raf=0;

  function maxHorizontal(){
    return Math.max(0,scroller.scrollWidth-window.innerWidth);
  }

  function progress(){
    var max=maxHorizontal();
    var amount=max?Math.max(0,Math.min(1,scroller.scrollLeft/max)):0;
    if(progressFill){
      progressFill.style.transform='scaleX('+amount+')';
    }
    raf=0;
  }

  function scheduleProgress(){
    if(!raf)raf=requestAnimationFrame(progress);
  }

  scroller.addEventListener('scroll',scheduleProgress,{passive:true});
  window.addEventListener('resize',scheduleProgress,{passive:true});

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
    window.clearTimeout(snapTimer);
    snapTimer=window.setTimeout(function(){
      var current=scroller.scrollLeft;
      var target=nearestSectionLeft();
      if(Math.abs(target-current)<18)return;
      scroller.scrollTo({left:target,top:0,behavior:'smooth'});
    },140);
  }

  window.addEventListener('wheel',function(e){
    if(e.ctrlKey || isEditable(e.target))return;

    var delta=e.deltaY;
    if(Math.abs(e.deltaX)>Math.abs(e.deltaY) && Math.abs(e.deltaX)>0){
      scheduleProgress();
      scheduleSnap();
      return;
    }

    if(Math.abs(delta)<0.5)return;

    /* Let a section consume vertical wheel input while it still has vertical content. */
    if(verticalPanelCanScroll(e.target,delta))return;

    var before=scroller.scrollLeft;
    var next=Math.max(0,Math.min(maxHorizontal(),before+delta));
    if(next!==before){
      scroller.scrollTo({left:next,top:0,behavior:'auto'});
      e.preventDefault();
      scheduleSnap();
    }
  },{passive:false});

  /* Desktop drag-to-pan: only starts from non-interactive page surfaces. */
  var drag={active:false,startX:0,startScroll:0,pointerId:null,moved:false};

  function isDragExcluded(target){
    if(!target || !target.closest)return true;
    return !!target.closest('a,button,input,textarea,select,summary,[contenteditable="true"],[draggable="true"]');
  }

  if(fine && !reduce){
    scroller.addEventListener('pointerdown',function(e){
      if(e.button!==0 || isDragExcluded(e.target))return;
      drag.active=true;
      drag.startX=e.clientX;
      drag.startScroll=scroller.scrollLeft;
      drag.pointerId=e.pointerId;
      drag.moved=false;
      scroller.classList.add('axis-dragging');
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
      scroller.classList.remove('axis-dragging');
    }

    scroller.addEventListener('pointerup',endDrag);
    scroller.addEventListener('pointercancel',endDrag);
    scroller.addEventListener('lostpointercapture',function(){endDrag();});
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
    if(history.pushState){
      history.pushState(null,'','#'+encodeURIComponent(id));
    }else{
      location.hash=id;
    }
    goTo(target,!reduce);
  });

  window.addEventListener('hashchange',function(){
    var id=decodeURIComponent(location.hash.replace(/^#/,''));
    if(!id)return;
    var target=document.getElementById(id);
    if(target)goTo(target,!reduce);
  });

  /* Desktop keyboard navigation follows the page axis. */
  window.addEventListener('keydown',function(e){
    if(isEditable(e.target))return;

    var step=Math.max(280,Math.round(window.innerWidth*.86));
    var key=e.key;
    var current=scroller.scrollLeft;
    var max=maxHorizontal();

    if(key==='ArrowRight'){
      e.preventDefault();
      scroller.scrollTo({left:Math.min(max,current+step),top:0,behavior:'smooth'});
    }else if(key==='ArrowLeft'){
      e.preventDefault();
      scroller.scrollTo({left:Math.max(0,current-step),top:0,behavior:'smooth'});
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

  /* Add an explicit horizontal cue to the first viewport without changing content. */
  var cue=document.querySelector('.scroll-cue');
  if(cue){
    var label=cue.querySelector('small');
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

  var readout=document.createElement('div');
  readout.className='horizontal-index-readout';
  readout.setAttribute('aria-hidden','true');

  var labels={
    top:'home',
    about:'about',
    projects:'work',
    socials:'social',
    contact:'contact'
  };

  var railButtons=[];
  pageItems.forEach(function(item,index){
    var id=item.id||'';
    var label=labels[id] || (item.classList.contains('band')?'signal':item===footer?'end':'section '+String(index+1).padStart(2,'0'));
    var button=document.createElement('button');
    button.type='button';
    button.setAttribute('aria-label','Go to '+label);
    button.setAttribute('data-label',label);
    button.dataset.index=String(index);
    button.addEventListener('click',function(){
      goTo(item,!reduce);
      if(id && history.replaceState){
        history.replaceState(null,'','#'+encodeURIComponent(id));
      }
    });
    rail.appendChild(button);
    railButtons.push(button);
  });

  document.body.appendChild(rail);
  document.body.appendChild(readout);

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

    document.querySelectorAll('.site-header .nav a[href^="#"], .site-header .header-contact[href^="#"], .mobile-nav a[href^="#"]').forEach(function(link){
      var href=link.getAttribute('href')||'';
      var linkId=href.slice(1);
      var active=linkId===activeId;
      link.classList.toggle('axis-active',active);
      if(active)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });

    document.body.dataset.axisSection=activeId||'top';

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
    var name=current?current.getAttribute('data-label'):'page';

    readout.innerHTML='<strong>'+number+'</strong><span>/ '+total+' · '+name+'</span>';
    readout.dataset.section=activeId||'top';
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

  /* Deep-link to a section after the layout has established its width. */
  if(location.hash){
    window.setTimeout(function(){
      var id=decodeURIComponent(location.hash.replace(/^#/,''));
      var target=document.getElementById(id);
      if(target)goTo(target,false);
    },60);
  }

  scheduleProgress();
})();


(function(){
  'use strict';

  var content=document.getElementById('content');
  if(!content)return;

  var fine=window.matchMedia && window.matchMedia('(pointer:fine)').matches;
  var reduce=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var progressFill=document.getElementById('progressFill');
  var scroller=document.body;
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
    var rect=el.getBoundingClientRect();
    return Math.max(0,Math.min(maxHorizontal(),scroller.scrollLeft+rect.left));
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
  window.addEventListener('wheel',function(e){
    if(e.ctrlKey || isEditable(e.target))return;

    var delta=e.deltaY;
    if(Math.abs(e.deltaX)>Math.abs(e.deltaY) && Math.abs(e.deltaX)>0){
      scheduleProgress();
      return;
    }

    if(Math.abs(delta)<0.5)return;

    var before=scroller.scrollLeft;
    var next=Math.max(0,Math.min(maxHorizontal(),before+delta));
    if(next!==before){
      scroller.scrollTo({left:next,top:0,behavior:'auto'});
      e.preventDefault();
    }
  },{passive:false});

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

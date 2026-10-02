(function(){
'use strict';
var root=document.documentElement,body=document.body,scrollRoot=document.scrollingElement||root;
var content=document.getElementById('content');
var sections=content?Array.prototype.slice.call(content.querySelectorAll(':scope > section')):[];
var footer=document.querySelector('.axis-scroller > .site-footer');
if(footer)sections.push(footer);
var reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
var active=0,rail,readout;
var progress=document.getElementById('siteProgress'),fill=document.getElementById('progressFill'),next=document.getElementById('axisNext');

root.dataset.horizontalMode='true';body.dataset.horizontalMode='true';

function maxX(){return Math.max(0,scrollRoot.scrollWidth-innerWidth)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function go(el,animate){
 if(!el)return;
 var r=el.getBoundingClientRect();
 scrollRoot.scrollTo({left:clamp(scrollRoot.scrollLeft+r.left+r.width/2-innerWidth/2,0,maxX()),top:0,behavior:animate?'smooth':'auto'});
}
function update(){
 var c=innerWidth/2,best=0,dist=Infinity;
 sections.forEach(function(el,i){var r=el.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-c);if(d<dist){dist=d;best=i}});
 active=best;
 sections.forEach(function(el,i){el.classList.toggle('axis-is-active',i===active);el.classList.toggle('axis-is-near',Math.abs(i-active)===1)});
 if(rail)Array.prototype.forEach.call(rail.children,function(b,i){var on=i===active;b.classList.toggle('is-active',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 if(readout)readout.innerHTML='<strong>'+String(active+1).padStart(2,'0')+'</strong><span>/ '+String(sections.length).padStart(2,'0')+' · '+(sections[active].id||'end')+'</span>';
 var ratio=maxX()?scrollRoot.scrollLeft/maxX():0;
 if(fill)fill.style.width=(ratio*100).toFixed(2)+'%';
 if(progress){progress.setAttribute('aria-valuenow',String(Math.round(ratio*100)));progress.setAttribute('aria-valuetext',Math.round(ratio*100)+'%')}
 if(next)next.setAttribute('aria-label','Go to '+(sections[(active+1)%sections.length]&&sections[(active+1)%sections.length].id||'end'));
}
function build(){
 rail=document.createElement('nav');rail.className='horizontal-rail';rail.setAttribute('aria-label','Horizontal page sections');
 sections.forEach(function(el,i){
   var b=document.createElement('button');b.type='button';b.setAttribute('data-label',el.id||('section '+String(i+1).padStart(2,'0')));b.setAttribute('aria-label','Go to '+(el.id||'section '+(i+1)));
   b.addEventListener('click',function(){go(el,!reduce)});rail.appendChild(b);
 });
 body.appendChild(rail);
 readout=document.createElement('div');readout.className='horizontal-index-readout';readout.setAttribute('aria-hidden','true');body.appendChild(readout);
}
build();

if(next)next.addEventListener('click',function(){go(sections[(active+1)%sections.length],!reduce)});
if(progress){
 progress.addEventListener('pointerdown',function(e){
   if(e.button!==0)return;
   var r=progress.getBoundingClientRect();scrollRoot.scrollLeft=maxX()*clamp((e.clientX-r.left)/Math.max(1,r.width),0,1);
 });
 progress.addEventListener('pointermove',function(e){
   if(!(e.buttons&1))return;
   var r=progress.getBoundingClientRect();scrollRoot.scrollLeft=maxX()*clamp((e.clientX-r.left)/Math.max(1,r.width),0,1);
 });
 progress.addEventListener('keydown',function(e){
   var ratio=maxX()?scrollRoot.scrollLeft/maxX():0,step=e.shiftKey?.1:.025;
   if(e.key==='ArrowRight'){e.preventDefault();scrollRoot.scrollLeft=maxX()*clamp(ratio+step,0,1)}
   else if(e.key==='ArrowLeft'){e.preventDefault();scrollRoot.scrollLeft=maxX()*clamp(ratio-step,0,1)}
   else if(e.key==='Home'){e.preventDefault();scrollRoot.scrollLeft=0}
   else if(e.key==='End'){e.preventDefault();scrollRoot.scrollLeft=maxX()}
 });
}

window.addEventListener('wheel',function(e){
 if(body.classList.contains('is-locked')||e.ctrlKey)return;
 var panel=e.target&&e.target.closest?e.target.closest('main#content > section, main#content > .band'):null;
 if(panel&&Math.abs(e.deltaY)>Math.abs(e.deltaX)){
   var max=panel.scrollHeight-panel.clientHeight,desired=clamp(panel.scrollTop+e.deltaY,0,Math.max(0,max));
   if(Math.abs(desired-panel.scrollTop)>1){e.preventDefault();panel.scrollTop=desired;return}
 }
 var d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
 if(Math.abs(d)<.5)return;
 e.preventDefault();scrollRoot.scrollLeft=clamp(scrollRoot.scrollLeft+d,0,maxX());
},{passive:false,capture:true});

window.addEventListener('keydown',function(e){
 if(body.classList.contains('is-locked')||/^(INPUT|TEXTAREA|SELECT)$/.test((e.target&&e.target.tagName)||''))return;
 if(e.key==='ArrowRight'){e.preventDefault();scrollRoot.scrollLeft=clamp(scrollRoot.scrollLeft+innerWidth*.88,0,maxX())}
 else if(e.key==='ArrowLeft'){e.preventDefault();scrollRoot.scrollLeft=clamp(scrollRoot.scrollLeft-innerWidth*.88,0,maxX())}
 else if(e.key==='PageDown'){e.preventDefault();scrollRoot.scrollLeft=clamp(scrollRoot.scrollLeft+innerWidth*.92,0,maxX())}
 else if(e.key==='PageUp'){e.preventDefault();scrollRoot.scrollLeft=clamp(scrollRoot.scrollLeft-innerWidth*.92,0,maxX())}
 else if(e.key==='Home'){e.preventDefault();scrollRoot.scrollLeft=0}
 else if(e.key==='End'){e.preventDefault();scrollRoot.scrollLeft=maxX()}
});

document.addEventListener('click',function(e){
 var a=e.target.closest?e.target.closest('a[href^="#"]'):null;if(!a)return;
 var id=(a.getAttribute('href')||'').slice(1),target=document.getElementById(id);if(!target)return;
 e.preventDefault();go(target,!reduce);
 if(history.pushState)history.pushState(null,'','#'+encodeURIComponent(id));
});

window.addEventListener('scroll',update,{passive:true});
window.addEventListener('resize',update,{passive:true});
if(location.hash){
 var target=document.getElementById(decodeURIComponent(location.hash.slice(1)));
 if(target)setTimeout(function(){go(target,false)},80);
}
update();
})();
(function(){
"use strict";
var body=document.body;if(!body||!body.classList.contains("home-v4"))return;
var nav=document.querySelector(".home-nav"),menu=document.querySelector(".home-menu");
function closeMenu(){if(!nav||!menu)return;nav.classList.remove("is-open");menu.setAttribute("aria-expanded","false");menu.setAttribute("aria-label","Open navigation");}
if(nav&&menu){
menu.addEventListener("click",function(){var open=menu.getAttribute("aria-expanded")!=="true";menu.setAttribute("aria-expanded",String(open));menu.setAttribute("aria-label",open?"Close navigation":"Open navigation");nav.classList.toggle("is-open",open);});
nav.querySelectorAll("a").forEach(function(link){link.addEventListener("click",closeMenu);});
document.addEventListener("keydown",function(event){if(event.key==="Escape")closeMenu();});
document.addEventListener("pointerdown",function(event){if(nav.classList.contains("is-open")&&!nav.contains(event.target)&&!menu.contains(event.target))closeMenu();});
window.addEventListener("resize",function(){if(window.innerWidth>760)closeMenu();},{passive:true});
}
var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var reveals=Array.prototype.slice.call(document.querySelectorAll("[data-home-reveal]"));
if("IntersectionObserver"in window&&!reduce){var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target);}});},{threshold:.12});reveals.forEach(function(el){observer.observe(el);});}
else{reveals.forEach(function(el){el.classList.add("is-visible");});}
var portrait=document.querySelector(".home-hero-art"),cursor=document.querySelector(".home-cursor");
var pointerFine=window.matchMedia&&window.matchMedia("(pointer: fine)").matches;
if(pointerFine&&!reduce){
var targetX=0,targetY=0,currentX=0,currentY=0,last=0,frame=0,cursorX=-100,cursorY=-100;
function tick(now){frame=0;var dt=last?Math.min(64,now-last):16.7;last=now;var blend=1-Math.exp(-dt/180);currentX+=(targetX-currentX)*blend;currentY+=(targetY-currentY)*blend;
if(portrait){portrait.style.setProperty("--portrait-rx",(currentY*-3.2).toFixed(3)+"deg");portrait.style.setProperty("--portrait-ry",(currentX*4.2).toFixed(3)+"deg");portrait.style.setProperty("--portrait-x",(currentX*5).toFixed(2)+"px");portrait.style.setProperty("--portrait-y",(currentY*5).toFixed(2)+"px");}
if(cursor)cursor.style.transform="translate3d("+(cursorX-12)+"px,"+(cursorY-12)+"px,0)";
if(Math.abs(targetX-currentX)>.001||Math.abs(targetY-currentY)>.001)frame=requestAnimationFrame(tick);
}
window.addEventListener("pointermove",function(event){if(event.pointerType==="touch")return;var rect=portrait?portrait.getBoundingClientRect():null;if(rect){targetX=Math.max(-1,Math.min(1,(event.clientX-(rect.left+rect.width/2))/(rect.width/2)));targetY=Math.max(-1,Math.min(1,(event.clientY-(rect.top+rect.height/2))/(rect.height/2)));}cursorX=event.clientX;cursorY=event.clientY;if(cursor)cursor.style.opacity="1";if(!frame)frame=requestAnimationFrame(tick);},{passive:true});
window.addEventListener("pointerleave",function(){targetX=0;targetY=0;if(cursor)cursor.style.opacity="0";if(!frame)frame=requestAnimationFrame(tick);});
document.querySelectorAll("a,button").forEach(function(el){el.addEventListener("pointerenter",function(){if(cursor)cursor.classList.add("is-link");});el.addEventListener("pointerleave",function(){if(cursor)cursor.classList.remove("is-link");});});
document.addEventListener("visibilitychange",function(){if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;last=0;}});
}
var year=document.getElementById("homeYear");if(year)year.textContent=String(new Date().getFullYear());
})();
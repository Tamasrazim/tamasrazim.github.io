(function(){
  'use strict';
  document.documentElement.classList.replace('no-js','js');

  window.addEventListener('DOMContentLoaded',function(){
    var script=document.createElement('script');
    script.src='./assets/js/motion-core.js?v=20260919-2';
    script.async=true;
    document.body.appendChild(script);
  },{once:true});
})();
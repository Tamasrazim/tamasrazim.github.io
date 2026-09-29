/**
 * KYNESTRA V2 media-stack compatibility descriptor.
 *
 * V2 uses the browser/device WebCodecs implementation for encoding and
 * contains its own small local muxers for the supported MP4/WebM outputs.
 */
(function () {
  'use strict';
  window.TamasrazimMediaStack = Object.freeze({
    name: 'Native WebCodecs + local muxers',
    version: '2',
    encoderLayer: 'WebCodecs / browser / device',
    muxerLayer: 'Local V2 muxer',
    containers: ['mp4', 'webm'],
    videoCodecs: ['avc', 'vp9', 'vp8'],
    externalRuntimeDependency: false,
    status: ('VideoEncoder' in window && 'VideoFrame' in window) ? 'AVAILABLE' : 'LIMITED'
  });

  function installBatchLink() {
    if (document.getElementById('tamasrazim-batch-link')) return;
    const link = document.createElement('a');
    link.id = 'tamasrazim-batch-link';
    link.href = '../batch/index.html';
    link.textContent = 'FLOWER BATCH';
    link.setAttribute('aria-label', 'Open KYNESTRA Flower Batch Lab');
    Object.assign(link.style, {
      position:'fixed',
      top:'12px',
      right:'12px',
      zIndex:'2147483647',
      display:'inline-flex',
      alignItems:'center',
      justifyContent:'center',
      padding:'9px 11px',
      border:'1px solid rgba(255,255,255,.28)',
      borderRadius:'8px',
      background:'rgba(5,5,5,.88)',
      color:'#fff',
      font:'600 9px ui-monospace,SFMono-Regular,Consolas,monospace',
      letterSpacing:'.12em',
      textDecoration:'none',
      backdropFilter:'blur(10px)',
      boxShadow:'0 8px 24px rgba(0,0,0,.28)'
    });
    link.addEventListener('mouseenter',()=>{link.style.background='#fff';link.style.color='#000';link.style.borderColor='#fff';});
    link.addEventListener('mouseleave',()=>{link.style.background='rgba(5,5,5,.88)';link.style.color='#fff';link.style.borderColor='rgba(255,255,255,.28)';});
    document.body.appendChild(link);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installBatchLink, { once:true });
  } else {
    installBatchLink();
  }

})();
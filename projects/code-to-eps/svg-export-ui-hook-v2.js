/* CODE→EPS v2 SVG Export Hook
 * Connects the Scene Graph SVG exporter to the UI layer.
 */
(()=>{
'use strict';

window.CODE_EPS_SVG={
 exportScene(scene,name='code-to-eps.svg'){
  if(!window.sceneToSvg) throw new Error('SVG serializer missing');
  const svg=window.sceneToSvg(scene);
  const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=name;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 },
 async exportBatch(items,folderWriter){
  let index=0;
  for(const item of items){
   const name=('prism-'+String(item.name||('flower-'+index)).toLowerCase().replace(/[^a-z0-9-]+/g,'-')+'.svg');
   await folderWriter(name,window.sceneToSvg(item.scene));
   index++;
   await new Promise(r=>setTimeout(r,0));
  }
 }
};
})();

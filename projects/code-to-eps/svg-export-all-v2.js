/* CODE→EPS SVG Batch Export Engine v2
 * Creates 50-file SVG batches from Scene Graph output.
 */
(()=>{
'use strict';

window.CODE_EPS_SVG_BATCH={
  filename(title){
    return 'prism-'+String(title||'flower')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-|-$/g,'')+'.svg';
  },

  async exportAll(sceneFactory,items){
    if(!window.showDirectoryPicker) throw new Error('Folder export unavailable');

    const root=await window.showDirectoryPicker();
    let folderIndex=1;
    let count=0;
    let folder=null;

    for(let i=0;i<items.length;i++){
      if(count%50===0){
        folder=await root.getDirectoryHandle(String(folderIndex).padStart(3,'0'),{create:true});
        folderIndex++;
      }

      const scene=sceneFactory(items[i]);
      const svg=window.sceneToSvg?window.sceneToSvg(scene):scene;
      const name=this.filename(items[i].title);
      const handle=await folder.getFileHandle(name,{create:true});
      const writable=await handle.createWritable();
      await writable.write(svg);
      await writable.close();

      count++;
      await new Promise(r=>setTimeout(r,0));
    }

    return count;
  }
};
})();

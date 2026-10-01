/* CODE-EPS SVG Folder Export v2
 * Splits SVG exports into folders of 50 files
 */
(function(){
'use strict';

window.exportSvgBatch50 = async function(items, rootDir, options={}){
  const size=50;
  const prefix=options.prefix||'prism';
  let exported=0;

  for(let index=0; index<items.length; index+=size){
    const folderNo=String(Math.floor(index/size)+1).padStart(3,'0');
    const folder=await rootDir.getDirectoryHandle(folderNo,{create:true});
    const batch=items.slice(index,index+size);

    for(const item of batch){
      const name=safeSvgName(item.title||('flower-'+exported));
      const file=await folder.getFileHandle(prefix+'-'+name+'.svg',{create:true});
      const writable=await file.createWritable();
      writable.write(item.svg);
      await writable.close();
      exported++;
      if(options.progress) options.progress(exported,items.length,folderNo);
      await new Promise(r=>setTimeout(r,0));
    }
  }
  return exported;
};

function safeSvgName(name){
 return String(name)
 .replace(/[^a-z0-9-_]+/gi,'-')
 .replace(/^-+|-+$/g,'')
 .toLowerCase() || 'untitled';
}
})();

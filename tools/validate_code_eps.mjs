import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg);console.log('PASS',msg)};

const libSrc=read('projects/code-to-eps/workspace/vector-icon-library.js');
new Function(libSrc);
const ctx={window:{}};
vm.runInNewContext(libSrc,ctx,{filename:'vector-icon-library.js'});
const lib=ctx.window.TAMAS_ICON_LIBRARY;

must(lib,'icon library initializes');
must(lib.total===10000,'10,000 stock icons');
must(lib.families.length===100,'100 icon families');
must(lib.domains.length===20,'20 icon domains');
must(lib.perFamily===100,'100 variants per family');
must(lib.items.length===10000,'item array length is 10,000');

const ids=new Set(),files=new Set();
for(const item of lib.items){
  must(!ids.has(item.id),'unique id '+item.id);ids.add(item.id);
  must(item.title.length<=70,'title <=70 '+item.id);
  must(item.description.length>=150&&item.description.length<=200,'description 150–200 '+item.id);
  must(item.keywords.length>=45&&item.keywords.length<=50,'keywords 45–50 '+item.id);
  must(!files.has(item.filename.eps),'unique EPS filename '+item.filename.eps);files.add(item.filename.eps);
  must(lib.codeFor(item).includes('renderFrame'),'codeFor emits renderFrame '+item.id);
}

const pathCtx=()=>({moveTo(){},lineTo(){},bezierCurveTo(){},closePath(){}});
const fake=new Proxy({},{
  get(_,key){
    if(key==='path') return fn=>{fn(pathCtx());return fake};
    return (...args)=>fake;
  }
});
for(const item of lib.items) lib.render(fake,4000,4000,item);

const html=read('projects/code-to-eps/workspace/index.html');
must(html.includes('./vector-icon-library.js'),'CODE→EPS loads icon library');
must(html.includes('id="iconFamily"'),'icon family selector present');
must(html.includes('id="loadIcon"'),'icon loader present');
must(html.includes('id="allIconEpsBtn"'),'all icon EPS exporter present');
must(html.includes('id="allIconSvgBtn"'),'all icon SVG exporter present');
must(html.includes('const batchSize=50'),'icon batching uses 50');

console.log('CODE→EPS icon validation complete.');

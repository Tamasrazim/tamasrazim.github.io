import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import vm from 'node:vm';


const ROOT=process.cwd();
const must=(ok,msg)=>{if(!ok)throw new Error(msg);console.log('PASS',msg)};
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const exists=p=>fs.existsSync(path.join(ROOT,p));
const stripRef=ref=>ref.split('#')[0].split('?')[0];

function checkLocalRefs(file){
  const html=read(file);
  const re=/(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while((m=re.exec(html))){
    const ref=m[1];
    if(!ref||ref.startsWith('#')||/^(?:https?:|mailto:|tel:|data:|blob:|javascript:)/i.test(ref)) continue;
    const clean=stripRef(ref);
    if(!clean||clean.startsWith('/')) continue;
    let target=path.resolve(ROOT,path.dirname(file),clean);
    if(clean.endsWith('/')) target=path.join(target,'index.html');
    must(fs.existsSync(target),file+' → '+ref+' resolves');
  }
  const ids=[...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(x=>x[1]);
  const dup=ids.filter((id,i)=>ids.indexOf(id)!==i);
  must(!dup.length,file+' has no duplicate DOM ids');
}

function checkScript(file){
  execFileSync(process.execPath,['--check',path.join(ROOT,file)],{stdio:'inherit'});
  console.log('PASS',file+' JavaScript parses');
}
function checkInlineScripts(file){
  const html=read(file);
  const matches=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  must(matches.length>0,file+' contains an inline script');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'code-eps-'));
  try{
    matches.forEach((m,i)=>{
      const temp=path.join(dir,'inline-'+i+'.mjs');
      fs.writeFileSync(temp,m[1],'utf8');
      execFileSync(process.execPath,['--check',temp],{stdio:'inherit'});
    });
    console.log('PASS',file+' inline JavaScript parses');
  }finally{
    fs.rmSync(dir,{recursive:true,force:true});
  }
}

const htmlFiles=[
  'index.html',
  'projects/index.html',
  'asset-vault/index.html',
  'projects/code-motion/index.html',
  'projects/code-motion/renderer/index.html',
  'projects/bncagrocare/index.html',
  'projects/bncagrocare/invoice/index.html',
  'projects/repo-token-meter/index.html',
  'projects/code-to-eps/index.html'
];
for(const file of htmlFiles) must(exists(file),file+' exists');
for(const file of htmlFiles) checkLocalRefs(file);

checkInlineScripts('projects/code-to-eps/index.html');

const codeEps=read('projects/code-to-eps/index.html');
must(codeEps.includes('id="allSvgBtn"'),'CODE-EPS exposes Export All SVG');
must(codeEps.includes('async function exportAllSvg()'),'CODE-EPS has the SVG batch exporter');
must(codeEps.includes('const batchSize=50;'),'CODE-EPS batches exports in groups of 50');
must(codeEps.includes('function validateEps('),'CODE-EPS validates EPS before writing');
const epsFnStart=codeEps.indexOf('function generateEps(scene){');
const epsFnEnd=codeEps.indexOf('function uniqueBatchName(',epsFnStart);
const epsFn=epsFnStart>=0&&epsFnEnd>epsFnStart?codeEps.slice(epsFnStart,epsFnEnd):'';
for(const banned of ['arc','rlineto','findfont','concat']) must(!new RegExp('\\b'+banned+'\\b').test(epsFn),'CODE-EPS serializer has no '+banned+' operator');
must(codeEps.includes('function runEpsSelfTests()'),'CODE-EPS includes EPS self-tests');
must(codeEps.includes('window.CODE_EPS_V2=Object.freeze('),'CODE-EPS exposes the consolidated v2 engine API');
must(codeEps.includes('id="epsProfile"'),'CODE-EPS exposes EPS target profile selection');
must(codeEps.includes('value="shutterstock10"'),'CODE-EPS defaults to Shutterstock Illustrator 10 RGB');
must(codeEps.includes('function stockScaleForBounds('),'CODE-EPS has 4–25 MP artwork normalization');
must(codeEps.includes('function strokeToFillPolygons('),'CODE-EPS expands strokes to vector fills');
must(codeEps.includes('%%DocumentProcessColors: RGB'),'CODE-EPS emits RGB-only process color declaration');
must(codeEps.includes('%%AI8_CreatorVersion:'),'CODE-EPS emits Illustrator legacy compatibility marker');
must(codeEps.includes('100*1024*1024'),'CODE-EPS enforces the 100 MB EPS limit');
for(const retired of [
  'projects/code-to-eps/eps-engine-v2.js',
  'projects/code-to-eps/vector-scene-bridge-v2.js',
  'projects/code-to-eps/svg-export-all-v2.js',
  'projects/code-to-eps/svg-folder-export-v2.js',
  'projects/code-to-eps/svg-export-ui-hook-v2.js'
]) must(!exists(retired),retired+' is retired and not part of the canonical single-file engine');

for(const file of [
  'assets/js/boot.js',
  'assets/js/site.js',
  'assets/js/motion-core.js',
  'projects/code-motion/renderer/media-stack.js',
  'asset-vault/js/app.js',
  'projects/bncagrocare/invoice/js/app.js'
]) checkScript(file);

for(const file of [
  'projects/code-motion/renderer/manifest.webmanifest',
  'asset-vault/manifest.webmanifest',
  'projects/bncagrocare/invoice/manifest.webmanifest'
]){
  JSON.parse(read(file));
  console.log('PASS',file+' is valid JSON');
}

const site=read('index.html');
const axis=read('assets/js/horizontal-mode.js');
const siteJs=read('assets/js/site.js');

must(site.includes('id="axisScroller" class="axis-scroller"'),'homepage has dedicated horizontal axis container');
must(site.includes('horizontal-mode.js?v='),'homepage loads horizontal axis controller');
must(!/<div class="band" aria-hidden="true">/.test(site),'homepage has no marquee bands');
must(/<footer class="site-footer">/.test(site),'homepage has the footer at the end of the axis');
must(!axis.includes('scheduleSnap'),'horizontal controller has no legacy snap handler');
must(!axis.includes('wheelTarget'),'horizontal controller has no legacy wheel target');
must((axis.match(/function cancelWheel\(/g)||[]).length===1,'horizontal controller has one wheel cancel routine');
must(!siteJs.includes('document.body.scrollTo'),'site focus routing uses the dedicated axis container');
must(axis.includes('function getScrollablePanel'),'horizontal controller supports vertical section panels');
must(axis.includes('function canConsumeVertical'),'horizontal controller detects available vertical travel');
must(axis.includes('panel.scrollTop=Math.max'),'horizontal controller applies vertical panel scrolling');
const motion=read('assets/js/motion-core.js');
const axisCss=read('assets/css/horizontal-mode.css');

must(motion.includes('Nested vertical panels are independent scroll containers'),'motion core tracks nested vertical panels');
must(motion.includes('panel.addEventListener(\'scroll\''),'motion core invalidates nested panel bounds');
must(!/main#content > section,\s*\nmain#content > \.band\{\s*\n\s*contain:layout paint/.test(axisCss),'homepage sections are not paint-contained');


for(const ref of [
  'href="projects/code-motion/"',
  'href="asset-vault/"',
  'href="projects/bncagrocare/"',
  'href="projects/bncagrocare/invoice/"',
  'href="projects/repo-token-meter/"',
  'href="projects/"'
]) must(site.includes(ref),'homepage exposes '+ref);
for(const stale of ['Personal Web','Technical Experiments','Gaming & Media']) must(!site.includes('<h3>'+stale+'</h3>'),'homepage has no placeholder project card: '+stale);

const hub=read('projects/index.html');
for(const ref of [
  'href="./code-motion/"',
  'href="../asset-vault/"',
  'href="./bncagrocare/"',
  'href="./bncagrocare/invoice/"',
  'href="./repo-token-meter/"'
]) must(hub.includes(ref),'project index exposes '+ref);

must(!site.includes('href="renderer/"'),'homepage has no retired renderer link');
must(!hub.includes('href="../renderer/"'),'project hub has no retired renderer link');

const iconLibrarySource=read('projects/code-to-eps/vector-icon-library.js');
execFileSync(process.execPath,['--check',path.join(ROOT,'projects/code-to-eps/vector-icon-library.js')]);
const iconCtx={window:{}};
vm.runInNewContext(iconLibrarySource,iconCtx,{filename:'vector-icon-library.js'});
const iconLib=iconCtx.window.TAMAS_ICON_LIBRARY;
must(iconLib && iconLib.total===10000,'CODE-EPS icon library contains exactly 10,000 assets');
must(iconLib.families.length===100,'CODE-EPS icon library contains 100 families');
must(iconLib.domains.length===20,'CODE-EPS icon library contains 20 subject domains');
must(iconLib.perFamily===100,'CODE-EPS icon library has 100 variants per family');
must(iconLib.items.length===10000,'CODE-EPS icon item array contains 10,000 records');
const iconIds=new Set(),iconFiles=new Set();
for(const item of iconLib.items){
  must(!iconIds.has(item.id),'CODE-EPS icon IDs are unique: '+item.id); iconIds.add(item.id);
  must(item.title.length<=70,'CODE-EPS icon title <=70 chars: '+item.id);
  must(item.description.length>=150&&item.description.length<=200,'CODE-EPS icon description 150–200 chars: '+item.id);
  must(item.keywords.length>=45&&item.keywords.length<=50,'CODE-EPS icon keyword count 45–50: '+item.id);
  must(item.filename.eps.endsWith('.eps')&&item.filename.svg.endsWith('.svg'),'CODE-EPS icon filenames have EPS/SVG extensions: '+item.id);
  must(!iconFiles.has(item.filename.eps),'CODE-EPS EPS filenames are unique: '+item.filename.eps); iconFiles.add(item.filename.eps);
}
const fakePath=()=>({moveTo(){},lineTo(){},bezierCurveTo(){},closePath(){}});
const fakeVec=new Proxy({},{
  get(target,key){
    if(key==='path') return fn=>{fn(fakePath());return fakeVec};
    return (...args)=>fakeVec;
  }
});
const sampleSet=[0,1,9,10,99,100,999,1000,4999,5000,9999];
iconCtx.TAMAS_ICON_LIBRARY=iconLib;
for(const idx of sampleSet){
  const item=iconLib.items[idx];
  const fn=new Function('v','W','H',iconLib.codeFor(item)+'\nreturn renderFrame;');
  const renderFrame=fn(fakeVec,4000,4000);
  renderFrame(0,0,60,fakeVec,4000,4000);
}
must(read('projects/code-to-eps/index.html').includes('./vector-icon-library.js'),'CODE-EPS loads canonical 10K icon library');
must(read('projects/code-to-eps/index.html').includes('id="iconFamily"'),'CODE-EPS exposes stock icon family selector');
must(read('projects/code-to-eps/index.html').includes('id="allIconEpsBtn"'),'CODE-EPS exposes 10K icon EPS batch export');
must(read('projects/code-to-eps/index.html').includes('id="allIconSvgBtn"'),'CODE-EPS exposes 10K icon SVG batch export');
must(read('projects/code-to-eps/index.html').includes('const batchSize=50'),'CODE-EPS icon batch exporter uses groups of 50');

console.log('Global site validation complete.');

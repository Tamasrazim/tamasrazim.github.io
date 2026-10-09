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
    if(!clean) continue;
    let target=clean.startsWith('/')
      ? path.resolve(ROOT,clean.replace(/^\/+/,'' ))
      : path.resolve(ROOT,path.dirname(file),clean);
    if(clean==='/'||clean.endsWith('/')) target=path.join(target,'index.html');
    must(fs.existsSync(target),file+' → '+ref+' resolves');
  }
  // DOM ids belong to actual markup, not JavaScript strings/comments.
  const markup=html
    .replace(/<!--[\s\S]*?-->/g,'')
    .replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi,'');
  const ids=[...markup.matchAll(/\bid=["']([^"']+)["']/gi)].map(x=>x[1]);
  const dup=ids.filter((id,i)=>ids.indexOf(id)!==i);
  must(!dup.length,file+' has no duplicate DOM ids');
}

function checkScript(file){
  execFileSync(process.execPath,['--check',path.join(ROOT,file)],{stdio:'inherit'});
  console.log('PASS',file+' JavaScript parses');
}
function checkInlineScripts(file){
  const html=read(file);
  const matches=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(m=>! /\btype\s*=\s*["']application\/ld\+json["']/i.test(m[1]))
    .map(m=>m[2]);
  must(matches.length>0,file+' contains an inline script');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'code-eps-'));
  try{
    matches.forEach((code,i)=>{
      const temp=path.join(dir,'inline-'+i+'.mjs');
      fs.writeFileSync(temp,code,'utf8');
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
  'KYNESTRA/download.html',
  'projects/kynestra/index.html',
  'projects/kynestra/download/index.html',
  'projects/asset-vault/index.html',
  'projects/trilyva/index.html',
  'asset-vault/index.html',
  'projects/code-motion/index.html',
  'projects/code-motion/renderer/index.html',
  'projects/bncagrocare/index.html',
  'projects/bncagrocare/catalog/index.html',
  'projects/bncagrocare/invoice/index.html',
  'projects/repo-token-meter/index.html',
  'projects/repo-token-meter/workspace/index.html',
  'projects/code-to-eps/index.html',
  'projects/code-to-eps/workspace/index.html',
  'projects/code-to-svg/index.html',
  'projects/code-to-svg/workspace/index.html',
  'projects/format-forge/index.html',
  'projects/format-forge/workspace/index.html',
  'projects/mail-scope/index.html',
  'projects/mail-scope/workspace/index.html',
  'projects/tunrun/index.html',
  'projects/razim-fps/index.html',
  'projects/razim-fps/download.html',
  'projects/neo/index.html',
  'projects/neo/download/index.html',
  'projects/spiral-mic/index.html',
  'projects/spiral-mic/workspace/index.html',
  'projects/prism-web-icons/index.html',
  'projects/prism-web-icons/workspace/index.html'
];
for(const file of htmlFiles) must(exists(file),file+' exists');
for(const file of htmlFiles) checkLocalRefs(file);

checkInlineScripts('projects/code-to-eps/workspace/index.html');

const codeEps=read('projects/code-to-eps/workspace/index.html');
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
const siteJs=read('assets/js/site-redesign.js');
const siteCss=read('assets/css/site-redesign.css');
const siteV3Css=read('assets/css/site-v3.css');
must(site.includes('class="home-v2"'),'homepage uses redesigned visual system');
must(site.includes('site-v3.css?v=')&&siteV3Css.includes('.v3-hero'),'homepage loads the rebuilt v3 design system');
must(site.includes('class="id-card tilt reveal"'),'homepage preserves original ID-card markup');
must(site.includes('id="secretReveal"')&&site.includes('id="secretNode"'),'homepage retains the hidden footer story');
must(site.includes('site-redesign.js?v=')&&site.includes('site-redesign.css?v='),'homepage loads redesign assets');
const schemaOpen='<script type="application/ld+json">',schemaStart=site.indexOf(schemaOpen),schemaEnd=site.indexOf('</script>',schemaStart);
must(schemaStart>=0&&schemaEnd>schemaStart,'homepage contains JSON-LD schema');
const rootSchema=JSON.parse(site.slice(schemaStart+schemaOpen.length,schemaEnd));
must(rootSchema['@context']==='https://schema.org'&&Array.isArray(rootSchema['@graph']),'homepage schema graph parses');
must(rootSchema['@graph'].some(n=>n['@type']==='Person'&&n['@id']==='https://tamasrazim.github.io/#person'),'schema identifies person');
must(rootSchema['@graph'].filter(n=>n['@type']==='SoftwareApplication').length===12,'schema distinguishes twelve desktop and browser software applications');
must(rootSchema['@graph'].some(n=>n['@id']==='https://tamasrazim.github.io/projects/code-motion/renderer/#application'&&n.name==='TRILYVA Renderer'),'schema identifies renderer as a separate tool route');
must(rootSchema['@graph'].some(n=>n['@id']==='https://tamasrazim.github.io/#trilyva'&&n.url==='https://tamasrazim.github.io/projects/trilyva/'),'TRILYVA schema points to the project overview, not the renderer');
must(rootSchema['@graph'].some(n=>n['@type']==='SoftwareApplication'&&n.name==='KYNESTRA'&&/Windows/.test(n.operatingSystem)),'schema identifies KYNESTRA as Windows desktop software');
must(rootSchema['@graph'].some(n=>n['@type']==='VideoGame'&&n.name==='NEO')&&rootSchema['@graph'].some(n=>n['@type']==='VideoGame'&&n.name==='TUNRUN'),'schema identifies native game projects separately');
must(rootSchema['@graph'].some(n=>n['@type']==='SoftwareSourceCode'&&n.name==='Spiral Mic native companion source'),'schema distinguishes native source code from the browser audio app');
must(rootSchema['@graph'].some(n=>n['@type']==='Organization'&&n['@id']==='https://tamasrazim.github.io/projects/bncagrocare/#organization'),'schema defines the BNC AgroCare organization referenced by its project page');
const knownSchemaIds=new Set(rootSchema['@graph'].map(n=>n['@id']));
const rootPerson=rootSchema['@graph'].find(n=>n['@type']==='Person');
must(rootPerson.subjectOf.every(ref=>knownSchemaIds.has(ref['@id'])),'person schema references defined project entities');
must(!site.includes('BOGURA')&&!site.includes('BANGLADESH'),'homepage omits unwanted location text');
must((site.match(/class="v3-project-card v2-project-card v2-reveal v3-reveal"/g)||[]).length===12,'homepage has twelve curated project cards');
must(!site.includes('PRO_TOOL_MANIFEST'),'homepage omits the generated micro-tool catalogue');
for(const ref of ['href="/projects/trilyva/"','href="/asset-vault/"','href="/projects/bncagrocare/"','href="/projects/bncagrocare/invoice/"','href="/projects/repo-token-meter/"','href="/projects/code-to-eps/"'])must(site.includes(ref),'homepage exposes '+ref);
must(!site.includes('href="/projects/code-motion/renderer/">Open workspace'),'homepage does not send the TRILYVA card straight to the renderer');
const visibleHomeMarkup=schemaStart>=0&&schemaEnd>schemaStart?site.slice(0,schemaStart)+site.slice(schemaEnd+'</script>'.length):site;
must(!visibleHomeMarkup.includes('github.com/Tamasrazim/tamasrazim.github.io/tree/main/')&&!visibleHomeMarkup.includes('Source files ↗')&&!visibleHomeMarkup.includes('SVG source ↗')&&!visibleHomeMarkup.includes('EPS source ↗'),'homepage omits direct source links in visible markup');
must(site.includes('href="/projects/tunrun/"')&&!site.includes('href="https://github.com/Tamasrazim/TUNRUN"'),'homepage links to TUNRUN project page');
must(site.includes('I build software, games, and creative tools, from native Windows applications to browser workspaces and procedural motion.')&&!site.includes('build TUNRUN in C++'),'homepage introduction describes the broader software work without naming one project');
must(!site.includes('work on TUNRUN, a C++ game')&&!site.includes('TUNRUN, a C++ game in development'),'homepage metadata and About copy stay focused on the person');
must(!site.includes('tamasrazim.dev'),'homepage does not claim a .dev domain');
must(!site.includes('ProfessionalService')&&!site.includes('13650456762875223511'),'homepage schema avoids unsupported business-profile claims');
must(siteCss.includes('prefers-reduced-motion:reduce')&&siteV3Css.includes('prefers-reduced-motion:reduce'),'redesign respects reduced-motion preferences');
must(siteJs.includes('1000/60'),'background animation is capped at 60 FPS');
const hub=read('projects/index.html');
must(hub.includes('<title>Projects — Tamasrazim</title>'),'project directory uses simple title');
must(!hub.includes('PRO_TOOL_MANIFEST')&&!hub.includes('tool-suite-health-console/'),'project directory omits generated catalogue');
must((hub.match(/class="pi-card v3-index-card"/g)||[]).length===12,'project directory has twelve curated cards');
must(hub.includes('type="application/ld+json"'),'project directory exposes CollectionPage schema');
const hubSchemaOpen='<script type="application/ld+json">',hubSchemaStart=hub.indexOf(hubSchemaOpen),hubSchemaEnd=hub.indexOf('</script>',hubSchemaStart);
must(hubSchemaStart>=0&&hubSchemaEnd>hubSchemaStart,'project directory schema script is bounded');
const hubSchema=JSON.parse(hub.slice(hubSchemaStart+hubSchemaOpen.length,hubSchemaEnd));
const hubItems=hubSchema.mainEntity&&hubSchema.mainEntity.itemListElement||[];
must(hubSchema['@type']==='CollectionPage'&&hubItems.length===12,'project directory schema describes twelve curated projects');
must(hubItems.every(item=>knownSchemaIds.has(item.item&&item.item['@id'])),'project directory items reference defined project entities');
for(const ref of ['href="/projects/trilyva/"','href="/asset-vault/"','href="/projects/bncagrocare/"','href="/projects/bncagrocare/invoice/"','href="/projects/repo-token-meter/"','href="/projects/code-to-eps/"'])must(hub.includes(ref),'project directory exposes '+ref);
must(!hub.includes('href="/projects/code-motion/renderer/">Open workspace'),'project directory links to the TRILYVA overview first');
must(!hub.includes('github.com/Tamasrazim/tamasrazim.github.io/tree/main/')&&!hub.includes('Source files ↗')&&!hub.includes('SVG source ↗')&&!hub.includes('EPS source ↗'),'project directory omits direct source links');
must(hub.includes('href="/projects/tunrun/"')&&!hub.includes('href="https://github.com/Tamasrazim/TUNRUN"'),'project directory links to TUNRUN project page');
const tunrunPage=read('projects/tunrun/index.html');
must(tunrunPage.includes("TUNRUN")&&tunrunPage.includes("Four generated aperture gates")&&tunrunPage.includes("Aether Shards")&&tunrunPage.includes("Singularity Cores")&&tunrunPage.includes("profile v3")&&tunrunPage.includes("Rival Run"),'TUNRUN page documents implemented systems, resources, persistence and future modes');
const trilyvaPage=read('projects/trilyva/index.html');
must(trilyvaPage.includes('Open TRILYVA workspace')&&trilyvaPage.includes('deterministic'),'TRILYVA project page describes the frame model and links to the renderer');
must(read('projects/code-motion/index.html').includes('location.replace(target)'),'legacy TRILYVA URL performs a clean replace redirect');
const neoPage=read('projects/neo/index.html');
must(neoPage.includes('"name": "NEO"')&&neoPage.includes('NEO is my native Windows x64 first-person puzzle game'),'NEO has its own canonical project page and branding');
must(neoPage.includes('href="/projects/neo/download/">Download NEO'),'NEO project page links to the clean download route');
const neoDownloadPage=read('projects/neo/download/index.html');
must(neoDownloadPage.includes('releases/latest/download/NEO-Setup.exe')&&neoDownloadPage.includes('releases/latest/download/NEO-Portable.zip'),'NEO download page links to the latest installer and portable package');
must(neoDownloadPage.includes('Download NEO Setup')&&neoDownloadPage.includes('Portable ZIP')&&neoDownloadPage.includes('Windows x64'),'NEO download page has clear professional download actions and platform details');
must(!neoDownloadPage.includes('/projects/razim-fps/')&&!neoDownloadPage.includes('download.html'),'canonical NEO download page hides the old implementation path and .html extension');
must(read('projects/kynestra/index.html').includes('alpha foundation')&&read('projects/kynestra/index.html').includes('Download KYNESTRA'),'KYNESTRA has a dedicated project overview page');
must(read('projects/kynestra/download/index.html').includes('releases/latest/download/KYNESTRA-setup.exe')&&!read('projects/kynestra/download/index.html').includes('download.html'),'KYNESTRA has a clean download route and installer link');
must(read('KYNESTRA/download.html').includes('location.replace("/projects/kynestra/download/")'),'legacy KYNESTRA download URL redirects');
must(read('projects/asset-vault/index.html').includes('href="/asset-vault/"'),'Stock Asset Vault project page links to its workspace');
must(read('projects/bncagrocare/index.html').includes('href="/projects/bncagrocare/catalog/"')&&read('projects/bncagrocare/index.html').includes('href="/projects/bncagrocare/invoice/"'),'BNC Agro Care project page links to catalogue and invoice workspaces');
for(const slug of ['format-forge','mail-scope','repo-token-meter','spiral-mic','prism-web-icons','code-to-svg','code-to-eps']) must(read('projects/'+slug+'/index.html').includes('/workspace/'),'project overview links to its separate workspace: '+slug);
must(read('projects/razim-fps/index.html').includes('location.replace("/projects/neo/")'),'old game URL redirects to the canonical NEO page');
must(read('projects/razim-fps/download.html').includes('location.replace("/projects/neo/download/")'),'old download.html URL redirects to the clean NEO download route');
must(!hub.includes('href="../renderer/"'),'project directory has no retired renderer link');

const iconLibrarySource=read('projects/code-to-eps/workspace/vector-icon-library.js');
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
  const fn=new Function('v','W','H','TAMAS_ICON_LIBRARY',iconLib.codeFor(item)+'\nreturn renderFrame;');
  const renderFrame=fn(fakeVec,4000,4000,iconLib);
  renderFrame(0,0,60,fakeVec,4000,4000);
}
must(read('projects/code-to-eps/workspace/index.html').includes('./vector-icon-library.js'),'CODE-EPS loads canonical 10K icon library');
must(read('projects/code-to-eps/index.html').includes('id="iconFamily"'),'CODE-EPS exposes stock icon family selector');
must(read('projects/code-to-eps/index.html').includes('id="allIconEpsBtn"'),'CODE-EPS exposes 10K icon EPS batch export');
must(read('projects/code-to-eps/index.html').includes('id="allIconSvgBtn"'),'CODE-EPS exposes 10K icon SVG batch export');
must(read('projects/code-to-eps/index.html').includes('const batchSize=50'),'CODE-EPS icon batch exporter uses groups of 50');

console.log('Global site validation complete.');

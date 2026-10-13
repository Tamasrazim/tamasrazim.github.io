// What this does: Checks the website's pages and linked assets for broken references and other structural mistakes.

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
  'work/index.html',
  'about/index.html',
  'approach/index.html',
  'projects/index.html',
  'KYNESTRA/download.html',
  'projects/kynestra/index.html',
  'projects/kynestra/download/index.html',
  'projects/asset-vault/index.html',
  'projects/trilyva/index.html',
  'projects/trilyva/the-last-star-train.html',
  'projects/trilyva/niko-and-the-clockwork-bird.html',
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
  'projects/tunrun/index.html',
  'projects/webedyts/index.html',
  'projects/qalyvyron/index.html',
  'projects/phasebreak/index.html',
  'projects/hollow-texture-lab/index.html',
  'projects/razim-fps/index.html',
  'projects/razim-fps/download.html',
  'projects/neo/index.html',
  'projects/neo/download/index.html',
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
must(rootSchema['@graph'].filter(n=>n['@type']==='SoftwareApplication').length===12,'schema distinguishes twelve desktop, browser, and creative software applications');
must(rootSchema['@graph'].some(n=>n['@id']==='https://tamasrazim.github.io/projects/code-motion/renderer/#application'&&n.name==='TRILYVA Renderer'),'schema identifies renderer as a separate tool route');
must(rootSchema['@graph'].some(n=>n['@id']==='https://tamasrazim.github.io/#trilyva'&&n.url==='https://tamasrazim.github.io/projects/trilyva/'),'TRILYVA schema points to the project overview, not the renderer');
must(rootSchema['@graph'].some(n=>n['@type']==='SoftwareApplication'&&n.name==='KYNESTRA'&&/Windows/.test(n.operatingSystem)),'schema identifies KYNESTRA as Windows desktop software');
must(rootSchema['@graph'].some(n=>n['@type']==='SoftwareApplication'&&n.name==='QALYVYRON'&&n.url==='https://tamasrazim.github.io/projects/qalyvyron/'),'schema identifies the QALYVYRON desktop 3D studio');
must(rootSchema['@graph'].some(n=>n['@type']==='VideoGame'&&n.name==='NEO')&&rootSchema['@graph'].some(n=>n['@type']==='VideoGame'&&n.name==='TUNRUN'),'schema identifies native game projects separately');
must(rootSchema['@graph'].some(n=>n['@type']==='Organization'&&n['@id']==='https://tamasrazim.github.io/projects/bncagrocare/#organization'),'schema defines the BNC AgroCare organization referenced by its project page');
const knownSchemaIds=new Set(rootSchema['@graph'].map(n=>n['@id']));
const rootPerson=rootSchema['@graph'].find(n=>n['@type']==='Person');
must(rootPerson.subjectOf.every(ref=>knownSchemaIds.has(ref['@id'])),'person schema references defined project entities');
must(!site.includes('BOGURA')&&!site.includes('BANGLADESH'),'homepage omits unwanted location text');
must((site.match(/class="v3-project-card v2-project-card v2-reveal v3-reveal"/g)||[]).length===12,'homepage has twelve curated project cards');
must(site.includes('12 SELECTED PROJECTS')&&!site.includes('13 SELECTED PROJECTS'),'homepage selected-work count matches its twelve cards');
const workPage=read('work/index.html');
must(workPage.includes('11 SELECTED PROJECTS')&&!workPage.includes('13 SELECTED PROJECTS'),'dedicated Work page displays the correct selected-project count');
must((workPage.match(/class="v3-project-card v2-project-card v2-reveal v3-reveal"/g)||[]).length===11,'dedicated Work page contains the same eleven selected project cards');
must(!site.includes('PRO_TOOL_MANIFEST'),'homepage omits the generated micro-tool catalogue');
for(const ref of ['href="/projects/trilyva/"','href="/projects/asset-vault/"','href="/projects/bncagrocare/"','href="/projects/bncagrocare/invoice/"','href="/projects/repo-token-meter/"','href="/projects/code-to-eps/"','href="/projects/webedyts/"','href="/projects/qalyvyron/"'])must(site.includes(ref),'homepage exposes '+ref);
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
must(siteJs.includes("event.key === 'Escape'")&&siteJs.includes("setMenuOpen(false, true)"),'mobile navigation closes on Escape and returns focus');
must(siteJs.includes("menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation')"),'mobile navigation label tracks its expanded state');
must(siteJs.includes("d.addEventListener('pointerdown'")&&siteJs.includes("nav.contains(event.target) || menu.contains(event.target)"),'mobile navigation closes on outside pointer input without toggling on the menu itself');
must(siteJs.includes("w.innerWidth > 900"),'compact navigation closes only when returning to the full desktop layout');
must(siteV3Css.includes('@media(max-width:900px)')&&siteV3Css.includes('.v3-nav.is-open{display:flex}'),'six-link navigation has a working tablet and mobile menu');
for(const route of ['/projects/','/work/','/about/','/approach/','/elsewere/','/licences/']) must(site.includes('href="'+route+'"'),'main header links to '+route);
for(const page of ['work','about','approach']) {
  const pageHtml=read(page+'/index.html');
  must(pageHtml.includes('href="/'+page+'/" aria-current="page"'),'dedicated '+page+' page marks its current navigation route');
  for(const route of ['/projects/','/work/','/about/','/approach/','/elsewere/','/licences/']) must(pageHtml.includes('href="'+route+'"'),'dedicated '+page+' page links to '+route);
}
must(siteJs.includes('function scheduleProgress()')&&siteJs.includes('w.requestAnimationFrame(updateProgress)'),'scroll progress writes are coalesced with requestAnimationFrame');
must(siteJs.includes('60000 - (now.getSeconds() * 1000) - now.getMilliseconds()'),'minute-resolution clock is scheduled on minute boundaries');
must(siteJs.includes("d.addEventListener('visibilitychange', syncVisibility)")&&siteJs.includes('function stopOrbit()')&&siteJs.includes('function stopField()'),'decorative animation loops pause while the document is hidden');
must(siteJs.includes("reduceQuery.addEventListener('change', onMotionPreferenceChange)"),'runtime reduced-motion changes are handled');
must(siteJs.includes('custom cursor mouse-only')&&siteJs.includes('if (!fine || reduce) return;'),'custom cursor effects respect pointer type and reduced-motion settings');
must(siteJs.includes("event.key !== 'Escape'")&&siteJs.includes('updateFilterButtons(active)'),'project search Escape key clears search and resets filters');
must(siteV3Css.includes('left: -17px;')&&siteV3Css.includes('flex-direction: column;')&&siteV3Css.includes('align-items: flex-end;'),'mobile ID card retains its 17px left nudge and stacked Active/code status');
const hub=read('projects/index.html');
must(hub.includes('<title>Projects — Tamasrazim</title>'),'project directory uses simple title');
must(!hub.includes('PRO_TOOL_MANIFEST')&&!hub.includes('tool-suite-health-console/'),'project directory omits generated catalogue');
must((hub.match(/class="pi-card v3-index-card"/g)||[]).length===13,'project directory has thirteen curated cards');

const hubCategories=[...hub.matchAll(/<article\b[^>]*class="[^"]*\bpi-card\b[^"]*"[^>]*data-category="([^"]+)"/g)].map(match=>match[1]);
const hubFilters=new Set([...hub.matchAll(/data-filter="([^"]+)"/g)].map(match=>match[1]));
must(hubCategories.every(category=>hubFilters.has(category)),'every project category has a matching filter control');

const sitemap=read('sitemap.xml');
const sitemapUrls=new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1].trim()));
for(const route of ['/', '/work/', '/about/', '/approach/', '/projects/', '/projects/phasebreak/', '/projects/hollow-texture-lab/']) {
  must(sitemapUrls.has('https://tamasrazim.github.io'+route),'sitemap includes '+route);
}

const readme=read('README.md');
const readmeSiteRoutes=[...readme.matchAll(/https:\/\/tamasrazim\.github\.io(\/[^)\s]*)?/g)].map(match=>match[1]||'/');
for(const route of readmeSiteRoutes) {
  const clean=route.split('#')[0].split('?')[0]||'/';
  let target=path.resolve(ROOT,clean.replace(/^\/+/, ''));
  if(clean==='/'||clean.endsWith('/')) target=path.join(target,'index.html');
  must(fs.existsSync(target),'README website route '+route+' resolves');
}

must(hub.includes('type="application/ld+json"'),'project directory exposes CollectionPage schema');
const hubSchemaOpen='<script type="application/ld+json">',hubSchemaStart=hub.indexOf(hubSchemaOpen),hubSchemaEnd=hub.indexOf('</script>',hubSchemaStart);
must(hubSchemaStart>=0&&hubSchemaEnd>hubSchemaStart,'project directory schema script is bounded');
const hubSchema=JSON.parse(hub.slice(hubSchemaStart+hubSchemaOpen.length,hubSchemaEnd));
const hubItems=hubSchema.mainEntity&&hubSchema.mainEntity.itemListElement||[];
must(hubSchema['@type']==='CollectionPage'&&hubItems.length===13,'project directory schema describes thirteen curated projects');
must(hubItems.every(item=>knownSchemaIds.has(item.item&&item.item['@id'])),'project directory items reference defined project entities');
for(const ref of ['href="/projects/trilyva/"','href="/projects/asset-vault/"','href="/projects/bncagrocare/"','href="/projects/bncagrocare/invoice/"','href="/projects/repo-token-meter/"','href="/projects/code-to-eps/"','href="/projects/webedyts/"','href="/projects/qalyvyron/"'])must(hub.includes(ref),'project directory exposes '+ref);
must(!hub.includes('href="/projects/code-motion/renderer/">Open workspace'),'project directory links to the TRILYVA overview first');
must(!hub.includes('github.com/Tamasrazim/tamasrazim.github.io/tree/main/')&&!hub.includes('Source files ↗')&&!hub.includes('SVG source ↗')&&!hub.includes('EPS source ↗'),'project directory omits direct source links');
must(hub.includes('href="/projects/tunrun/"')&&!hub.includes('href="https://github.com/Tamasrazim/TUNRUN"'),'project directory links to TUNRUN project page');
const tunrunPage=read('projects/tunrun/index.html');
must(tunrunPage.includes("TUNRUN")&&tunrunPage.includes("Four generated aperture gates")&&tunrunPage.includes("Aether Shards")&&tunrunPage.includes("Singularity Cores")&&tunrunPage.includes("profile v3")&&tunrunPage.includes("Rival Run"),'TUNRUN page documents implemented systems, resources, persistence and future modes');
const trilyvaPage=read('projects/trilyva/index.html');
must(trilyvaPage.includes('Open TRILYVA workspace')&&trilyvaPage.includes('deterministic'),'TRILYVA project page describes the frame model and links to the renderer');
must(read('projects/code-motion/index.html').includes('location.replace(target)'),'legacy TRILYVA URL performs a clean replace redirect');
const trilyvaRenderer=read('projects/code-motion/renderer/index.html');
const trilyvaPrismData=read('projects/code-motion/renderer/library/prism-data.js');
const trilyvaRendererSw=read('projects/code-motion/renderer/sw.js');
must(exists('projects/code-to-eps/prism-library.json'),'the shared Prism dataset exists at its canonical local path');
must(exists('projects/code-motion/renderer/library/prism-library.json'),'TRILYVA bundles the Prism dataset next to its renderer modules');
must(read('projects/code-motion/renderer/library/prism-library.json')===read('projects/code-to-eps/prism-library.json'),'the renderer-local Prism data stays identical to the canonical dataset');
must(trilyvaRenderer.includes("const PRISM_LIBRARY_URL='./library/prism-library.json'")&&trilyvaRenderer.includes("const TRILYVA_PRISM_LIBRARY_URL='./library/prism-library.json'"),'both TRILYVA Prism loaders use the self-contained local dataset');
must(trilyvaPrismData.includes('./prism-library.json')&&trilyvaPrismData.includes('export default data;'),'the protected Prism module loads and exports its sibling JSON data');
must(trilyvaRendererSw.includes("const CACHE = 'tamasrazim-trilyva-pwa-v84'")&&trilyvaRendererSw.includes("'./library/prism-library.json'"),'TRILYVA offline cache includes the local Prism dataset');
const kynestraBuild=read('KYNESTRA/desktop/tauri/build.rs');
must(kynestraBuild.includes('manifest_dir.join("../../../projects/code-motion/renderer")')&&kynestraBuild.includes('fn copy_directory'),'KYNESTRA packages the full canonical renderer runtime with its local dependencies');
const trilyvaMediaStack=read('projects/code-motion/renderer/media-stack.js');
const kynestraMediaStack=read('KYNESTRA/modules/c2m/renderer/media-stack.js');
must(!trilyvaMediaStack.includes('FLOWER BATCH')&&!trilyvaMediaStack.includes('installBatchLink')&&!kynestraMediaStack.includes('FLOWER BATCH')&&!kynestraMediaStack.includes('installBatchLink'),'renderer does not inject the removed Flower Batch tab');
const neoPage=read('projects/neo/index.html');
must(neoPage.includes('"name": "NEO"')&&neoPage.includes('100 deterministic floors'),'NEO has its own canonical project page and branding');
must(neoPage.includes('href="/projects/neo/download/">Download NEO'),'NEO project page links to the clean download route');
const neoDownloadPage=read('projects/neo/download/index.html');
must(neoDownloadPage.includes('releases/latest/download/NEO-Setup.exe')&&neoDownloadPage.includes('releases/latest/download/NEO-Portable.zip'),'NEO download page links to the latest installer and portable package');
must(neoDownloadPage.includes('Download NEO Setup')&&neoDownloadPage.includes('Portable ZIP')&&neoDownloadPage.includes('Windows x64'),'NEO download page has clear professional download actions and platform details');
must(!neoDownloadPage.includes('/projects/razim-fps/')&&!neoDownloadPage.includes('download.html'),'canonical NEO download page hides the old implementation path and .html extension');
must(read('projects/kynestra/index.html').includes('NATIVE SOFTWARE / WINDOWS X64 / ALPHA')&&read('projects/kynestra/index.html').includes('Download KYNESTRA'),'KYNESTRA has a dedicated project overview page');
must(read('projects/kynestra/download/index.html').includes('releases/latest/download/KYNESTRA-setup.exe')&&!read('projects/kynestra/download/index.html').includes('download.html'),'KYNESTRA has a clean download route and installer link');
must(read('KYNESTRA/download.html').includes('location.replace("/projects/kynestra/download/")'),'legacy KYNESTRA download URL redirects');
must(read('projects/asset-vault/index.html').includes('href="/asset-vault/"'),'Stock Asset Vault project page links to its workspace');
must(read('projects/bncagrocare/index.html').includes('href="/projects/bncagrocare/catalog/"')&&read('projects/bncagrocare/index.html').includes('href="/projects/bncagrocare/invoice/"'),'BNC Agro Care project page links to catalogue and invoice workspaces');
for(const slug of ['format-forge','repo-token-meter','code-to-svg','code-to-eps']) must(read('projects/'+slug+'/index.html').includes('/workspace/'),'project overview links to its separate workspace: '+slug);
must(read('projects/razim-fps/index.html').includes('location.replace("/projects/neo/")'),'old game URL redirects to the canonical NEO page');
must(read('projects/razim-fps/download.html').includes('location.replace("/projects/neo/download/")'),'old download.html URL redirects to the clean NEO download route');
must(!hub.includes('href="../renderer/"'),'project directory has no retired renderer link');


const webedytsPage=read('projects/webedyts/index.html');
must(webedytsPage.includes('WEBEDYTS')&&webedytsPage.includes('I\'m not publishing a download yet.'),'WEBEDYTS has a dedicated pre-release product page');
must(webedytsPage.includes('Downloads are not available yet.')&&!webedytsPage.includes('releases/latest/download/WEBEDYTS'),'WEBEDYTS does not advertise unpublished release assets');
must(webedytsPage.includes('not a screenshot')&&webedytsPage.includes('current editor source')&&webedytsPage.includes('w-select-pass')&&webedytsPage.includes('w-cursor-flow'),'WEBEDYTS labels conceptual UI art and editor-source status honestly');

const qalyvyronPage=read('projects/qalyvyron/index.html');
must(qalyvyronPage.includes('QALYVYRON')&&qalyvyronPage.includes('not yet a complete replacement for Blender'),'QALYVYRON has a dedicated page with honest development status');
must(qalyvyronPage.includes('Focus Selected')&&qalyvyronPage.toLowerCase().includes('offline png')&&qalyvyronPage.toLowerCase().includes("what isn't done yet"),'QALYVYRON page distinguishes current functionality from unfinished systems');
must(qalyvyronPage.includes('selectable mesh-edge lines')&&qalyvyronPage.includes('closed edge loop'),'QALYVYRON page documents tested mesh-edge selection and edge-loop face creation');
must(qalyvyronPage.includes('Subdivide Edge')&&qalyvyronPage.includes('midpoint vertex'),'QALYVYRON page documents tested edge subdivision and midpoint vertex insertion');
must(qalyvyronPage.includes('/actions/runs/38195187492')&&!qalyvyronPage.includes('/actions/runs/38193966185')&&!qalyvyronPage.includes('/actions/runs/38193528968')&&!qalyvyronPage.includes('/actions/runs/38189084118')&&!qalyvyronPage.includes('/actions/runs/38187040533')&&!qalyvyronPage.includes('releases/latest/download/QALYVYRON'),'QALYVYRON links the latest verified CI build and does not advertise an unpublished release');
must(qalyvyronPage.includes('approximately every 30 seconds')&&qalyvyronPage.includes('restore the snapshot'),'QALYVYRON page documents timed local recovery and startup restore');
must(qalyvyronPage.includes('Run 38195187492 passed')&&qalyvyronPage.includes('CTest suite')&&qalyvyronPage.includes('edge subdivision'),'QALYVYRON build status reflects current green Linux/Windows tests for mesh subdivision');
must(qalyvyronPage.includes('disconnected selections')&&qalyvyronPage.includes('consistent face winding'),'QALYVYRON page documents tested edge-loop rejection and orientation handling');

const cinematicIntroCss=read('assets/css/project-cinematic-intro.css');
const cinematicIntroJs=read('assets/js/project-cinematic-intro.js');
execFileSync(process.execPath,['--check',path.join(ROOT,'assets/js/project-cinematic-intro.js')]);
must(cinematicIntroJs.includes('Object.assign(profiles')&&cinematicIntroJs.includes('Escape'),'cinematic intro has project profiles and a keyboard skip path');
must(cinematicIntroJs.includes('home: {')&&cinematicIntroJs.includes('IDENTITY ASSEMBLY / MAIN SITE'),'cinematic intro includes the homepage ID assembly profile');
must(cinematicIntroCss.includes('.pci-project--home')&&cinematicIntroCss.includes('.pci-home-id-mount')&&cinematicIntroCss.includes('.pci-home-built-card'),'homepage intro animates the original identity-card component');
must(cinematicIntroCss.includes('@keyframes pci-home-card-reveal')&&cinematicIntroCss.includes('pci-home-constellation-bloom')&&cinematicIntroCss.includes('pci-home-flash-pass'),'homepage intro uses its centre-opening 3D reveal, constellation bloom, and finishing light pass');
must(cinematicIntroCss.includes('--ring-z:-18deg')&&cinematicIntroCss.includes('--ring-z:32deg')&&cinematicIntroCss.includes('rotateZ(var(--ring-z'),'homepage orbital rings preserve distinct crossing angles through the entrance animation');
must(cinematicIntroCss.includes('.pci-home-loading-track span')&&cinematicIntroCss.includes('@keyframes pci-home-loader-sweep')&&cinematicIntroCss.includes('pci-home-loader-spin'),'homepage has an animated loading scene while the original JPG is pending');
must(cinematicIntroJs.includes('waitForHomeImage()')&&cinematicIntroJs.includes('homeImage.complete')&&cinematicIntroJs.includes('12000'),'homepage waits for its source image and includes a bounded fallback');
must(cinematicIntroJs.includes('durationMs: 8500')&&cinematicIntroJs.includes('durationLabel: "08.5 SEC"'),'homepage ID assembly duration is between seven and ten seconds');
must(cinematicIntroJs.includes('document.querySelector("main .id-card")')&&cinematicIntroJs.includes('homeMount.appendChild(homeCard)')&&cinematicIntroJs.includes('restoreHomeCard()'),'homepage animation moves and restores the original identity-card node');
must(cinematicIntroJs.includes('cancelAnimationFrame(startFrame)')&&cinematicIntroJs.includes('if (isClosing) return;')&&cinematicIntroJs.includes('let didStart = false;'),'homepage intro safely handles Skip or Escape before the first animation frame');
const identityCardCss=read('assets/css/site.css');
const identityCardJs=read('assets/js/site.js');
const identityCardStart=site.indexOf('<article class="id-card tilt reveal" data-reveal');
const identityCardEnd=site.indexOf('</article>',identityCardStart)+10;
const identityCardMarkup=identityCardStart>=0&&identityCardEnd>identityCardStart?site.slice(identityCardStart,identityCardEnd):'';
must(identityCardMarkup.includes('src="./assets/images/tamanna-constellation.jpeg"')&&identityCardMarkup.includes('loading="eager"')&&identityCardMarkup.includes('fetchpriority="high"')&&identityCardMarkup.includes('id="idAlias"')&&identityCardMarkup.includes('Robiul Rumman Razim'),'homepage keeps the original ID artwork and prioritises its JPG for the intro');
must(site.includes('rel="preload" as="image" href="./assets/images/tamanna-constellation.jpeg" fetchpriority="high"'),'homepage preloads the original constellation JPG before the cinematic intro');
must(identityCardCss.includes('.id-card{')&&identityCardCss.includes('.id-constellation{')&&identityCardCss.includes('.id-image-scan{')&&identityCardCss.includes('.id-kicker,.id-online,.id-status'),'original identity-card CSS assets and their styles remain in place');
must(identityCardJs.includes("var idAlias = q('#idAlias')")&&identityCardJs.includes("scrambleTo(idAlias,'TAMASRAZIM',260)"),'original identity-card JavaScript interaction remains in place');
must(site.includes('<body class="home-v2" data-cinematic-intro="home">')&&site.includes('project-cinematic-intro.css?v=20261013-8')&&site.includes('project-cinematic-intro.js?v=20261013-8'),'homepage loads the identity-assembly intro assets');
const cinematicProjectKeys=['tunrun','webedyts','qalyvyron','trilyva','neo','code-to-svg','code-to-eps','format-forge','asset-vault','kynestra','bncagrocare','repo-token-meter'];
must(cinematicProjectKeys.every(key=>cinematicIntroJs.includes(key+': {')||cinematicIntroJs.includes('"'+key+'": {')),'cinematic intro has a dedicated animation profile for every featured project');
must(cinematicIntroCss.includes('prefers-reduced-motion:reduce')&&cinematicIntroCss.includes('.pci-project--tunrun')&&cinematicIntroCss.includes('.pci-project--webedyts')&&cinematicIntroCss.includes('.pci-project--qalyvyron')&&cinematicIntroCss.includes('.pci-project--trilyva'),'cinematic intro has reduced-motion handling and project-specific themes');
for (const [projectKey,pagePath] of [
  ['tunrun','projects/tunrun/index.html'],
  ['webedyts','projects/webedyts/index.html'],
  ['qalyvyron','projects/qalyvyron/index.html'],
  ['trilyva','projects/trilyva/index.html'],
  ['neo','projects/neo/index.html'],
  ['code-to-svg','projects/code-to-svg/index.html'],
  ['code-to-eps','projects/code-to-eps/index.html'],
  ['format-forge','projects/format-forge/index.html'],
  ['asset-vault','projects/asset-vault/index.html'],
  ['kynestra','projects/kynestra/index.html'],
  ['bncagrocare','projects/bncagrocare/index.html'],
  ['repo-token-meter','projects/repo-token-meter/index.html']
]) {
  const page=read(pagePath);
  must(page.includes('data-cinematic-intro="'+projectKey+'"')&&page.includes('/assets/css/project-cinematic-intro.css?v=20261013-7')&&page.includes('/assets/js/project-cinematic-intro.js?v=20261013-7'),projectKey.toUpperCase()+' project overview loads its cinematic intro');
}


// Scan every top-level route so each page declares its intended experience.
// Some have a cinematic intro, PHASEBREAK is a standalone page, and two old URLs redirect.
const legacyProjectRedirects = new Set([
  'projects/code-motion/index.html',
  'projects/razim-fps/index.html'
]);
const cinematicProjectPages = new Set([
  'projects/tunrun/index.html',
  'projects/webedyts/index.html',
  'projects/qalyvyron/index.html',
  'projects/trilyva/index.html',
  'projects/neo/index.html',
  'projects/code-to-svg/index.html',
  'projects/code-to-eps/index.html',
  'projects/format-forge/index.html',
  'projects/asset-vault/index.html',
  'projects/kynestra/index.html',
  'projects/bncagrocare/index.html',
  'projects/repo-token-meter/index.html'
]);
const standaloneProjectPages = new Set([
  'projects/phasebreak/index.html',
  'projects/hollow-texture-lab/index.html'
]);
const topLevelProjectIndexes = fs.readdirSync(path.join(ROOT,'projects'),{withFileTypes:true})
  .filter(entry=>entry.isDirectory())
  .map(entry=>path.join('projects',entry.name,'index.html').split(path.sep).join('/'))
  .filter(exists)
  .sort();
must(topLevelProjectIndexes.length===cinematicProjectPages.size+standaloneProjectPages.size+legacyProjectRedirects.size,
  'every top-level project route has a registered experience or an explicit legacy redirect');
for(const pagePath of topLevelProjectIndexes) {
  const page=read(pagePath);
  const introMatch=page.match(/\bdata-cinematic-intro=["']([^"']+)["']/);
  if(introMatch) {
    must(cinematicProjectKeys.includes(introMatch[1]),pagePath+' uses a registered cinematic profile');
    must(cinematicProjectPages.has(pagePath),pagePath+' is part of the cinematic regression suite');
    must(page.includes('/assets/css/project-cinematic-intro.css?v=20261013-7')&&page.includes('/assets/js/project-cinematic-intro.js?v=20261013-7'),
      pagePath+' loads the matching cinematic intro assets');
  } else if(standaloneProjectPages.has(pagePath)) {
    must(!page.includes('/assets/js/project-cinematic-intro.js'),pagePath+' remains a direct standalone project page');
  } else {
    must(legacyProjectRedirects.has(pagePath),pagePath+' has an intro or an explicitly approved legacy redirect');
    must(/(?:window\.)?location\.replace\(/.test(page),pagePath+' legacy redirect has a client-side destination');
    must(!page.includes('/assets/js/project-cinematic-intro.js'),pagePath+' redirect avoids mounting a cinematic overlay');
  }
}
must([...standaloneProjectPages].every(pagePath=>topLevelProjectIndexes.includes(pagePath)),
  'standalone native project pages remain registered');
must([...legacyProjectRedirects].every(pagePath=>topLevelProjectIndexes.includes(pagePath)),
  'both documented legacy project redirects still exist');


function testCinematicIntroRuntime(projectKey, closeWithEscape=false, closeAutomatically=false, imageInitiallyLoaded=true) {
  const makeClassList=(getName,setName)=>({
    add(...tokens){const next=new Set(String(getName()).split(/\s+/).filter(Boolean));tokens.forEach(token=>next.add(token));setName(Array.from(next).join(' '));},
    remove(...tokens){const next=new Set(String(getName()).split(/\s+/).filter(Boolean));tokens.forEach(token=>next.delete(token));setName(Array.from(next).join(' '));},
    contains(token){return String(getName()).split(/\s+/).includes(token)}
  });
  const storage=new Map();
  const timeouts=[];
  const listeners=new Map();
  const skipHandlers={};
  const headingAttrs=new Set();
  let intro;
  let homeMount=null;
  const homeCardParent={
    children:[],
    insertBefore(node,referenceNode){
      if(node.parentNode&&typeof node.parentNode.removeChild==='function')node.parentNode.removeChild(node);
      const at=this.children.indexOf(referenceNode);
      if(at<0)throw new Error('Expected insertion reference to exist in the ID card parent.');
      this.children.splice(at,0,node);node.parentNode=this;return node;
    },
    removeChild(node){this.children=this.children.filter(child=>child!==node);node.parentNode=null;return node;}
  };
  let homeCard=null;
  const homeImage={complete:imageInitiallyLoaded,naturalWidth:imageInitiallyLoaded?1280:0,handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},removeEventListener(type,fn){if(this.handlers[type]===fn)delete this.handlers[type];}};
  const originalHomeCardClassName='id-card tilt reveal';
  const originalHomeCardStyle='--delay:3';
  const originalHomeCardDataReveal='';
  if(projectKey==='home'){
    const cardAttrs={style:originalHomeCardStyle,'data-reveal':originalHomeCardDataReveal};
    homeCard={
      tagName:'ARTICLE',
      className:originalHomeCardClassName,
      attrs:cardAttrs,
      parentNode:homeCardParent,
      getAttribute(name){return Object.prototype.hasOwnProperty.call(cardAttrs,name)?cardAttrs[name]:null;},
      setAttribute(name,value){cardAttrs[name]=String(value);},
      removeAttribute(name){delete cardAttrs[name];},
      focus(){documentMock.activeElement=homeCard;},
      querySelector(selector){return selector==='.id-constellation'?homeImage:null;}
    };
    homeCard.classList=makeClassList(()=>homeCard.className,value=>{homeCard.className=value;});
    homeCardParent.children.push(homeCard);
  }
  const heading={
    attrs:headingAttrs,
    hasAttribute(name){return headingAttrs.has(name)},
    setAttribute(name,value){headingAttrs.add(name);this[name]=value},
    removeAttribute(name){headingAttrs.delete(name);delete this[name]},
    focus(){documentMock.activeElement=heading},
    addEventListener(){},
  };
  const documentMock={
    activeElement:null,
    createElement(tag){
      const attrs={};
      const skip={
        handlers:skipHandlers,
        addEventListener(type,fn){skipHandlers[type]=fn},
        focus(){documentMock.activeElement=skip},
        setAttribute(name,value){attrs[name]=value}
      };
      const loaderTitle={textContent:'LOADING ORIGINAL CONSTELLATION'};
      const loaderDetail={textContent:'FETCHING JPG'};
      const footerStatus={textContent:'TR / IMAGE PREPARATION'};
      homeMount={
        className:'pci-home-id-mount',
        children:[],
        parentNode:null,
        appendChild(node){
          if(node.parentNode&&typeof node.parentNode.removeChild==='function')node.parentNode.removeChild(node);
          node.parentNode=this;this.children.push(node);return node;
        },
        removeChild(node){this.children=this.children.filter(child=>child!==node);node.parentNode=null;return node;}
      };
      intro={
        tagName:tag.toUpperCase(),
        className:'',
        classList:(()=>{const classes=new Set();return{add(value){classes.add(value)},remove(value){classes.delete(value)},contains(value){return classes.has(value)}}})(),
        attrs,
        parentNode:null,
        innerHTML:'',
        setAttribute(name,value){attrs[name]=value},
        addEventListener(){},
        removeEventListener(){},
        focus(){documentMock.activeElement=intro},
        contains(node){return node===intro||node===skip||node===homeMount||(homeMount&&homeMount.children.includes(node))},
        querySelector(selector){
          if(selector==='.pci-skip')return skip;
          if(selector==='.pci-home-id-mount'&&projectKey==='home')return homeMount;
          if(selector==='.pci-home-loading-label'&&projectKey==='home')return loaderTitle;
          if(selector==='.pci-home-loading-detail'&&projectKey==='home')return loaderDetail;
          if(selector==='.pci-home-bottom-label'&&projectKey==='home')return footerStatus;
          return null;
        }
      };
      intro.skip=skip;
      return intro;
    },
    createComment(text){return{nodeType:8,textContent:text,parentNode:null};},
    querySelector(selector){
      if(selector==='.pci-skip')return intro&&intro.skip;
      if(selector==='main h1')return heading;
      if(selector==='main .id-card'&&projectKey==='home')return homeCard;
      return null;
    },
    addEventListener(type,fn){listeners.set(type,fn)},
    removeEventListener(type){listeners.delete(type)}
  };
  const body={
    classList:(()=>{const classes=new Set();return{add(value){classes.add(value)},remove(value){classes.delete(value)},contains(value){return classes.has(value)}}})(),
    children:[],
    getAttribute(name){return name==='data-cinematic-intro'?projectKey:null},
    appendChild(node){if(node.parentNode&&typeof node.parentNode.removeChild==='function')node.parentNode.removeChild(node);node.parentNode=this;this.children.push(node);return node;},
    removeChild(node){this.children=this.children.filter(child=>child!==node);node.parentNode=null;return node;}
  };
  documentMock.body=body;
  const windowMock={
    sessionStorage:{
      getItem(key){return storage.has(key)?storage.get(key):null},
      setItem(key,value){storage.set(key,value)}
    },
    matchMedia(){return {matches:false}},
    requestAnimationFrame(callback){callback(16)},
    setTimeout(callback,delay){timeouts.push({callback,delay});return timeouts.length},
    clearTimeout(){},
  };
  vm.runInNewContext(cinematicIntroJs,{
    window:windowMock,
    document:documentMock,
    console,
    setTimeout:windowMock.setTimeout,
    clearTimeout:windowMock.clearTimeout
  },{filename:'project-cinematic-intro.js'});
  const expectedTitles={
    home:'TAMASRAZIM',tunrun:'TUNRUN',webedyts:'WEBEDYTS',qalyvyron:'QALYVYRON',trilyva:'TRILYVA',
    neo:'NEO','code-to-svg':'CODE → SVG','code-to-eps':'CODE → EPS',
    'format-forge':'FORMAT FORGE','asset-vault':'STOCK ASSET VAULT',
    kynestra:'KYNESTRA',bncagrocare:'BNC AGROCARE','repo-token-meter':'REPO TOKEN METER'
  };
  if(projectKey==='home'&&!imageInitiallyLoaded){
    must(intro.classList.contains('pci-home-waiting')&&!intro.classList.contains('pci-is-live'),'homepage shows the animated loader before the JPG loads');
    must(intro.innerHTML.includes('pci-home-loading')&&timeouts.some(timer=>timer.delay===12000)&&!timeouts.some(timer=>timer.delay===8500),'homepage loader remains active without starting the 8.5-second reveal timer');
    const onLoad=homeImage.handlers.load;
    must(typeof onLoad==='function','homepage listens for the original JPG load event');
    homeImage.complete=true;homeImage.naturalWidth=1280;onLoad();
    must(!intro.classList.contains('pci-home-waiting')&&intro.classList.contains('pci-is-live')&&timeouts.some(timer=>timer.delay===8500),'homepage begins the full reveal only when the JPG is ready');
  }
  const expectedDuration=projectKey==='home'?8500:4250;
  const sessionKey=projectKey==='home'?'tamasrazim-cinematic-intro-v7:home':'tamasrazim-cinematic-intro-v1:'+projectKey;
  must(body.children.length===1&&intro.innerHTML.includes(expectedTitles[projectKey]),projectKey.toUpperCase()+' intro mounts its own title and layout');
  must(body.classList.contains('pci-lock')&&intro.classList.contains('pci-is-live')&&typeof skipHandlers.click==='function'&&timeouts.some(timer=>timer.delay===expectedDuration),projectKey.toUpperCase()+' intro starts, exposes Skip, locks scrolling, and uses the expected duration');
  if(projectKey==='home'){
    must(homeMount.children[0]===homeCard&&homeCard.parentNode===homeMount&&homeCard.classList.contains('pci-home-built-card'),'homepage intro mounts the exact existing identity-card DOM node');
    must(homeCard.getAttribute('style')===originalHomeCardStyle&&homeCard.getAttribute('data-reveal')===originalHomeCardDataReveal,'homepage ID card retains its native attributes while assembled');
  }
  let escapePrevented=false;
  if(closeAutomatically){
    const autoClose=timeouts.find(timer=>timer.delay===expectedDuration);
    must(!!autoClose&&typeof autoClose.callback==='function',projectKey.toUpperCase()+' schedules its automatic dismissal');
    autoClose.callback();
  } else if(closeWithEscape){
    const keyHandler=listeners.get('keydown');
    must(typeof keyHandler==='function',projectKey.toUpperCase()+' registers its keyboard handler');
    keyHandler({key:'Escape',preventDefault(){escapePrevented=true}});
  } else {
    skipHandlers.click();
  }
  const closeMethod=closeAutomatically?'automatic timeout':closeWithEscape?'Escape':'Skip';
  must(!body.classList.contains('pci-lock')&&intro.classList.contains('pci-is-leaving')&&storage.get(sessionKey)==='shown'&&(!closeWithEscape||escapePrevented),projectKey.toUpperCase()+' '+closeMethod+' closes, restores scrolling, and records the session');
  if(projectKey==='home'){
    must(homeCard.parentNode===homeCardParent&&homeCardParent.children.length===1&&homeCardParent.children[0]===homeCard,'homepage '+closeMethod+' returns the exact same ID card to its original DOM position');
    must(homeCard.className===originalHomeCardClassName&&homeCard.getAttribute('style')===originalHomeCardStyle&&homeCard.getAttribute('data-reveal')===originalHomeCardDataReveal,'homepage '+closeMethod+' restores the ID card original classes and inline attributes');
  }
}
for(const projectKey of cinematicProjectKeys) testCinematicIntroRuntime(projectKey);
for(const projectKey of cinematicProjectKeys) testCinematicIntroRuntime(projectKey,true);
for(const projectKey of cinematicProjectKeys) testCinematicIntroRuntime(projectKey,false,true);
testCinematicIntroRuntime('home');
testCinematicIntroRuntime('home',true);
testCinematicIntroRuntime('home',false,true);
testCinematicIntroRuntime('home',false,false,false);

function testCinematicIntroEarlyExit(projectKey, prefersReducedMotion, alreadyShown) {
  const classes=new Set();
  let children=0;
  const body={
    classList:{add(value){classes.add(value)},remove(value){classes.delete(value)},contains(value){return classes.has(value)}},
    getAttribute(name){return name==='data-cinematic-intro'?projectKey:null},
    appendChild(){children++}
  };
  const windowMock={
    matchMedia(){return {matches:prefersReducedMotion}},
    sessionStorage:{
      getItem(key){const expectedKey=projectKey==='home'?'tamasrazim-cinematic-intro-v7:home':'tamasrazim-cinematic-intro-v1:'+projectKey;return alreadyShown&&key===expectedKey?'shown':null},
      setItem(){}
    }
  };
  const documentMock={body,createElement(){throw new Error('Intro should not create an overlay on this path.')}};
  vm.runInNewContext(cinematicIntroJs,{window:windowMock,document:documentMock},{filename:'project-cinematic-intro-early-exit.js'});
  must(children===0&&!classes.has('pci-lock'),projectKey.toUpperCase()+' '+(prefersReducedMotion?'respects reduced-motion preference':'does not replay after being shown in this tab'));
}
testCinematicIntroEarlyExit('tunrun',true,false);
testCinematicIntroEarlyExit('tunrun',false,true);
testCinematicIntroEarlyExit('home',true,false);
testCinematicIntroEarlyExit('home',false,true);

const iconLibrarySource=read('projects/code-to-eps/workspace/vector-icon-library.js');
execFileSync(process.execPath,['--check',path.join(ROOT,'projects/code-to-eps/workspace/vector-icon-library.js')]);
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
must(read('projects/code-to-eps/workspace/index.html').includes('id="iconFamily"'),'CODE-EPS exposes stock icon family selector');
must(read('projects/code-to-eps/workspace/index.html').includes('id="allIconEpsBtn"'),'CODE-EPS exposes 10K icon EPS batch export');
must(read('projects/code-to-eps/workspace/index.html').includes('id="allIconSvgBtn"'),'CODE-EPS exposes 10K icon SVG batch export');
must(read('projects/code-to-eps/workspace/index.html').includes('const batchSize=50'),'CODE-EPS icon batch exporter uses groups of 50');

const routeMenuPages=[
  'projects/trilyva/index.html',
  'projects/neo/index.html',
  'projects/tunrun/index.html',
  'projects/code-to-svg/index.html',
  'projects/code-to-eps/index.html',
  'projects/format-forge/index.html',
  'projects/asset-vault/index.html',
  'projects/kynestra/index.html',
  'projects/bncagrocare/index.html',
  'projects/repo-token-meter/index.html',
  'projects/webedyts/index.html',
  'projects/qalyvyron/index.html',
  'projects/trilyva/the-last-star-train.html',
  'projects/neo/download/index.html',
  'projects/kynestra/download/index.html',
  'projects/code-to-svg/workspace/index.html',
  'projects/format-forge/workspace/index.html',
  'projects/code-to-eps/workspace/index.html',
  'projects/repo-token-meter/workspace/index.html',
  'asset-vault/index.html'
];
const mainSiteRoutes=['/projects/','/work/','/about/','/approach/','/elsewere/','/licences/'];
for(const file of routeMenuPages){
  const page=read(file);
  const menuStart=page.indexOf('<details class="site-page-menu">');
  const menuEnd=page.indexOf('</details>',menuStart);
  must(menuStart>=0&&menuEnd>menuStart,file+' has the compact main-site route menu');
  const menuHtml=page.slice(menuStart,menuEnd+'</details>'.length);
  for(const route of mainSiteRoutes) must(menuHtml.includes('href="'+route+'"'),file+' route menu links to '+route);
  must(page.includes('/assets/css/site-navigation.css?v=20261012-1'),file+' loads route-menu styles');
  must(page.includes('/assets/js/site-navigation.js?v=20261012-1'),file+' loads route-menu keyboard and dismissal behavior');
}

console.log('Global site validation complete.');

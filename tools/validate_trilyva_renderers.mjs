// What this does: Verifies TRILYVA's render controls, full tutorial, and removal of promotional animation samples.
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);console.log('PASS',message);};
const renderer=read('projects/code-motion/renderer/index.html');
const overview=read('projects/trilyva/index.html');
const tutorial=read('projects/trilyva/tutorial.html');
const manifest=read('projects/code-motion/renderer/library/manifest.json');
const serviceWorker=read('projects/code-motion/renderer/sw.js');
const movieFinalizer=read('projects/code-motion/renderer/movie-finalizer.js');
must(renderer.includes('data-act="render"'),'header retains Render action');
must(renderer.includes('data-act="renderAll"'),'render panel retains Render All');
must(renderer.includes('data-act="renderAllDotMesh"'),'render panel retains Dot Mesh batch action');
const renderPanel=renderer.slice(renderer.indexOf('id="p-render"'),renderer.indexOf('id="toyWrap"'));
must(renderPanel.includes('data-act="renderAll"')&&renderPanel.includes('data-act="renderAllDotMesh"'),'both batch actions are inside the Render panel');
must(!renderer.includes("renderAllDotMesh.textContent='RENDER ALL DOT MESH'")&&!renderer.includes("renderAllDotMesh.style.display=active&&active.id==='dot-mesh'"),'duplicate Dot Mesh batch shortcut is absent from the Library dialog');
must(!movieFinalizer.includes('trilyvaMovieFinalizerBtn')&&!movieFinalizer.includes('trilyvaDotMeshFolderBtn')&&!movieFinalizer.includes('Dot Mesh → Folder')&&!/button\.textContent\s*=\s*['"]Finish Movie['"]/.test(movieFinalizer),'extra Dot Mesh Folder and Finish Movie header buttons are removed');
must(renderer.includes('data-act="resetDefaults"')&&renderer.includes('function resetRendererDefaults()'),'renderer exposes a working reset-to-default-controls action');
must(renderer.includes('trilyva-gate-animation')&&renderer.includes('Trilyva.')&&renderer.includes('trilyvaGateWhiteSweep'),'access gate includes the animated SVG wordmark');
must(renderer.includes('font-family="Unbounded, sans-serif"')&&renderer.includes('dur="2s" calcMode="linear" fill="freeze"')&&renderer.includes('#f00000'),'SVG uses Unbounded, the exact two-second metallic sweep and red-on-black accents');
must(renderer.includes('keySplines=".2 .75 .15 1"')&&renderer.includes('values="5;0" dur=".42s" fill="freeze"'),'SVG uses the matching soft fade, blur and easing reveal');
for(const stop of ['#626262','#e5e5e5','#858585','#f7f7f7','#555','#c9c9c9']) must(renderer.includes('stop-color="'+stop+'"'),'site-intro metallic gradient stop '+stop+' is preserved');
must(renderer.includes('speed: 1')&&renderer.includes('reverse: false')&&renderer.includes('seed: 12345'),'Dot Mesh batch overrides stale speed, reverse and seed settings');
must(renderer.includes('renderAllDotMesh: function () { openDotMeshFolderPicker(); }'),'Render panel Dot Mesh action opens the direct-folder exporter');
must(!movieFinalizer.includes('trilyva:download-dotmesh-zip')&&!movieFinalizer.includes('trilyvaDownloadDotMeshZip'),'obsolete ZIP shortcut is absent');
must(renderer.includes('data-act="cancelRender"'),'render panel retains Cancel');
must(!/data-act="queueAdd"|data-act="startRender"/i.test(renderer),'duplicate queue/current-render buttons are removed');
must(!renderer.includes('sample-chatgpt-motion-loop')&&!/ChatGPT Ad Edit|chatgpt-motion-loop|chatgpt-30s-seamless-loop/i.test(renderer),'ChatGPT promotional sample is removed from renderer');
must(tutorial.includes('/assets/brand/trilyva/T.svg'),'tutorial uses the TRILYVA T.svg brand icon');
for(const section of ['id="workspace"','id="first"','id="code"','id="motion"','id="composition"','id="preview"','id="export"','id="loops"','id="quality"','id="formats"','id="fixes"','id="workflow"']) must(tutorial.includes(section),'full tutorial includes '+section);
must(tutorial.includes('not a fixed 60-second animation or promo'),'tutorial explains it is not tied to a fixed video length');
must(overview.includes('/projects/trilyva/tutorial.html'),'TRILYVA overview links to the complete tutorial');
must(serviceWorker.includes('tamasrazim-trilyva-pwa-v120'),'renderer service worker cache version is bumped');
must(!/chatgpt-motion-loop|chatgpt-30s-seamless-loop|trilyva-60s-motion-edit/i.test(serviceWorker),'promotional animation assets are removed from offline cache');
must(!/chatgpt-motion-loop|chatgpt-30s-seamless-loop|trilyva-60s-motion-edit/i.test(overview),'TRILYVA overview no longer links to fixed-length promo animations');
must(!/story-films|cartoon/i.test(manifest),'cartoon collection is absent from the library manifest');
must(!/niko-and-the-clockwork-bird|the-last-star-train|lumi-and-the-lost-firefly|voice-studio|story-films/i.test(serviceWorker),'cartoon files are absent from offline cache');
must(!/Watch The Last Star Train|cartoon|Niko and the Clockwork Bird/i.test(overview),'TRILYVA overview has no cartoon promotion');
for(const file of [
  'projects/code-motion/renderer/examples/chatgpt-motion-loop.html',
  'projects/code-motion/renderer/examples/chatgpt-30s-seamless-loop.js',
  'projects/code-motion/renderer/examples/trilyva-60s-motion-edit.html',
  'projects/code-motion/renderer/examples/trilyva-60s-motion-edit.js',
  'projects/trilyva/niko-and-the-clockwork-bird.html',
  'projects/trilyva/the-last-star-train.html',
  'projects/code-motion/renderer/niko-and-the-clockwork-bird.js',
  'projects/code-motion/renderer/the-last-star-train.js',
  'projects/code-motion/renderer/library/story-films.js',
  'projects/code-motion/renderer/voice-studio.js'
]) must(!fs.existsSync(path.join(ROOT,file)),file+' removed');

const xyzSource = read('projects/code-motion/renderer/library/xyz-library.js');
const xyzModule = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(xyzSource));
const xyzItems = await xyzModule.default.load();
must(manifest.libraries.includes('./xyz-library.js'), 'XYZ is registered in the TRILYVA library manifest');
must(serviceWorker.includes('tamasrazim-trilyva-pwa-v120') && serviceWorker.includes('./library/xyz-library.js'), 'XYZ module is included in the bumped offline cache');
must(xyzItems.length === 50, 'XYZ library contains 50 distinct editable animations');
must(new Set(xyzItems.map(item => item.title)).size === 50, 'XYZ animation titles are all unique');
must(xyzItems.every(item => item.code.includes('function renderFrame') && item.code.length > 250), 'all XYZ animations contain editable renderFrame source');
must(new Set(xyzItems.map(item => item.code.slice(item.code.indexOf('ctx.save();') + 12))).size === 50, 'XYZ animation source bodies are not identical');

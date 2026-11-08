// What this does: Verifies TRILYVA's render controls, full tutorial, and removal of promotional animation samples.
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);console.log('PASS',message);};
const renderer=read('projects/trilyva/renderer/index.html');
const overview=read('projects/trilyva/index.html');
const docs=read('projects/trilyva/docs/index.html');
const tutorial=read('projects/trilyva/tutorial/index.html');
must(docs.includes('href="/projects/trilyva/tutorial/"'), 'documentation links to the tutorial directory route');
must(tutorial.includes('href="/projects/trilyva/docs/"'), 'tutorial links to the documentation directory route');
must(overview.includes('/projects/trilyva/docs/') && overview.includes('/projects/trilyva/tutorial/'), 'TRILYVA overview links to the directory-based docs and tutorial routes');
must(!fs.existsSync(path.join(ROOT,'projects/trilyva','docs'+'.html')) && !fs.existsSync(path.join(ROOT,'projects/trilyva','tutorial'+'.html')), 'legacy flat docs and tutorial files are removed');
const manifest=read('projects/trilyva/renderer/library/manifest.json');
const serviceWorker=read('projects/trilyva/renderer/sw.js');
const movieFinalizer=read('projects/trilyva/renderer/movie-finalizer.js');
must(renderer.includes('data-act="render"'),'header retains the current Render action');
must(renderer.includes('id="oBitrate" min="20" max="2000"') && renderer.includes('value="25"'),'video bitrate control enforces 20 Mbps minimum and 25 Mbps default');
must(renderer.includes('MAX_VIDEO_FILE_BYTES = 2000000000') && renderer.includes('MAX_VIDEO_FILE_BYTES: MAX_VIDEO_FILE_BYTES'),'video exporter exposes the strict decimal 2 GB file-size cap');
must(renderer.includes('function maxEncodedPayloadBytes') && renderer.includes('OutputSizeLimitError'),'MP4/WebM muxers guard encoded output size without quality reduction');
 must(renderer.includes('validation frame evaluated in a disposable runtime') && renderer.includes('frame 0 will render at full composition resolution'),'low-resolution validation cannot mutate the production frame-zero runtime');
must(renderer.includes('function estimateVideoFileBytes') && renderer.includes('acceptVideoSizeWarning'),'oversize video estimates warn and require confirmation before rendering');
must(renderer.includes('A 2 GB output is a file-size limit, not a bitrate'),'in-app docs distinguish file size from bitrate and explain memory behaviour');
must(movieFinalizer.includes('MIN_FINAL_VIDEO_BITRATE_BPS = 20000000') && movieFinalizer.includes('MAX_FINAL_VIDEO_FILE_BYTES = 2000000000'),'Movie Finalizer uses the 20 Mbps minimum and strict 2 GB cap');
must(movieFinalizer.includes('recordedBytes + e.data.size > MAX_FINAL_VIDEO_FILE_BYTES') && movieFinalizer.includes('High · 25 Mbps'),'Movie Finalizer enforces the size cap and defaults to 25 Mbps');
must(docs.includes('2,000,000,000-byte (2 GB) output-file cap'),'public docs disclose the 2 GB video output cap');
must(overview.includes('2,000,000,000-byte (2 GB) file-size cap'),'overview discloses the 2 GB video output cap');
must(renderer.includes('renderAllDotMesh: function () { openDotMeshFolderPicker(); }'),'renderer retains its Dot Mesh folder-export action');
const renderPanel=renderer.slice(renderer.indexOf('id="p-render"'),renderer.indexOf('id="toyWrap"'));
must(renderPanel.includes('data-act="renderFullLibrary"')&&renderPanel.includes('id="stillFrameIndex"')&&renderPanel.includes('id="stillExportFormats"'),'Render panel retains full-library and still-frame export controls');
must(!renderer.includes("renderAllDotMesh.textContent='RENDER ALL DOT MESH'")&&!renderer.includes("renderAllDotMesh.style.display=active&&active.id==='dot-mesh'"),'duplicate Dot Mesh batch shortcut is absent from the Library dialog');
must(!movieFinalizer.includes('trilyvaMovieFinalizerBtn')&&!movieFinalizer.includes('trilyvaDotMeshFolderBtn')&&!movieFinalizer.includes('Dot Mesh → Folder')&&!/button\.textContent\s*=\s*['"]Finish Movie['"]/.test(movieFinalizer),'extra Dot Mesh Folder and Finish Movie header buttons are removed');
must(renderer.includes('data-act="resetDefaults"')&&renderer.includes('function resetRendererDefaults()'),'renderer exposes a working reset-to-default-controls action');
must(renderer.includes('trilyva-gate-alert')&&renderer.includes('WARNING 001/099'),'access gate includes exaggerated warning strip');
must(renderer.includes('trilyva-gate-ticker')&&renderer.includes('trilyva-gate-systemline'),'access gate includes scrolling warning ticker and extra status line');
must(renderer.includes('@keyframes trilyva-gate-card-nag')&&renderer.includes('@keyframes trilyva-gate-title-nag'),'access gate includes restrained card shake and title glitch effects');
must(renderer.includes('@media(prefers-reduced-motion:reduce)')&&renderer.includes('#trilyvaPasswordGate .trilyva-gate-ticker-track'),'gate animation has reduced-motion handling');
must(renderer.includes('Four phases. Memorise 6, 8, 10, then 12 pulses.'),'puzzle explains its four escalating phases and sequence lengths');
must(renderer.includes('id="trilyvaGatePuzzle"')&&renderer.includes('id="trilyvaGateToggleMode"')&&renderer.includes('id="trilyvaGatePasswordPanel"'),'access gate offers both puzzle and password modes');
must(renderer.includes('data-pulse="0"')&&renderer.includes('data-pulse="1"')&&renderer.includes('data-pulse="2"')&&renderer.includes('data-pulse="3"'),'signal puzzle includes four interactive pulse tiles');
must(renderer.includes('async function playSequence(isReplay)')&&renderer.includes('function beginRound(round)')&&renderer.includes('roundLengths=[6,8,10,12]'),'puzzle has four escalating 6/8/10/12 pulse rounds');
must(renderer.includes('replayRemaining=1')&&renderer.includes('replayRemaining--')&&renderer.includes('REPLAY LOCKED'),'puzzle limits replay to one use per phase');
must(renderer.includes('makeSequence(roundLengths[currentRound-1])')&&renderer.includes('PHASE REJECTED'),'a wrong pulse regenerates the current phase sequence');
must(renderer.includes('#trilyvaPasswordGate{filter:grayscale(1)}'),'access gate is strictly monochrome');
must(renderer.includes('window.__TRILYVA_ACCESS_MODE=mode')&&renderer.includes("unlock('single')"),'successful puzzle unlock follows the existing single-render access mode');
must(renderer.includes('@keyframes trilyva-gate-console-sweep')&&renderer.includes('@keyframes trilyva-gate-reactor-spin')&&renderer.includes('@keyframes trilyva-gate-tile-hit'),'puzzle interface includes animated scanner, reactor and pulse feedback');
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
must(overview.includes('/projects/trilyva/tutorial/index.html'),'TRILYVA overview links to the complete tutorial');
must(overview.includes('id="renderer-reference"') && overview.includes('RENDERER REFERENCE / 001'),'TRILYVA overview includes a dedicated renderer-reference section');
must(overview.includes('8554d996-e226-4cf6-ad87-49624db8392e.png') && overview.includes('alt="TRILYVA Aurora Loop workspace:'),'renderer reference uses the uploaded Aurora Loop screenshot with descriptive alt text');
must(overview.includes('OPEN THE RENDERER') && overview.includes('loading="lazy"'),'renderer reference links to the live workspace and lazy-loads its screenshot');
must(serviceWorker.includes('tamasrazim-trilyva-pwa-v162'),'renderer service worker cache version is bumped');
must(!/chatgpt-motion-loop|chatgpt-30s-seamless-loop|trilyva-60s-motion-edit/i.test(serviceWorker),'promotional animation assets are removed from offline cache');
must(!/chatgpt-motion-loop|chatgpt-30s-seamless-loop|trilyva-60s-motion-edit/i.test(overview),'TRILYVA overview no longer links to fixed-length promo animations');
must(!/story-films|cartoon/i.test(manifest),'cartoon collection is absent from the library manifest');
must(!/niko-and-the-clockwork-bird|the-last-star-train|lumi-and-the-lost-firefly|voice-studio|story-films/i.test(serviceWorker),'cartoon files are absent from offline cache');
must(!/Watch The Last Star Train|cartoon|Niko and the Clockwork Bird/i.test(overview),'TRILYVA overview has no cartoon promotion');
for(const file of [
  'projects/trilyva/renderer/examples/chatgpt-motion-loop.html',
  'projects/trilyva/renderer/examples/chatgpt-30s-seamless-loop.js',
  'projects/trilyva/renderer/examples/trilyva-60s-motion-edit.html',
  'projects/trilyva/renderer/examples/trilyva-60s-motion-edit.js',
  'projects/trilyva/niko-and-the-clockwork-bird.html',
  'projects/trilyva/the-last-star-train.html',
  'projects/trilyva/renderer/niko-and-the-clockwork-bird.js',
  'projects/trilyva/renderer/the-last-star-train.js',
  'projects/trilyva/renderer/library/story-films.js',
  'projects/trilyva/renderer/voice-studio.js'
]) must(!fs.existsSync(path.join(ROOT,file)),file+' removed');

must(renderer.includes('id="sample-starfall-phonk-cut"') && renderer.includes('data-title="Starfall Fist — Phonk Character Edit"') && renderer.includes('data-dur="30"') && renderer.includes('data-fps="60"'), 'Examples includes the 30-second Starfall Fist phonk character edit');

const xyzSource = read('projects/trilyva/renderer/library/xyz-library.js');
const xyzModule = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(xyzSource));
const xyzItems = await xyzModule.default.load();
must(manifest.libraries.includes('./xyz-library.js'), 'XYZ is registered in the TRILYVA library manifest');
must(serviceWorker.includes('tamasrazim-trilyva-pwa-v162') && serviceWorker.includes('./library/xyz-library.js'), 'XYZ module is included in the bumped offline cache');
must(xyzItems.length === 50, 'XYZ library contains 50 distinct editable animations');
must(new Set(xyzItems.map(item => item.title)).size === 50, 'XYZ animation titles are all unique');
must(xyzItems.every(item => item.code.includes('function renderFrame') && item.code.length > 250), 'all XYZ animations contain editable renderFrame source');
must(new Set(xyzItems.map(item => item.code.slice(item.code.indexOf('ctx.save();') + 12))).size === 50, 'XYZ animation source bodies are not identical');


(function(){
"use strict";
var pathMatch=location.pathname.match(/projects\/([^\/]+)\/?$/), pathSlug=pathMatch?pathMatch[1]:""; var cfg=window.PRO_TOOL||((window.PRO_TOOL_MANIFEST||{})[pathSlug])||{}, root=document.getElementById("app");
var name=cfg.name||"Browser Tool", kind=cfg.kind||infer(name), category=cfg.category||"Tool";
document.title=name+" — Tamasrazim";

function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m]})}
function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
function bytes(n){var u=["B","KB","MB","GB","TB"],i=0,x=Number(n)||0;while(x>=1024&&i<u.length-1){x/=1024;i++}return x.toFixed(i?2:0)+" "+u[i]}
function copy(s){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(s).catch(function(){fallbackCopy(s)});fallbackCopy(s);return Promise.resolve()}
function fallbackCopy(s){var t=document.createElement("textarea");t.value=s;document.body.appendChild(t);t.select();document.execCommand("copy");t.remove()}
function download(n,s,t){var a=document.createElement("a"),u=URL.createObjectURL(new Blob([s],{type:t||"text/plain"}));a.href=u;a.download=n;a.click();setTimeout(function(){URL.revokeObjectURL(u)},1000)}
function infer(n){
var x=n.toLowerCase();
if(/browser|capability|api|webgl|webgpu|webcodecs|wasm|worker|storage|clipboard|picker|share|screen capture|pointer|touch|orientation|fullscreen|wake lock|notification|broadcast|benchmark|service worker|compressionstream/.test(x))return"capability";
if(/json|schema|pointer|jsonpath|object|array|merge|diff|type table|precision/.test(x))return"json";
if(/csv|tsv|delimiter|quote|column|row|table|pivot|group by|join|data quality/.test(x))return"csv";
if(/hash|fingerprint|hmac|crc|adler|checksum|similarity|perceptual/.test(x))return"hash";
if(/base64|url encoder|decode|unicode|entity|escape|jwt|hex/.test(x))return"encoding";
if(/color|contrast|palette|gradient|pixel|oklch|lch|alpha|blend|spacing|token/.test(x))return"color";
if(/image|dpi|print size|crop|alpha|histogram|luma|rgb vector|jpeg|png|webp|bit depth|resolution/.test(x))return"image";
if(/video|gop|keyframe|frame drop|frame pace|timebase|cfr|vfr|chroma|hdr|caption|shot|proxy|render queue|delivery|sequence/.test(x))return"video";
if(/audio|lufs|peak|rms|dynamic range|sample rate|channel|silence|waveform|spectral|clipping|dc offset|crest|pcm|tone|click track|gain staging/.test(x))return"audio";
if(/motion|keyframe|easing|velocity|acceleration|loop|quantizer|time remap|pose|transform|matrix|quaternion|tween|opacity|path progress|stagger|spring|fps|frame budget/.test(x))return"motion";
if(/file|mime|binary|folder|directory|rename|sort|path|archive|zip|transfer|bundle|extension|manifest/.test(x))return"files";
if(/http|header|cache-control|csp|permissions-policy|referrer|robots|sitemap|cors|canonical|open graph|twitter card|json-ld|web manifest|pwa|viewport|resource hint|structured data|security header/.test(x))return"web";
return"text";
}
var caps=[
["File System Access","showDirectoryPicker" in window||"showOpenFilePicker" in window],
["Clipboard API","clipboard" in navigator],
["WebCrypto","crypto" in window&&!!crypto.subtle],
["WebCodecs","VideoEncoder" in window||"VideoDecoder" in window],
["WebGL2",!!(function(){try{return document.createElement("canvas").getContext("webgl2")}catch(e){return null}})()],
["WebGPU","gpu" in navigator],
["OffscreenCanvas","OffscreenCanvas" in window],
["Web Workers","Worker" in window],
["IndexedDB","indexedDB" in window],
["Compression Streams","CompressionStream" in window&&"DecompressionStream" in window],
["WebAssembly","WebAssembly" in window],
["MediaRecorder","MediaRecorder" in window],
["Screen Capture",!!(navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia)],
["Web Share","share" in navigator]
];
function shell(){
var desc="Professional browser-first "+({
motion:"motion and frame-timing workbench",
image:"image inspection and planning workbench",
video:"video delivery and preflight workbench",
audio:"audio inspection and delivery workbench",
json:"structured-data development workbench",
csv:"tabular profiling and transformation workbench",
hash:"local hashing and fingerprinting workbench",
encoding:"text and binary encoding workbench",
color:"color, accessibility and design-system workbench",
files:"file and batch-operations workbench",
capability:"browser API diagnostics workbench",
web:"web-platform configuration workbench",
text:"local text and data workbench"
}[kind]||"browser workbench")+" for "+name.toLowerCase()+". Processing stays in this browser.";
root.innerHTML='<div class="shell"><div class="kicker">'+esc(category)+' / PROFESSIONAL BROWSER TOOL</div><div class="hero"><div><h1>'+esc(name)+'</h1><p>'+esc(desc)+'</p></div><aside class="hero-aside"><div class="statusline"><span>Runtime</span><b class="ok">LOCAL-FIRST</b></div><div class="statusline"><span>Transport</span><b>NONE</b></div><div class="statusline"><span>Fallbacks</span><b>ENABLED</b></div><div class="statusline"><span>Reduced motion</span><b>'+((window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)?"YES":"NO")+'</b></div></aside></div>'+
'<section class="panel"><div class="toolbar"><button class="btn primary" id="run">Process</button><button class="btn" id="copy">Copy result</button><button class="btn" id="save">Download result</button><button class="btn" id="reset">Reset</button><span class="chip">'+esc(kind)+'</span><span class="chip" id="state">Ready</span></div><div id="input"></div><div style="margin-top:14px"><div class="field"><label>Result</label><div id="out" class="output">Ready.</div><div id="metrics" class="metric-grid"></div></div></div></section></div><div class="shell foot"><span>Browser-first · local processing · graceful fallback</span><a href="../">Project index ↑</a></div>';
var input=document.getElementById("input");
if(kind==="capability")input.innerHTML='<div id="caps" class="output">Detecting…</div>';
else if(kind==="image"||kind==="video"||kind==="audio")input.innerHTML='<div class="toolbar"><label class="btn"><input id="file" type="file" accept="'+(kind==="image"?"image/*":kind==="video"?"video/*":"audio/*")+'" hidden>Choose '+kind+' </label><button class="btn" id="clear">Clear</button></div><div id="info" class="output">Choose a local file.</div>';
else if(kind==="files")input.innerHTML='<div class="toolbar"><label class="btn"><input id="files" type="file" multiple hidden>Choose files</label><button class="btn" id="clear">Clear</button></div><div id="info" class="output">Choose local files.</div>';
else if(kind==="motion")input.innerHTML='<div class="grid2"><div class="field"><label>Duration (ms)</label><input id="duration" type="number" value="1000" min="1"></div><div class="field"><label>FPS</label><input id="fps" type="number" value="60" min="1"></div><div class="field"><label>Samples</label><input id="samples" type="number" value="16" min="2" max="1000"></div><div class="field"><label>Amplitude</label><input id="amp" type="number" value="100"></div></div><canvas id="plot" height="240" style="width:100%;margin-top:12px;background:#070707;border:1px solid #292929"></canvas>';
else if(kind==="color")input.innerHTML='<div class="grid2"><div class="field"><label>Color A</label><input id="c1" value="#7c3aed"></div><div class="field"><label>Color B</label><input id="c2" value="#06b6d4"></div></div><div class="field" style="margin-top:12px"><label>Optional source text</label><textarea id="src" class="editor" placeholder="Paste colors, tokens, or text…"></textarea></div>';
else input.innerHTML='<textarea id="src" class="editor" placeholder="Paste input here…"></textarea>';
}
function setState(s,ok){var e=document.getElementById("state");e.textContent=s;e.className="chip "+(ok===false?"bad":"ok")}
function metrics(a){var e=document.getElementById("metrics");e.innerHTML=(a||[]).map(function(x){return'<div class="metric"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>'}).join("")}
function parseRows(s){var d=detect(s),rx=new RegExp(d==="tab"?"\\t":d==="semicolon"?";":d==="pipe"?"\\|":",","g");return s.split(/\\r?\\n/).filter(function(x){return x.trim()}).map(function(line){return line.split(rx).map(function(v){return v.trim().replace(/^"|"$/g,"")})})}
function detect(s){var a=[["comma",(s.match(/,/g)||[]).length],["tab",(s.match(/\\t/g)||[]).length],["semicolon",(s.match(/;/g)||[]).length],["pipe",(s.match(/\\|/g)||[]).length]];a.sort(function(x,y){return y[1]-x[1]});return a[0][1]?a[0][0]:"comma"}
function sha256(s){return crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)).then(function(b){return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,"0")}).join("")})}
function crc32(s){var c=~0;var bytes=new TextEncoder().encode(s);for(var i=0;i<bytes.length;i++){c^=bytes[i];for(var k=0;k<8;k++)c=(c>>>1)^((c&1)?0xEDB88320:0)}return (~c>>>0).toString(16).padStart(8,"0")}
function sortKeys(x){if(Array.isArray(x))return x.map(sortKeys);if(x&&typeof x==="object"){var o={};Object.keys(x).sort().forEach(function(k){o[k]=sortKeys(x[k])});return o}return x}
function flatten(x,p,o){o=o||{};if(x&&typeof x==="object"&&!Array.isArray(x)){Object.keys(x).forEach(function(k){flatten(x[k],p?(p+"."+k):k,o)})}else o[p]=x;return o}
function parseColor(v){v=String(v||"").trim().replace("#","");if(v.length===3)v=v.split("").map(function(c){return c+c}).join("");if(!/^[0-9a-f]{6}$/i.test(v))return[0,0,0];return[parseInt(v.slice(0,2),16),parseInt(v.slice(2,4),16),parseInt(v.slice(4,6),16)]}
function lum(c){return c.reduce(function(_,v,i){v=v/255;v=v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);return i===0?v*.2126+0:i===1?_*0+v*.7152:_+v*.0722},0)}
function contrast(a,b){var A=lum(a),B=lum(b);return(Math.max(A,B)+.05)/(Math.min(A,B)+.05)}
function motion(n,d,f,count,amp){var rows=[],spring=/spring/i.test(n);for(var i=0;i<count;i++){var t=i/(count-1),v=spring?1-Math.cos(t*Math.PI*2)*Math.exp(-5*t):t*t*(3-2*t),frame=Math.round(t*d/1000*f);rows.push(frame+"\\t"+(t*d).toFixed(1)+"ms\\t"+(v*amp).toFixed(3))}return rows.join("\\n")}
function draw(){var c=document.getElementById("plot");if(!c)return;var r=c.getBoundingClientRect(),dpr=devicePixelRatio||1;c.width=r.width*dpr;c.height=240*dpr;var g=c.getContext("2d");g.strokeStyle="#777";g.lineWidth=dpr;g.beginPath();for(var i=0;i<120;i++){var t=i/119,y=t*t*(3-2*t),x=t*c.width,py=c.height-(y*c.height*.8+c.height*.1);i?g.lineTo(x,py):g.moveTo(x,py)}g.stroke()}
function webResult(s){
if(/robots/i.test(name))return"User-agent: *\\nAllow: /";
if(/sitemap/i.test(name))return'<?xml version="1.0" encoding="UTF-8"?>\\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\\n  <url><loc>'+esc(s||"https://example.com/")+'</loc></url>\\n</urlset>';
if(/open graph/i.test(name))return'<meta property="og:title" content="Title">\\n<meta property="og:description" content="Description">\\n<meta property="og:url" content="'+esc(s||"https://example.com/")+'">';
if(/twitter card/i.test(name))return'<meta name="twitter:card" content="summary_large_image">\\n<meta name="twitter:title" content="Title">';
if(/json-ld|structured data/i.test(name))return JSON.stringify({"@context":"https://schema.org","@type":"WebSite","url":s||"https://example.com/","name":"Website"},null,2);
if(/csp/i.test(name))return"default-src 'self'; img-src 'self' data: https:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';";
if(/permissions-policy/i.test(name))return"camera=(), microphone=(), geolocation=(), payment=()";
if(/referrer/i.test(name))return"Referrer-Policy: strict-origin-when-cross-origin";
if(/cache-control/i.test(name))return"Cache-Control: public, max-age=31536000, immutable";
if(/canonical/i.test(name))try{return'<link rel="canonical" href="'+new URL(s||"https://example.com/").href+'">'}catch(e){return"Invalid URL."}
return s||"Paste source input.";
}
function process(){
var out=document.getElementById("out"),s=document.getElementById("src"),v=s?s.value:"";
setState("Processing…",true);
try{
if(kind==="capability"){out.textContent=caps.map(function(x){return(x[1]?"✓":"✕")+"  "+x[0]}).join("\\n");metrics(caps.slice(0,4).map(function(x){return[x[0],x[1]?"Supported":"Unavailable"]}));}
else if(kind==="json"){var x=JSON.parse(v||"null");if(/flatten/i.test(name))x=flatten(x);else if(/sorter/i.test(name))x=sortKeys(x);out.textContent=JSON.stringify(x,null,2);metrics([["Root",Array.isArray(x)?"array":typeof x],["Bytes",bytes(new TextEncoder().encode(v).length)]]);}
else if(kind==="csv"){var rows=parseRows(v),cols=rows.length?Math.max.apply(null,rows.map(function(r){return r.length})):0;out.textContent=JSON.stringify({rows:rows.length,columns:cols,headers:rows[0]||[],sample:rows.slice(0,5)},null,2);metrics([["Rows",rows.length],["Columns",cols],["Delimiter",detect(v)]])}
else if(kind==="hash"){var p=/crc32/i.test(name)?Promise.resolve(crc32(v)):sha256(v);p.then(function(h){out.textContent=h;metrics([["Bytes",bytes(new TextEncoder().encode(v).length)],["Algorithm",/crc32/i.test(name)?"CRC-32":"SHA-256"]]);setState("Complete",true)}) ;return}
else if(kind==="encoding"){if(/base64 decoder/i.test(name)){try{out.textContent=decodeURIComponent(escape(atob(v)))}catch(e){out.textContent="Invalid Base64: "+e.message}}else if(/base64/i.test(name))out.textContent=btoa(unescape(encodeURIComponent(v)));else if(/url encoder|percent/i.test(name))out.textContent=/decode/i.test(name)?decodeURIComponent(v):encodeURIComponent(v);else if(/unicode code point/i.test(name))out.textContent=Array.from(v).map(function(c){return c+" U+"+c.codePointAt(0).toString(16).toUpperCase()}).join("\\n");else if(/json escape/i.test(name))out.textContent=JSON.stringify(v);else if(/html entity/i.test(name))out.textContent=esc(v);else if(/jwt/i.test(name)){var p=v.split(".");try{out.textContent=JSON.stringify(JSON.parse(atob(p[1].replace(/-/g,"+").replace(/_/g,"/"))),null,2)}catch(e){out.textContent="JWT payload could not be decoded locally."}}else out.textContent=v;metrics([["Characters",v.length],["Bytes",new TextEncoder().encode(v).length]])}
else if(kind==="color"){var a=parseColor(document.getElementById("c1").value),b=parseColor(document.getElementById("c2").value),cr=contrast(a,b);if(/contrast/i.test(name))out.textContent="Contrast ratio: "+cr.toFixed(2)+":1\\nWCAG AA normal: "+(cr>=4.5?"PASS":"FAIL")+"\\nWCAG AAA normal: "+(cr>=7?"PASS":"FAIL");else if(/gradient/i.test(name))out.textContent="linear-gradient(90deg, "+document.getElementById("c1").value+", "+document.getElementById("c2").value+")";else out.textContent=JSON.stringify({colorA:a,colorB:b,contrast:cr},null,2);metrics([["Contrast",cr.toFixed(2)+":1"]])}
else if(kind==="motion"){out.textContent=motion(name,+document.getElementById("duration").value||1000,+document.getElementById("fps").value||60,+document.getElementById("samples").value||16,+document.getElementById("amp").value||100);draw();metrics([["FPS",document.getElementById("fps").value],["Duration",document.getElementById("duration").value+" ms"]])}
else if(kind==="web"){out.textContent=webResult(v);metrics([["Characters",v.length]])}
else if(kind==="image"||kind==="video"||kind==="audio"||kind==="files"){inspect().then(function(r){out.textContent=r.text;metrics(r.metrics);setState("Complete",true)});return}
else{var a2=v.trim().split(/\\s+/);if(/keyword/i.test(name))out.textContent=Array.from(new Set(v.split(/[,;\\n]+/).map(function(x){return x.trim().toLowerCase()}).filter(Boolean))).slice(0,50).join(", ");else if(/sort|normalizer/i.test(name))out.textContent=v.split(/\\r?\\n/).sort(function(a,b){return a.localeCompare(b)}).join("\\n");else if(/count|meter|analyzer|profiler/i.test(name))out.textContent="Characters: "+v.length+"\\nWords: "+a2.filter(Boolean).length+"\\nLines: "+(v?v.split(/\\r?\\n/).length:0)+"\\nBytes: "+new TextEncoder().encode(v).length;else out.textContent=v;metrics([["Characters",v.length],["Words",a2.filter(Boolean).length]])}
setState("Complete",true);
}catch(e){out.textContent="Error: "+e.message;metrics([]);setState("Error",false)}
}
function inspect(){var el=document.getElementById(kind==="files"?"files":"file"),fs=el&&el.files?Array.from(el.files):[];if(!fs.length)return Promise.resolve({text:"No file selected.",metrics:[]});if(kind==="files"){var total=fs.reduce(function(a,f){return a+f.size},0);return Promise.resolve({text:fs.map(function(f){return f.name+"\\t"+bytes(f.size)+"\\t"+(f.type||"unknown")}).join("\\n"),metrics:[["Files",fs.length],["Total",bytes(total)]]})}var f=fs[0],u=URL.createObjectURL(f);return new Promise(function(resolve){var node=kind==="image"?new Image():document.createElement(kind);node.preload="metadata";node.onload=node.onloadedmetadata=function(){var m=kind==="image"?[["Width",node.naturalWidth],["Height",node.naturalHeight],["Size",bytes(f.size)]]:kind==="video"?[["Width",node.videoWidth],["Height",node.videoHeight],["Duration",node.duration.toFixed(2)+" s"],["Size",bytes(f.size)]]:[["Duration",node.duration.toFixed(2)+" s"],["Size",bytes(f.size)]];resolve({text:f.name+"\\n"+(f.type||"unknown")+"\\n"+bytes(f.size),metrics:m});URL.revokeObjectURL(u)};node.onerror=function(){resolve({text:"Browser could not decode this file.",metrics:[]});URL.revokeObjectURL(u)};node.src=u})}
shell();
document.getElementById("run").onclick=process;
document.getElementById("copy").onclick=function(){copy(document.getElementById("out").textContent).then(function(){setState("Copied",true)})};
document.getElementById("save").onclick=function(){download(slug(name)+".txt",document.getElementById("out").textContent);setState("Downloaded",true)};
document.getElementById("reset").onclick=function(){var s=document.getElementById("src");if(s)s.value="";document.getElementById("out").textContent="Ready.";metrics([]);setState("Ready",true)};
var f=document.getElementById("file");if(f)f.onchange=function(){inspect().then(function(r){document.getElementById("info").textContent=r.text;metrics(r.metrics);setState("Loaded",true)})};
var fs=document.getElementById("files");if(fs)fs.onchange=function(){inspect().then(function(r){document.getElementById("info").textContent=r.text;metrics(r.metrics);setState("Loaded",true)})};
var clr=document.getElementById("clear");if(clr)clr.onclick=function(){var e=document.getElementById("file")||document.getElementById("files");if(e)e.value="";document.getElementById("info").textContent="Cleared."};
if(kind==="capability")process();
})();

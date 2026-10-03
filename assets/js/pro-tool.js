
(function(){
"use strict";
var pathMatch=location.pathname.match(/projects\/([^\/]+)\/?$/), pathSlug=pathMatch?pathMatch[1]:"";
var cfg=window.PRO_TOOL||((window.PRO_TOOL_MANIFEST||{})[pathSlug])||{};
var root=document.getElementById("app"), name=cfg.name||"Browser Tool", kind=cfg.kind||infer(name), category=cfg.category||"Tool";
document.title=name+" — Tamasrazim";

function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m]})}
function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
function bytes(n){var u=["B","KB","MB","GB","TB"],i=0,x=Number(n)||0;while(x>=1024&&i<u.length-1){x/=1024;i++}return x.toFixed(i?2:0)+" "+u[i]}
function copy(s){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(s).catch(function(){fallbackCopy(s)});fallbackCopy(s);return Promise.resolve()}
function fallbackCopy(s){var t=document.createElement("textarea");t.value=s;document.body.appendChild(t);t.select();document.execCommand("copy");t.remove()}
function download(n,s,t){var a=document.createElement("a"),u=URL.createObjectURL(new Blob([s],{type:t||"text/plain"}));a.href=u;a.download=n;a.click();setTimeout(function(){URL.revokeObjectURL(u)},1000)}
function infer(n){
var x=n.toLowerCase();
if(/browser|capability|api|observer|webgl|webgpu|webcodecs|wasm|worker|storage|clipboard|picker|share|screen capture|pointer|touch|orientation|fullscreen|wake lock|notification|broadcast|benchmark|service worker|compressionstream|battery|geolocation|gamepad|memory/.test(x))return"capability";
if(/json|schema|pointer|jsonpath|object|array|merge|diff|type table|precision|patch/.test(x))return"json";
if(/csv|tsv|delimiter|quote|column|row|table|pivot|group by|join|data quality|percentile|median|variance|correlation|histogram|missing|distinct|frequency|date range/.test(x))return"csv";
if(/hash|fingerprint|hmac|crc|adler|checksum|similarity|perceptual|sri|integrity|nonce/.test(x))return"hash";
if(/base64|url encoder|decode|unicode|entity|escape|jwt|hex/.test(x))return"encoding";
if(/color|contrast|palette|gradient|pixel|oklch|lch|alpha|blend|spacing|token|rgb|hsl|hsv|cmyk|temperature|luminance|apca|wcag/.test(x))return"color";
if(/image|dpi|print size|crop|alpha|histogram|luma|rgb vector|jpeg|png|webp|bit depth|resolution|matte|edge|dominant|entropy|gamma|exposure|saturation|kernel/.test(x))return"image";
if(/video|gop|keyframe|frame drop|frame pace|timebase|cfr|vfr|chroma|hdr|caption|shot|proxy|render queue|delivery|sequence|bitrate|stream|buffer|hls|dash|latency|mux|storage per hour|archive capacity/.test(x))return"video";
if(/audio|lufs|peak|rms|dynamic range|sample rate|channel|silence|waveform|spectral|clipping|dc offset|crest|pcm|tone|click track|gain staging|snr|headroom|bpm|tempo|pan|crossfade/.test(x))return"audio";
if(/motion|keyframe|easing|velocity|acceleration|jerk|loop|quantizer|time remap|pose|transform|matrix|quaternion|tween|opacity|path progress|stagger|spring|fps|frame budget|timecode|timeline|bezier/.test(x))return"motion";
if(/file|mime|binary|folder|directory|rename|sort|path|archive|zip|transfer|bundle|extension|manifest|batch|sequence|prefix|suffix|artifact/.test(x))return"files";
if(/http|header|cache-control|csp|permissions-policy|referrer|robots|sitemap|cors|canonical|open graph|twitter card|json-ld|web manifest|pwa|viewport|resource hint|structured data|security header|cookie|origin|etag|disposition/.test(x))return"web";
return"text";
}
var caps=[
["File System Access","showDirectoryPicker" in window||"showOpenFilePicker" in window],
["Clipboard API","clipboard" in navigator],
["WebCrypto","crypto" in window&&!!crypto.subtle],
["WebCodecs","VideoEncoder" in window&&"VideoDecoder" in window],
["WebGL2",!!(function(){try{return document.createElement("canvas").getContext("webgl2")}catch(e){return null}})()],
["WebGPU","gpu" in navigator],
["OffscreenCanvas","OffscreenCanvas" in window],
["Web Workers","Worker" in window],
["IndexedDB","indexedDB" in window],
["Compression Streams","CompressionStream" in window&&"DecompressionStream" in window],
["WebAssembly","WebAssembly" in window],
["MediaRecorder","MediaRecorder" in window],
["Screen Capture",!!(navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia)],
["Web Share","share" in navigator],
["WebSocket","WebSocket" in window],
["AudioWorklet","AudioWorkletNode" in window],
["IntersectionObserver","IntersectionObserver" in window],
["ResizeObserver","ResizeObserver" in window],
["PerformanceObserver","PerformanceObserver" in window],
["BroadcastChannel","BroadcastChannel" in window],
["Network Information","connection" in navigator]
];
function shell(){
var desc="Professional browser-first "+({
motion:"motion and frame-timing workbench",
image:"image inspection and processing workbench",
video:"video delivery and preflight workbench",
audio:"audio analysis and delivery workbench",
json:"structured-data development workbench",
csv:"tabular profiling and transformation workbench",
hash:"local hashing and integrity workbench",
encoding:"text and binary encoding workbench",
color:"color, accessibility and design-system workbench",
files:"file and batch-operations workbench",
capability:"browser API and runtime diagnostics workbench",
web:"web-platform configuration and metadata workbench",
text:"local text and developer workbench"
}[kind]||"browser workbench")+" for "+name.toLowerCase()+". Processing stays in this browser.";
root.innerHTML='<div class="shell"><div class="kicker">'+esc(category)+' / PROFESSIONAL BROWSER TOOL</div><div class="hero"><div><h1>'+esc(name)+'</h1><p>'+esc(desc)+'</p></div><aside class="hero-aside"><div class="statusline"><span>Runtime</span><b class="ok">LOCAL-FIRST</b></div><div class="statusline"><span>Transport</span><b>NONE</b></div><div class="statusline"><span>Capability fallback</span><b>ENABLED</b></div><div class="statusline"><span>Reduced motion</span><b>'+((window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)?"YES":"NO")+'</b></div></aside></div>'+
'<section class="panel"><div class="toolbar"><button class="btn primary" id="run">Process</button><button class="btn" id="copy">Copy result</button><button class="btn" id="save">Download result</button><button class="btn" id="reset">Reset</button><span class="chip">'+esc(kind)+'</span><span class="chip" id="state">Ready</span></div><div id="input"></div><div style="margin-top:14px"><div class="field"><label>Result</label><div id="out" class="output">Ready.</div><div id="metrics" class="metric-grid"></div></div></div></section></div><div class="shell foot"><span>Browser-first · local processing · graceful fallback</span><a href="../">Project index ↑</a></div>';
var input=document.getElementById("input");
if(kind==="capability")input.innerHTML='<div id="caps" class="output">Detecting browser capabilities…</div>';
else if(kind==="image")input.innerHTML='<div class="toolbar"><label class="btn"><input id="file" type="file" accept="image/*" hidden>Choose image</label><button class="btn" id="clear">Clear</button></div><div id="info" class="output">Choose a local image.</div>';
else if(kind==="video"||kind==="audio"||kind==="motion")input.innerHTML='<div class="grid2"><div class="field"><label>Primary value</label><input id="n1" type="number" value="1000"></div><div class="field"><label>Secondary value</label><input id="n2" type="number" value="'+(kind==="audio"?"48000":"60")+'"></div><div class="field"><label>Samples</label><input id="n3" type="number" value="16"></div><div class="field"><label>Multiplier / rate</label><input id="n4" type="number" value="1"></div></div><div class="toolbar" style="margin-top:12px"><label class="btn"><input id="file" type="file" accept="'+(kind==="video"?"video/*":"audio/*")+'" hidden>Choose '+kind+' file</label><button class="btn" id="clear">Clear</button></div><div id="info" class="output">Optional: choose a local file, or use the calculator inputs above.</div><div class="field" style="margin-top:12px"><label>Optional source / values</label><textarea id="src" class="editor" placeholder="Paste values, timecodes, CSV, or notes here…"></textarea></div>';
else if(kind==="files")input.innerHTML='<div class="toolbar"><label class="btn"><input id="files" type="file" multiple hidden>Choose files</label><button class="btn" id="clear">Clear</button></div><div id="info" class="output">Choose local files.</div>';
else if(false)input.innerHTML='<div class="grid2"><div class="field"><label>Primary value</label><input id="n1" type="number" value="1000"></div><div class="field"><label>Secondary value</label><input id="n2" type="number" value="60"></div><div class="field"><label>Samples</label><input id="n3" type="number" value="16"></div><div class="field"><label>Multiplier / rate</label><input id="n4" type="number" value="1"></div></div><div class="field" style="margin-top:12px"><label>Optional source / values</label><textarea id="src" class="editor" placeholder="Paste values, timecodes, JSON, CSV, or notes here…"></textarea></div>';
else if(kind==="color")input.innerHTML='<div class="grid2"><div class="field"><label>Color A</label><input id="c1" value="#7c3aed"></div><div class="field"><label>Color B</label><input id="c2" value="#06b6d4"></div></div><div class="field" style="margin-top:12px"><label>Optional source</label><textarea id="src" class="editor" placeholder="Paste colors, tokens, or source data…"></textarea></div>';
else input.innerHTML='<textarea id="src" class="editor" placeholder="Paste input here…"></textarea>';
}
function setState(s,ok){var e=document.getElementById("state");e.textContent=s;e.className="chip "+(ok===false?"bad":"ok")}
function metrics(a){var e=document.getElementById("metrics");e.innerHTML=(a||[]).map(function(x){return'<div class="metric"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>'}).join("")}
function num(id,f){var x=parseFloat((document.getElementById(id)||{}).value);return isFinite(x)?x:f}
function source(){var e=document.getElementById("src");return e?e.value:""}
function parseValues(s){return s.trim().split(/[\s,;|]+/).filter(Boolean).map(Number).filter(isFinite)}
function detect(s){var a=[["comma",(s.match(/,/g)||[]).length],["tab",(s.match(/\t/g)||[]).length],["semicolon",(s.match(/;/g)||[]).length],["pipe",(s.match(/\|/g)||[]).length]];a.sort(function(x,y){return y[1]-x[1]});return a[0][1]?a[0][0]:"comma"}
function parseCSV(s){
var rows=[],row=[],cell="",q=false;
for(var i=0;i<s.length;i++){var ch=s[i],nx=s[i+1];
if(ch==='"'){if(q&&nx==='"'){cell+='"';i++}else q=!q}
else if(ch===','&&!q){row.push(cell);cell=""}
else if((ch==="\n"||ch==="\r")&&!q){if(ch==="\r"&&nx==="\n")i++;row.push(cell);if(row.some(function(x){return x!==""}))rows.push(row);row=[];cell=""}
else cell+=ch}
if(cell!==""||row.length){row.push(cell);rows.push(row)}
return rows;
}
function jsonParse(s){return JSON.parse(s||"null")}
function deepSort(x){if(Array.isArray(x))return x.map(deepSort);if(x&&typeof x==="object"){var o={};Object.keys(x).sort().forEach(function(k){o[k]=deepSort(x[k])});return o}return x}
function flatten(x,p,o){o=o||{};if(x&&typeof x==="object"&&!Array.isArray(x)){Object.keys(x).forEach(function(k){flatten(x[k],p?(p+"."+k):k,o)})}else o[p]=x;return o}
function jsonDiff(a,b,p,out){p=p||"$";out=out||[];if(Object.is(a,b))return out;if(typeof a!==typeof b){out.push({path:p,type:"type",left:a,right:b});return out}if(a&&b&&typeof a==="object"){var keys=new Set(Object.keys(a).concat(Object.keys(b)));keys.forEach(function(k){jsonDiff(a[k],b[k],p+"."+k,out)});return out}out.push({path:p,type:"change",left:a,right:b});return out}
function csvStats(rows){
var width=Math.max(0,...rows.map(function(r){return r.length})),head=rows[0]||[],body=rows.slice(1),stats=[];
for(var c=0;c<width;c++){var vals=body.map(function(r){return r[c]==null?"":r[c].trim()}),present=vals.filter(Boolean),nums=present.map(Number).filter(isFinite),uniq=new Set(present);stats.push({column:head[c]||("Column "+(c+1)),rows:body.length,present:present.length,missing:vals.length-present.length,unique:uniq.size,numeric:numbersEnough(nums,present)?nums.length:0})}
return stats;
}
function numbersEnough(nums,raw){return raw.length&&nums.length/raw.length>.9}
function percentile(a,p){if(!a.length)return NaN;var x=(a.length-1)*p,i=Math.floor(x),f=x-i;return a[i]+(a[i+1]-a[i])*f}
function cryptoHash(s,algorithm){return crypto.subtle.digest(algorithm,new TextEncoder().encode(s)).then(function(b){return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,"0")}).join("")})}
function crc32(s){var c=~0,b=new TextEncoder().encode(s);for(var i=0;i<b.length;i++){c^=b[i];for(var k=0;k<8;k++)c=(c>>>1)^((c&1)?0xEDB88320:0)}return (~c>>>0).toString(16).padStart(8,"0")}
function parseColor(v){v=String(v||"").trim().replace("#","");if(v.length===3)v=v.split("").map(function(c){return c+c}).join("");if(!/^[0-9a-f]{6}$/i.test(v))throw new Error("Invalid HEX color");return[parseInt(v.slice(0,2),16),parseInt(v.slice(2,4),16),parseInt(v.slice(4,6),16)]}
function lum(c){var q=c.map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*q[0]+.7152*q[1]+.0722*q[2]}
function contrast(a,b){var x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
function hex(c){return"#"+c.map(function(v){return Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")}).join("").toUpperCase()}
function rgbToHsl(c){var r=c[0]/255,g=c[1]/255,b=c[2]/255,m=Math.max(r,g,b),n=Math.min(r,g,b),h=0,s=0,l=(m+n)/2;if(m!==n){var d=m-n;s=l>.5?d/(2-m-n):d/(m+n);switch(m){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4}h*=60}return[h,s*100,l*100]}
function hslToRgb(h,s,l){h=((h%360)+360)%360/360;s/=100;l/=100;if(!s)return[Math.round(l*255),Math.round(l*255),Math.round(l*255)];var q=l<.5?l*(1+s):l+s-l*s,p=2*l-q,fn=function(t){if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p};return[Math.round(fn(h+1/3)*255),Math.round(fn(h)*255),Math.round(fn(h-1/3)*255)]}
function motionCalc(n){
var a=num("n1",1000),b=num("n2",60),s=num("n3",16),m=num("n4",1),v=parseValues(source()),x=[];
if(/seconds to frames/i.test(name))x.push("Frames: "+Math.round(a*b));
else if(/frames to seconds/i.test(name))x.push("Seconds: "+(a/b));
else if(/frame duration/i.test(name))x.push("Frame duration: "+(1000/b).toFixed(6)+" ms");
else if(/drop-frame timecode/i.test(name))x.push("30fps-style total frames: "+Math.round(a*b));
else if(/timecode to frames/i.test(name)){var p=(source()||"00:00:00:00").split(/[:;]/).map(Number);x.push("Frames: "+(((p[0]*3600)+(p[1]*60)+p[2])*b+p[3]))}
else if(/frames to timecode/i.test(name)){var fr=Math.round(a),fps=b,hh=Math.floor(fr/(fps*3600));fr-=hh*fps*3600;var mm=Math.floor(fr/(fps*60));fr-=mm*fps*60;var ss=Math.floor(fr/fps);fr-=ss*fps;x.push([hh,mm,ss,fr].map(function(z){return String(z).padStart(2,"0")}).join(":"))}
else if(/loop seam/i.test(name)){x.push("Boundary delta: "+((v.length>1)?(v[v.length-1]-v[0]):0));}
else if(/velocity/i.test(name)){for(var i=1;i<v.length;i++)x.push(i+"\\t"+((v[i]-v[i-1])*b).toFixed(6))}
else if(/acceleration/i.test(name)){for(var i=2;i<v.length;i++)x.push(i+"\\t"+(((v[i]-v[i-1])-(v[i-1]-v[i-2]))*b*b).toFixed(6))}
else if(/jerk/i.test(name)){for(var i=3;i<v.length;i++)x.push(i+"\\t"+(((v[i]-v[i-1])-((v[i-1]-v[i-2])-(v[i-2]-v[i-3])))*b*b*b).toFixed(6))}
else if(/keyframe density/i.test(name))x.push("Frames: "+Math.round(a*b)+"\\nKeyframes/sample: "+Math.max(1,s));
else{x.push("Frames: "+Math.round(a*b));x.push("Frame duration: "+(1000/b).toFixed(4)+" ms");x.push("Samples: "+s);x.push("Multiplier: "+m)}
return x.join("\\n");
}
function videoCalc(){var a=num("n1",1000),b=num("n2",60),m=num("n4",1);if(/bitrate to file size/i.test(name))return "Approx size: "+bytes((a*1000/8)*(b*60)*m)+" for 1 minute\\nBitrate: "+a+" kbps";if(/file size to bitrate/i.test(name))return "Approx bitrate: "+(((a*8)/(b*60*m))/1000).toFixed(3)+" Mbps";if(/duration to frames/i.test(name))return "Frames: "+Math.round(a*b/1000);if(/frames to duration/i.test(name))return "Duration: "+(a/b).toFixed(3)+" seconds";if(/pixel rate/i.test(name))return "Pixels/sec: "+Math.round(a*b);return "Value A: "+a+"\\nValue B: "+b+"\\nMultiplier: "+m}
function audioCalc(){var a=num("n1",1000),b=num("n2",48000),m=num("n4",2);if(/bpm to milliseconds/i.test(name))return "Beat: "+(60000/a).toFixed(3)+" ms";if(/milliseconds to samples/i.test(name))return "Samples: "+Math.round(a*b/1000);if(/pcm size/i.test(name)||/audio file size/i.test(name))return "Bytes/sec: "+Math.round(b*m)+" for rate/channel inputs";if(/sample count/i.test(name))return "Samples: "+Math.round(a*b/1000);if(/headroom/i.test(name))return "Headroom from "+a+" dBFS: "+Math.max(0,-a).toFixed(2)+" dB";return "Primary: "+a+"\\nSecondary: "+b+"\\nMultiplier: "+m}
function colorCalc(){
var a=parseColor(document.getElementById("c1").value),b=parseColor(document.getElementById("c2").value),cr=contrast(a,b),ha=rgbToHsl(a),hb=rgbToHsl(b),src=source();
if(/contrast|wcag|apca/i.test(name))return "A: "+hex(a)+"\\nB: "+hex(b)+"\\nContrast ratio: "+cr.toFixed(3)+":1\\nAA normal: "+(cr>=4.5?"PASS":"FAIL")+"\\nAAA normal: "+(cr>=7?"PASS":"FAIL");
if(/rgb to hsl/i.test(name))return "HSL: "+ha.map(function(v){return v.toFixed(3)}).join(", ");
if(/hsl to rgb/i.test(name)){var p=src.split(/[, ]+/).map(Number);return "RGB: "+hex(hslToRgb(p[0]||0,p[1]||0,p[2]||0))}
if(/hex to rgb/i.test(name))return "RGB: "+a.join(", ");
if(/rgb to hex/i.test(name))return "HEX: "+hex(a);
if(/gradient/i.test(name))return "linear-gradient(90deg, "+hex(a)+" 0%, "+hex(b)+" 100%)";
if(/alpha over/i.test(name))return "Composite preview: "+hex([a[0]*.5+b[0]*.5,a[1]*.5+b[1]*.5,a[2]*.5+b[2]*.5]);
return "A RGB: "+a.join(", ")+"\\nA HSL: "+ha.map(function(v){return v.toFixed(2)}).join(", ")+"\\nB RGB: "+b.join(", ")+"\\nB HSL: "+hb.map(function(v){return v.toFixed(2)}).join(", ");
}
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
if(/sri|integrity/i.test(name))return"<script integrity=\"sha384-[hash]\" crossorigin=\"anonymous\">";
if(/cors/i.test(name))return"Access-Control-Allow-Origin: https://example.com\\nAccess-Control-Allow-Methods: GET,HEAD,OPTIONS";
if(/cookie/i.test(name))return"Set-Cookie: session=VALUE; Path=/; Secure; HttpOnly; SameSite=Lax";
if(/canonical/i.test(name))try{return'<link rel="canonical" href="'+new URL(s||"https://example.com/").href+'">'}catch(e){return"Invalid URL."}
if(/url query builder/i.test(name)){try{return new URL(s||"https://example.com/").toString()}catch(e){return"Enter a valid base URL."}}
if(/url query parser/i.test(name)){try{var u=new URL(s);return Array.from(u.searchParams.entries()).map(function(p){return p[0]+" = "+p[1]}).join("\\n")}catch(e){return"Enter a valid URL."}}
return s||"Paste source input.";
}
function process(){
var out=document.getElementById("out"),v=source();
setState("Processing…",true);
try{
if(kind==="capability"){var target=name.toLowerCase(),rows=caps.filter(function(x){return target==="browser capability"||target==="browser support matrix"||target==="feature detect lab"||target.indexOf(x[0].toLowerCase().replace(/ /g,""))>=0||target.indexOf("capability")>=0});if(!rows.length)rows=caps;out.textContent=rows.map(function(x){return(x[1]?"✓":"✕")+"  "+x[0]}).join("\\n");metrics([["APIs checked",rows.length],["Supported",rows.filter(function(x){return x[1]}).length],["Browser",navigator.userAgent.replace(/\\s+/g," ").slice(0,55)],["Online",navigator.onLine?"yes":"no"])}
else if(kind==="json"){var x=jsonParse(v);if(/diff viewer|deep diff/i.test(name)){var parts=v.split(/\\n---+\\n/),a=jsonParse(parts[0]),b=jsonParse(parts[1]||"null");out.textContent=JSON.stringify(jsonDiff(a,b),null,2)}else if(/flatten|array flattener/i.test(name))out.textContent=JSON.stringify(flatten(x),null,2);else if(/sorter/i.test(name))out.textContent=JSON.stringify(deepSort(x),null,2);else if(/min/i.test(name))out.textContent=JSON.stringify(x);else if(/type table/i.test(name)){var keys=Object.keys(x||{});out.textContent=keys.map(function(k){return k+"\\t"+(x[k]===null?"null":Array.isArray(x[k])?"array":typeof x[k])}).join("\\n")}else if(/null|undefined audit/i.test(name)){var s0=JSON.stringify(x);out.textContent="Null values: "+((s0.match(/null/g)||[]).length)}else if(/precision/i.test(name)){out.textContent=JSON.stringify(x,null,2)}else out.textContent=JSON.stringify(x,null,2);metrics([["Root",Array.isArray(x)?"array":typeof x],["Bytes",bytes(new TextEncoder().encode(v).length)]])}
else if(kind==="csv"){var rows=parseCSV(v),cols=rows.length?Math.max.apply(null,rows.map(function(r){return r.length})):0,st=csvStats(rows);if(/distinct count/i.test(name)||/cardinality/i.test(name))out.textContent=st.map(function(s){return s.column+"\\t"+s.unique}).join("\\n");else if(/missing/i.test(name)||/data quality/i.test(name))out.textContent=st.map(function(s){return s.column+"\\tMissing: "+s.missing+"\\tPresent: "+s.present}).join("\\n");else if(/numeric range/i.test(name)||/percentile|median|variance|standard deviation|numeric stats/i.test(name)){out.textContent=st.map(function(s,i){var a=rows.slice(1).map(function(r){return Number(r[i])}).filter(isFinite);if(!a.length)return s.column+"\\tNon-numeric";a.sort(function(x,y){return x-y});var mean=a.reduce(function(x,y){return x+y},0)/a.length;var variance=a.reduce(function(x,y){return x+(y-mean)*(y-mean)},0)/a.length;return s.column+"\\tmin="+a[0]+"\\tmedian="+percentile(a,.5)+"\\tmax="+a[a.length-1]+"\\tmean="+mean.toFixed(4)+"\\tstd="+Math.sqrt(variance).toFixed(4)}).join("\\n")}else out.textContent=JSON.stringify({rows:rows.length,columns:cols,headers:rows[0]||[],profile:st,sample:rows.slice(0,6)},null,2);metrics([["Rows",rows.length],["Columns",cols],["Delimiter",detect(v)]])}
else if(kind==="hash"){var p=/crc32/i.test(name)?Promise.resolve(crc32(v)) : cryptoHash(v,/sha-384|sri/i.test(name)?"SHA-384":"SHA-256");p.then(function(h){out.textContent=h;metrics([["Bytes",bytes(new TextEncoder().encode(v).length)],["Algorithm",/crc32/i.test(name)?"CRC-32":/sha-384|sri/i.test(name)?"SHA-384":"SHA-256"]]);setState("Complete",true)});return}
else if(kind==="encoding"){if(/base64 decoder/i.test(name)){try{out.textContent=decodeURIComponent(escape(atob(v)))}catch(e){out.textContent="Invalid Base64: "+e.message}}else if(/base64/i.test(name))out.textContent=btoa(unescape(encodeURIComponent(v)));else if(/url encoder|percent/i.test(name))out.textContent=/decode/i.test(name)?decodeURIComponent(v):encodeURIComponent(v);else if(/unicode code point/i.test(name))out.textContent=Array.from(v).map(function(c){return c+" U+"+c.codePointAt(0).toString(16).toUpperCase()}).join("\\n");else if(/unicode normalizer/i.test(name))out.textContent=v.normalize("NFC");else if(/json escape/i.test(name))out.textContent=JSON.stringify(v);else if(/html entity/i.test(name))out.textContent=esc(v);else if(/jwt/i.test(name)){var p=v.split(".");try{out.textContent=JSON.stringify(JSON.parse(atob((p[1]||"").replace(/-/g,"+").replace(/_/g,"/"))),null,2)}catch(e){out.textContent="JWT payload could not be decoded locally."}}else if(/hex/i.test(name))out.textContent=Array.from(new TextEncoder().encode(v)).map(function(x){return x.toString(16).padStart(2,"0")}).join(" ");else out.textContent=v;metrics([["Characters",v.length],["Bytes",new TextEncoder().encode(v).length]])}
else if(kind==="color"){var a=parseColor(document.getElementById("c1").value),b=parseColor(document.getElementById("c2").value),cr=contrast(a,b);out.textContent=colorCalc();metrics([["Contrast",cr.toFixed(3)+":1"],["A",hex(a)],["B",hex(b)]])}
else if(kind==="motion"){out.textContent=motionCalc(name);metrics([["Primary",num("n1",0)],["Secondary",num("n2",0)],["Samples",num("n3",0)]])}
else if(kind==="video"){if(document.getElementById("file")&&document.getElementById("file").files.length){inspect().then(function(r){out.textContent=r.text;metrics(r.metrics);setState("Complete",true)});return}out.textContent=videoCalc();metrics([["Primary",num("n1",0)],["Secondary",num("n2",0)],["Multiplier",num("n4",1)])}
else if(kind==="audio"){if(document.getElementById("file")&&document.getElementById("file").files.length){inspect().then(function(r){out.textContent=r.text;metrics(r.metrics);setState("Complete",true)});return}out.textContent=audioCalc();metrics([["Primary",num("n1",0)],["Secondary",num("n2",0)],["Multiplier",num("n4",1)])}
else if(kind==="web"){out.textContent=webResult(v);metrics([["Characters",v.length],["Origin",location.origin]])}
else if(kind==="image"){if(document.getElementById("file")&&document.getElementById("file").files.length){inspect().then(function(r){out.textContent=r.text;metrics(r.metrics);setState("Complete",true)});return}out.textContent="Choose an image file for local pixel inspection.";metrics([])}
else if(kind==="files"){inspect().then(function(r){out.textContent=r.text;metrics(r.metrics);setState("Complete",true)});return}
else{var words=v.trim().split(/\s+/).filter(Boolean);if(/keyword/i.test(name))out.textContent=Array.from(new Set(v.split(/[,;\n]+/).map(function(x){return x.trim().toLowerCase()}).filter(Boolean))).join(", ");else if(/sort|normalizer/i.test(name))out.textContent=v.split(/\r?\n/).sort(function(a,b){return a.localeCompare(b)}).join("\n");else if(/regex/i.test(name)){var parts=v.split(/\n---+\n/),pat=parts[0]||"",txt=parts[1]||"";try{var re=new RegExp(pat,"gm"),m0=txt.match(re)||[];out.textContent="Matches: "+m0.length+"\\n"+m0.join("\\n")}catch(e){out.textContent="Regex error: "+e.message}}else if(/count|meter|analyzer|profiler|audit/i.test(name))out.textContent="Characters: "+v.length+"\\nWords: "+words.length+"\\nLines: "+(v?v.split(/\r?\n/).length:0)+"\\nBytes: "+new TextEncoder().encode(v).length;else out.textContent=v;metrics([["Characters",v.length],["Words",words.length],["Lines",v?v.split(/\r?\n/).length:0]])}
setState("Complete",true);
}catch(e){out.textContent="Error: "+e.message;metrics([]);setState("Error",false)}
}
function inspect(){
var el=document.getElementById(kind==="files"?"files":"file"),fs=el&&el.files?Array.from(el.files):[];
if(!fs.length)return Promise.resolve({text:"No file selected.",metrics:[]});
if(kind==="files"){var total=fs.reduce(function(a,f){return a+f.size},0);var types={};fs.forEach(function(f){types[f.type||"unknown"]=(types[f.type||"unknown"]||0)+1});return Promise.resolve({text:fs.map(function(f){return f.name+"\\t"+bytes(f.size)+"\\t"+(f.type||"unknown")}).join("\\n"),metrics:[["Files",fs.length],["Total",bytes(total)],["Types",Object.keys(types).length]]})}
var f=fs[0],u=URL.createObjectURL(f);
return new Promise(function(resolve){
if(kind==="image"){var im=new Image();im.onload=function(){var c=document.createElement("canvas"),w=Math.min(im.naturalWidth,1600),h=Math.max(1,Math.round(im.naturalHeight*w/im.naturalWidth));c.width=w;c.height=h;var g=c.getContext("2d",{willReadFrequently:true});g.drawImage(im,0,0,w,h);var d=g.getImageData(0,0,w,h).data,sum=[0,0,0],alpha=0,luma=0;for(var i=0;i<d.length;i+=4){sum[0]+=d[i];sum[1]+=d[i+1];sum[2]+=d[i+2];alpha+=d[i+3]/255;luma+=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2]}var pix=d.length/4;resolve({text:f.name+"\\n"+im.naturalWidth+" × "+im.naturalHeight+"\\n"+(f.type||"unknown")+"\\nAverage RGB: "+sum.map(function(x){return Math.round(x/pix)}).join(", ")+"\\nAlpha coverage: "+(alpha/pix*100).toFixed(2)+"%\\nAverage luma: "+(luma/pix).toFixed(2),metrics:[["Width",im.naturalWidth],["Height",im.naturalHeight],["Size",bytes(f.size)],["Alpha",((alpha/pix)*100).toFixed(2)+"%"]]});URL.revokeObjectURL(u)};im.onerror=function(){resolve({text:"Browser could not decode this image.",metrics:[]});URL.revokeObjectURL(u)};im.src=u;return}
var node=document.createElement(kind);node.preload="metadata";node.onloadedmetadata=function(){var m=kind==="video"?[["Width",node.videoWidth],["Height",node.videoHeight],["Duration",node.duration.toFixed(3)+" s"],["Size",bytes(f.size)],["Type",f.type||"unknown"]]:[["Duration",node.duration.toFixed(3)+" s"],["Size",bytes(f.size)],["Type",f.type||"unknown"]];resolve({text:f.name+"\\n"+(f.type||"unknown")+"\\n"+bytes(f.size)+"\\nDuration "+node.duration.toFixed(3)+" s",metrics:m});URL.revokeObjectURL(u)};node.onerror=function(){resolve({text:"Browser could not decode this file.",metrics:[]});URL.revokeObjectURL(u)};node.src=u;
})}
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

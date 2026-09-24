import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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

const htmlFiles=[
  'index.html',
  'projects/index.html',
  'asset-vault/index.html',
  'projects/code-motion/index.html',
  'projects/code-motion/renderer/index.html',
  'projects/bncagrocare/index.html',
  'projects/bncagrocare/invoice/index.html',
  'projects/repo-token-meter/index.html'
];
for(const file of htmlFiles) must(exists(file),file+' exists');
for(const file of htmlFiles) checkLocalRefs(file);

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
  'href="../renderer/"',
  'href="../asset-vault/"',
  'href="./bncagrocare/"',
  'href="./bncagrocare/invoice/"',
  'href="./repo-token-meter/"'
]) must(hub.includes(ref),'project index exposes '+ref);

const bncPdfSha=execFileSync('git',['ls-tree','-r','HEAD','--','projects/bncagrocare/invoice.pdf'],{encoding:'utf8'}).trim().split(/\s+/)[2];
must(bncPdfSha==='46c9ce8303a0a4abdf7599ba1479b298c26fc6fe','locked BNC invoice template SHA is unchanged');

must(!site.includes('href="renderer/"'),'homepage has no retired renderer link');
must(!hub.includes('href="../renderer/"'),'project hub has no retired renderer link');

console.log('Global site validation complete.');

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root='projects/bncagrocare';
const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg);console.log('PASS',msg)};

must(fs.existsSync(root+'/index.html'),'BNC business page exists');
must(fs.existsSync(root+'/FB_IMG_1789811599210.jpg'),'BNC image asset exists');
must(fs.existsSync(root+'/reference/demo.xlsx'),'Demo sheet exists and remains in reference/');
must(fs.existsSync(root+'/invoice.pdf'),'Locked original invoice PDF exists');
const invoicePdfTree=execFileSync('git',['ls-tree','-r','HEAD','--',root+'/invoice.pdf'],{encoding:'utf8'}).trim().split(/\s+/);
must(invoicePdfTree[2]==='46c9ce8303a0a4abdf7599ba1479b298c26fc6fe','invoice.pdf immutable template SHA matches locked source');
must(fs.existsSync(root+'/invoice/index.html'),'Invoice PWA page exists');
must(fs.existsSync(root+'/invoice/js/app.js'),'Invoice JavaScript exists');
must(fs.existsSync(root+'/invoice/css/app.css'),'Invoice CSS exists');
must(fs.existsSync(root+'/invoice/sw.js'),'Invoice service worker exists');
must(fs.existsSync(root+'/invoice/manifest.webmanifest'),'Invoice manifest exists');

const site=read(root+'/index.html');
must(site.includes('BNC AgroCare'),'business page identifies BNC AgroCare');
must(site.includes('href="invoice/"'),'business page links to Invoice PWA');
must(site.includes('href="reference/demo.xlsx"'),'business page links to demo sheet');
must(!site.includes('tamasrazim.github.io/renderer'),'BNC page does not leak personal renderer navigation');

const invoice=read(root+'/invoice/index.html');
must(invoice.includes('id="saveInvoice"'),'invoice save control exists');
must(invoice.includes('id="importBtn"'),'invoice JSON import exists');
must(invoice.includes('href="../reference/demo.xlsx"'),'invoice points to canonical demo sheet');
must(!invoice.includes('../site/'),'invoice has no stale staging path');

const manifest=JSON.parse(read(root+'/invoice/manifest.webmanifest'));
must(manifest.start_url==='./','PWA start_url is relative to invoice app');
must(manifest.scope==='./','PWA scope is relative to invoice app');

const sw=read(root+'/invoice/sw.js');
must(/const CACHE='bnc-invoice-v\d+'/.test(sw),'service worker has versioned BNC cache');
must(sw.includes("self.registration.scope"),'service worker uses registration scope');
must(sw.includes("caches.match('./index.html')"),'service worker has offline navigation fallback');

execFileSync(process.execPath,['--check',root+'/invoice/js/app.js'],{stdio:'inherit'});
execFileSync(process.execPath,['--check',root+'/invoice/sw.js'],{stdio:'inherit'});
console.log('PASS invoice JavaScript syntax');
console.log('BNC validation complete');

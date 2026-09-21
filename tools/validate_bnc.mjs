import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root='projects/bncagrocare';
const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg);console.log('PASS',msg)};

must(fs.existsSync(root+'/index.html'),'BNC business page exists');
must(fs.existsSync(root+'/FB_IMG_1789811599210.jpg'),'BNC image asset exists');
must(fs.existsSync(root+'/invoice.pdf'),'Locked original invoice PDF exists');
const pdfTree=execFileSync('git',['ls-tree','-r','HEAD','--',root+'/invoice.pdf'],{encoding:'utf8'}).trim().split(/\s+/);
must(pdfTree[2]==='46c9ce8303a0a4abdf7599ba1479b298c26fc6fe','invoice.pdf immutable template SHA matches locked source');

for(const p of ['index.html','js/app.js','css/app.css','sw.js','manifest.webmanifest','icons/icon.svg']){
  must(fs.existsSync(root+'/invoice/'+p),'Invoice '+p+' exists');
}

const site=read(root+'/index.html');
must(site.includes('BNC AgroCare'),'business page identifies BNC AgroCare');
must(site.includes('href="./invoice/"'),'business page links to Invoice PWA');
must(!site.includes('tamasrazim.github.io/renderer'),'BNC page does not leak personal renderer navigation');

const invoice=read(root+'/invoice/index.html');
must(invoice.includes('id="previewBtn"'),'invoice generate control exists');
must(invoice.includes('id="saveBtn"'),'invoice save control exists');
must(invoice.includes('id="jsonInBtn"'),'invoice JSON import control exists');
must(invoice.includes('serviceWorker'),'invoice registers its own service worker');
must(invoice.includes('../invoice.pdf'),'invoice references local locked PDF template');
must(invoice.includes('id="pdfPreview"'),'invoice uses the in-page A4 PDF preview');
must(!invoice.includes('<iframe id="pdf"'),'invoice does not use the browser PDF viewer');
must(!invoiceJs.includes('$("#pdf").src'),'invoice has no stale browser PDF viewer reference');
must(invoice.includes('pdf-lib@1.17.1'),'invoice includes the pinned PDF engine');

const invoiceJs=read(root+'/invoice/js/app.js');
must(invoiceJs.includes('const TEMPLATE="../invoice.pdf"'),'invoice uses the local locked PDF template');
must(invoiceJs.includes('fetch(TEMPLATE'),'invoice loads the locked template at runtime');
must(invoiceJs.includes('loadPdfEngine'),'invoice has a resilient PDF engine loader');
must(invoiceJs.includes('unpkg.com/pdf-lib@1.17.1'),'invoice has a second PDF engine CDN fallback');
must(invoiceJs.includes('useObjectStreams:false'),'invoice saves preview PDFs with compatible object streams');
must(invoiceJs.includes('pdfjs-dist@6.3.289'),'invoice uses pinned PDF.js for in-page preview');
must(invoiceJs.includes('function renderPdfPreview'),'invoice renders generated PDFs to A4 canvas sheets');
must(invoiceJs.includes('header_B4_L4'),'invoice maps the template ref field explicitly');
must(invoiceJs.includes('invoice_number'),'invoice maps the template invoice field explicitly');
must(invoiceJs.includes('dealer_trader_name'),'invoice maps trader field explicitly');
must(invoiceJs.includes('function totals()')&&invoiceJs.includes('leftAmount')&&invoiceJs.includes('rightAmount'),'invoice calculates the left/right summary amounts');
must(invoiceJs.includes('if(!drawn)drawSummary(page,totals(),0,font,bold)'),'invoice always redraws the summary when no extra data rows exist');
must(invoiceJs.includes('const X=[22.883,35.553,96.994'),'invoice uses the corrected template column geometry');
must(invoiceJs.includes('MAX_EXTRAROWS=10'),'invoice bounds same-page dynamic expansion');
must(invoiceJs.includes('function continuationPage'),'invoice has a safe overflow continuation path');
must(invoiceJs.includes('setTimeout(()=>URL.revokeObjectURL'),'invoice cleans generated object URLs');
execFileSync(process.execPath,['--check',root+'/invoice/js/app.js'],{stdio:'inherit'});

const manifest=JSON.parse(read(root+'/invoice/manifest.webmanifest'));
must(manifest.start_url==='./','PWA start_url is relative');
must(manifest.scope==='./','PWA scope is relative');
must(Array.isArray(manifest.icons)&&manifest.icons.length>0,'PWA icon is declared');

const sw=read(root+'/invoice/sw.js');
must(/bnc-invoice-v\d+/.test(sw),'service worker cache is versioned');
must(sw.includes("self.registration.scope"),'service worker derives its navigation scope');
must(sw.includes('caches.match(FALLBACK)'),'service worker has offline navigation fallback');
must(sw.includes('no-cors'),'service worker can cache the external PDF engine');
execFileSync(process.execPath,['--check',root+'/invoice/sw.js'],{stdio:'inherit'});

console.log('BNC validation complete');

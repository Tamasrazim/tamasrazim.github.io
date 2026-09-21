import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root='projects/bncagrocare';
const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg);console.log('PASS',msg)};

must(fs.existsSync(root+'/index.html'),'BNC business page exists');
must(fs.existsSync(root+'/invoice.pdf'),'Locked original invoice PDF exists');
const pdfTree=execFileSync('git',['ls-tree','-r','HEAD','--',root+'/invoice.pdf'],{encoding:'utf8'}).trim().split(/\s+/);
must(pdfTree[2]==='46c9ce8303a0a4abdf7599ba1479b298c26fc6fe','invoice.pdf immutable template SHA matches locked source');

for(const p of ['index.html','js/app.js','css/app.css','sw.js','manifest.webmanifest','icons/icon.svg']){
  must(fs.existsSync(root+'/invoice/'+p),'Invoice '+p+' exists');
}

const site=read(root+'/index.html');
must(site.includes('BNC AgroCare'),'business page identifies BNC AgroCare');
must(site.includes('href="./invoice/"'),'business page links to Invoice PWA');

const invoice=read(root+'/invoice/index.html');
must(invoice.includes('id="pdfPreview"'),'invoice uses the A4 preview field');
must(!invoice.includes('<iframe'),'invoice does not use a browser PDF iframe');
must(invoice.includes('unpkg.com/pdf-lib@1.17.1'),'invoice preloads pinned pdf-lib');
must(invoice.includes('navigator.serviceWorker.register("./sw.js")'),'invoice registers its service worker');

const invoiceJs=read(root+'/invoice/js/app.js');
must(invoiceJs.includes('bnc-invoice-v4'),'invoice uses the rebuilt data store');
must(invoiceJs.includes('TEMPLATE="../invoice.pdf"'),'invoice uses the locked PDF template');
must(invoiceJs.includes('async function loadPdfLib'),'invoice has a resilient PDF engine loader');
must(invoiceJs.includes('cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'),'invoice has a PDF engine fallback');
must(invoiceJs.includes('async function generate'),'invoice has a single PDF generation path');
must(invoiceJs.includes('useObjectStreams:false'),'invoice saves a compatible PDF');
must(!invoiceJs.includes('form.flatten'),'invoice does not depend on form flattening');
must(!invoiceJs.includes('pdfjs-dist'),'invoice has no PDF.js dependency');
must(!invoiceJs.includes('$("#pdf")'),'invoice has no stale browser PDF viewer reference');
must(/const side=i<4\?0:i<8\?1:\(i-8\)%2/.test(invoiceJs),'dynamic extra rows map to left/right columns');
must(invoiceJs.includes('function renderProducts(){lastPdf=null;'),'editing invalidates the old generated PDF');
must(invoiceJs.includes('function syncFields(){'),'invoice synchronizes saved state back into form fields');
must(invoiceJs.includes('install();\\n(async()=>'),'PWA install prompt is registered before async initialization');
must(invoiceJs.includes('let dl=$("#catalog")'),'product catalog is not duplicated on every render');
must(invoiceJs.includes('items.sort((x,y)=>Number(y.updatedAt||0)-Number(x.updatedAt||0))'),'invoice history sorts by save time');
must(invoiceJs.includes('const remaining=state.products.slice(shown).filter(hasData)'),'invoice supports continuation pages');
execFileSync(process.execPath,['--check',root+'/invoice/js/app.js'],{stdio:'inherit'});

const manifest=JSON.parse(read(root+'/invoice/manifest.webmanifest'));
must(manifest.start_url==='./','PWA start_url is relative');
must(manifest.scope==='./','PWA scope is relative');
must(Array.isArray(manifest.icons)&&manifest.icons.length>0,'PWA icon is declared');

const serviceWorker=read(root+'/invoice/sw.js');
must(/bnc-invoice-v\d+/.test(serviceWorker),'service worker cache is versioned');
must(serviceWorker.includes('bnc-invoice-v45'),'service worker cache is at v43');
must(serviceWorker.includes('self.registration.scope'),'service worker derives its navigation scope');
must(serviceWorker.includes('caches.match(FALLBACK)'),'service worker has an offline navigation fallback');
must(serviceWorker.includes('invoice.pdf'),'service worker pre-caches the locked invoice template');
execFileSync(process.execPath,['--check',root+'/invoice/sw.js'],{stdio:'inherit'});

console.log('BNC validation complete');

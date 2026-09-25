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

const invoice=read(root+'/invoice/index.html');
must(invoice.includes('id="pdfPreview"'),'invoice uses the A4 preview field');
must(!invoice.includes('<iframe'),'invoice does not use a browser PDF iframe');
must(invoice.includes('cdn.jsdelivr.net/npm/pdf-lib@1.17.1'),'invoice preloads pinned pdf-lib from the cached CDN');
must(invoice.includes('navigator.serviceWorker.register("./sw.js")'),'invoice registers its service worker');
must(invoice.includes('id="rowMetric"'),'invoice exposes physical row count');
must(invoice.includes('id="slotMetric"'),'invoice exposes total product slots');
must(invoice.includes('+ Add product row'),'invoice uses physical row insertion wording');
must(invoice.includes('pairLegend'),'invoice presents balanced left/right product columns');

const invoiceJs=read(root+'/invoice/js/app.js');
must(invoiceJs.includes('ROWS_PER_SIDE=4'),'invoice starts with 4 physical rows per side');
must(invoiceJs.includes('MAX_ROWS_PER_SIDE=50'),'invoice has an explicit safe row ceiling');
must(invoiceJs.includes('function addProductRow()'),'invoice adds a physical row, not a single flat product');
must(invoiceJs.includes('state.rows.push(blankRow())'),'adding a product creates one row on both sides');
must(invoiceJs.includes('function slFor('),'SL numbering is derived from total physical rows');
must(invoiceJs.includes('side==="left"?rowIndex+1:totalRows+rowIndex+1'),'right SL starts at N+1');
must(!invoiceJs.includes('TEMPLATE_ROWS=8'),'old fixed 8-product model is removed');
must(!invoiceJs.includes('const side=i<4?0:i<8?1:(i-8)%2'),'old flat-side mapping is removed');
must(invoiceJs.includes('function syncFields(){'),'saved state synchronizes into form controls');
must(invoiceJs.includes('items.sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0)'),'history sorts by save time');
must(invoiceJs.includes('const extra=state.rows.slice(ROWS_PER_SIDE,ROWS_PER_SIDE+FIRST_PAGE_EXTRA_ROWS)'),'extra rows shift the subtotal area');
must(invoiceJs.includes('const remaining=state.rows.slice(shownRows)'),'remaining physical rows continue onto PDF pages');
const installPos=invoiceJs.indexOf('install();');
const initPos=invoiceJs.indexOf('(async()=>');
must(installPos>=0 && initPos>installPos,'PWA install prompt is registered before async initialization');
execFileSync(process.execPath,['--check',root+'/invoice/js/app.js'],{stdio:'inherit'});

const css=read(root+'/invoice/css/app.css');
must(css.includes('.pairRow{'),'CSS styles physical left/right invoice rows');
must(css.includes('.productSide{'),'CSS styles each invoice side');
must(css.includes('.removeRow{'),'CSS provides physical-row removal');

const manifest=JSON.parse(read(root+'/invoice/manifest.webmanifest'));
must(manifest.start_url==='./','PWA start_url is relative');
must(manifest.scope==='./','PWA scope is relative');
must(Array.isArray(manifest.icons)&&manifest.icons.length>0,'PWA icon is declared');

const serviceWorker=read(root+'/invoice/sw.js');
must(serviceWorker.includes('bnc-invoice-v46'),'service worker cache is at v46');
must(serviceWorker.includes('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js'),'service worker caches the same PDF engine URL');
must(serviceWorker.includes('self.registration.scope'),'service worker derives its navigation scope');
must(serviceWorker.includes('caches.match(FALLBACK)'),'service worker has an offline navigation fallback');
must(serviceWorker.includes('invoice.pdf'),'service worker pre-caches the locked invoice template');
execFileSync(process.execPath,['--check',root+'/invoice/sw.js'],{stdio:'inherit'});

console.log('BNC validation complete');

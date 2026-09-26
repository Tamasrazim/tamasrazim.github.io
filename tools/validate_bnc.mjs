import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root='projects/bncagrocare';
const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg);console.log('PASS',msg)};

must(fs.existsSync(root+'/index.html'),'BNC website exists');
must(fs.existsSync(root+'/invoice/index.html'),'invoice application exists');

const invoice=read(root+'/invoice/index.html');
for(const id of ['products','summary','history','sheetPreview','previewBtn','downloadBtn']){
  must(invoice.includes('id="'+id+'"'),'invoice exposes '+id);
}
must(!invoice.includes('Invoice Studio'),'invoice page has no retired Studio branding');
must(!invoice.includes('pdfPreview'),'invoice page has no retired PDF preview');
must(invoice.includes('navigator.serviceWorker.register("./sw.js")'),'invoice registers its service worker');
must(invoice.includes('id="rowMetric">6'),'invoice starts with 6 master rows per side');
must(invoice.includes('id="slotMetric">12'),'invoice starts with 12 master line slots');
must(fs.existsSync(root+'/reference/BNCFINAL.xlsx'),'master BNC workbook exists');
must(fs.existsSync(root+'/reference/addProductRow.js'),'master row helper exists');
must(fs.existsSync(root+'/reference/AddProductRow.bas'),'fixed Excel VBA macro exists');

for(const p of ['js/app.js','css/app.css','sw.js','manifest.webmanifest','icons/icon.svg']){
  must(fs.existsSync(root+'/invoice/'+p),'invoice '+p+' exists');
}

execFileSync(process.execPath,['--check',root+'/invoice/js/app.js'],{stdio:'inherit'});
execFileSync(process.execPath,['--check',root+'/invoice/sw.js'],{stdio:'inherit'});
execFileSync(process.execPath,['--check',root+'/reference/addProductRow.js'],{stdio:'inherit'});

const manifest=JSON.parse(read(root+'/invoice/manifest.webmanifest'));
must(manifest.start_url==='./','invoice PWA start_url is relative');
must(Array.isArray(manifest.icons)&&manifest.icons.length>0,'invoice PWA has icons');

const site=read(root+'/index.html');
must(site.includes('FB_IMG_1789811611633.jpg'),'cover image is present');
must(site.includes('aspect-ratio:16/9'),'cover presentation keeps the wide ratio');
must(!site.includes('Invoice Studio'),'customer website has no Studio branding');
must(!site.includes('./invoice/'),'customer website does not advertise the representative app');
must(site.includes('© Robiul Rumman Razim'),'customer website has the requested footer credit');
console.log('BNC validation complete');
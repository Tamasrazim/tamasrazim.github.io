(()=>{"use strict";
const $=s=>document.querySelector(s);
const TEMPLATE="../invoice.pdf",DB="bnc-invoice-v4",TEMPLATE_ROWS=8,MAX_EXTRA=20;
const PRODUCTS=[
{name:"NC Gold- 4CPA",packs:["1 Ltr x 12 Bottle","500 ml x 12 Bottle","100 ml x 30 Bottle"]},
{name:"NC Zinc- Mono 36%",packs:["1kg. x 10 Pack"]},
{name:"NC Solu- Boron 20%",packs:["500 gm x 10 Pack","100 gm x 24 Pack"]},
{name:"NC Solu+ Boron 17%",packs:["1kg. x 10 Pack","500 gm x 20 Pack"]},
{name:"NC Chilli- Chilted Zinc 10%",packs:["500 gm x 10 Pack","100 gm x 30 Pack","17 gm x 100 Pack"]},
{name:"Pa-Cola- Paclobutazol 25 SC",packs:["20 Ltr","5 Ltr","1 Ltr x 12 Bottle","100 ml x 30 Bottle"]},
{name:"NC Vit- (NNA 98%)",packs:["1kg. x 10 Pack"]},
{name:"NC Leaf- GA-3",packs:["10 gm x 100 Pack","1 gm x 100 Pack"]},
{name:"NC Gyp- Calcium 20% & Sulfur 16%",packs:["10 kg. x 5 Pack","5 kg. x 10 Pack"]},
{name:"NC-Darma",packs:["500 ml x 12 Bottle","100 ml x 30 Bottle"]},
];
const blank=()=>({name:"",pack:"",ctn:"",rate:""});
const state={ref:"X2",invoiceNo:"0002",date:"",commission:0,trader:"",buyer:"",address:"",mobile:"",products:Array.from({length:TEMPLATE_ROWS},blank)};
let db=null,lastPdf=null,deferred=null,pdfLibPromise=null;

const productByName=name=>PRODUCTS.find(p=>p.name===String(name||""));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const money=v=>num(v).toFixed(2);
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const displayDate=v=>{const m=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+"."+m[2]+"."+m[1]:String(v||"")};
const safe=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const hasData=p=>!!(String(p?.name||"").trim()||String(p?.pack||"").trim()||String(p?.ctn||"").trim()||String(p?.rate||"").trim());
const copy=()=>JSON.parse(JSON.stringify(state));

function words(n){
 n=Math.max(0,Math.round(num(n)*100))/100;
 const a=["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"],b=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
 const w=x=>x<20?a[x]:x<100?b[Math.floor(x/10)]+(x%10?" "+a[x%10]:""):x<1000?a[Math.floor(x/100)]+" Hundred"+(x%100?" "+w(x%100):""):x<1e5?w(Math.floor(x/1000))+" Thousand"+(x%1000?" "+w(x%1000):""):x<1e7?w(Math.floor(x/1e5))+" Lakh"+(x%1e5?" "+w(x%1e5):""):w(Math.floor(x/1e7))+" Crore"+(x%1e7?" "+w(x%1e7):"");
 const whole=Math.floor(n),p=Math.round((n-whole)*100);
 return w(whole)+" Taka"+(p?" and "+String(p).padStart(2,"0")+" Paisa":"")+" Only";
}
function totals(){
 let cartons=0,total=0,leftAmount=0,rightAmount=0;
 state.products.forEach((p,i)=>{const c=Math.max(0,num(p.ctn)),a=c*Math.max(0,num(p.rate));cartons+=c;total+=a;if((i%8)<4)leftAmount+=a;else rightAmount+=a});
 const commission=total*Math.max(0,num(state.commission))/100;
 return {cartons,total,commission,final:Math.max(0,total-commission),leftAmount,rightAmount};
}
function normalize(){
 state.products=Array.isArray(state.products)?state.products.map(p=>({...blank(),...p})).slice(0,8+MAX_EXTRA):[];
 while(state.products.length<TEMPLATE_ROWS)state.products.push(blank());
 state.commission=Math.max(0,num(state.commission));if(!state.date)state.date=today();
}
function dbOpen(){
 return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("drafts"))d.createObjectStore("drafts",{keyPath:"id"});if(!d.objectStoreNames.contains("invoices"))d.createObjectStore("invoices",{keyPath:"id"})};r.onsuccess=()=>{db=r.result;resolve()};r.onerror=()=>reject(r.error)})
}
function saveDraft(){if(!db)return;db.transaction("drafts","readwrite").objectStore("drafts").put({id:"current",data:copy(),updatedAt:Date.now()})}
function syncFields(){document.querySelectorAll("[data-k]").forEach(el=>el.value=state[el.dataset.k]??"")}
function bindFields(){
 document.querySelectorAll("[data-k]").forEach(el=>el.addEventListener("input",()=>{const k=el.dataset.k;state[k]=k==="commission"?Math.max(0,num(el.value)):el.value;lastPdf=null;updateSummary();renderPreview();saveDraft()}))
}
function setStatus(msg){$("#status").textContent=msg}
function packList(row,idx){
 const id="pack-list-"+idx;let dl=document.getElementById(id);
 if(!dl){dl=document.createElement("datalist");dl.id=id;document.body.append(dl)}
 dl.replaceChildren(...((productByName(state.products[idx]?.name)?.packs)||[]).map(v=>{const o=document.createElement("option");o.value=v;return o}));
 return id;
}
function renderProducts(){lastPdf=null;normalize();const host=$("#products");host.replaceChildren();
 let dl=$("#catalog");if(!dl){dl=document.createElement("datalist");dl.id="catalog";document.body.append(dl)}dl.replaceChildren(...PRODUCTS.map(p=>{const o=document.createElement("option");o.value=p.name;return o}));
 state.products.forEach((p,i)=>{
  const row=document.createElement("div");row.className="prod";
  const n=document.createElement("div");n.className="n";n.textContent=String(i+1).padStart(2,"0");row.append(n);
  ["name","pack","ctn","rate"].forEach(k=>{
   const label=document.createElement("label");label.textContent=k==="ctn"?"CTN":k==="rate"?"RATE / CTN":k==="name"?"PRODUCT":"PACK";
   const input=document.createElement("input");input.value=p[k]??"";input.autocomplete="off";input.setAttribute("aria-label",label.textContent+" "+(i+1));
   if(k==="name"){input.setAttribute("list","catalog");input.placeholder="Product"}
   if(k==="pack"){input.setAttribute("list",packList(p,i));input.placeholder="Pack size"}
   if(k==="ctn"){input.type="number";input.min="0";input.step="1";input.inputMode="numeric";input.placeholder="0"}
   if(k==="rate"){input.type="number";input.min="0";input.step=".01";input.inputMode="decimal";input.placeholder="0.00"}
   input.addEventListener("input",e=>{p[k]=(k==="ctn"||k==="rate")?Math.max(0,num(e.target.value)):e.target.value;if(k==="name"){packList(p,i);const list=document.getElementById("pack-list-"+i);if(list){} }lastPdf=null;updateSummary();renderPreview();saveDraft()});
   label.append(input);row.append(label)
  });
  const amount=document.createElement("label");amount.textContent="AMOUNT";const ai=document.createElement("input");ai.readOnly=true;ai.value=p.ctn&&p.rate?money(num(p.ctn)*num(p.rate)):"";amount.append(ai);row.append(amount);
  const del=document.createElement("button");del.type="button";del.className="remove";del.textContent="×";del.onclick=()=>{if(state.products.length>TEMPLATE_ROWS){state.products.splice(i,1);renderProducts();saveDraft()}else setStatus("Template keeps 8 base lines")};row.append(del);
  host.append(row)
 });
 updateSummary();renderPreview()
}
function updateSummary(){const t=totals();$("#summary").innerHTML='<div class="sum"><span>Cartons</span><strong>'+t.cartons+'</strong></div><div class="sum"><span>Gross taka</span><strong>'+money(t.total)+'</strong></div><div class="sum"><span>Commission</span><strong>'+money(t.commission)+'</strong></div><div class="sum final"><span>Final total</span><strong>'+money(t.final)+'</strong></div>'}
function addProduct(){state.products.push(blank());renderProducts();saveDraft();setStatus("Product line added");const rows=$("#products").querySelectorAll("input");rows[Math.max(0,rows.length-5)]?.focus()}
function paperRow(p,i){return '<div class="tr"><span>'+String(i+1).padStart(2,"0")+'</span><span title="'+safe(p.name)+'">'+safe(p.name)+'</span><span>'+safe(p.pack)+'</span><span>'+safe(p.ctn)+'</span><span>'+safe(p.rate?money(p.rate):"")+'</span></div>'}
function renderPreview(){
 const t=totals(),left=state.products.slice(0,4),right=state.products.slice(4,8),extras=state.products.slice(8).filter(hasData);
 const col=rows=>'<div class="paperTable"><div class="th"><span>SL</span><span>PRODUCT</span><span>PACK</span><span>CTN</span><span>RATE</span></div>'+rows.slice(0,10).map(p=>paperRow(p,state.products.indexOf(p))).join("")+'</div>';
 const continuation=extras.length?'<div class="paperContinuation">+'+extras.length+' additional line'+(extras.length===1?'':'s')+' continue on the next PDF page.</div>':'';
 $("#pdfPreview").innerHTML='<div class="a4Sheet"><div class="paperHeader"><div><div class="paperBrand">BNC AGROCARE</div><div class="paperTitle">INVOICE</div></div><div class="paperMeta">REF '+safe(state.ref)+'<br>NO. '+safe(state.invoiceNo)+'<br>'+safe(displayDate(state.date))+'</div></div><div class="metaGrid"><div class="metaBox"><small>TRADER / SHOP</small><strong>'+safe(state.trader)+'</strong></div><div class="metaBox"><small>BUYER</small><strong>'+safe(state.buyer)+'</strong></div><div class="metaBox"><small>ADDRESS</small><strong>'+safe(state.address)+'</strong></div><div class="metaBox"><small>MOBILE</small><strong>'+safe(state.mobile)+'</strong></div></div><div class="paperTables">'+col(left)+col(right)+'</div>'+continuation+'<div class="paperSummary"><div class="paperTotal"><span>TOTAL CARTON</span><strong>'+t.cartons+'</strong></div><div class="paperTotal"><span>GROSS TAKA</span><strong>'+money(t.total)+'</strong></div><div class="paperTotal"><span>COMMISSION</span><strong>'+money(t.commission)+'</strong></div><div class="paperTotal"><span>TOTAL AMOUNT</span><strong>'+money(t.final)+'</strong></div><div class="paperWords">Total Taka (In words): '+safe(words(t.final))+'</div></div><div class="paperFoot"><span>Representative: Md Rezaul Karim</span><span>BNC AgroCare</span></div></div>'
}

async function loadPdfLib(){
 if(window.PDFLib?.PDFDocument)return window.PDFLib;
 if(pdfLibPromise)return pdfLibPromise;
 pdfLibPromise=new Promise((resolve,reject)=>{const urls=["https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js","https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js"];let i=0;const next=()=>{if(window.PDFLib?.PDFDocument)return resolve(window.PDFLib);if(i>=urls.length)return reject(Error("PDF engine unavailable"));const s=document.createElement("script");s.src=urls[i++];s.onload=()=>window.PDFLib?.PDFDocument?resolve(window.PDFLib):next();s.onerror=next;document.head.append(s)};next()});return pdfLibPromise
}
async function loadTemplate(){
 try{const r=await fetch(TEMPLATE,{cache:"force-cache"});if(r.ok)return r.arrayBuffer()}catch{}
 if("caches"in window){const r=await caches.match(new URL(TEMPLATE,location.href));if(r)return r.arrayBuffer()}
 throw Error("Locked invoice template unavailable")
}
function drawTextFit(page,text,x,y,w,h,font,size,align="left"){
 const v=String(text??"");if(!v)return;let s=size;while(s>3.2&&font.widthOfTextAtSize(v,s)>Math.max(2,w-4))s-=.2;const tw=font.widthOfTextAtSize(v,s);const tx=align==="center"?x+(w-tw)/2:align==="right"?x+w-tw-2:x+2;page.drawText(v,{x:Math.max(x+1,tx),y:y+Math.max(1,(h-s)/2+1),size:s,font,color:window.PDFLib.rgb(0,0,0)})
}
function box(page,x,y,w,h){page.drawRectangle({x,y,width:w,height:h,borderColor:window.PDFLib.rgb(0,0,0),borderWidth:.7})}
const X=[22.883,35.553,96.994,152.482,172.693,211.939,259.504,272.572,334.409,393.852,412.476,462.422,521.496],BASE=[681.80975,671.69073,661.57074,651.45074],BH=8.12,SY=[641.33179,632.33179,622.59479,612.85779,603.11975],SH=[7,9.74,9.74,9.74,8.12];
function col(page,v,c,y,h,font){drawTextFit(page,v,X[c],y,X[c+1]-X[c],h,font,7.6,[0,3,4,5].includes(c)?"center":"left")}
function drawProduct(page,p,i,y,h,font){
 const side=i<4?0:i<8?1:(i-8)%2,base=side?6:0,vals=[hasData(p)?String(i+1):"",hasData(p)?p.name:"",hasData(p)?p.pack:"",hasData(p)?p.ctn:"",hasData(p)?p.rate?money(p.rate):"":"",hasData(p)&&p.ctn&&p.rate?money(num(p.ctn)*num(p.rate)):""];
 for(let c=0;c<6;c++)col(page,vals[c],base+c,y,h,font)
}
function drawExisting(page,font){for(let i=0;i<8;i++)drawProduct(page,state.products[i],i,BASE[i<4?i:i-4],BH,font)}
function drawSummary(page,t,shift,font,bold){
 const ys=SY.map(y=>y-shift),b1=X[1],b3=X[3],d=X[3],f=X[5],h=X[7],i=X[8],l=X[11],r=X[12];
 const row=(label,y,hgt,lv,rl,rv,mode)=>{if(mode===0){box(page,b1,y,b3-b1,hgt);box(page,d,y,f-d,hgt);box(page,h,y,i-h,hgt);box(page,l,y,r-l,hgt);drawTextFit(page,label,b1,y,b3-b1,hgt,bold,7.2,"center");drawTextFit(page,lv,d,y,f-d,hgt,font,7.2,"right");drawTextFit(page,rl,h,y,i-h,hgt,bold,7.2,"center");drawTextFit(page,rv,l,y,r-l,hgt,font,7.2,"right")}else if(mode===1){box(page,b1,y,b3-b1,hgt);box(page,d,y,f-d,hgt);box(page,h,y,l-h,hgt);box(page,l,y,r-l,hgt);drawTextFit(page,label,b1,y,b3-b1,hgt,bold,7,"center");drawTextFit(page,lv,d,y,f-d,hgt,font,7.2,"right");drawTextFit(page,rl,h,y,l-h,hgt,bold,7,"center");drawTextFit(page,rv,l,y,r-l,hgt,font,7.2,"right")}else{box(page,b1,y,l-b1,hgt);box(page,l,y,r-l,hgt);drawTextFit(page,label,b1,y,l-b1,hgt,bold,7.1,"right");drawTextFit(page,lv,l,y,r-l,hgt,font,7.1,mode===4?"left":"right")}};
 row("ST",ys[0],SH[0],money(t.leftAmount),"ST",money(t.rightAmount),0);row("Total Carton",ys[1],SH[1],String(t.cartons),"Total Taka",money(t.total),1);row("Commission %",ys[2],SH[2],String(state.commission),"","",2);row("Total Amount",ys[3],SH[3],money(t.final),"","",3);row("Total Taka (In words):",ys[4],SH[4],words(t.final),"","",4)
}
function drawExtras(page,font,bold){
 const extras=state.products.slice(8).filter(hasData);if(!extras.length)return 0;
 const rows=Math.min(MAX_EXTRA,Math.ceil(extras.length/2)),rh=Math.min(10.1,45/rows),shift=rh*rows;
 page.drawRectangle({x:X[0],y:548,width:X[12]-X[0],height:93,color:window.PDFLib.rgb(1,1,1)});
 for(let rr=0;rr<rows;rr++){const y=649.45-(rr+1)*rh,a=8+rr*2,b=a+1;drawProduct(page,state.products[a],a,y,rh,font);if(b<state.products.length)drawProduct(page,state.products[b],b,y,rh,font);for(let c=0;c<12;c++)box(page,X[c],y,X[c+1]-X[c],rh)}
 drawSummary(page,totals(),shift,font,bold);return rows*2
}
async function continuation(doc,items,start,font,bold){
 const p=doc.addPage([595.28,841.89]),g=window.PDFLib.rgb(.043,.239,.180),x=[36,64,272,350,415,468,559],heads=["SL","PRODUCT","PACK","CTN","RATE","AMOUNT"];
 p.drawText("BNC AGROCARE",{x:36,y:790,size:17,font:bold,color:g});p.drawText("INVOICE CONTINUATION",{x:36,y:770,size:9,font:bold,color:g});
 heads.forEach((h,i)=>p.drawText(h,{x:x[i]+2,y:742,size:7,font:bold,color:g}));
 let y=724;items.forEach((it,n)=>{if(y<45)return;const vals=[String(start+n+1).padStart(2,"0"),it.name||"",it.pack||"",it.ctn||"",it.rate?money(it.rate):"",it.ctn&&it.rate?money(num(it.ctn)*num(it.rate)):""];for(let i=0;i<6;i++){box(p,x[i],y-4,x[i+1]-x[i],18);drawTextFit(p,vals[i],x[i],y-4,x[i+1]-x[i],18,font,8,[0,3,4,5].includes(i)?"center":"left")}y-=21});
 p.drawText("Continuation generated from the locked BNC invoice template.",{x:36,y:23,size:6.5,font})
}

async function generate(){
 if(generate.busy)return lastPdf;generate.busy=true;const btn=$("#previewBtn");btn.disabled=true;normalize();renderPreview();$("#pdfState").textContent="Generating";setStatus("Preparing PDF…");
 try{
  const PDFLib=await loadPdfLib();const {PDFDocument,StandardFonts}=PDFLib;
  const doc=await PDFDocument.load(await loadTemplate(),{updateMetadata:false}),form=doc.getForm();
  const fields=[["header_B4_L4",state.ref],["invoice_number",state.invoiceNo],["invoice_date",displayDate(state.date)],["dealer_trader_name",state.trader],["dealer_buyer_name",state.buyer],["dealer_address",state.address],["dealer_mobile",state.mobile],["header_I6_L6","Md Rezaul Karim"],["header_I7_L7","Officer BNC AGRO CARE Area Manager"],["header_I8_L8","01718-306103"]];
  fields.forEach(([n,v])=>{try{form.getTextField(n).setText(String(v??""))}catch{}});
  const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);try{form.updateFieldAppearances(font)}catch{}
  if(!doc.getPages().length)throw Error("Invoice template has no pages");
  const page=doc.getPage(0);drawExisting(page,font);const drawn=drawExtras(page,font,bold);const shown=8+drawn;if(!drawn)drawSummary(page,totals(),0,font,bold);
  const remaining=state.products.slice(shown).filter(hasData);for(let i=0;i<remaining.length;i+=18)await continuation(doc,remaining.slice(i,i+18),shown+i,font,bold);
  lastPdf=await doc.save({useObjectStreams:false,addDefaultPage:false,updateFieldAppearances:true});
  $("#pdfState").textContent=remaining.length?"PDF ready · continuation":"PDF ready · A4";setStatus("Ready");return lastPdf
 }finally{generate.busy=false;btn.disabled=false}
}
async function download(){
 const b=lastPdf||await generate(),url=URL.createObjectURL(new Blob([b],{type:"application/pdf"})),a=document.createElement("a");a.href=url;a.download="BNC-Invoice-"+state.invoiceNo+".pdf";a.click();setTimeout(()=>URL.revokeObjectURL(url),1200)
}
function reset(){
 Object.assign(state,{ref:"X2",invoiceNo:String((Number(state.invoiceNo)||1)+1).padStart(4,"0"),date:today(),commission:0,trader:"",buyer:"",address:"",mobile:"",products:Array.from({length:TEMPLATE_ROWS},blank)});
 syncFields();renderProducts();saveDraft();$("#pdfState").textContent="Ready";setStatus("New invoice")
}
function saveInvoice(){
 if(!db)return;const t=totals(),id=state.invoiceNo+"-"+Date.now();db.transaction("invoices","readwrite").objectStore("invoices").put({id,invoiceNumber:state.invoiceNo,total:t.final,updatedAt:Date.now(),data:copy()});saveDraft();history();setStatus("Invoice saved")
}
function history(){
 if(!db)return;const host=$("#history");host.replaceChildren();const req=db.transaction("invoices").objectStore("invoices").openCursor(),items=[];
 req.onsuccess=()=>{const c=req.result;if(c){items.push(c.value);c.continue();return}items.sort((x,y)=>Number(y.updatedAt||0)-Number(x.updatedAt||0));
 if(!items.length){host.innerHTML='<div class="historyRow"><div><strong>No saved invoices</strong><small>Saved documents from this device will appear here.</small></div></div>';return}
 items.forEach(x=>{const row=document.createElement("div");row.className="historyRow";row.innerHTML='<div><strong>'+safe(x.invoiceNumber)+'</strong><small>'+money(x.total)+' · '+new Date(x.updatedAt).toLocaleString()+'</small></div>';const actions=document.createElement("div");actions.className="rowActions";
 [["Load",()=>{Object.assign(state,x.data);normalize();syncFields();renderProducts();saveDraft();setStatus("Loaded "+x.invoiceNumber)}],["Copy",()=>{Object.assign(state,x.data);state.invoiceNo=String((Number(state.invoiceNo)||0)+1).padStart(4,"0");state.date=today();normalize();syncFields();renderProducts();saveDraft();setStatus("Copied "+x.invoiceNumber)}],["Delete",()=>{db.transaction("invoices","readwrite").objectStore("invoices").delete(x.id).onsuccess=history},"del"]].forEach(([label,fn,cl])=>{const b=document.createElement("button");b.textContent=label;b.type="button";if(cl)b.className=cl;b.onclick=fn;actions.append(b)});row.append(actions);host.append(row)})
 }}
function exportJson(){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([JSON.stringify(copy(),null,2)],{type:"application/json"}));a.href=url;a.download="BNC-Invoice-"+state.invoiceNo+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function importJson(file){file.text().then(t=>{const d=JSON.parse(t);if(!Array.isArray(d.products))throw Error();Object.assign(state,d);normalize();syncFields();renderProducts();saveDraft();setStatus("Imported")}).catch(()=>alert("Invalid invoice JSON"))}
function install(){window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("#installBtn").hidden=false});$("#installBtn").onclick=async()=>{if(!deferred)return;await deferred.prompt();deferred=null;$("#installBtn").hidden=true};window.addEventListener("appinstalled",()=>$("#installBtn").hidden=true)}

install();
(async()=>{
 try{
  await dbOpen();const req=db.transaction("drafts").objectStore("drafts").get("current");req.onsuccess=()=>{if(req.result?.data)Object.assign(state,req.result.data);normalize();syncFields();renderProducts();bindFields();history()}
 }catch{normalize();syncFields();renderProducts();bindFields()}
 $("#addBtn").onclick=addProduct;$("#newBtn").onclick=reset;$("#saveBtn").onclick=saveInvoice;
 $("#previewBtn").onclick=()=>generate().catch(e=>{setStatus("PDF error");$("#pdfState").textContent="Generation failed";alert(e?.message||"Unable to generate PDF")});
 $("#downloadBtn").onclick=()=>download().catch(e=>alert(e?.message||"Unable to download PDF"));
 $("#jsonOutBtn").onclick=exportJson;$("#jsonInBtn").onclick=()=>$("#jsonFile").click();$("#jsonFile").onchange=e=>{const f=e.target.files?.[0];if(f)importJson(f);e.target.value=""}
})();
})();
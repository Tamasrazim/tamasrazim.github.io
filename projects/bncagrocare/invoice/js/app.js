(()=>{"use strict";
const $=s=>document.querySelector(s);
const TEMPLATE="../invoice.pdf",DB="bnc-invoice-v4",ROWS_PER_SIDE=4,MAX_ROWS_PER_SIDE=50,FIRST_PAGE_EXTRA_ROWS=2;
const PRODUCTS=[
{name:"NC Gold- 4CPA",packs:["1 Ltr x 12 Bottle","500 ml x 12 Bottle","100 ml x 30 Bottle"]},
{name:"NC Zinc- Mono 36%",packs:["1kg. x 10 Pack"]},
{name:"NC Solu- Boron 20%",packs:["500 gm x 10 Pack","100 gm x 24 Pack"]},
{name:"NC Solu+ Boron 17%",packs:["1kg. x 10 Pack","500 gm x 20 Pack"]},
{name:"NC Chilli- Chilted Zinc 10%",packs:["500 gm x 10 Pack","100 gm x 30 Bottle","17 gm x 100 Pack"]},
{name:"Pa-Cola- Paclobutazol 25 SC",packs:["20 Ltr","5 Ltr","1 Ltr x 12 Bottle","100 ml x 30 Bottle"]},
{name:"NC Vit- (NNA 98%)",packs:["1kg. x 10 Pack"]},
{name:"NC Leaf- GA-3",packs:["10 gm x 100 Pack","1 gm x 100 Pack"]},
{name:"NC Gyp- Calcium 20% & Sulfur 16%",packs:["10 kg. x 5 Pack","5 kg. x 10 Pack"]},
{name:"NC-Darma",packs:["500 ml x 12 Bottle","100 ml x 30 Bottle"]}
];
const blank=()=>({name:"",pack:"",ctn:"",rate:""});
const blankRow=()=>({left:blank(),right:blank()});
const state={ref:"X2",invoiceNo:"0002",date:"",commission:0,trader:"",buyer:"",address:"",mobile:"",rows:Array.from({length:ROWS_PER_SIDE},blankRow)};
let db=null,lastPdf=null,deferred=null,pdfLibPromise=null;

const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const money=v=>num(v).toFixed(2);
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const displayDate=v=>{const m=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+"."+m[2]+"."+m[1]:String(v||"")};
const safe=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const hasData=p=>!!(String(p?.name||"").trim()||String(p?.pack||"").trim()||String(p?.ctn||"").trim()||String(p?.rate||"").trim());
const copy=()=>JSON.parse(JSON.stringify(state));
const productByName=name=>PRODUCTS.find(p=>p.name===String(name||""));
const slFor=(rowIndex,side,totalRows)=>side==="left"?rowIndex+1:totalRows+rowIndex+1;

function words(n){
 n=Math.max(0,Math.round(num(n)*100))/100;
 const a=["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"],b=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
 const w=x=>x<20?a[x]:x<100?b[Math.floor(x/10)]+(x%10?" "+a[x%10]:""):x<1000?a[Math.floor(x/100)]+" Hundred"+(x%100?" "+w(x%100):""):x<1e5?w(Math.floor(x/1000))+" Thousand"+(x%1000?" "+w(x%1000):""):x<1e7?w(Math.floor(x/1e5))+" Lakh"+(x%1e5?" "+w(x%1e5):""):w(Math.floor(x/1e7))+" Crore"+(x%1e7?" "+w(x%1e7):"");
 const whole=Math.floor(n),p=Math.round((n-whole)*100);
 return w(whole)+" Taka"+(p?" and "+String(p).padStart(2,"0")+" Paisa":"")+" Only";
}

function normalize(){
 if(Array.isArray(state.rows)){
  state.rows=state.rows.map(r=>({left:{...blank(),...(r?.left||{})},right:{...blank(),...(r?.right||{})}}));
 }else{
  const old=Array.isArray(state.products)?state.products.map(p=>({...blank(),...p})):[];
  const rows=Array.from({length:Math.max(ROWS_PER_SIDE,Math.ceil(Math.max(ROWS_PER_SIDE*2,old.length)/2))},blankRow);
  for(let i=0;i<ROWS_PER_SIDE;i++){rows[i].left={...rows[i].left,...(old[i]||{})};rows[i].right={...rows[i].right,...(old[ROWS_PER_SIDE+i]||{})}}
  for(let j=ROWS_PER_SIDE*2;j<old.length;j++){
   const extraIndex=j-ROWS_PER_SIDE*2,rowIndex=ROWS_PER_SIDE+Math.floor(extraIndex/2);
   if(rowIndex>=rows.length)break;
   if(extraIndex%2===0)rows[rowIndex].left={...rows[rowIndex].left,...old[j]};
   else rows[rowIndex].right={...rows[rowIndex].right,...old[j]};
  }
  state.rows=rows;
  delete state.products;
 }
 if(state.rows.length<ROWS_PER_SIDE)while(state.rows.length<ROWS_PER_SIDE)state.rows.push(blankRow());
 if(state.rows.length>MAX_ROWS_PER_SIDE)state.rows=state.rows.slice(0,MAX_ROWS_PER_SIDE);
 state.commission=Math.max(0,num(state.commission));
 if(!state.date)state.date=today();
}

function totals(){
 let cartons=0,total=0,leftAmount=0,rightAmount=0;
 state.rows.forEach(row=>{
  const lc=Math.max(0,num(row.left.ctn)),la=lc*Math.max(0,num(row.left.rate));
  const rc=Math.max(0,num(row.right.ctn)),ra=rc*Math.max(0,num(row.right.rate));
  cartons+=lc+rc;total+=la+ra;leftAmount+=la;rightAmount+=ra;
 });
 const commission=total*Math.max(0,num(state.commission))/100;
 return {cartons,total,commission,final:Math.max(0,total-commission),leftAmount,rightAmount};
}

function setStatus(msg){$("#status").textContent=msg}
function syncFields(){document.querySelectorAll("[data-k]").forEach(el=>el.value=state[el.dataset.k]??"")}
function bindFields(){document.querySelectorAll("[data-k]").forEach(el=>el.addEventListener("input",()=>{const k=el.dataset.k;state[k]=k==="commission"?Math.max(0,num(el.value)):el.value;lastPdf=null;updateSummary();renderPreview();saveDraft()}))}
function dbOpen(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("drafts"))d.createObjectStore("drafts",{keyPath:"id"});if(!d.objectStoreNames.contains("invoices"))d.createObjectStore("invoices",{keyPath:"id"})};r.onsuccess=()=>{db=r.result;resolve()};r.onerror=()=>reject(r.error)})}
function saveDraft(){if(db)db.transaction("drafts","readwrite").objectStore("drafts").put({id:"current",data:copy(),updatedAt:Date.now()})}

function refreshPackList(rowIndex,side){
 const id="pack-list-"+rowIndex+"-"+side, row=state.rows[rowIndex], dl=document.getElementById(id);
 if(!dl)return;
 const packs=productByName(row?.[side]?.name)?.packs||[];
 dl.replaceChildren(...packs.map(v=>{const o=document.createElement("option");o.value=v;return o}));
}
function packListId(rowIndex,side){
 const id="pack-list-"+rowIndex+"-"+side;
 let dl=document.getElementById(id);
 if(!dl){dl=document.createElement("datalist");dl.id=id;document.body.append(dl)}
 refreshPackList(rowIndex,side);
 return id;
}
function buildSide(row,rowIndex,side,totalRows){
 const wrap=document.createElement("div");wrap.className="productSide "+side;
 const head=document.createElement("div");head.className="sideHead";head.innerHTML="<span>"+(side==="left"?"LEFT":"RIGHT")+"</span><strong>SL "+String(slFor(rowIndex,side,totalRows)).padStart(2,"0")+"</strong>";wrap.append(head);
 const fields=document.createElement("div");fields.className="sideFields";
 const spec=[
  ["name","PRODUCT","Product"],["pack","PACK","Pack size"],["ctn","CTN","0"],["rate","RATE / CTN","0.00"]
 ];
 spec.forEach(([key,label,placeholder])=>{
  const lab=document.createElement("label");lab.textContent=label;
  const input=document.createElement("input");input.value=row[key]??"";input.autocomplete="off";input.placeholder=placeholder;input.setAttribute("aria-label",label+" "+String(slFor(rowIndex,side,totalRows)).padStart(2,"0"));
  if(key==="name"){input.setAttribute("list","catalog");}
  if(key==="pack"){input.setAttribute("list",packListId(rowIndex,side))}
  if(key==="ctn"){input.type="number";input.min="0";input.step="1";input.inputMode="numeric"}
  if(key==="rate"){input.type="number";input.min="0";input.step=".01";input.inputMode="decimal"}
  input.addEventListener("input",e=>{row[key]=(key==="ctn"||key==="rate")?Math.max(0,num(e.target.value)):e.target.value;if(key==="name")refreshPackList(rowIndex,side);lastPdf=null;updateSummary();renderPreview();saveDraft()});
  lab.append(input);fields.append(lab);
 });
 const al=document.createElement("label");al.textContent="AMOUNT";const ai=document.createElement("input");ai.readOnly=true;ai.value=row.ctn&&row.rate?money(num(row.ctn)*num(row.rate)):"";ai.setAttribute("aria-label","Amount "+String(slFor(rowIndex,side,totalRows)).padStart(2,"0"));al.append(ai);fields.append(al);
 wrap.append(fields);return wrap;
}

function renderProducts(){
 lastPdf=null;normalize();
 let catalog=document.getElementById("catalog");if(!catalog){catalog=document.createElement("datalist");catalog.id="catalog";document.body.append(catalog)}
 catalog.replaceChildren(...PRODUCTS.map(p=>{const o=document.createElement("option");o.value=p.name;return o}));
 const host=$("#products");host.replaceChildren();
 const totalRows=state.rows.length;
 state.rows.forEach((row,i)=>{
  const pair=document.createElement("div");pair.className="pairRow";
  pair.append(buildSide(row,i,"left",totalRows),buildSide(row,i,"right",totalRows));
  const del=document.createElement("button");del.type="button";del.className="removeRow";del.textContent="×";del.title="Remove this physical invoice row";del.setAttribute("aria-label","Remove invoice row "+(i+1));
  del.disabled=totalRows<=ROWS_PER_SIDE;
  del.onclick=()=>{if(state.rows.length<=ROWS_PER_SIDE){setStatus("Keep the 4 template rows");return}state.rows.splice(i,1);renderProducts();saveDraft();setStatus("Invoice row removed")};
  pair.append(del);host.append(pair);
 });
 const rm=$("#rowMetric"),sm=$("#slotMetric");if(rm)rm.textContent=String(totalRows);if(sm)sm.textContent=String(totalRows*2);
 updateSummary();renderPreview();
}

function addProductRow(){
 if(state.rows.length>=MAX_ROWS_PER_SIDE){setStatus("Maximum 50 rows per side");return}
 state.rows.push(blankRow());renderProducts();saveDraft();setStatus("Product row added");
 const target=$("#products .pairRow:last-child input");if(target)target.focus();
}

function updateSummary(){
 const t=totals();
 $("#summary").innerHTML="<div class=\"sum\"><span>Cartons</span><strong>"+t.cartons+"</strong></div><div class=\"sum\"><span>Gross taka</span><strong>"+money(t.total)+"</strong></div><div class=\"sum\"><span>Commission</span><strong>"+money(t.commission)+"</strong></div><div class=\"sum final\"><span>Final total</span><strong>"+money(t.final)+"</strong></div>";
}

function paperRow(p,sl){
 return "<div class=\"tr\"><span>"+(hasData(p)?String(sl).padStart(2,"0"):"")+"</span><span title=\""+safe(p.name)+"\">"+safe(p.name)+"</span><span>"+safe(p.pack)+"</span><span>"+safe(p.ctn)+"</span><span>"+safe(p.rate?money(p.rate):"")+"</span></div>";
}
function paperCol(rows,side,totalRows){
 return "<div class=\"paperTable\"><div class=\"th\"><span>SL</span><span>PRODUCT</span><span>PACK</span><span>CTN</span><span>RATE</span></div>"+rows.map((p,i)=>paperRow(p,slFor(i,side,totalRows))).join("")+"</div>";
}
function renderPreview(){
 const t=totals(),totalRows=state.rows.length,left=state.rows.map(r=>r.left),right=state.rows.map(r=>r.right),shown=state.rows.slice(0,ROWS_PER_SIDE+FIRST_PAGE_EXTRA_ROWS);
 const previewRows=shown,extra=Math.max(0,state.rows.length-8);
 const leftPreview=previewRows.map(r=>r.left),rightPreview=previewRows.map(r=>r.right);
 $("#pdfPreview").innerHTML="<div class=\"a4Sheet\"><div class=\"paperHeader\"><div><div class=\"paperBrand\">BNC AGROCARE</div><div class=\"paperTitle\">INVOICE</div></div><div class=\"paperMeta\">REF "+safe(state.ref)+"<br>NO. "+safe(state.invoiceNo)+"<br>"+safe(displayDate(state.date))+"</div></div><div class=\"metaGrid\"><div class=\"metaBox\"><small>TRADER / SHOP</small><strong>"+safe(state.trader)+"</strong></div><div class=\"metaBox\"><small>BUYER</small><strong>"+safe(state.buyer)+"</strong></div><div class=\"metaBox\"><small>ADDRESS</small><strong>"+safe(state.address)+"</strong></div><div class=\"metaBox\"><small>MOBILE</small><strong>"+safe(state.mobile)+"</strong></div></div><div class=\"paperTables\">"+paperCol(leftPreview,"left",totalRows)+paperCol(rightPreview,"right",totalRows)+"</div>"+(extra?"<div class=\"paperContinuation\">+"+extra+" additional row"+(extra===1?"":"s")+" continue on the PDF.</div>":"")+"<div class=\"paperSummary\"><div class=\"paperTotal\"><span>TOTAL CARTON</span><strong>"+t.cartons+"</strong></div><div class=\"paperTotal\"><span>GROSS TAKA</span><strong>"+money(t.total)+"</strong></div><div class=\"paperTotal\"><span>COMMISSION</span><strong>"+money(t.commission)+"</strong></div><div class=\"paperTotal\"><span>TOTAL AMOUNT</span><strong>"+money(t.final)+"</strong></div><div class=\"paperWords\">Total Taka (In words): "+safe(words(t.final))+"</div></div><div class=\"paperFoot\"><span>Representative: Md Rezaul Karim</span><span>BNC AgroCare</span></div></div>";
}

async function loadPdfLib(){
 if(window.PDFLib?.PDFDocument)return window.PDFLib;
 if(pdfLibPromise)return pdfLibPromise;
 pdfLibPromise=new Promise((resolve,reject)=>{
  const urls=["https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js","https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js"];let i=0;
  const next=()=>{if(window.PDFLib?.PDFDocument)return resolve(window.PDFLib);if(i>=urls.length)return reject(Error("PDF engine unavailable"));const s=document.createElement("script");s.src=urls[i++];s.onload=()=>window.PDFLib?.PDFDocument?resolve(window.PDFLib):next();s.onerror=next;document.head.append(s)};
  next();
 });
 return pdfLibPromise;
}
async function loadTemplate(){
 try{const r=await fetch(TEMPLATE,{cache:"force-cache"});if(r.ok)return r.arrayBuffer()}catch{}
 if("caches"in window){const r=await caches.match(new URL(TEMPLATE,location.href));if(r)return r.arrayBuffer()}
 throw Error("Locked invoice template unavailable");
}

function drawTextFit(page,text,x,y,w,h,font,size,align="left"){
 const v=String(text??"");if(!v)return;let s=size;while(s>3.2&&font.widthOfTextAtSize(v,s)>Math.max(2,w-4))s-=.2;const tw=font.widthOfTextAtSize(v,s);const tx=align==="center"?x+(w-tw)/2:align==="right"?x+w-tw-2:x+2;page.drawText(v,{x:Math.max(x+1,tx),y:y+Math.max(1,(h-s)/2+1),size:s,font,color:window.PDFLib.rgb(0,0,0)});
}
function box(page,x,y,w,h){page.drawRectangle({x,y,width:w,height:h,borderColor:window.PDFLib.rgb(0,0,0),borderWidth:.7})}
const X=[22.883,35.553,96.994,152.482,172.693,211.939,259.504,272.572,334.409,393.852,412.476,462.422,521.496],BASE=[681.80975,671.69073,661.57074,651.45074],BH=8.12,SY=[641.33179,632.33179,622.59479,612.85779,603.11975],SH=[7,9.74,9.74,9.74,8.12];
function col(page,v,c,y,h,font){drawTextFit(page,v,X[c],y,X[c+1]-X[c],h,font,7.6,[0,3,4,5].includes(c)?"center":"left")}
function drawProduct(page,p,sl,base,y,h,font){
 const valid=hasData(p),vals=[valid?String(sl).padStart(2,"0"):"",valid?p.name:"",valid?p.pack:"",valid?p.ctn:"",valid&&p.rate?money(p.rate):"",valid&&p.ctn&&p.rate?money(num(p.ctn)*num(p.rate)):""];
 for(let c=0;c<6;c++)col(page,vals[c],base+c,y,h,font);
}
function drawPair(page,row,rowIndex,totalRows,y,h,font){
 drawProduct(page,row.left,slFor(rowIndex,"left",totalRows),0,y,h,font);
 drawProduct(page,row.right,slFor(rowIndex,"right",totalRows),6,y,h,font);
}
function drawExisting(page,font){
 for(let i=0;i<ROWS_PER_SIDE;i++)drawPair(page,state.rows[i],i,state.rows.length,BASE[i],BH,font);
}
function drawSummary(page,t,shift,font,bold){
 const ys=SY.map(y=>y-shift),b1=X[1],b3=X[3],d=X[3],f=X[5],h=X[7],i=X[8],l=X[11],r=X[12];
 const row=(label,y,hgt,lv,rl,rv,mode)=>{
  if(mode===0){box(page,b1,y,b3-b1,hgt);box(page,d,y,f-d,hgt);box(page,h,y,i-h,hgt);box(page,l,y,r-l,hgt);drawTextFit(page,label,b1,y,b3-b1,hgt,bold,7.2,"center");drawTextFit(page,lv,d,y,f-d,hgt,font,7.2,"right");drawTextFit(page,rl,h,y,i-h,hgt,bold,7.2,"center");drawTextFit(page,rv,l,y,r-l,hgt,font,7.2,"right")}
  else if(mode===1){box(page,b1,y,b3-b1,hgt);box(page,d,y,f-d,hgt);box(page,h,y,l-h,hgt);box(page,l,y,r-l,hgt);drawTextFit(page,label,b1,y,b3-b1,hgt,bold,7,"center");drawTextFit(page,lv,d,y,f-d,hgt,font,7.2,"right");drawTextFit(page,rl,h,y,l-h,hgt,bold,7,"center");drawTextFit(page,rv,l,y,r-l,hgt,font,7.2,"right")}
  else{box(page,b1,y,l-b1,hgt);box(page,l,y,r-l,hgt);drawTextFit(page,label,b1,y,l-b1,hgt,bold,7.1,"right");drawTextFit(page,lv,l,y,r-l,hgt,font,7.1,mode===4?"left":"right")}
 };
 row("ST",ys[0],SH[0],money(t.leftAmount),"ST",money(t.rightAmount),0);
 row("Total Carton",ys[1],SH[1],String(t.cartons),"Total Taka",money(t.total),1);
 row("Commission %",ys[2],SH[2],String(state.commission),"","",2);
 row("Total Amount",ys[3],SH[3],money(t.final),"","",3);
 row("Total Taka (In words):",ys[4],SH[4],words(t.final),"","",4);
}
function cellBorders(page,base,y,h){for(let c=0;c<6;c++)box(page,X[base+c],y,X[base+c+1]-X[base+c],h)}
function drawExtraRows(page,font,bold){
 const extra=state.rows.slice(ROWS_PER_SIDE,ROWS_PER_SIDE+FIRST_PAGE_EXTRA_ROWS);
 if(!extra.length)return 0;
 const rh=9.8,white=window.PDFLib.rgb(1,1,1);
 page.drawRectangle({x:X[0]-1,y:548,width:X[12]-X[0]+2,height:94,color:white});
 extra.forEach((row,j)=>{
  const y=SY[0]-j*rh;
  drawPair(page,row,ROWS_PER_SIDE+j,state.rows.length,y,rh,font);
  cellBorders(page,0,y,rh);cellBorders(page,6,y,rh);
 });
 drawSummary(page,totals(),extra.length*rh,font,bold);
 return extra.length;
}
async function continuation(doc,rows,startRow,totalRows,font,bold){
 const {rgb}=window.PDFLib;
 const xL=[32,54,158,207,239,279,293],xR=[304,326,430,479,511,551,565],heads=["SL","PRODUCT","PACK","CTN","RATE","AMOUNT"];
 const rowH=20,top=742,bottom=48,perPage=Math.floor((top-bottom)/rowH);
 let offset=0;
 while(offset<rows.length){
  const page=doc.addPage([595.28,841.89]);
  page.drawText("BNC AGROCARE",{x:32,y:790,size:17,font:bold,color:rgb(.043,.239,.180)});
  page.drawText("INVOICE CONTINUATION",{x:32,y:771,size:8,font:bold,color:rgb(.043,.239,.180)});
  [["LEFT",xL],["RIGHT",xR]].forEach(([title,xs])=>{
   page.drawText(title,{x:xs[0],y:755,size:6.5,font:bold,color:rgb(.25,.34,.29)});
   heads.forEach((h,i)=>page.drawText(h,{x:xs[i]+2,y:742,size:5.8,font:bold,color:rgb(.2,.28,.24)}));
  });
  const chunk=rows.slice(offset,offset+perPage);
  chunk.forEach((row,j)=>{
   const globalRow=startRow+offset+j,y=top-j*rowH-13;
   const drawSide=(p,side,xs)=>{
    const vals=[hasData(p)?String(slFor(globalRow,side,totalRows)).padStart(2,"0"):"",hasData(p)?p.name:"",hasData(p)?p.pack:"",hasData(p)?p.ctn:"",hasData(p)&&p.rate?money(p.rate):"",hasData(p)&&p.ctn&&p.rate?money(num(p.ctn)*num(p.rate)):""];
    for(let i=0;i<6;i++){box(page,xs[i],y,xs[i+1]-xs[i],rowH);drawTextFit(page,vals[i],xs[i],y,xs[i+1]-xs[i],rowH,font,6.8,[0,3,4,5].includes(i)?"center":"left")}
   };
   drawSide(row.left,"left",xL);drawSide(row.right,"right",xR);
  });
  page.drawText("Continuation generated from the locked BNC invoice template.",{x:32,y:25,size:6.2,font,color:rgb(.35,.4,.37)});
  offset+=chunk.length;
 }
}

async function generate(){
 if(generate.busy)return lastPdf;generate.busy=true;
 const btn=$("#previewBtn");btn.disabled=true;normalize();renderPreview();$("#pdfState").textContent="Generating...";setStatus("Loading PDF engine...");
 try{
  const PDFLib=await loadPdfLib(),{PDFDocument,StandardFonts}=PDFLib,doc=await PDFDocument.load(await loadTemplate(),{updateMetadata:false});
  const form=doc.getForm();
  const put=(name,value)=>{try{form.getTextField(name).setText(String(value??""));return true}catch{return false}};
  put("header_B4_L4",state.ref);put("invoice_number",state.invoiceNo);put("invoice_date",displayDate(state.date));put("dealer_trader_name",state.trader);put("dealer_buyer_name",state.buyer);put("dealer_address",state.address);put("dealer_mobile",state.mobile);
  put("header_I6_L6","Md Rezaul Karim");put("header_I7_L7","Officer BNC AGRO CARE Area Manager");put("header_I8_L8","01718-306103");
  const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
  try{form.updateFieldAppearances(font)}catch{}
  if(!doc.getPages().length)throw Error("Invoice template has no pages");
  const page=doc.getPage(0),inlineExtra=drawExtraRows(page,font,bold);
  if(!inlineExtra)drawSummary(page,totals(),0,font,bold);
  drawExisting(page,font);
  const shownRows=ROWS_PER_SIDE+inlineExtra,remaining=state.rows.slice(shownRows);
  if(remaining.length)await continuation(doc,remaining,shownRows,state.rows.length,font,bold);
  lastPdf=await doc.save({useObjectStreams:false,addDefaultPage:false,updateFieldAppearances:true});
  $("#pdfState").textContent=remaining.length?"PDF ready · continuation":"PDF ready · A4";setStatus("Ready");return lastPdf;
 }finally{generate.busy=false;btn.disabled=false}
}
async function download(){
 const b=lastPdf||await generate(),url=URL.createObjectURL(new Blob([b],{type:"application/pdf"})),a=document.createElement("a");a.href=url;a.download="BNC-Invoice-"+state.invoiceNo+".pdf";a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function reset(){
 Object.assign(state,{ref:"X2",invoiceNo:String((Number(state.invoiceNo)||1)+1).padStart(4,"0"),date:today(),commission:0,trader:"",buyer:"",address:"",mobile:"",rows:Array.from({length:ROWS_PER_SIDE},blankRow)});
 lastPdf=null;syncFields();renderProducts();saveDraft();$("#pdfState").textContent="Ready";setStatus("New invoice");
}
function saveInvoice(){
 if(!db)return;const t=totals(),id=state.invoiceNo+"-"+Date.now();db.transaction("invoices","readwrite").objectStore("invoices").put({id,invoiceNumber:state.invoiceNo,total:t.final,updatedAt:Date.now(),data:copy()});saveDraft();history();setStatus("Invoice saved");
}
function history(){
 if(!db)return;const host=$("#history");host.replaceChildren();const req=db.transaction("invoices").objectStore("invoices").openCursor(),items=[];
 req.onsuccess=()=>{const c=req.result;if(c){items.push(c.value);c.continue();return}items.sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0));
 if(!items.length){host.innerHTML="<div class=\"historyRow\"><div><strong>No saved invoices</strong><small>Saved documents from this device will appear here.</small></div></div>";return}
 items.forEach(x=>{const row=document.createElement("div");row.className="historyRow";row.innerHTML="<div><strong>"+safe(x.invoiceNumber)+"</strong><small>"+money(x.total)+" · "+new Date(x.updatedAt).toLocaleString()+"</small></div>";const actions=document.createElement("div");actions.className="rowActions";
 [["Load",()=>{Object.assign(state,x.data);normalize();syncFields();renderProducts();saveDraft();setStatus("Loaded "+x.invoiceNumber)}],["Copy",()=>{Object.assign(state,x.data);state.invoiceNo=String((Number(state.invoiceNo)||0)+1).padStart(4,"0");state.date=today();normalize();syncFields();renderProducts();saveDraft();setStatus("Copied "+x.invoiceNumber)}],["Delete",()=>{db.transaction("invoices","readwrite").objectStore("invoices").delete(x.id).onsuccess=history},"del"]].forEach(([label,fn,cl])=>{const b=document.createElement("button");b.type="button";b.textContent=label;if(cl)b.className=cl;b.onclick=fn;actions.append(b)});row.append(actions);host.append(row)})
 }}
function exportJson(){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([JSON.stringify(copy(),null,2)],{type:"application/json"}));a.href=url;a.download="BNC-Invoice-"+state.invoiceNo+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function importJson(file){file.text().then(t=>{const d=JSON.parse(t);if(!Array.isArray(d.rows)&&!Array.isArray(d.products))throw Error();Object.assign(state,d);normalize();syncFields();renderProducts();saveDraft();setStatus("Imported")}).catch(()=>alert("Invalid invoice JSON"))}
function install(){window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("#installBtn").hidden=false});$("#installBtn").onclick=async()=>{if(!deferred)return;await deferred.prompt();deferred=null;$("#installBtn").hidden=true};window.addEventListener("appinstalled",()=>$("#installBtn").hidden=true)}

install();
(async()=>{
 try{
  await dbOpen();const req=db.transaction("drafts").objectStore("drafts").get("current");req.onsuccess=()=>{if(req.result?.data)Object.assign(state,req.result.data);normalize();syncFields();renderProducts();bindFields();history()}
 }catch{normalize();syncFields();renderProducts();bindFields()}
 $("#addBtn").onclick=addProductRow;$("#newBtn").onclick=reset;$("#saveBtn").onclick=saveInvoice;
 $("#previewBtn").onclick=()=>generate().catch(e=>{setStatus("PDF error");$("#pdfState").textContent="Generation failed";alert(e?.message||"Unable to generate PDF")});
 $("#downloadBtn").onclick=()=>download().catch(e=>alert(e?.message||"Unable to download PDF"));
 $("#jsonOutBtn").onclick=exportJson;$("#jsonInBtn").onclick=()=>$("#jsonFile").click();$("#jsonFile").onchange=e=>{const f=e.target.files?.[0];if(f)importJson(f);e.target.value=""};
})();
})();
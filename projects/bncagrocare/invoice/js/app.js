(()=>{"use strict";
const $=s=>document.querySelector(s);
const DB_NAME="bnc-invoice-exact-sheet",DB_VERSION=2;
const TEMPLATE_URL="../invoice.pdf";
const PDF_FIELDS={
 ref:"header_B4_L4",invoiceNo:"invoice_number",date:"invoice_date",
 repName:"header_I6_L6",repRole:"header_I7_L7",repMob:"header_I8_L8",
 trader:"dealer_trader_name",buyer:"dealer_buyer_name",address:"dealer_address",dealerMob:"dealer_mobile",
 rowsLeft:10,rowsRight:10
};
const blank=()=>({name:"",pack:"",ctn:"",rate:""});
const firstRows=()=>Array.from({length:4},blank);
const state={
 ref:"X2",invoiceNo:"0002",date:"",traderName:"",buyerName:"",address:"",dealerMobile:"",
 repName:"Md Rezaul Karim",repRole:"Officer BNC AGRO CARE Area Manager",repMob:"01718-306103",
 commission:0,left:firstRows(),right:firstRows(),amountWords:""
};
let db=null,timer=null,pdfTimer=null,deferredInstall=null,pdfUrl="",renderSeq=0,pdfBytes=null,pdfjsPromise=null,pdfDocument=null,templateBytesPromise=null,renderingPdf=null;

function localDate(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function displayDate(v){const m=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+"/"+m[2]+"/"+m[1]:String(v||"")}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
function money(v){return num(v).toFixed(2)}
function hasData(x){return !!(String(x.name||"").trim()||String(x.pack||"").trim()||String(x.ctn||"").trim()||String(x.rate||"").trim())}
function ensureFour(side){while(state[side].length<4)state[side].push(blank())}
function trimTrailing(side){ensureFour(side);while(state[side].length>4&&!hasData(state[side][state[side].length-1])&&!hasData(state[side][state[side].length-2]))state[side].pop();ensureFour(side)}
function normalize(){
  ["left","right"].forEach(side=>{
    state[side]=Array.isArray(state[side])?state[side].map(x=>({name:String(x?.name||""),pack:String(x?.pack||""),ctn:String(x?.ctn||""),rate:String(x?.rate||"")})):firstRows();
    trimTrailing(side);
  });
  state.commission=Math.max(0,num(state.commission));
  state.nextAddSide=state.nextAddSide==="right"?"right":"left";
  const leftExtra=Math.max(0,state.left.length-4),rightExtra=Math.max(0,state.right.length-4);
  if(!state.hasOwnProperty("_nextSideSaved"))state.nextAddSide=leftExtra===rightExtra?"left":leftExtra>rightExtra?"right":"left";
  state._nextSideSaved=true;
  delete state.freeCells;
}
function slFor(side,index){
  return side==="left"?(index<4?index+1:9+(index-4)*2):(index<4?index+5:10+(index-4)*2);
}
function nextProductLabel(){
  const side=state.nextAddSide==="right"?"Right":"Left";
  const extra=state[side.toLowerCase()].length-4;
  return "Next slot: "+side+" · SL "+slFor(side.toLowerCase(),extra+4);
}

function totals(){
  const left=state.left.filter(hasData),right=state.right.filter(hasData);
  const leftCartons=left.reduce((s,i)=>s+num(i.ctn),0),rightCartons=right.reduce((s,i)=>s+num(i.ctn),0);
  const leftAmount=left.reduce((s,i)=>s+num(i.ctn)*num(i.rate),0),rightAmount=right.reduce((s,i)=>s+num(i.ctn)*num(i.rate),0);
  const totalTaka=leftAmount+rightAmount,commissionAmount=totalTaka*num(state.commission)/100,finalTotal=Math.max(0,totalTaka-commissionAmount);
  return{left,right,leftCartons,rightCartons,totalCartons:leftCartons+rightCartons,leftAmount,rightAmount,totalTaka,commissionAmount,finalTotal}
}
function numberWords(n){
  n=Math.max(0,Math.round(num(n)*100))/100;
  const whole=Math.floor(n),paisa=Math.round((n-whole)*100);
  const ones=["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function w(x){if(x<20)return ones[x];if(x<100)return tens[Math.floor(x/10)]+(x%10?" "+ones[x%10]:"");if(x<1000)return ones[Math.floor(x/100)]+" Hundred"+(x%100?" "+w(x%100):"");if(x<100000)return w(Math.floor(x/1000))+" Thousand"+(x%1000?" "+w(x%1000):"");if(x<10000000)return w(Math.floor(x/100000))+" Lakh"+(x%100000?" "+w(x%100000):"");return w(Math.floor(x/10000000))+" Crore"+(x%10000000?" "+w(x%10000000):"")}
  return w(whole)+" Taka"+(paisa?" and "+String(paisa).padStart(2,"0")+" Paisa":"")+" Only"
}
function toast(msg){const e=$("#toast");e.textContent=msg;e.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove("show"),1800)}
function nextNo(){const key="bnc-invoice-next",n=Math.max(3,Math.floor(num(localStorage.getItem(key)||3)));localStorage.setItem(key,String(n+1));return String(n).padStart(4,"0")}
function syncCounter(v){const m=String(v||"").match(/^\d{1,4}$/);if(!m)return;const n=Number(m[0])+1,cur=Math.max(1,Math.floor(num(localStorage.getItem("bnc-invoice-next")||1)));if(n>cur)localStorage.setItem("bnc-invoice-next",String(n))}
function ensureNumber(){if(!state.invoiceNo)state.invoiceNo=nextNo();syncCounter(state.invoiceNo)}

function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("invoices")){const s=d.createObjectStore("invoices",{keyPath:"id"});s.createIndex("updatedAt","updatedAt")}if(!d.objectStoreNames.contains("drafts"))d.createObjectStore("drafts",{keyPath:"id"})};r.onsuccess=()=>{db=r.result;resolve()};r.onerror=()=>reject(r.error)})}
function saveDraft(){if(!db)return;const data=JSON.parse(JSON.stringify(state));const req=db.transaction("drafts","readwrite").objectStore("drafts").put({id:"current",updatedAt:Date.now(),data});req.onsuccess=()=>$("#saveState").textContent="Saved locally";req.onerror=()=>$("#saveState").textContent="Save error"}
function scheduleSave(){clearTimeout(timer);$("#saveState").textContent="Saving…";timer=setTimeout(saveDraft,220)}

function createInput(side,i,key,placeholder,type){
  const input=document.createElement("input");input.className="field "+key;input.value=state[side][i][key]||"";if(placeholder)input.placeholder=placeholder;if(type){input.type=type;input.min="0";input.step="0.01"}
  input.addEventListener("input",()=>{
    state[side][i][key]=input.value;
    syncTotalsPanel();scheduleSave();queuePdfRender()
  });return input
}
function editorRow(side,i){
  const row=document.createElement("div");row.className="prod-row";row.dataset.i=i;
  const no=document.createElement("span");no.className="prod-num";no.textContent=slFor(side,i);row.append(no);
  row.append(createInput(side,i,"name","Product"));
  row.append(createInput(side,i,"pack","Pack"));
  row.append(createInput(side,i,"ctn","", "number"));
  row.append(createInput(side,i,"rate","", "number"));
  return row
}
function appendEditorRow(side,i){const host=$("#"+side+"Editor");const row=editorRow(side,i);host.appendChild(row)}
function hostRows(side){return [...document.querySelectorAll("#"+side+"Editor .prod-row")]}
function addProduct(){
  const side=state.nextAddSide==="right"?"right":"left";
  const index=state[side].length;
  state[side].push(blank());
  state.nextAddSide=side==="left"?"right":"left";
  renderEditor(side);
  $("#nextProductHint").textContent=nextProductLabel();
  const row=hostRows(side).find(x=>Number(x.dataset.i)===index);
  row?.querySelector(".name")?.focus();
  syncTotalsPanel();scheduleSave();queuePdfRender()
}
function renderEditor(side){
  const host=$("#"+side+"Editor");host.innerHTML='<div class="prod-head"><span>SL</span><span>Products</span><span>Pack</span><span>Ctn</span><span>Rate / Ctn</span></div>';
  state[side].forEach((_,i)=>host.appendChild(editorRow(side,i)));
}
function renderEditors(){
  ensureFour("left");ensureFour("right");
  renderEditor("left");renderEditor("right");syncEditors();syncTotalsPanel();
  $("#nextProductHint").textContent=nextProductLabel();
}

function syncEditors(){
  ensureNumber();
  $("#ref").value=state.ref;$("#invoiceNo").value=String(state.invoiceNo).padStart(4,"0");$("#invoiceDate").value=state.date;
  $("#dealerTraderName").value=state.traderName;$("#dealerBuyerName").value=state.buyerName;$("#dealerAddress").value=state.address;$("#dealerMobile").value=state.dealerMobile;
  $("#repName").value=state.repName;$("#repRole").value=state.repRole;$("#repMob").value=state.repMob;$("#commission").value=state.commission
}
function readSimple(){
  state.ref=$("#ref").value.trim();state.invoiceNo=$("#invoiceNo").value.trim();state.date=$("#invoiceDate").value;
  state.traderName=$("#dealerTraderName").value.trim();state.buyerName=$("#dealerBuyerName").value.trim();state.address=$("#dealerAddress").value.trim();state.dealerMobile=$("#dealerMobile").value.trim();
  state.repName=$("#repName").value.trim();state.repRole=$("#repRole").value.trim();state.repMob=$("#repMob").value.trim();state.commission=Math.max(0,num($("#commission").value));
  ensureNumber()
}
function syncTotalsPanel(){
  const t=totals();state.amountWords=numberWords(t.finalTotal);
  $("#commissionAmount").value=money(t.commissionAmount);$("#finalTotal").value=money(t.finalTotal);$("#amountWords").value=state.amountWords
}
function bindSimpleInputs(){
  ["ref","invoiceNo","invoiceDate","dealerTraderName","dealerBuyerName","dealerAddress","dealerMobile","repName","repRole","repMob","commission"].forEach(id=>{
    $("#"+id).addEventListener("input",()=>{readSimple();syncTotalsPanel();scheduleSave();queuePdfRender()})
  })
}

function safeTextField(form,name,value,fieldMap){
  try{
    const f=fieldMap?.get(name)||form.getTextField(name);
    f.setText(value==null?"":String(value));return true
  }catch(e){return false}
}
function buildFieldMap(form){const map=new Map();for(const f of form.getFields()){try{map.set(f.getName(),f)}catch(e){}}return map}
function fillProductFields(form,side,items,fieldMap){
  const cols=side==="left"?["A","B","C","D","E","F"]:["G","H","I","J","K","L"];
  for(let i=0;i<4;i++){
    const item=items[i]||blank(),active=hasData(item),amount=active?money(num(item.ctn)*num(item.rate)):"";
    const row=10+i,sl=slFor(side,i);
    safeTextField(form,"cell_"+cols[0]+row,active?String(sl):"",fieldMap);
    safeTextField(form,"cell_"+cols[1]+row,active?item.name:"",fieldMap);
    safeTextField(form,"cell_"+cols[2]+row,active?item.pack:"",fieldMap);
    safeTextField(form,"cell_"+cols[3]+row,active?item.ctn:"",fieldMap);
    safeTextField(form,"cell_"+cols[4]+row,active?item.rate:"",fieldMap);
    safeTextField(form,"cell_"+cols[5]+row,amount,fieldMap)
  }
}
function fillTemplateForm(form){
  const t=totals();ensureNumber();state.amountWords=numberWords(t.finalTotal);const fieldMap=buildFieldMap(form);
  safeTextField(form,PDF_FIELDS.ref,state.ref,fieldMap);
  safeTextField(form,PDF_FIELDS.invoiceNo,state.invoiceNo,fieldMap);
  safeTextField(form,PDF_FIELDS.date,displayDate(state.date),fieldMap);
  safeTextField(form,PDF_FIELDS.repName,state.repName,fieldMap);safeTextField(form,PDF_FIELDS.repRole,state.repRole,fieldMap);safeTextField(form,PDF_FIELDS.repMob,state.repMob,fieldMap);
  safeTextField(form,PDF_FIELDS.trader,state.traderName,fieldMap);safeTextField(form,PDF_FIELDS.buyer,state.buyerName,fieldMap);safeTextField(form,PDF_FIELDS.address,state.address,fieldMap);safeTextField(form,PDF_FIELDS.dealerMob,state.dealerMobile,fieldMap);
  fillProductFields(form,"left",state.left.slice(0,4),fieldMap);fillProductFields(form,"right",state.right.slice(0,4),fieldMap);
  safeTextField(form,"cell_D16",String(t.leftCartons),fieldMap);safeTextField(form,"cell_F16",money(t.leftAmount),fieldMap);safeTextField(form,"cell_L16",money(t.rightAmount),fieldMap);
  safeTextField(form,"cell_D17",String(t.totalCartons),fieldMap);safeTextField(form,"cell_L17",money(t.totalTaka),fieldMap);
  safeTextField(form,"cell_L18",String(state.commission),fieldMap);safeTextField(form,"cell_L19",money(t.finalTotal),fieldMap);safeTextField(form,"cell_D20_K20",state.amountWords,fieldMap);
}
function fitText(text,max){text=String(text||"");return text.length<=max?text:text.slice(0,Math.max(0,max-1))+"…"}
const X=[22.883,35.553,152.482,172.693,211.939,259.504,272.572,334.409,393.852,412.476,462.422,521.496];
const PRODUCT_CELLS=[[22.883,35.553],[37.553,96.994],[98.994,152.482],[154.482,172.693],[174.693,211.939],[213.939,259.504],[261.504,272.572],[274.572,334.409],[336.409,393.852],[395.852,412.476],[414.476,462.422],[464.422,521.496]];
const ROW_TOP=649.45, ROW_H=10.12;
const SUMMARY_TOP=ROW_TOP-(ROW_H*4), SUMMARY_BOTTOM=SUMMARY_TOP-44.34, MIN_SUMMARY_BOTTOM=548.0;
const SUMMARY_ROWS=[
  {h:7.0,label:"ST",labelX1:X[1],labelX2:X[3],v1X:X[3],v1W:X[5]-X[3],rightLabel:"ST",rightLabelX1:X[7],rightLabelX2:X[9],rightV1X:X[11]},
  {h:9.74,label:"Total Carton",labelX1:X[1],labelX2:X[3],v1X:X[3],v1W:X[5]-X[3],rightLabel:"Total Taka",rightLabelX1:X[8],rightLabelX2:X[11],rightV1X:X[11]},
  {h:9.74,label:"Commission %",labelX1:X[1],labelX2:X[11],v1X:X[11],v1W:X[12]-X[11]},
  {h:9.74,label:"Total Amount",labelX1:X[1],labelX2:X[11],v1X:X[11],v1W:X[12]-X[11]},
  {h:8.12,label:"Total Taka (In words):",labelX1:X[1],labelX2:X[3],v1X:X[3],v1W:X[11]-X[3]}
];

function drawBox(page,x,y,w,h,border=.7){
  page.drawRectangle({x,y,width:w,height:h,borderColor:PDFLib.rgb(0,0,0),borderWidth:border,color:PDFLib.rgb(1,1,1)});
}
function drawTextFit(page,text,x,y,w,h,font,size,align="left"){
  const v=String(text??"");if(!v)return;
  let fs=size;
  while(fs>3.5 && font.widthOfTextAtSize(v,fs)>w-4)fs-=.25;
  const tw=font.widthOfTextAtSize(v,fs);
  const tx=align==="center"?x+(w-tw)/2:align==="right"?x+w-tw-2:x+2;
  page.drawText(v,{x:Math.max(x+1,tx),y:y+Math.max(1,(h-fs)/2+1.5),size:fs,font,color:PDFLib.rgb(0,0,0)});
}
function dynamicRowHeight(extraRows){
  if(extraRows<=0)return ROW_H;
  return Math.min(ROW_H,(SUMMARY_TOP-MIN_SUMMARY_BOTTOM)/extraRows);
}
function drawExtraProductRows(page,left,right,maxRows,regular,bold){
  const extraRows=Math.max(0,maxRows-4);
  if(!extraRows)return 0;
  const rh=dynamicRowHeight(extraRows);
  const totalExtraH=extraRows*rh;
  const clearBottom=SUMMARY_BOTTOM-totalExtraH;
  // Preserve SL 1–4. Clear only the summary area plus the space occupied by the inserted rows.
  page.drawRectangle({
    x:PRODUCT_CELLS[0][0],
    y:clearBottom,
    width:PRODUCT_CELLS[PRODUCT_CELLS.length-1][1]-PRODUCT_CELLS[0][0],
    height:SUMMARY_TOP-clearBottom,
    color:PDFLib.rgb(1,1,1),
    borderWidth:0
  });
  for(let r=0;r<extraRows;r++){
    const y=SUMMARY_TOP-(r+1)*rh;
    const li=r+4,ri=r+4,l=left[li]||blank(),rr=right[ri]||blank();
    const vals=[
      hasData(l)?slFor("left",li):"",hasData(l)?l.name:"",hasData(l)?l.pack:"",hasData(l)?l.ctn:"",hasData(l)?l.rate:"",hasData(l)?money(num(l.ctn)*num(l.rate)):"",
      hasData(rr)?slFor("right",ri):"",hasData(rr)?rr.name:"",hasData(rr)?rr.pack:"",hasData(rr)?rr.ctn:"",hasData(rr)?rr.rate:"",hasData(rr)?money(num(rr.ctn)*num(rr.rate)):""
    ];
    for(let c=0;c<PRODUCT_CELLS.length;c++){
      const x1=PRODUCT_CELLS[c][0],x2=PRODUCT_CELLS[c][1],w=x2-x1;
      drawBox(page,x1,y,w,rh,.75);
      const center=[0,3,4,5,6,9,10,11].includes(c);
      drawTextFit(page,fitText(vals[c],[4,28,10,8,10,13,4,28,10,8,10,13][c]),x1,y,w,rh,regular,Math.min(8,Math.max(4,rh*.72)),center?"center":"left");
    }
  }
  return totalExtraH;
}
function drawDynamicSummary(page,t,shift,regular,bold){
  if(shift<=0)return;
  let top=SUMMARY_TOP-shift;
  const heights=[7.0,9.74,9.74,9.74,8.12];
  const rows=[
    {top,label:"ST",leftValue:money(t.leftAmount),rightLabel:"ST",rightValue:money(t.rightAmount)},
    {top:top-=9.74,label:"Total Carton",leftValue:String(t.totalCartons),rightLabel:"Total Taka",rightValue:money(t.totalTaka)},
    {top:top-=9.74,label:"Commission %",leftValue:String(state.commission)},
    {top:top-=9.74,label:"Total Amount",leftValue:money(t.finalTotal)},
    {top:top-=8.12,label:"Total Taka (In words):",leftValue:state.amountWords}
  ];
  const b1=X[1],b3=X[3],d=X[3],f=X[5],h=X[7],i=X[8],l=X[10],right=X[11];
  rows.forEach((row,idx)=>{
    const hgt=heights[idx],y=row.top-hgt;
    if(idx===0){
      drawBox(page,b1,y,b3-b1,hgt,.7);drawBox(page,d,y,f-d,hgt,.7);drawBox(page,h,y,i-h,hgt,.7);drawBox(page,l,y,right-l,hgt,.7);
      drawTextFit(page,row.label,b1,y,b3-b1,hgt,bold,8,"center");drawTextFit(page,row.leftValue,d,y,f-d,hgt,regular,8,"right");
      drawTextFit(page,row.rightLabel,h,y,i-h,hgt,bold,8,"center");drawTextFit(page,row.rightValue,l,y,right-l,hgt,regular,8,"right");
    }else if(idx===1){
      drawBox(page,b1,y,b3-b1,hgt,.7);drawBox(page,d,y,f-d,hgt,.7);drawBox(page,h,y,l-h,hgt,.7);drawBox(page,l,y,right-l,hgt,.7);
      drawTextFit(page,row.label,b1,y,b3-b1,hgt,bold,7.8,"center");drawTextFit(page,row.leftValue,d,y,f-d,hgt,regular,8,"right");
      drawTextFit(page,row.rightLabel,h,y,l-h,hgt,bold,7.8,"center");drawTextFit(page,row.rightValue,l,y,right-l,hgt,regular,8,"right");
    }else{
      drawBox(page,b1,y,l-b1,hgt,.7);drawBox(page,l,y,right-l,hgt,.7);
      drawTextFit(page,row.label,b1,y,l-b1,hgt,bold,8,"right");drawTextFit(page,row.leftValue,l,y,right-l,hgt,regular,8,idx===4?"left":"right");
    }
  });
}
async function generatePdf(){
  readSimple();syncTotalsPanel();
  if(!window.PDFLib)throw Error("PDF engine unavailable");
  const bytes=await getTemplateBytes();
  const doc=await PDFLib.PDFDocument.load(bytes,{updateMetadata:false,ignoreEncryption:true});
  const form=doc.getForm();fillTemplateForm(form);
  try{form.updateFieldAppearances();form.flatten()}catch(e){}
  const left=state.left,right=state.right;
  // Product rows are structural: pressing Add Product must create a visible PDF row even before data is entered.
  const activeCount=side=>Math.max(4,state[side].length);
  const maxRows=Math.max(activeCount("left"),activeCount("right"),4);
  if(maxRows>4){
    const page=doc.getPages()[0];
    const regular=await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    const bold=await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const shift=drawExtraProductRows(page,left,right,maxRows,regular,bold);
    const t=totals();state.amountWords=numberWords(t.finalTotal);drawDynamicSummary(page,t,shift,regular,bold);
  }
  return await doc.save({useObjectStreams:true,addDefaultPage:false});
}
async function getTemplateBytes(){
  if(!templateBytesPromise){
    templateBytesPromise=fetch(TEMPLATE_URL).then(response=>{
      if(!response.ok)throw Error("Invoice template unavailable ("+response.status+")");
      return response.arrayBuffer();
    });
  }
  return templateBytesPromise;
}
function queuePdfRender(){clearTimeout(pdfTimer);pdfTimer=setTimeout(updatePdfPreview,70)}

async function updatePdfPreview(){
  const seq=++renderSeq;
  $("#pdfStatus").textContent="Generating PDF…";
  try{
    const out=await generatePdf();if(seq!==renderSeq)return;
    pdfBytes=out;
    const blob=new Blob([out],{type:"application/pdf"});
    const nextUrl=URL.createObjectURL(blob);
    if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=nextUrl;
    $("#openPdf").href=pdfUrl;
    await renderCleanPdf(out,seq);
    if(seq!==renderSeq)return;
    $("#saveState").textContent="PDF ready"
  }catch(e){console.error(e);$("#pdfStatus").textContent="PDF error";toast(e.message||"Could not generate PDF")}
}
async function getPdfJs(){
  if(!pdfjsPromise){
    pdfjsPromise=import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs").then(m=>{
      m.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
      return m;
    });
  }
  return pdfjsPromise;
}
async function renderCleanPdf(bytes,seq){
  const pdfjs=await getPdfJs();
  try{await pdfDocument?.destroy()}catch(e){} pdfDocument=null;
  const loading=pdfjs.getDocument({data:bytes});
  const pdf=await loading.promise;
  if(seq!==renderSeq){try{await pdf.destroy()}catch(e){};return}
  pdfDocument=pdf;
  const stage=$("#pdfStage"),width=Math.max(320,stage.clientWidth-28);
  stage.replaceChildren();
  const dpr=Math.min(1.5,window.devicePixelRatio||1);
  for(let n=1;n<=pdf.numPages;n++){
    if(seq!==renderSeq){try{await pdf.destroy()}catch(e){};return}
    const page=await pdf.getPage(n);
    const base=page.getViewport({scale:1}),scale=width/base.width;
    const viewport=page.getViewport({scale:scale*dpr}),cssViewport=page.getViewport({scale});
    const wrap=document.createElement("div");wrap.className="pdf-page-wrap";wrap.dataset.page=String(n);
    const canvas=document.createElement("canvas");canvas.className="pdf-page";
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    canvas.style.width=Math.ceil(cssViewport.width)+"px";canvas.style.height=Math.ceil(cssViewport.height)+"px";
    wrap.appendChild(canvas);stage.appendChild(wrap);
    const task=page.render({canvasContext:canvas.getContext("2d",{alpha:false,desynchronized:true}),viewport});
    renderingPdf=task;await task.promise;renderingPdf=null;page.cleanup();
  }
  $("#pdfStatus").textContent="Live PDF · "+pdf.numPages+" page"+(pdf.numPages===1?"":"s")+" · "+(state.left.filter(hasData).length+state.right.filter(hasData).length)+" products";
}
function savePdf(){
  if(!pdfBytes)return updatePdfPreview().then(savePdf);
  const a=document.createElement("a");a.href=pdfUrl;a.download="BNC-Invoice-"+(state.invoiceNo||"draft")+".pdf";a.click()
}
function openPdf(){if(!pdfUrl){updatePdfPreview().then(openPdf);return}window.open(pdfUrl,"_blank","noopener")}
function saveRecord(){
  readSimple();syncTotalsPanel();syncCounter(state.invoiceNo);
  if(!db)return;
  const data=JSON.parse(JSON.stringify(state)),t=totals();
  const req=db.transaction("invoices","readwrite").objectStore("invoices").put({id:data.invoiceNo,invoiceNumber:data.invoiceNo,updatedAt:Date.now(),data,total:t.finalTotal});
  req.onsuccess=()=>{renderHistory();$("#saveState").textContent="Saved locally";toast("Invoice saved · "+data.invoiceNo);queuePdfRender()}
}
function renderHistory(){
  if(!db)return;const host=$("#historyList"),req=db.transaction("invoices").objectStore("invoices").index("updatedAt").openCursor(null,"prev");host.innerHTML="";
  req.onsuccess=()=>{const c=req.result;if(!c)return;const a=c.value,row=document.createElement("div");row.className="history-row";
    row.innerHTML='<div class="history-main"><strong>'+esc(a.invoiceNumber)+'</strong><span>'+money(a.total)+'</span></div><div class="history-actions"><button type="button" class="load">Load</button><button type="button" class="copy">Copy</button><button type="button" class="delete">×</button></div>';
    row.querySelector(".load").onclick=()=>{Object.assign(state,JSON.parse(JSON.stringify(a.data)));normalize();renderEditors();renderHistory();scheduleSave();queuePdfRender();toast("Invoice loaded · "+a.invoiceNumber)};
    row.querySelector(".copy").onclick=()=>{Object.assign(state,JSON.parse(JSON.stringify(a.data)));state.invoiceNo=nextNo();state.date=localDate();normalize();renderEditors();scheduleSave();queuePdfRender();toast("Copied as "+state.invoiceNo)};
    row.querySelector(".delete").onclick=()=>{if(confirm("Delete this saved invoice?"))db.transaction("invoices","readwrite").objectStore("invoices").delete(a.id).onsuccess=renderHistory};
    host.appendChild(row);c.continue()
  }
}
function esc(v){return String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function newInvoice(){
  Object.assign(state,{ref:"X2",invoiceNo:nextNo(),date:localDate(),traderName:"",buyerName:"",address:"",dealerMobile:"",commission:0,amountWords:"",left:firstRows(),right:firstRows(),nextAddSide:"left",_nextSideSaved:true});
  renderEditors();saveDraft();queuePdfRender();toast("New invoice · "+state.invoiceNo)
}
function exportJSON(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="BNC-Invoice-"+(state.invoiceNo||"draft")+".json";a.click();URL.revokeObjectURL(u)}
function importJSON(file){file.text().then(t=>{const d=JSON.parse(t);Object.assign(state,d);normalize();renderEditors();scheduleSave();queuePdfRender();toast("Invoice imported")}).catch(()=>toast("Invalid invoice JSON"))}
function setupInstall(){
  const b=$("#installBtn");addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;b.hidden=false});
  b.onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;b.hidden=true};
  addEventListener("appinstalled",()=>{b.hidden=true})
}
function bindActions(){
  $("#saveInvoice").onclick=saveRecord;$("#newInvoice").onclick=newInvoice;$("#addProductBtn").onclick=addProduct;$("#printBtn").onclick=openPdf;$("#downloadPdfBtn").onclick=savePdf;
  $("#openPdf").onclick=e=>{e.preventDefault();openPdf()};
  $("#openTemplateBtn").onclick=()=>window.open(TEMPLATE_URL,"_blank","noopener");
  $("#jsonBtn").onclick=exportJSON;$("#importBtn").onclick=()=>$("#importFile").click();$("#importFile").onchange=e=>{const f=e.target.files?.[0];if(f)importJSON(f);e.target.value=""}
}
function loadDraft(){return new Promise(resolve=>{if(!db)return resolve(false);const q=db.transaction("drafts").objectStore("drafts").get("current");q.onsuccess=()=>{if(q.result?.data){Object.assign(state,q.result.data);normalize();resolve(true)}else resolve(false)};q.onerror=()=>resolve(false)})}
(async()=>{
  try{
    await openDB();const loaded=await loadDraft();if(!loaded){ensureNumber()}
    normalize();renderEditors();bindSimpleInputs();bindActions();setupInstall();renderHistory();syncTotalsPanel();
    new ResizeObserver(()=>{if(pdfBytes)queuePdfRender()}).observe($("#pdfStage"));
    await updatePdfPreview();
  }
  catch(e){console.error(e);normalize();renderEditors();bindSimpleInputs();bindActions();setupInstall();syncTotalsPanel();queuePdfRender();toast("Invoice storage unavailable")}
})();
})();
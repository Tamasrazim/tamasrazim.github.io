(()=>{"use strict";
const $=s=>document.querySelector(s);
const TEMPLATE="../reference/BNCFINAL.xlsx",DB="bnc-invoice-xlsx-v1",ROWS_PER_SIDE=4,MAX_ROWS_PER_SIDE=50,FIRST_PAGE_EXTRA_ROWS=2;
const PRODUCTS=window.BNC_PRODUCTS||[];
const blank=()=>({name:"",pack:"",ctn:"",rate:""});
const blankRow=()=>({left:blank(),right:blank()});
const state={ref:"X2",invoiceNo:"0002",date:"",commission:0,trader:"",buyer:"",address:"",mobile:"",rows:Array.from({length:ROWS_PER_SIDE},blankRow)};
let db=null,lastBuffer=null,deferred=null;

const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const money=v=>num(v).toFixed(2);
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const displayDate=v=>{const m=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+"."+m[2]+"."+m[1]:String(v||"")};
const safe=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const hasData=p=>!!(String(p?.name||"").trim()||String(p?.pack||"").trim()||String(p?.ctn||"").trim()||String(p?.rate||"").trim());
const copy=()=>JSON.parse(JSON.stringify(state));
const productByName=name=>PRODUCTS.find(p=>p.name===String(name||""));
const slFor=(rowIndex,side,totalRows)=>side==="left"?rowIndex+1:totalRows+rowIndex+1;

function setStatus(msg){$("#status").textContent=msg}
function normalize(){
 if(!Array.isArray(state.rows))state.rows=[];
 state.rows=state.rows.map(r=>({left:{...blank(),...(r?.left||{})},right:{...blank(),...(r?.right||{})}}));
 while(state.rows.length<ROWS_PER_SIDE)state.rows.push(blankRow());
 if(state.rows.length>MAX_ROWS_PER_SIDE)state.rows=state.rows.slice(0,MAX_ROWS_PER_SIDE);
 state.commission=Math.max(0,num(state.commission));
 if(!state.date)state.date=today();
}
function totals(){
 let cartons=0,total=0,leftAmount=0,rightAmount=0;
 state.rows.forEach(r=>{
  const lc=Math.max(0,num(r.left.ctn)),la=lc*Math.max(0,num(r.left.rate));
  const rc=Math.max(0,num(r.right.ctn)),ra=rc*Math.max(0,num(r.right.rate));
  cartons+=lc+rc;total+=la+ra;leftAmount+=la;rightAmount+=ra;
 });
 const commission=total*Math.max(0,num(state.commission))/100;
 return {cartons,total,commission,final:Math.max(0,total-commission),leftAmount,rightAmount};
}

function syncFields(){document.querySelectorAll("[data-k]").forEach(el=>el.value=state[el.dataset.k]??"")}
function bindFields(){
 document.querySelectorAll("[data-k]").forEach(el=>el.addEventListener("input",()=>{
  const k=el.dataset.k;state[k]=k==="commission"?Math.max(0,num(el.value)):el.value;
  lastBuffer=null;updateSummary();renderPreview();saveDraft();
 }));
}

function dbOpen(){return new Promise((resolve,reject)=>{
 const r=indexedDB.open(DB,1);
 r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("drafts"))d.createObjectStore("drafts",{keyPath:"id"});if(!d.objectStoreNames.contains("invoices"))d.createObjectStore("invoices",{keyPath:"id"})};
 r.onsuccess=()=>{db=r.result;resolve()};r.onerror=()=>reject(r.error)
})}
function saveDraft(){if(db)db.transaction("drafts","readwrite").objectStore("drafts").put({id:"current",data:copy(),updatedAt:Date.now()})}

function refreshPackList(rowIndex,side){
 const dl=document.getElementById("pack-list-"+rowIndex+"-"+side);if(!dl)return;
 const packs=productByName(state.rows[rowIndex]?.[side]?.name)?.packs||[];
 dl.replaceChildren(...packs.map(v=>{const o=document.createElement("option");o.value=v;return o}));
}
function packListId(rowIndex,side){
 const id="pack-list-"+rowIndex+"-"+side;let dl=document.getElementById(id);
 if(!dl){dl=document.createElement("datalist");dl.id=id;document.body.append(dl)}
 refreshPackList(rowIndex,side);return id
}
function buildSide(row,rowIndex,side,totalRows){
 const wrap=document.createElement("div");wrap.className="productSide "+side;
 const head=document.createElement("div");head.className="sideHead";head.innerHTML="<span>"+(side==="left"?"LEFT":"RIGHT")+"</span><strong>SL "+String(slFor(rowIndex,side,totalRows)).padStart(2,"0")+"</strong>";wrap.append(head);
 const fields=document.createElement("div");fields.className="sideFields";
 [["name","PRODUCT","Product"],["pack","PACK","Pack size"],["ctn","CTN","0"],["rate","RATE / CTN","0.00"]].forEach(([key,label,placeholder])=>{
  const lab=document.createElement("label");lab.textContent=label;
  const input=document.createElement("input");input.value=row[key]??"";input.autocomplete="off";input.placeholder=placeholder;input.setAttribute("aria-label",label+" "+String(slFor(rowIndex,side,totalRows)).padStart(2,"0"));
  if(key==="name")input.setAttribute("list","catalog");
  if(key==="pack")input.setAttribute("list",packListId(rowIndex,side));
  if(key==="ctn"){input.type="number";input.min="0";input.step="1";input.inputMode="numeric"}
  if(key==="rate"){input.type="number";input.min="0";input.step=".01";input.inputMode="decimal"}
  input.addEventListener("input",e=>{row[key]=(key==="ctn"||key==="rate")?Math.max(0,num(e.target.value)):e.target.value;if(key==="name")refreshPackList(rowIndex,side);lastBuffer=null;updateSummary();renderPreview();saveDraft()});
  lab.append(input);fields.append(lab)
 });
 const al=document.createElement("label");al.textContent="AMOUNT";const ai=document.createElement("input");ai.readOnly=true;ai.value=row.ctn&&row.rate?money(num(row.ctn)*num(row.rate)):"";al.append(ai);fields.append(al);
 wrap.append(fields);return wrap;
}
function renderProducts(){
 normalize();lastBuffer=null;
 let catalog=document.getElementById("catalog");if(!catalog){catalog=document.createElement("datalist");catalog.id="catalog";document.body.append(catalog)}
 catalog.replaceChildren(...PRODUCTS.map(p=>{const o=document.createElement("option");o.value=p.name;return o}));
 const host=$("#products");host.replaceChildren();const totalRows=state.rows.length;
 state.rows.forEach((row,i)=>{
  const pair=document.createElement("div");pair.className="pairRow";
  pair.append(buildSide(row,i,"left",totalRows),buildSide(row,i,"right",totalRows));
  const del=document.createElement("button");del.type="button";del.className="removeRow";del.textContent="×";del.title="Remove this physical invoice row";
  del.disabled=totalRows<=ROWS_PER_SIDE;
  del.onclick=()=>{if(state.rows.length<=ROWS_PER_SIDE)return;state.rows.splice(i,1);renderProducts();saveDraft();setStatus("Invoice row removed")};
  pair.append(del);host.append(pair)
 });
 $("#rowMetric").textContent=String(totalRows);$("#slotMetric").textContent=String(totalRows*2);updateSummary();renderPreview()
}
function addProductRow(){
 if(state.rows.length>=MAX_ROWS_PER_SIDE){setStatus("Maximum 50 rows per side");return}
 state.rows.push(blankRow());renderProducts();saveDraft();setStatus("Product row added");
 const target=$("#products .pairRow:last-child input");if(target)target.focus()
}
function updateSummary(){
 const t=totals();
 $("#summary").innerHTML='<div class="sum"><span>Cartons</span><strong>'+t.cartons+'</strong></div><div class="sum"><span>Gross taka</span><strong>'+money(t.total)+'</strong></div><div class="sum"><span>Commission</span><strong>'+money(t.commission)+'</strong></div><div class="sum final"><span>Final total</span><strong>'+money(t.final)+'</strong></div>';
}

function paperRow(p,sl){
 return '<div class="tr"><span>'+(hasData(p)?String(sl).padStart(2,"0"):"")+'</span><span title="'+safe(p.name)+'">'+safe(p.name)+'</span><span>'+safe(p.pack)+'</span><span>'+safe(p.ctn)+'</span><span>'+safe(p.rate?money(p.rate):"")+'</span><span>'+(p.ctn&&p.rate?money(num(p.ctn)*num(p.rate)):"")+'</span></div>';
}
function paperCol(rows,side,totalRows){
 return '<div class="paperTable"><div class="th"><span>SL</span><span>PRODUCT</span><span>PACK</span><span>CTN</span><span>RATE</span><span>AMOUNT</span></div>'+rows.map((p,i)=>paperRow(p,slFor(i,side,totalRows))).join("")+'</div>';
}
function renderPreview(){
 const totalRows=state.rows.length,shown=state.rows.slice(0,ROWS_PER_SIDE+FIRST_PAGE_EXTRA_ROWS),t=totals();
 $("#sheetPreview").innerHTML='<div class="a4Sheet"><div class="paperHeader"><div><div class="paperBrand">BNC AGROCARE</div><div class="paperTitle">INVOICE · XLSX</div></div><div class="paperMeta">REF '+safe(state.ref)+'<br>NO. '+safe(state.invoiceNo)+'<br>'+safe(displayDate(state.date))+'</div></div><div class="metaGrid"><div class="metaBox"><small>TRADER / DEALER</small><strong>'+safe(state.trader)+'</strong></div><div class="metaBox"><small>BUYER</small><strong>'+safe(state.buyer)+'</strong></div><div class="metaBox"><small>ADDRESS</small><strong>'+safe(state.address)+'</strong></div><div class="metaBox"><small>MOBILE</small><strong>'+safe(state.mobile)+'</strong></div></div><div class="paperTables">'+paperCol(shown.map(r=>r.left),"left",totalRows)+paperCol(shown.map(r=>r.right),"right",totalRows)+'</div>'+(state.rows.length>shown.length?'<div class="paperContinuation">+ '+(state.rows.length-shown.length)+' extra row(s) will be inserted into the workbook before ST.</div>':"")+'<div class="paperSummary"><div class="paperTotal"><span>TOTAL CARTON</span><strong>'+t.cartons+'</strong></div><div class="paperTotal"><span>GROSS TAKA</span><strong>'+money(t.total)+'</strong></div><div class="paperTotal"><span>COMMISSION</span><strong>'+money(t.commission)+'</strong></div><div class="paperTotal"><span>TOTAL AMOUNT</span><strong>'+money(t.final)+'</strong></div></div><div class="paperFoot"><span>Workbook source: BNCFINAL.xlsx</span><span>Output: .xlsx</span></div></div>';
}

function findInvoiceSheet(workbook){
 return workbook.getWorksheet("01")||workbook.worksheets[0]
}
function textOfCell(cell){
 const v=cell?.value;
 if(v==null)return "";
 if(typeof v==="string"||typeof v==="number")return String(v).trim();
 if(v.richText)return v.richText.map(x=>x.text||"").join("").trim();
 if(v.text)return String(v.text).trim();
 return ""
}
function findCell(ws,labels){
 let found=null;
 ws.eachRow({includeEmpty:true},row=>row.eachCell({includeEmpty:true},cell=>{
  if(found)return;
  const s=textOfCell(cell).toLowerCase();
  if(labels.some(x=>s===x||s.includes(x))){found=cell}
 }));
 return found
}
function tryWrite(cell,value){
 try{cell.value=value;return true}catch{return false}
}
function writeNextToLabel(ws,cell,value){
 if(!cell||value==null)return false;
 const candidates=[
  ws.getCell(cell.row,cell.col+1),ws.getCell(cell.row,cell.col+2),
  ws.getCell(cell.row+1,cell.col),ws.getCell(cell.row+1,cell.col+1),
  ws.getCell(cell.row,cell.col-1)
 ].filter(x=>x&&x.col>0&&x.row>0);
 for(const c of candidates){if(!textOfCell(c)&&tryWrite(c,value))return true}
 return tryWrite(ws.getCell(cell.row,cell.col+1),value)
}
function putHeaderField(ws,labels,value){
 const cell=findCell(ws,labels);
 return writeNextToLabel(ws,cell,value)
}
function copyStyleAndRelativeFormula(source,target){
 try{target.style={...source.style}}catch{}
 if(source.formula){
  const sourceRow=source.row,targetRow=target.row;
  const formula=String(source.formula).replace(/(\$?[A-Z]{1,3}\$?)(\d+)/g,(m,col,row)=>Number(row)===sourceRow?col+targetRow:m);
  target.value={formula}
 }
}
function bumpFormulaRefsAtOrBelow(ws,startRow){
 const re=/(\$?[A-Z]{1,3}\$?)(\d+)/g;
 for(let r=startRow;r<=ws.rowCount;r++){
  const row=ws.getRow(r);
  row.eachCell({includeEmpty:false},cell=>{
   if(cell.formula){
    cell.value={formula:String(cell.formula).replace(re,(m,col,numRow)=>Number(numRow)>=startRow?col+(Number(numRow)+1):m)}
   }
  })
 }
}
function insertProductRow(ws){
 let stRow=null;
 ws.eachRow((row,rowNumber)=>{if(stRow===null&&textOfCell(row.getCell("B")).toUpperCase()==="ST")stRow=rowNumber});
 if(!stRow)throw Error('Could not find the "ST" row in BNCFINAL.xlsx');
 bumpFormulaRefsAtOrBelow(ws,stRow);
 ws.spliceRows(stRow,0,[]);
 const above=ws.getRow(stRow-1),neo=ws.getRow(stRow);
 for(let c=1;c<=12;c++)copyStyleAndRelativeFormula(above.getCell(c),neo.getCell(c));
 neo.height=above.height;
 const newSt=stRow+1;
 ["D","F","L"].forEach(col=>ws.getCell(col+newSt).value={formula:"SUM("+col+"11:"+col+stRow+")"});
 return stRow
}
function clearValue(cell){try{cell.value=null}catch{}}
function writeLine(ws,rowIndex,totalRows,side,p){
 const r=11+rowIndex;
 const base=side==="left"?0:6;
 const vals=[hasData(p)?slFor(rowIndex,side,totalRows):"",p.name||"",p.pack||"",p.ctn===""?"":num(p.ctn),p.rate===""?"":num(p.rate)];
 clearValue(ws.getCell(r,1+base));tryWrite(ws.getCell(r,1+base),vals[0]);
 [1,2,3,4].forEach((i,k)=>{const cell=ws.getCell(r,2+base+k);tryWrite(cell,vals[i]??null)});
}
function fillRows(ws){
 normalize();
 while(countInvoiceRows(ws)<state.rows.length)insertProductRow(ws);
 const totalRows=state.rows.length;
 for(let i=0;i<totalRows;i++){
  writeLine(ws,i,totalRows,"left",state.rows[i].left);
  writeLine(ws,i,totalRows,"right",state.rows[i].right);
 }
 return totalRows
}
function countInvoiceRows(ws){
 let stRow=null;
 ws.eachRow((row,rowNumber)=>{if(stRow===null&&textOfCell(row.getCell("B")).toUpperCase()==="ST")stRow=rowNumber});
 return stRow?Math.max(ROWS_PER_SIDE,stRow-11):ROWS_PER_SIDE
}

async async function buildWorkbook(){
 if(buildWorkbook.busy)return lastBuffer;
 buildWorkbook.busy=true;$("#previewBtn").disabled=true;$("#xlsxState").textContent="Preparing...";setStatus("Loading BNCFINAL.xlsx...");
 try{
  if(!window.ExcelJS?.Workbook)throw Error("ExcelJS unavailable");
  const wb=new ExcelJS.Workbook();
  const response=await fetch(TEMPLATE,{cache:"no-store"});
  if(!response.ok)throw Error("BNCFINAL.xlsx unavailable");
  await wb.xlsx.load(await response.arrayBuffer());
  const ws=findInvoiceSheet(wb);
  if(!ws)throw Error("Invoice sheet 01 is unavailable");

  putHeaderField(ws,["reference","ref"],state.ref);
  putHeaderField(ws,["invoice no","invoice number","invoice"],state.invoiceNo);
  putHeaderField(ws,["date"],displayDate(state.date));
  putHeaderField(ws,["trader / dealer","trader/dealer","trader","dealer"],state.trader);
  putHeaderField(ws,["buyer"],state.buyer);
  putHeaderField(ws,["address"],state.address);
  putHeaderField(ws,["mobile","phone"],state.mobile);

  fillRows(ws);

  const t=totals();
  putHeaderField(ws,["commission %","commission"],state.commission);
  // Preserve workbook formulas wherever the template already has them.
  if(wb.calcProperties){wb.calcProperties.fullCalcOnLoad=true;wb.calcProperties.forceFullCalc=true}
  lastBuffer=await wb.xlsx.writeBuffer();
  $("#xlsxState").textContent="XLSX ready";setStatus("Workbook ready");
  return lastBuffer
 }finally{buildWorkbook.busy=false;$("#previewBtn").disabled=false}
}
async function downloadXlsx(){
 const buffer=lastBuffer||await buildWorkbook();
 const url=URL.createObjectURL(new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
 const a=document.createElement("a");a.href=url;a.download="BNC-Invoice-"+String(state.invoiceNo||"0002")+".xlsx";a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1200);setStatus("XLSX downloaded")
}
function reset(){Object.assign(state,{ref:"X2",invoiceNo:String((Number(state.invoiceNo)||1)+1).padStart(4,"0"),date:today(),commission:0,trader:"",buyer:"",address:"",mobile:"",rows:Array.from({length:ROWS_PER_SIDE},blankRow)});lastBuffer=null;syncFields();renderProducts();saveDraft();$("#xlsxState").textContent="Ready";setStatus("New invoice")}
function saveInvoice(){if(!db)return;const t=totals(),id=state.invoiceNo+"-"+Date.now();db.transaction("invoices","readwrite").objectStore("invoices").put({id,invoiceNumber:state.invoiceNo,total:t.final,updatedAt:Date.now(),data:copy()});saveDraft();history();setStatus("Invoice saved")}
function history(){
 if(!db)return;const host=$("#history");host.replaceChildren();const req=db.transaction("invoices").objectStore("invoices").openCursor(),items=[];
 req.onsuccess=()=>{const c=req.result;if(c){items.push(c.value);c.continue();return}items.sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0));
 if(!items.length){host.innerHTML="<div class=\"historyRow\"><div><strong>No saved invoices</strong><small>Saved workbook drafts from this device appear here.</small></div></div>";return}
 items.forEach(x=>{
  const row=document.createElement("div");row.className="historyRow";row.innerHTML="<div><strong>"+safe(x.invoiceNumber)+"</strong><small>"+money(x.total)+" · "+new Date(x.updatedAt).toLocaleString()+"</small></div>";
  const actions=document.createElement("div");actions.className="rowActions";
  [["Load",()=>{Object.assign(state,x.data);normalize();syncFields();renderProducts();saveDraft();setStatus("Loaded "+x.invoiceNumber)}],["Copy",()=>{Object.assign(state,x.data);state.invoiceNo=String((Number(state.invoiceNo)||0)+1).padStart(4,"0");state.date=today();normalize();syncFields();renderProducts();saveDraft();setStatus("Copied "+x.invoiceNumber)}],["Delete",()=>{db.transaction("invoices","readwrite").objectStore("invoices").delete(x.id).onsuccess=history},"del"]].forEach(([label,fn,cl])=>{const b=document.createElement("button");b.type="button";b.textContent=label;if(cl)b.className=cl;b.onclick=fn;actions.append(b)});
  row.append(actions);host.append(row)
 })
 }
}
function exportJson(){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([JSON.stringify(copy(),null,2)],{type:"application/json"}));a.href=url;a.download="BNC-Invoice-"+state.invoiceNo+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function importJson(file){file.text().then(t=>{const d=JSON.parse(t);if(!Array.isArray(d.rows))throw Error();Object.assign(state,d);normalize();syncFields();renderProducts();saveDraft();setStatus("Imported")}).catch(()=>alert("Invalid invoice JSON"))}
function install(){window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("#installBtn").hidden=false});$("#installBtn").onclick=async()=>{if(!deferred)return;await deferred.prompt();deferred=null;$("#installBtn").hidden=true};window.addEventListener("appinstalled",()=>$("#installBtn").hidden=true)}

install();
(async()=>{
 try{
  await dbOpen();
  const req=db.transaction("drafts").objectStore("drafts").get("current");
  req.onsuccess=()=>{if(req.result?.data)Object.assign(state,req.result.data);normalize();syncFields();renderProducts();bindFields();history()}
 }catch{normalize();syncFields();renderProducts();bindFields()}
 $("#addBtn").onclick=addProductRow;$("#newBtn").onclick=reset;$("#saveBtn").onclick=saveInvoice;
 $("#previewBtn").onclick=()=>buildWorkbook().catch(e=>{setStatus("XLSX error");$("#xlsxState").textContent="Failed";alert(e?.message||"Unable to prepare XLSX")});
 $("#downloadBtn").onclick=()=>downloadXlsx().catch(e=>alert(e?.message||"Unable to download XLSX"));
 $("#jsonOutBtn").onclick=exportJson;$("#jsonInBtn").onclick=()=>$("#jsonFile").click();$("#jsonFile").onchange=e=>{const f=e.target.files?.[0];if(f)importJson(f);e.target.value=""};
})();
})();
(()=>{"use strict";
const $=s=>document.querySelector(s);
const SOURCE_VERSION=52,TEMPLATE="../reference/BNCFINAL.xlsx?v="+SOURCE_VERSION,DB="bnc-invoice-xlsx-v1",ROWS_PER_SIDE=4,MAX_ROWS_PER_SIDE=50,PRODUCT_START_ROW=11;
const PRODUCTS=window.BNC_PRODUCTS||[];
const blank=()=>({name:"",pack:"",ctn:"",rate:""});
const blankRow=()=>({left:blank(),right:blank()});
const state={ref:"X2",invoiceNo:"0002",date:"",commission:0,trader:"",buyer:"",address:"",mobile:"",rows:Array.from({length:ROWS_PER_SIDE},blankRow)};
let db=null,lastBuffer=null,deferred=null,buildBusy=false;

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

function colLetter(n){
 let out="";
 while(n>0){const m=(n-1)%26;out=String.fromCharCode(65+m)+out;n=Math.floor((n-1)/26)}
 return out;
}
function excelColorToCss(v,fallback="#111"){
 if(!v)return fallback;
 if(typeof v==="string")return v.startsWith("#")?v:"#"+v.slice(-6);
 if(v.argb){
  const a=String(v.argb);
  return a.length>=8?"#"+a.slice(-6):"#"+a;
 }
 if(v.rgb)return String(v.rgb).startsWith("#")?v.rgb:"#"+String(v.rgb).slice(-6);
 return fallback;
}
function borderCss(side,defaultColor="#222"){
 if(!side)return"";
 const style=String(side.style||"");
 if(!style)return"";
 const map={thin:"1px",medium:"2px",thick:"3px",double:"3px",hair:"1px",dotted:"1px",dashed:"1px"};
 return (map[style]||"1px")+" "+(style==="double"?"double":"solid")+" "+excelColorToCss(side.color,defaultColor);
}
function cellDisplayValue(cell){
 const v=cell?.value;
 if(v==null)return"";
 if(typeof v==="string"||typeof v==="number")return String(v);
 if(v instanceof Date)return displayDate(v.toISOString().slice(0,10));
 if(v.richText)return v.richText.map(x=>x.text||"").join("");
 if(v.result!=null)return String(v.result);
 if(v.text)return String(v.text);
 if(v.formula)return"="+v.formula;
 return"";
}
function buildWorkbookPreviewSheet(ws){
 const host=$("#sheetPreview");
 if(!host)return;
 const maxCol=Math.max(12,ws.columnCount||12);
 const maxRow=Math.max(1,ws.rowCount||1);
 const stage=document.createElement("div");
 stage.className="workbookSheet";
 const inner=document.createElement("div");
 inner.className="workbookGrid";
 const widths=[];
 for(let c=1;c<=maxCol;c++){
  const w=Number(ws.getColumn(c).width)||10;
  widths.push(Math.max(28,Math.min(260,Math.round(w*7.2)));
 }
 const heights=[];
 for(let r=1;r<=maxRow;r++){
  const h=Number(ws.getRow(r).height)||15;
  heights.push(Math.max(12,Math.min(120,Math.round(h*1.333)));
 }
 const gridX=widths.reduce((a,b)=>a+b,0);
 const gridY=heights.reduce((a,b)=>a+b,0);
 inner.style.width=gridX+"px";
 inner.style.height=gridY+"px";
 const mergeMap=new Map();
 const merges=ws.model?.merges||[];
 merges.forEach(ref=>{
  const m=String(ref).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if(!m)return;
  const parseCol=x=>{let n=0;for(const ch of x)n=n*26+ch.charCodeAt(0)-64;return n};
  const c1=parseCol(m[1]),r1=Number(m[2]),c2=parseCol(m[3]),r2=Number(m[4]);
  mergeMap.set(r1+"-"+c1,{r1,c1,r2,c2});
 });
 for(let r=1;r<=maxRow;r++){
  let x=0;
  for(let c=1;c<=maxCol;c++){
   const cell=ws.getRow(r).getCell(c);
   const merge=mergeMap.get(r+"-"+c);
   if(cell.isMerged&&!merge) { x+=widths[c-1]; continue; }
   const el=document.createElement("div");
   el.className="xlsxCell";
   el.dataset.address=colLetter(c)+r;
   el.textContent=cellDisplayValue(cell);
   el.style.left=x+"px";
   el.style.top=heights.slice(0,r-1).reduce((a,b)=>a+b,0)+"px";
   let cw=widths[c-1],ch=heights[r-1],spanC=1,spanR=1;
   if(merge){
    spanC=merge.c2-merge.c1+1;spanR=merge.r2-merge.r1+1;
    cw=widths.slice(merge.c1-1,merge.c2).reduce((a,b)=>a+b,0);
    ch=heights.slice(merge.r1-1,merge.r2).reduce((a,b)=>a+b,0);
   }
   el.style.width=cw+"px";el.style.height=ch+"px";
   const st=cell.style||{};
   if(st.font){
    if(st.font.name)el.style.fontFamily=st.font.name+",Arial,sans-serif";
    if(st.font.sz)el.style.fontSize=Number(st.font.sz)+"px";
    if(st.font.bold)el.style.fontWeight="700";
    if(st.font.italic)el.style.fontStyle="italic";
    if(st.font.underline)el.style.textDecoration="underline";
    if(st.font.color)el.style.color=excelColorToCss(st.font.color,"#111");
   }
   if(st.fill&&st.fill.fgColor)el.style.background=excelColorToCss(st.fill.fgColor,"transparent");
   const align=st.alignment||{};
   el.style.textAlign=align.horizontal||"left";
   el.style.verticalAlign=align.vertical||"middle";
   el.style.whiteSpace=align.wrapText?"pre-wrap":"nowrap";
   el.style.overflow="hidden";
   if(align.indent)el.style.paddingLeft=(Number(align.indent)*8+3)+"px";
   else el.style.paddingLeft="3px";
   el.style.paddingRight="3px";
   const bd=st.border||{};
   el.style.borderTop=borderCss(bd.top);
   el.style.borderRight=borderCss(bd.right);
   el.style.borderBottom=borderCss(bd.bottom);
   el.style.borderLeft=borderCss(bd.left);
   inner.append(el);
   x+=widths[c-1];
  }
 }
 stage.append(inner);
 host.replaceChildren(stage);
 host.closest(".previewPanel")?.querySelector(".panelHead b")?.replaceChildren(document.createTextNode("LIVE XLSX"));
}
async function renderPreview(){
 const host=$("#sheetPreview");
 if(!host)return;
 host.innerHTML='<div class="emptyPage"><strong>Rendering workbook…</strong><span>Using the same edited XLSX that will be downloaded.</span></div>';
 try{
  const buffer=await buildWorkbook();
  const wb=new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws=findInvoiceSheet(wb);
  if(!ws)throw Error("Preview sheet 01 unavailable");
  buildWorkbookPreviewSheet(ws);
 }catch(e){
  host.innerHTML='<div class="emptyPage"><strong>Preview unavailable</strong><span>'+safe(e?.message||"Unable to render workbook")+'</span></div>';
 }
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
function cellAt(ws,rowNumber,colNumber){
 const r=Number(rowNumber),c=Number(colNumber);
 if(!Number.isInteger(r)||r<1||!Number.isInteger(c)||c<1)return null;
 return ws.getRow(r).getCell(c);
}
function findCell(ws,labels){
 const wanted=labels.map(x=>String(x).toLowerCase());
 let exact=null,fuzzy=null;
 ws.eachRow(row=>row.eachCell({includeEmpty:false},cell=>{
  if(exact)return;
  const s=textOfCell(cell).toLowerCase();
  if(!s)return;
  if(wanted.includes(s)){if(!exact)exact=cell;return}
  if(!fuzzy&&wanted.some(x=>s.includes(x)))fuzzy=cell;
 }));
 return exact||fuzzy;
}
function mergedMaster(cell){return cell&&cell.master?cell.master:cell}
function sameCell(a,b){return !!(a&&b&&a.address===b.address)}
function tryWrite(cell,value){
 try{if(!cell)return false;cell.value=value;return true}catch{return false}
}
function writeNextToLabel(ws,anchor,value){
 if(!anchor||value==null)return false;
 const candidates=[
  cellAt(ws,anchor.row,anchor.col+1),cellAt(ws,anchor.row,anchor.col+2),cellAt(ws,anchor.row,anchor.col+3),
  cellAt(ws,anchor.row+1,anchor.col),cellAt(ws,anchor.row+1,anchor.col+1),cellAt(ws,anchor.row+1,anchor.col+2),
  cellAt(ws,anchor.row,anchor.col-1)
 ];
 for(const raw of candidates){
  const c=mergedMaster(raw);
  if(!c||sameCell(c,anchor))continue;
  if(!textOfCell(c)&&tryWrite(c,value))return true;
 }
 return false;
}
function putHeaderField(ws,labels,value,{required=false}={}){
 if(value==null||value==="")return true;
 const anchor=findCell(ws,labels);
 const ok=writeNextToLabel(ws,anchor,value);
 if(!ok&&required)throw Error("Could not place workbook field: "+labels[0]);
 return ok;
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
function findStRow(ws){
 let stRow=null;
 ws.eachRow((row,rowNumber)=>{
  if(stRow!==null)return;
  if(textOfCell(row.getCell(2)).toUpperCase()==="ST")stRow=rowNumber;
 });
 if(!stRow)throw Error('Could not find the "ST" row in BNCFINAL.xlsx');
 return stRow;
}
function insertProductRow(ws){
 if(typeof window.BNCInsertProductRow!=="function")throw Error("Invoice row engine is unavailable");
 const inserted=window.BNCInsertProductRow(ws);
 if(!Number.isInteger(inserted)||inserted<PRODUCT_START_ROW)throw Error("Invoice row engine returned an invalid row");
 return inserted;
}

function clearValue(cell){try{cell.value=null}catch{}}
function writeLine(ws,rowIndex,totalRows,side,p){
 const r=PRODUCT_START_ROW+rowIndex,base=side==="left"?0:6;
 const vals=[hasData(p)?slFor(rowIndex,side,totalRows):"",p.name||"",p.pack||"",p.ctn===""?"":num(p.ctn),p.rate===""?"":num(p.rate)];
 const row=ws.getRow(r);
 for(let i=0;i<5;i++)row.getCell(base+1+i).value=vals[i]??"";
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
function countInvoiceRows(ws){return Math.max(ROWS_PER_SIDE,findStRow(ws)-PRODUCT_START_ROW)}



async function buildWorkbook(){
 if(buildBusy)return lastBuffer;
 buildBusy=true;lastBuffer=null;$("#previewBtn").disabled=true;$("#downloadBtn").disabled=true;$("#xlsxState").textContent="Preparing...";setStatus("Loading BNCFINAL.xlsx...");
 try{
  if(!window.ExcelJS?.Workbook)throw Error("ExcelJS unavailable");
  if(typeof window.BNCInsertProductRow!=="function")throw Error("Row engine unavailable");
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
 }finally{buildBusy=false;$("#previewBtn").disabled=false;$("#downloadBtn").disabled=false}
}
async function downloadXlsx(){
 const buffer=await buildWorkbook();
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
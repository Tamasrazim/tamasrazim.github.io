(()=>{"use strict";
const $=s=>document.querySelector(s);
const SOURCE_VERSION=54;
const TEMPLATE="../reference/BNCFINAL.xlsx?v="+SOURCE_VERSION;
const DB="bnc-invoice-xlsx-v1";
const ROWS_PER_SIDE=4;
const MAX_ROWS_PER_SIDE=50;
const PRODUCT_START_ROW=11;
const PRODUCTS=window.BNC_PRODUCTS||[];

const blank=()=>({name:"",pack:"",ctn:"",rate:""});
const blankRow=()=>({left:blank(),right:blank()});
const state={
  ref:"X2",invoiceNo:"0002",date:"",commission:0,trader:"",buyer:"",
  address:"",mobile:"",rows:Array.from({length:ROWS_PER_SIDE},blankRow)
};

let db=null;
let deferred=null;
let buildPromise=null;
let lastBuffer=null;
let previewTimer=null;
let liveWorkbook=null;
let liveSheet=null;
let dirty=true;
let headerTargets={};
let formulaResults={};

const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const money=v=>num(v).toFixed(2);
const today=()=>{
  const d=new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
};
const displayDate=v=>{
  const m=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m?m[3]+"."+m[2]+"."+m[1]:String(v||"");
};
const safe=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const hasData=p=>!!(String(p?.name||"").trim()||String(p?.pack||"").trim()||String(p?.ctn||"").trim()||String(p?.rate||"").trim());
const copyState=()=>JSON.parse(JSON.stringify(state));
const productByName=name=>PRODUCTS.find(p=>p.name===String(name||""));
const slFor=(rowIndex,side,totalRows)=>side==="left"?rowIndex+1:totalRows+rowIndex+1;

function setStatus(text){const el=$("#status");if(el)el.textContent=text}
function invalidate(){lastBuffer=null}
function normalize(){
  if(!Array.isArray(state.rows))state.rows=[];
  state.rows=state.rows.map(r=>({
    left:{...blank(),...(r?.left||{})},
    right:{...blank(),...(r?.right||{})}
  }));
  while(state.rows.length<ROWS_PER_SIDE)state.rows.push(blankRow());
  if(state.rows.length>MAX_ROWS_PER_SIDE)state.rows=state.rows.slice(0,MAX_ROWS_PER_SIDE);
  state.commission=Math.max(0,num(state.commission));
  if(!state.date)state.date=today();
}
function totals(){
  let cartons=0,total=0;
  state.rows.forEach(r=>{
    const lc=Math.max(0,num(r.left.ctn));
    const rc=Math.max(0,num(r.right.ctn));
    cartons+=lc+rc;
    total+=lc*Math.max(0,num(r.left.rate))+rc*Math.max(0,num(r.right.rate));
  });
  const commission=total*Math.max(0,num(state.commission))/100;
  return {cartons,total,commission,final:Math.max(0,total-commission)};
}
function syncFields(){
  document.querySelectorAll("[data-k]").forEach(el=>el.value=state[el.dataset.k]??"");
}
function bindFields(){
  document.querySelectorAll("[data-k]").forEach(el=>{
    el.addEventListener("input",()=>{
      const k=el.dataset.k;
      state[k]=k==="commission"?Math.max(0,num(el.value)):el.value;
      ensureLiveWorkbook().then(()=>{
        applyHeaderEditsToLive();
        recalcLiveFormulas();
        dirty=true;lastBuffer=null;
        schedulePreview();
      }).catch(console.error);
      updateSummary();
      saveDraft();
    });
  });
}

function dbOpen(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>{
      const d=req.result;
      if(!d.objectStoreNames.contains("drafts"))d.createObjectStore("drafts",{keyPath:"id"});
      if(!d.objectStoreNames.contains("invoices"))d.createObjectStore("invoices",{keyPath:"id"});
    };
    req.onsuccess=()=>{db=req.result;resolve()};
    req.onerror=()=>reject(req.error);
  });
}
function saveDraft(){
  if(db)db.transaction("drafts","readwrite").objectStore("drafts").put({
    id:"current",data:copyState(),updatedAt:Date.now()
  });
}

function refreshPackList(rowIndex,side){
  const dl=document.getElementById("pack-list-"+rowIndex+"-"+side);
  if(!dl)return;
  const packs=productByName(state.rows[rowIndex]?.[side]?.name)?.packs||[];
  dl.replaceChildren(...packs.map(v=>{
    const o=document.createElement("option");o.value=v;return o;
  }));
}
function packListId(rowIndex,side){
  const id="pack-list-"+rowIndex+"-"+side;
  let dl=document.getElementById(id);
  if(!dl){dl=document.createElement("datalist");dl.id=id;document.body.append(dl)}
  refreshPackList(rowIndex,side);
  return id;
}
function buildSide(row,rowIndex,side,totalRows){
  const wrap=document.createElement("div");
  wrap.className="productSide "+side;
  const head=document.createElement("div");
  head.className="sideHead";
  head.innerHTML="<span>"+(side==="left"?"LEFT":"RIGHT")+"</span><strong>SL "+String(slFor(rowIndex,side,totalRows)).padStart(2,"0")+"</strong>";
  wrap.append(head);

  const fields=document.createElement("div");
  fields.className="sideFields";

  [["name","PRODUCT","Product"],["pack","PACK","Pack size"],["ctn","CTN","0"],["rate","RATE / CTN","0.00"]].forEach(([key,label,placeholder])=>{
    const lab=document.createElement("label");
    lab.textContent=label;
    const input=document.createElement("input");
    input.value=row[key]??"";
    input.autocomplete="off";
    input.placeholder=placeholder;
    if(key==="name")input.setAttribute("list","catalog");
    if(key==="pack")input.setAttribute("list",packListId(rowIndex,side));
    if(key==="ctn"){input.type="number";input.min="0";input.step="1";input.inputMode="numeric"}
    if(key==="rate"){input.type="number";input.min="0";input.step=".01";input.inputMode="decimal"}
    input.addEventListener("input",e=>{
      row[key]=(key==="ctn"||key==="rate")?Math.max(0,num(e.target.value)):e.target.value;
      if(key==="name")refreshPackList(rowIndex,side);
      ensureLiveWorkbook().then(()=>{
        writeLine(liveSheet,rowIndex,state.rows.length,side,row);
        rebalanceSL(liveSheet,state.rows.length);
        recalcLiveFormulas();
        dirty=true;lastBuffer=null;
        schedulePreview();
      }).catch(console.error);
      updateSummary();
      saveDraft();
    });
    lab.append(input);
    fields.append(lab);
  });

  const amountLabel=document.createElement("label");
  amountLabel.textContent="AMOUNT";
  const amount=document.createElement("input");
  amount.readOnly=true;
  amount.value=row.ctn!==""&&row.rate!==""?money(num(row.ctn)*num(row.rate)):"";
  amountLabel.append(amount);
  fields.append(amount);
  wrap.append(fields);
  return wrap;
}

function renderProducts(){
  normalize();
  invalidate();

  let catalog=document.getElementById("catalog");
  if(!catalog){
    catalog=document.createElement("datalist");
    catalog.id="catalog";
    document.body.append(catalog);
  }
  catalog.replaceChildren(...PRODUCTS.map(p=>{
    const o=document.createElement("option");o.value=p.name;return o;
  }));

  const host=$("#products");
  host.replaceChildren();
  const totalRows=state.rows.length;

  state.rows.forEach((row,i)=>{
    const pair=document.createElement("div");
    pair.className="pairRow";
    pair.append(buildSide(row,i,"left",totalRows),buildSide(row,i,"right",totalRows));

    const del=document.createElement("button");
    del.type="button";
    del.className="removeRow";
    del.textContent="×";
    del.title="Remove this physical invoice row";
    del.disabled=totalRows<=ROWS_PER_SIDE;
    del.onclick=async()=>{
      if(state.rows.length<=ROWS_PER_SIDE)return;
      try{
        await ensureLiveWorkbook();
        state.rows.splice(i,1);
        liveWorkbook=null;
        liveSheet=null;
        buildPromise=null;
        headerTargets={};
        formulaResults={};
        await ensureLiveWorkbook();
        rebalanceSL(liveSheet,state.rows.length);
        recalcLiveFormulas();
        dirty=true;lastBuffer=null;
        renderProducts();
        saveDraft();
        buildWorkbookPreviewSheet(liveSheet);
        setStatus("Live XLSX row removed");
      }catch(error){
        console.error(error);
        setStatus("Could not remove row");
      }
    };
    pair.append(del);
    host.append(pair);
  });

  const rowMetric=$("#rowMetric");
  const slotMetric=$("#slotMetric");
  if(rowMetric)rowMetric.textContent=String(totalRows);
  if(slotMetric)slotMetric.textContent=String(totalRows*2);
  updateSummary();
  schedulePreview();
}


async function addProductRow(){
  if(state.rows.length>=MAX_ROWS_PER_SIDE){setStatus("Maximum 50 rows per side");return}
  try{
    await ensureLiveWorkbook();
    window.BNCInsertProductRow(liveSheet);
    state.rows.push(blankRow());
    rebalanceSL(liveSheet,state.rows.length);
    recalcLiveFormulas();
    dirty=true;lastBuffer=null;
    renderProducts();
    saveDraft();
    buildWorkbookPreviewSheet(liveSheet);
    setStatus("Live XLSX row added");
  }catch(error){console.error(error);setStatus("Could not add row");alert(error.message||"Could not add product row")}
}

function updateSummary(){
  const t=totals();
  $("#summary").innerHTML=
    '<div class="sum"><span>Cartons</span><strong>'+t.cartons+"</strong></div>"+
    '<div class="sum"><span>Gross taka</span><strong>'+money(t.total)+"</strong></div>"+
    '<div class="sum"><span>Commission</span><strong>'+money(t.commission)+"</strong></div>"+
    '<div class="sum final"><span>Final total</span><strong>'+money(t.final)+"</strong></div>";
}

function cellAt(ws,rowNumber,colNumber){
  const r=Number(rowNumber),c=Number(colNumber);
  if(!Number.isInteger(r)||r<1||!Number.isInteger(c)||c<1)return null;
  return ws.getRow(r).getCell(c);
}
function textOfCell(cell){
  const v=cell?.value;
  if(v==null)return"";
  if(typeof v==="string"||typeof v==="number")return String(v).trim();
  if(v instanceof Date)return v.toISOString().slice(0,10);
  if(v.richText)return v.richText.map(x=>x.text||"").join("").trim();
  if(v.result!=null)return String(v.result).trim();
  if(v.text!=null)return String(v.text).trim();
  return"";
}
function findCell(ws,labels){
  const wanted=labels.map(v=>String(v).toLowerCase());
  let exact=null,fuzzy=null;
  ws.eachRow(row=>{
    row.eachCell({includeEmpty:false},cell=>{
      if(exact)return;
      const s=textOfCell(cell).toLowerCase();
      if(!s)return;
      if(wanted.includes(s)){exact=exact||cell;return}
      if(!fuzzy&&wanted.some(x=>s.includes(x)))fuzzy=cell;
    });
  });
  return exact||fuzzy;
}
function tryWrite(cell,value){
  try{if(!cell)return false;cell.value=value;return true}catch{return false}
}
function writeNextToLabel(ws,anchor,value){
  if(!anchor||value==null)return false;
  const candidates=[
    cellAt(ws,anchor.row,anchor.col+1),
    cellAt(ws,anchor.row,anchor.col+2),
    cellAt(ws,anchor.row,anchor.col+3),
    cellAt(ws,anchor.row+1,anchor.col),
    cellAt(ws,anchor.row+1,anchor.col+1),
    cellAt(ws,anchor.row+1,anchor.col+2),
    cellAt(ws,anchor.row,anchor.col-1)
  ];
  for(const raw of candidates){
    const cell=raw?.master||raw;
    if(!cell||cell.address===anchor.address)continue;
    if(!textOfCell(cell)&&tryWrite(cell,value))return true;
  }
  return false;
}
function putHeaderField(ws,labels,value,required=false){
  if(value==null||value==="")return true;
  const key=labels.join("|");
  if(headerTargets[key]){
    const target=cellAt(ws,headerTargets[key].row,headerTargets[key].col);
    if(target){target.value=value;return true}
  }
  const anchor=findCell(ws,labels);
  if(!anchor){if(required)throw Error("Could not find workbook field: "+labels[0]);return false}
  const candidates=[
    cellAt(ws,anchor.row,anchor.col+1),cellAt(ws,anchor.row,anchor.col+2),cellAt(ws,anchor.row,anchor.col+3),
    cellAt(ws,anchor.row+1,anchor.col),cellAt(ws,anchor.row+1,anchor.col+1),cellAt(ws,anchor.row+1,anchor.col+2),cellAt(ws,anchor.row,anchor.col-1)
  ];
  for(const raw of candidates){
    const target=raw?.master||raw;
    if(!target||target.address===anchor.address)continue;
    if(!textOfCell(target)){
      target.value=value;headerTargets[key]={row:target.row,col:target.col};return true;
    }
  }
  if(required)throw Error("Could not place workbook field: "+labels[0]);
  return false;
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
function countInvoiceRows(ws){
  return Math.max(ROWS_PER_SIDE,findStRow(ws)-PRODUCT_START_ROW);
}
function writeLine(ws,rowIndex,totalRows,side,p){
  const row=ws.getRow(PRODUCT_START_ROW+rowIndex);
  const base=side==="left"?0:6;
  const values=[
    hasData(p)?slFor(rowIndex,side,totalRows):"",
    p.name||"",
    p.pack||"",
    p.ctn===""?"":num(p.ctn),
    p.rate===""?"":num(p.rate)
  ];
  for(let i=0;i<5;i++)row.getCell(base+1+i).value=values[i]??"";
}
function rebalanceSL(ws,totalRows){
  for(let i=0;i<totalRows;i++){
    ws.getRow(PRODUCT_START_ROW+i).getCell(1).value=i+1;
    ws.getRow(PRODUCT_START_ROW+i).getCell(7).value=totalRows+i+1;
  }
}
function fillRows(ws){
  normalize();
  while(countInvoiceRows(ws)<state.rows.length){
    const inserted=window.BNCInsertProductRow(ws);
    if(!Number.isInteger(inserted))throw Error("Invalid inserted invoice row");
  }
  const totalRows=state.rows.length;
  for(let i=0;i<totalRows;i++){
    writeLine(ws,i,totalRows,"left",state.rows[i].left);
    writeLine(ws,i,totalRows,"right",state.rows[i].right);
  }
  rebalanceSL(ws,totalRows);
}
function findInvoiceSheet(wb){
  return wb.getWorksheet("01")||wb.worksheets[0];
}


async function ensureLiveWorkbook(){
  if(liveWorkbook&&liveSheet)return liveWorkbook;
  if(buildPromise)return buildPromise;
  buildPromise=(async()=>{
    if(!window.ExcelJS?.Workbook)throw Error("ExcelJS unavailable");
    setStatus("Loading BNCFINAL.xlsx…");
    const response=await fetch(TEMPLATE,{cache:"no-store"});
    if(!response.ok)throw Error("BNCFINAL.xlsx unavailable ("+response.status+")");
    headerTargets={};
    liveWorkbook=new ExcelJS.Workbook();
    await liveWorkbook.xlsx.load(await response.arrayBuffer());
    liveSheet=findInvoiceSheet(liveWorkbook);
    if(!liveSheet)throw Error("Invoice sheet 01 is unavailable");
    putHeaderField(liveSheet,["reference","ref"],state.ref);
    putHeaderField(liveSheet,["invoice no","invoice number","invoice"],state.invoiceNo,true);
    putHeaderField(liveSheet,["date"],displayDate(state.date),true);
    putHeaderField(liveSheet,["trader / dealer","trader/dealer","trader","dealer"],state.trader);
    putHeaderField(liveSheet,["buyer"],state.buyer);
    putHeaderField(liveSheet,["address"],state.address);
    putHeaderField(liveSheet,["mobile","phone"],state.mobile);
    putHeaderField(liveSheet,["commission %","commission"],state.commission);
    while(countInvoiceRows(liveSheet)<state.rows.length)window.BNCInsertProductRow(liveSheet);
    const totalRows=state.rows.length;
    for(let i=0;i<totalRows;i++){
      writeLine(liveSheet,i,totalRows,"left",state.rows[i].left);
      writeLine(liveSheet,i,totalRows,"right",state.rows[i].right);
    }
    rebalanceSL(liveSheet,totalRows);
    recalcLiveFormulas();
    setStatus("Live XLSX loaded");
    return liveWorkbook;
  })();
  try{return await buildPromise}finally{buildPromise=null}
}

function recalcLiveFormulas(){
  formulaResults={};
  if(!liveSheet)return;
  liveSheet.eachRow(row=>row.eachCell({includeEmpty:false},cell=>{
    if(!cell.formula)return;
    const m=String(cell.formula).match(/^SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/i);
    if(!m||m[1].toUpperCase()!==m[3].toUpperCase())return;
    let total=0;
    for(let r=Number(m[2]);r<=Number(m[4]);r++){
      const value=liveSheet.getRow(r).getCell(cell.column).value;
      total+=num(value);
    }
    formulaResults[cell.address]=total;
  }));
}

async function buildWorkbook(){
  await ensureLiveWorkbook();
  applyHeaderEditsToLive();
  recalcLiveFormulas();
  if(liveWorkbook.calcProperties){
    liveWorkbook.calcProperties.fullCalcOnLoad=true;
    liveWorkbook.calcProperties.forceFullCalc=true;
  }
  const out=await liveWorkbook.xlsx.writeBuffer();
  lastBuffer=out;
  return out;
}

function applyHeaderEditsToLive(){
  if(!liveSheet)return;
  putHeaderField(liveSheet,["reference","ref"],state.ref);
  putHeaderField(liveSheet,["invoice no","invoice number","invoice"],state.invoiceNo);
  putHeaderField(liveSheet,["date"],displayDate(state.date));
  putHeaderField(liveSheet,["trader / dealer","trader/dealer","trader","dealer"],state.trader);
  putHeaderField(liveSheet,["buyer"],state.buyer);
  putHeaderField(liveSheet,["address"],state.address);
  putHeaderField(liveSheet,["mobile","phone"],state.mobile);
  putHeaderField(liveSheet,["commission %","commission"],state.commission);
}

function excelColor(v,fallback){
  if(!v)return fallback;
  if(v.argb)return"#"+String(v.argb).slice(-6);
  if(v.rgb)return"#"+String(v.rgb).slice(-6);
  return fallback;
}
function borderCss(side){
  if(!side?.style)return"";
  const sizes={hair:"1px",thin:"1px",medium:"2px",thick:"3px",double:"3px",dotted:"1px",dashed:"1px"};
  return (sizes[side.style]||"1px")+" "+(side.style==="double"?"double":"solid")+" "+excelColor(side.color,"#222");
}
function displayWorkbookValue(cell){
  const v=cell?.value;
  if(v==null)return"";
  if(typeof v==="string"||typeof v==="number")return String(v);
  if(v instanceof Date)return displayDate(v.toISOString().slice(0,10));
  if(v.richText)return v.richText.map(x=>x.text||"").join("");
  if(v.formula){
    if(formulaResults[cell.address]!==undefined)return String(formulaResults[cell.address]);
    if(v.result!=null)return String(v.result);
    return"="+v.formula;
  }
  if(v.result!=null)return String(v.result);
  if(v.text!=null)return String(v.text);
  return"";
}
function columnNumberFromLetters(value){
  let n=0;
  for(const ch of value)n=n*26+ch.charCodeAt(0)-64;
  return n;
}

function colLetters(n){let s="";while(n){const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=Math.floor((n-1)/26)}return s}
function buildWorkbookPreviewSheet(ws){
  const host=$("#sheetPreview");
  if(!host)return;
  const maxCol=Math.max(12,ws.columnCount||12),maxRow=Math.max(1,ws.rowCount||1);
  const widths=[],heights=[],x=[0],y=[0];
  for(let c=1;c<=maxCol;c++){widths[c-1]=Math.max(28,Math.min(280,Math.round((Number(ws.getColumn(c).width)||10)*7.2)));x.push(x[x.length-1]+widths[c-1])}
  for(let r=1;r<=maxRow;r++){heights[r-1]=Math.max(12,Math.min(120,Math.round((Number(ws.getRow(r).height)||15)*1.333)));y.push(y[y.length-1]+heights[r-1])}
  const stage=document.createElement("div");stage.className="workbookSheet";
  const grid=document.createElement("div");grid.className="workbookGrid";
  grid.style.width=x[x.length-1]+"px";grid.style.height=y[y.length-1]+"px";
  const merges=(Array.isArray(ws.model?.merges)?ws.model.merges:[]).map(ref=>{
    const m=String(ref).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);if(!m)return null;
    return{r1:Number(m[2]),c1:columnNumberFromLetters(m[1]),r2:Number(m[4]),c2:columnNumberFromLetters(m[3])};
  }).filter(Boolean);
  const covered=new Set();
  merges.forEach(m=>{for(let r=m.r1;r<=m.r2;r++)for(let c=m.c1;c<=m.c2;c++)if(r!==m.r1||c!==m.c1)covered.add(r+":"+c)});
  for(let r=1;r<=maxRow;r++)for(let c=1;c<=maxCol;c++){
    if(covered.has(r+":"+c))continue;
    const cell=ws.getRow(r).getCell(c);
    const merge=merges.find(m=>r>=m.r1&&r<=m.r2&&c>=m.c1&&c<=m.c2);
    const r2=merge?merge.r2:r,c2=merge?merge.c2:c;
    const el=document.createElement("div");
    el.className="xlsxCell";
    el.contentEditable="true";
    el.spellcheck=false;
    el.dataset.row=String(r);el.dataset.col=String(c);el.dataset.address=colLetters(c)+r;
    el.textContent=displayWorkbookValue(cell);
    el.style.left=x[c-1]+"px";el.style.top=y[r-1]+"px";el.style.width=(x[c2]-x[c-1])+"px";el.style.height=(y[r2]-y[r-1])+"px";
    const a=cell.alignment||{};
    el.style.justifyContent=a.horizontal==="right"?"flex-end":a.horizontal==="center"?"center":"flex-start";
    el.style.alignItems=a.vertical==="bottom"?"flex-end":a.vertical==="middle"?"center":"flex-start";
    el.style.textAlign=a.horizontal||"left";el.style.whiteSpace=a.wrapText?"pre-wrap":"nowrap";
    el.style.padding=(a.indent?2+a.indent*2:2)+"px";
    const f=cell.font||{};
    el.style.fontFamily=f.name||"Arial";el.style.fontSize=((Number(f.size)||9))+"px";el.style.fontWeight=f.bold?"700":"400";el.style.fontStyle=f.italic?"italic":"normal";el.style.color=excelColor(f.color,"#111");
    if(cell.fill?.type==="pattern")el.style.background=excelColor(cell.fill.fgColor,"#fff");
    const b=cell.border||{};
    el.style.borderTop=borderCss(b.top);el.style.borderRight=borderCss(b.right);el.style.borderBottom=borderCss(b.bottom);el.style.borderLeft=borderCss(b.left);
    if(cell.formula)el.dataset.formula="1";
    el.addEventListener("focus",()=>{el.classList.add("editing");setStatus("Editing "+el.dataset.address)});
    el.addEventListener("input",()=>{
      if(!liveSheet)return;
      const live=liveSheet.getRow(r).getCell(c);
      const value=el.textContent.trim();
      if(live.formula&&!value.startsWith("=")){live.value=value===""?null:value}
      else if(!live.formula){
        live.value=value===""?null:(/^-?\d+(?:\.\d+)?$/.test(value)?Number(value):value);
      }
      dirty=true;lastBuffer=null;$("#xlsxState").textContent="EDITED";
    });
    el.addEventListener("blur",async()=>{
      if(!liveSheet)return;
      recalcLiveFormulas();
      el.classList.remove("editing");
      setStatus("Live XLSX edited");
      await renderPreview();
    });
    grid.append(el);
  }
  stage.append(grid);host.replaceChildren(stage);
  $("#xlsxState").textContent=dirty?"LIVE XLSX":"LIVE XLSX";
}


async function renderPreview(){
  const host=$("#sheetPreview");
  if(!host)return;
  host.innerHTML='<div class="emptyPage"><strong>Syncing live XLSX…</strong><span>The preview is the current workbook state.</span></div>';
  try{
    await ensureLiveWorkbook();
    recalcLiveFormulas();
    buildWorkbookPreviewSheet(liveSheet);
    dirty=false;
    setStatus("Live preview synced");
  }catch(error){
    console.error("BNC Invoice:",error);
    host.innerHTML='<div class="emptyPage"><strong>Preview unavailable</strong><span>'+safe(error?.message||"Unable to render workbook")+'</span></div>';
    setStatus("XLSX error");
  }
}

function schedulePreview(){
  clearTimeout(previewTimer);
  previewTimer=setTimeout(()=>{renderPreview()},180);
}


async function downloadXlsx(){
  try{
    const buffer=await buildWorkbook();
    const blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;
    a.download="BNC-Invoice-"+String(state.invoiceNo||"0002").replace(/[^0-9A-Za-z_-]/g,"_")+".xlsx";
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    setStatus("Latest XLSX downloaded");
  }catch(error){console.error(error);alert(error?.message||"Unable to download XLSX")}
}

function reset(){
  Object.assign(state,{
    ref:"X2",
    invoiceNo:String((Number(state.invoiceNo)||1)+1).padStart(4,"0"),
    date:today(),
    commission:0,
    trader:"",
    buyer:"",
    address:"",
    mobile:"",
    rows:Array.from({length:ROWS_PER_SIDE},blankRow)
  });
  invalidate();
  syncFields();
  renderProducts();
  saveDraft();
  $("#xlsxState").textContent="Ready";
  liveWorkbook=null;liveSheet=null;buildPromise=null;lastBuffer=null;headerTargets={};dirty=true;
  setStatus("New invoice");
}
function saveInvoice(){
  if(!db)return;
  const t=totals();
  const id=state.invoiceNo+"-"+Date.now();
  db.transaction("invoices","readwrite").objectStore("invoices").put({
    id,invoiceNumber:state.invoiceNo,total:t.final,updatedAt:Date.now(),data:copyState()
  });
  saveDraft();
  history();
  setStatus("Invoice saved");
}
function history(){
  if(!db)return;
  const host=$("#history");
  host.replaceChildren();
  const req=db.transaction("invoices").objectStore("invoices").openCursor();
  const items=[];
  req.onsuccess=()=>{
    const c=req.result;
    if(c){items.push(c.value);c.continue();return}
    items.sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0));
    if(!items.length){
      host.innerHTML='<div class="historyRow"><div><strong>No saved invoices</strong><small>Saved workbook drafts from this device appear here.</small></div></div>';
      return;
    }
    items.forEach(item=>{
      const row=document.createElement("div");
      row.className="historyRow";
      const info=document.createElement("div");
      info.innerHTML="<strong>"+safe(item.invoiceNumber)+"</strong><small>"+money(item.total)+" · "+new Date(item.updatedAt).toLocaleString()+"</small>";
      const actions=document.createElement("div");
      actions.className="rowActions";

      const load=document.createElement("button");
      load.type="button";load.textContent="Load";
      load.onclick=()=>{Object.assign(state,item.data);normalize();invalidate();syncFields();renderProducts();saveDraft();setStatus("Loaded "+item.invoiceNumber)};
      actions.append(load);

      const copyBtn=document.createElement("button");
      copyBtn.type="button";copyBtn.textContent="Copy";
      copyBtn.onclick=()=>{Object.assign(state,item.data);state.invoiceNo=String((Number(state.invoiceNo)||0)+1).padStart(4,"0");state.date=today();normalize();invalidate();syncFields();renderProducts();saveDraft();setStatus("Copied "+item.invoiceNumber)};
      actions.append(copyBtn);

      const del=document.createElement("button");
      del.type="button";del.className="del";del.textContent="Delete";
      del.onclick=()=>{
        db.transaction("invoices","readwrite").objectStore("invoices").delete(item.id).onsuccess=history;
      };
      actions.append(del);

      row.append(info,actions);
      host.append(row);
    });
  };
}
function exportJson(){
  const url=URL.createObjectURL(new Blob([JSON.stringify(copyState(),null,2)],{type:"application/json"}));
  const a=document.createElement("a");
  a.href=url;a.download="BNC-Invoice-"+state.invoiceNo+".json";document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function importJson(file){
  file.text().then(text=>{
    const data=JSON.parse(text);
    if(!Array.isArray(data.rows))throw Error();
    Object.assign(state,data);
    normalize();invalidate();syncFields();renderProducts();saveDraft();setStatus("Imported");
  }).catch(()=>alert("Invalid invoice JSON"));
}
function install(){
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("#installBtn").hidden=false});
  $("#installBtn").onclick=async()=>{if(!deferred)return;await deferred.prompt();deferred=null;$("#installBtn").hidden=true};
  window.addEventListener("appinstalled",()=>$("#installBtn").hidden=true);
}

install();

(async()=>{
  try{
    await dbOpen();
    const req=db.transaction("drafts").objectStore("drafts").get("current");
    req.onsuccess=()=>{
      if(req.result?.data)Object.assign(state,req.result.data);
      normalize();syncFields();renderProducts();bindFields();history();
    };
    req.onerror=()=>{
      normalize();syncFields();renderProducts();bindFields();
    };
  }catch{
    normalize();syncFields();renderProducts();bindFields();
  }

  $("#addBtn").onclick=addProductRow;
  $("#newBtn").onclick=reset;
  $("#saveBtn").onclick=saveInvoice;
  $("#previewBtn").onclick=()=>renderPreview();
  $("#downloadBtn").onclick=()=>downloadXlsx();
  const jsonOut=$("#jsonOutBtn"),jsonIn=$("#jsonInBtn"),jsonFile=$("#jsonFile");
  if(jsonOut)jsonOut.onclick=exportJson;
  if(jsonIn&&jsonFile)jsonIn.onclick=()=>jsonFile.click();
  if(jsonFile)jsonFile.onchange=e=>{
    const file=e.target.files?.[0];
    if(file)importJson(file);
    e.target.value="";
  };
})();
})();
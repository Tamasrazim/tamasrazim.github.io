(()=>{"use strict";
const $=s=>document.querySelector(s);
const SOURCE_VERSION=53;
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
      invalidate();
      updateSummary();
      schedulePreview();
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
      invalidate();
      updateSummary();
      schedulePreview();
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
    del.onclick=()=>{
      if(state.rows.length<=ROWS_PER_SIDE)return;
      state.rows.splice(i,1);
      renderProducts();
      saveDraft();
      setStatus("Invoice row removed");
    };
    pair.append(del);
    host.append(pair);
  });

  $("#rowMetric").textContent=String(totalRows);
  $("#slotMetric").textContent=String(totalRows*2);
  updateSummary();
  schedulePreview();
}

function addProductRow(){
  if(state.rows.length>=MAX_ROWS_PER_SIDE){
    setStatus("Maximum 50 rows per side");
    return;
  }
  state.rows.push(blankRow());
  renderProducts();
  saveDraft();
  setStatus("Product row added");
  const input=$("#products .pairRow:last-child input");
  if(input)input.focus();
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
  const ok=writeNextToLabel(ws,findCell(ws,labels),value);
  if(!ok&&required)throw Error("Could not place workbook field: "+labels[0]);
  return ok;
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

async function buildWorkbook(){
  if(buildPromise)return buildPromise;

  buildPromise=(async()=>{
    $("#previewBtn").disabled=true;
    $("#downloadBtn").disabled=true;
    $("#xlsxState").textContent="Preparing...";
    setStatus("Building edited XLSX...");
    try{
      if(!window.ExcelJS?.Workbook)throw Error("ExcelJS unavailable");
      if(typeof window.BNCInsertProductRow!=="function")throw Error("Invoice row engine unavailable");

      normalize();
      const wb=new ExcelJS.Workbook();
      const response=await fetch(TEMPLATE,{cache:"no-store"});
      if(!response.ok)throw Error("BNCFINAL.xlsx unavailable ("+response.status+")");
      const source=await response.arrayBuffer();
      await wb.xlsx.load(source);

      const ws=findInvoiceSheet(wb);
      if(!ws)throw Error("Invoice sheet 01 is unavailable");

      putHeaderField(ws,["reference","ref"],state.ref);
      putHeaderField(ws,["invoice no","invoice number","invoice"],state.invoiceNo,true);
      putHeaderField(ws,["date"],displayDate(state.date),true);
      putHeaderField(ws,["trader / dealer","trader/dealer","trader","dealer"],state.trader);
      putHeaderField(ws,["buyer"],state.buyer);
      putHeaderField(ws,["address"],state.address);
      putHeaderField(ws,["mobile","phone"],state.mobile);
      putHeaderField(ws,["commission %","commission"],state.commission);

      fillRows(ws);

      if(wb.calcProperties){
        wb.calcProperties.fullCalcOnLoad=true;
        wb.calcProperties.forceFullCalc=true;
      }

      const out=await wb.xlsx.writeBuffer();
      if(!out||!out.byteLength)throw Error("ExcelJS produced an empty workbook");
      lastBuffer=out;
      $("#xlsxState").textContent="XLSX ready";
      setStatus("Edited workbook ready");
      return out;
    }catch(error){
      lastBuffer=null;
      $("#xlsxState").textContent="Failed";
      setStatus("XLSX error");
      console.error("Invoice Studio:",error);
      throw error;
    }finally{
      $("#previewBtn").disabled=false;
      $("#downloadBtn").disabled=false;
    }
  })();

  try{return await buildPromise}
  finally{buildPromise=null}
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
  if(v.result!=null)return String(v.result);
  if(v.text!=null)return String(v.text);
  if(v.formula)return"="+v.formula;
  return"";
}
function columnNumberFromLetters(value){
  let n=0;
  for(const ch of value)n=n*26+ch.charCodeAt(0)-64;
  return n;
}
function buildWorkbookPreviewSheet(ws){
  const host=$("#sheetPreview");
  if(!host)return;

  const maxCol=Math.max(12,ws.columnCount||12);
  const maxRow=Math.max(1,ws.rowCount||1);
  const widths=[];
  const heights=[];
  const tops=[0];

  for(let c=1;c<=maxCol;c++){
    const width=Number(ws.getColumn(c).width)||10;
    widths.push(Math.max(28,Math.min(280,Math.round(width*7.2))));
  }
  for(let r=1;r<=maxRow;r++){
    const height=Number(ws.getRow(r).height)||15;
    heights.push(Math.max(12,Math.min(120,Math.round(height*1.333))));
    tops.push(tops[tops.length-1]+heights[r-1]);
  }

  const stage=document.createElement("div");
  stage.className="workbookSheet";
  const grid=document.createElement("div");
  grid.className="workbookGrid";
  grid.style.width=widths.reduce((a,b)=>a+b,0)+"px";
  grid.style.height=heights.reduce((a,b)=>a+b,0)+"px";

  const merges=Array.isArray(ws.model?.merges)?ws.model.merges:[];
  const mergeMap=new Map();
  for(const ref of merges){
    const m=String(ref).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if(!m)continue;
    const c1=columnNumberFromLetters(m[1]),r1=Number(m[2]);
    const c2=columnNumberFromLetters(m[3]),r2=Number(m[4]);
    mergeMap.set(r1+":"+c1,{r1,c1,r2,c2});
  }

  const left=[];
  for(let c=1;c<=maxCol;c++){
    left[c]=(left[c-1]||0)+widths[c-1];
  }

  for(let r=1;r<=maxRow;r++){
    for(let c=1;c<=maxCol;c++){
      const cell=ws.getRow(r).getCell(c);
      const merge=mergeMap.get(r+":"+c);
      if(cell.isMerged&&!merge)continue;

      const el=document.createElement("div");
      el.className="xlsxCell";
      el.dataset.address=(function(n){let out="";while(n){const m=(n-1)%26;out=String.fromCharCode(65+m)+out;n=Math.floor((n-1)/26)}return out})(c)+r;
      el.textContent=displayWorkbookValue(cell);

      let width=widths[c-1],height=heights[r-1];
      if(merge){
        width=widths.slice(merge.c1-1,merge.c2).reduce((a,b)=>a+b,0);
        height=heights.slice(merge.r1-1,merge.r2).reduce((a,b)=>a+b,0);
      }

      el.style.left=((left[c-1]||0))+"px";
      el.style.top=tops[r-1]+"px";
      el.style.width=width+"px";
      el.style.height=height+"px";

      const style=cell.style||{};
      const font=style.font||{};
      const fill=style.fill||{};
      const align=style.alignment||{};
      const border=style.border||{};

      if(font.name)el.style.fontFamily=font.name+",Arial,sans-serif";
      if(font.sz)el.style.fontSize=Number(font.sz)+"px";
      if(font.bold)el.style.fontWeight="700";
      if(font.italic)el.style.fontStyle="italic";
      if(font.underline)el.style.textDecoration="underline";
      if(font.color)el.style.color=excelColor(font.color,"#111");
      if(fill.fgColor)el.style.background=excelColor(fill.fgColor,"transparent");

      el.style.textAlign=align.horizontal||"left";
      el.style.alignItems=align.vertical==="top"?"flex-start":align.vertical==="bottom"?"flex-end":"center";
      el.style.whiteSpace=align.wrapText?"pre-wrap":"nowrap";
      el.style.overflow="hidden";
      el.style.paddingLeft=align.indent?(Number(align.indent)*8+3)+"px":"3px";
      el.style.paddingRight="3px";
      el.style.borderTop=borderCss(border.top);
      el.style.borderRight=borderCss(border.right);
      el.style.borderBottom=borderCss(border.bottom);
      el.style.borderLeft=borderCss(border.left);

      grid.append(el);
    }
  }

  stage.append(grid);
  host.replaceChildren(stage);
  const badge=$("#xlsxState");
  if(badge)badge.textContent="LIVE XLSX";
}

async function renderPreview(){
  const host=$("#sheetPreview");
  if(!host)return;

  host.innerHTML='<div class="emptyPage"><strong>Rendering workbook…</strong><span>Showing the same edited XLSX that will be downloaded.</span></div>';
  try{
    const buffer=await buildWorkbook();
    const wb=new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws=findInvoiceSheet(wb);
    if(!ws)throw Error("Preview sheet 01 unavailable");
    buildWorkbookPreviewSheet(ws);
  }catch(error){
    host.innerHTML="";
    const empty=document.createElement("div");
    empty.className="emptyPage";
    const strong=document.createElement("strong");
    strong.textContent="Preview unavailable";
    const span=document.createElement("span");
    span.textContent=error?.message||"Unable to render workbook";
    empty.append(strong,span);
    host.append(empty);
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
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="BNC-Invoice-"+String(state.invoiceNo||"0002").replace(/[^0-9A-Za-z_-]/g,"_")+".xlsx";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    setStatus("XLSX downloaded");
  }catch(error){
    alert(error?.message||"Unable to download XLSX");
  }
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
  $("#jsonOutBtn").onclick=exportJson;
  $("#jsonInBtn").onclick=()=>$("#jsonFile").click();
  $("#jsonFile").onchange=e=>{
    const file=e.target.files?.[0];
    if(file)importJson(file);
    e.target.value="";
  };
})();
})();
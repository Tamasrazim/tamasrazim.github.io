// BNC Agro Care — master invoice row helper
(function(global){
"use strict";

const PRODUCT_START_ROW=11;
const LEFT_SL_COL=1;
const RIGHT_SL_COL=7;
const MAX_COLUMNS=12;
const MIN_ROWS_PER_SIDE=6;

function textOfCell(cell){
  const v=cell?.value;
  if(v==null)return "";
  if(typeof v==="string"||typeof v==="number")return String(v).trim();
  if(v.richText)return v.richText.map(x=>x.text||"").join("").trim();
  if(v.text!=null)return String(v.text).trim();
  if(v.result!=null)return String(v.result).trim();
  return "";
}

function cellAt(ws,row,col){
  return ws.getRow(row).getCell(col);
}

function findStRow(ws){
  for(let r=PRODUCT_START_ROW;r<=ws.rowCount;r++){
    if(textOfCell(cellAt(ws,r,2)).toUpperCase()==="ST")return r;
  }
  throw new Error("Could not find the invoice subtotal row.");
}

function mergeRanges(ws){
  if(ws._merges&&typeof ws._merges==="object"){
    return Object.values(ws._merges)
      .filter(Boolean)
      .map(v=>String(v.range||v));
  }
  const model=ws.model;
  return Array.isArray(model?.merges)?model.merges.map(String):[];
}

function shiftMergeRange(range,startRow){
  const m=String(range).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if(!m)return range;
  let r1=Number(m[2]),r2=Number(m[4]);
  if(r1>=startRow){r1++;r2++}
  else if(r2>=startRow){r2++}
  return m[1]+r1+":"+m[3]+r2;
}

function unmergeAll(ws,ranges){
  for(const range of ranges){
    try{ws.unMergeCells(range)}catch{}
  }
}

function restoreMerges(ws,ranges,startRow){
  for(const range of ranges){
    const shifted=shiftMergeRange(range,startRow);
    try{
      if(typeof ws.mergeCellsWithoutStyle==="function")ws.mergeCellsWithoutStyle(shifted);
      else ws.mergeCells(shifted);
    }catch(error){
      throw new Error("Could not restore invoice merge "+shifted+": "+(error?.message||error));
    }
  }
}

function cloneBorder(border){
  if(!border)return {};
  if(typeof structuredClone==="function"){
    try{return structuredClone(border)}catch{}
  }
  return JSON.parse(JSON.stringify(border));
}

function snapshotBorders(ws,firstRow,lastRow){
  const out={};
  for(let r=firstRow;r<=lastRow;r++){
    out[r]=[];
    for(let c=1;c<=MAX_COLUMNS;c++){
      out[r][c]=cloneBorder(cellAt(ws,r,c).border);
    }
  }
  return out;
}

function restoreBordersAfterInsert(ws,snapshot,startRow,originalBottom){
  const finalBottom=originalBottom+1;
  for(let targetRow=1;targetRow<=finalBottom;targetRow++){
    let sourceRow;
    if(targetRow<startRow)sourceRow=targetRow;
    else if(targetRow===startRow)sourceRow=startRow-1;
    else sourceRow=targetRow-1;

    const source=snapshot[sourceRow];
    if(!source)continue;

    for(let c=1;c<=MAX_COLUMNS;c++){
      cellAt(ws,targetRow,c).border=cloneBorder(source[c]);
    }
  }
}

function clearProductRow(ws,row){
  for(let c=1;c<=MAX_COLUMNS;c++)cellAt(ws,row,c).value=null;
}

function setLineAmountFormulas(ws,firstRow,lastRow){
  for(let r=firstRow;r<=lastRow;r++){
    cellAt(ws,r,6).value={formula:"D"+r+"*E"+r};
    cellAt(ws,r,12).value={formula:"J"+r+"*K"+r};
  }
}

function rebalanceSL(ws,totalRows){
  for(let i=0;i<totalRows;i++){
    cellAt(ws,PRODUCT_START_ROW+i,LEFT_SL_COL).value=i+1;
    cellAt(ws,PRODUCT_START_ROW+i,RIGHT_SL_COL).value=totalRows+i+1;
  }
}

function rebuildSubtotalFormulas(ws,stRow){
  const totalsRow=stRow+1;
  cellAt(ws,totalsRow,4).value={formula:"SUM(D"+PRODUCT_START_ROW+":D"+stRow+")"};
  cellAt(ws,totalsRow,6).value={formula:"SUM(F"+PRODUCT_START_ROW+":F"+stRow+")"};
  cellAt(ws,totalsRow,12).value={formula:"SUM(L"+PRODUCT_START_ROW+":L"+stRow+")"};
}

function insertProductRowIntoWorksheet(ws){
  if(!ws||typeof ws.insertRow!=="function"){
    throw new Error("ExcelJS worksheet row insertion is unavailable");
  }

  const stRow=findStRow(ws);
  const merges=mergeRanges(ws);
  const bottomRow=ws.rowCount;
  // Snapshot the complete invoice outline, including header rows and the
  // outer frame, because merge teardown can affect borders outside the
  // inserted product-row area.
  const borderSnapshot=snapshotBorders(ws,1,bottomRow);

  // Critical fix:
  // never insert a physical worksheet row while invoice merges are active.
  // Detach the merges, insert the product row, then restore every merge
  // at its shifted address.
  unmergeAll(ws,merges);

  try{
    ws.insertRow(stRow,[], "i+");

    // Keep the new row visually consistent while preserving the complete
    // original invoice outline across the whole sheet.
    clearProductRow(ws,stRow);
    restoreBordersAfterInsert(ws,borderSnapshot,stRow,bottomRow);

    const totalRows=stRow-PRODUCT_START_ROW+1;
    if(totalRows<MIN_ROWS_PER_SIDE){
      throw new Error("Invoice master must contain at least 6 product rows per side.");
    }

    rebalanceSL(ws,totalRows);
    setLineAmountFormulas(ws,PRODUCT_START_ROW,stRow);
    rebuildSubtotalFormulas(ws,stRow);

  }finally{
    restoreMerges(ws,merges,stRow);
  }

  return stRow;
}

async function addProductRow(file){
  if(typeof ExcelJS==="undefined")throw new Error("ExcelJS is required");
  const workbook=new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const ws=workbook.getWorksheet("01");
  if(!ws)throw new Error("Invoice sheet 01 is unavailable");
  insertProductRowIntoWorksheet(ws);
  const out=await workbook.xlsx.writeBuffer();
  return new Blob([out],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}

global.BNCInsertProductRow=insertProductRowIntoWorksheet;
global.BNCFindStRow=findStRow;
global.BNCCountInvoiceRows=ws=>Math.max(MIN_ROWS_PER_SIDE,findStRow(ws)-PRODUCT_START_ROW);
global.addProductRow=addProductRow;

})(typeof window!=="undefined"?window:globalThis);

// BNC Agro Care invoice row helper
(function(global){
"use strict";

const PRODUCT_START_ROW=11;
const LEFT_SL_COL=1;
const RIGHT_SL_COL=7;
const MAX_COLUMNS=12;

function textOfCell(cell){
  const v=cell?.value;
  if(v==null)return "";
  if(typeof v==="string"||typeof v==="number")return String(v).trim();
  if(v.richText)return v.richText.map(x=>x.text||"").join("").trim();
  if(v.text!=null)return String(v.text).trim();
  if(v.result!=null)return String(v.result).trim();
  return "";
}

function cellAt(ws,rowNumber,colNumber){
  const r=Number(rowNumber),c=Number(colNumber);
  if(!Number.isInteger(r)||r<1||!Number.isInteger(c)||c<1)return null;
  return ws.getRow(r).getCell(c);
}

function findStRow(ws){
  for(let r=PRODUCT_START_ROW;r<=ws.rowCount;r++){
    if(textOfCell(cellAt(ws,r,2)).toUpperCase()==="ST")return r;
  }
  throw new Error("Could not find the invoice subtotal row.");
}

function shiftMergeRange(range,startRow){
  const m=String(range).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if(!m)return range;
  let r1=Number(m[2]),r2=Number(m[4]);
  if(r1>=startRow){r1++;r2++}
  else if(r2>=startRow){r2++}
  return m[1]+r1+":"+m[3]+r2;
}

function mergeRanges(ws){
  if(ws._merges&&typeof ws._merges==="object"){
    return Object.values(ws._merges).filter(Boolean).map(v=>String(v.range));
  }
  const model=ws.model;
  return Array.isArray(model?.merges)?model.merges.map(String):[];
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

function clearCellsAtoL(ws,rowNumber){
  for(let c=1;c<=MAX_COLUMNS;c++)cellAt(ws,rowNumber,c).value=null;
}

function rebuildTotals(ws,stRow){
  const totalsRow=stRow+1;
  [["D",4],["F",6],["L",12]].forEach(([letter,col])=>{
    cellAt(ws,totalsRow,col).value={formula:"SUM("+letter+PRODUCT_START_ROW+":"+letter+stRow+")"};
  });
}

function rebalanceSL(ws,totalRows){
  for(let i=0;i<totalRows;i++){
    cellAt(ws,PRODUCT_START_ROW+i,LEFT_SL_COL).value=i+1;
    cellAt(ws,PRODUCT_START_ROW+i,RIGHT_SL_COL).value=totalRows+i+1;
  }
}

function insertProductRowIntoWorksheet(ws){
  if(!ws||typeof ws.insertRow!=="function")throw new Error("ExcelJS worksheet row insertion is unavailable");

  const stRow=findStRow(ws);
  const merges=mergeRanges(ws);

  // ExcelJS can move normal rows correctly, but merged cells are the fragile part.
  // Detach every merge, let ExcelJS create a real Row/Cell structure, then restore
  // the merge ranges at their new addresses.
  unmergeAll(ws,merges);

  try{
    // i+ copies the visual style from the row above without copying product values.
    ws.insertRow(stRow,[], "i+");
    clearCellsAtoL(ws,stRow);

    const totalRows=Math.max(4,stRow-PRODUCT_START_ROW+1);
    rebalanceSL(ws,totalRows);
    rebuildTotals(ws,stRow);
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
global.BNCCountInvoiceRows=ws=>Math.max(4,findStRow(ws)-PRODUCT_START_ROW);
global.addProductRow=addProductRow;

})(typeof window!=="undefined"?window:globalThis);

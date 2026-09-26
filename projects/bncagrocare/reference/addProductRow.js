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

function clone(value){
  if(value==null)return value;
  if(typeof structuredClone==="function"){
    try{return structuredClone(value)}catch{}
  }
  return JSON.parse(JSON.stringify(value));
}

function bumpFormula(formula,startRow){
  return String(formula).replace(/(\$?[A-Z]{1,3}\$?)(\d+)/g,(whole,col,rowText)=>{
    const row=Number(rowText);
    return row>=startRow?col+(row+1):whole;
  });
}

function bumpAddress(address,startRow){
  if(!address)return address;
  return String(address).replace(/^(\$?[A-Z]{1,3}\$?)(\d+)$/i,(whole,col,rowText)=>{
    const row=Number(rowText);
    return row>=startRow?col+(row+1):whole;
  });
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

function snapshotRows(ws,startRow,lastRow,maxCol){
  const rows={};
  for(let r=Math.max(1,startRow-1);r<=lastRow;r++){
    const row=ws.getRow(r);
    const cells=[];
    for(let c=1;c<=maxCol;c++){
      const cell=row.getCell(c);
      // A merged child contains an internal MergeValue object that references
      // its master Cell. Never copy that object as an ordinary cell value.
      const keepValue=!cell.isMerged||cell.master===cell;
      cells[c]={style:clone(cell.style),value:keepValue?clone(cell.value):null};
    }
    rows[r]={
      height:row.height,
      hidden:row.hidden,
      outlineLevel:row.outlineLevel,
      cells
    };
  }
  return rows;
}

function shiftedValue(value,startRow){
  if(value==null)return null;
  if(typeof value!=="object")return value;
  const next=clone(value);
  if(next.formula)next.formula=bumpFormula(next.formula,startRow);
  if(next.ref)next.ref=bumpAddress(next.ref,startRow);
  if(next.sharedFormula)next.sharedFormula=bumpAddress(next.sharedFormula,startRow);
  if(next.address)next.address=bumpAddress(next.address,startRow);
  if(next.master)next.master=bumpAddress(next.master,startRow);
  return next;
}

function writeCellSnapshot(target,source,startRow,keepValue=true){
  target.value=null;
  if(source?.style)target.style=clone(source.style);
  if(keepValue)target.value=shiftedValue(source?.value,startRow);
}

function copyRowSnapshot(targetRow,sourceRow,startRow,maxCol,keepValues=true){
  if(sourceRow?.height!=null)targetRow.height=sourceRow.height;
  else delete targetRow.height;
  targetRow.hidden=!!sourceRow?.hidden;
  targetRow.outlineLevel=Number(sourceRow?.outlineLevel)||0;
  for(let c=1;c<=maxCol;c++){
    const target=targetRow.getCell(c);
    const source=sourceRow?.cells?.[c];
    writeCellSnapshot(target,source,startRow,keepValues);
  }
}

function clearRow(ws,rowNumber,maxCol){
  const row=ws.getRow(rowNumber);
  for(let c=1;c<=maxCol;c++){
    const cell=row.getCell(c);
    cell.value=null;
  }
}

function shiftRowsDownWithoutSplice(ws,startRow){
  const last=findStRow(ws);
  const maxCol=Math.max(MAX_COLUMNS,ws.columnCount||MAX_COLUMNS);
  const rows=snapshotRows(ws,startRow,last,maxCol);
  const merges=mergeRanges(ws);

  // Work on ordinary cells while merges are detached. This avoids ExcelJS row.model
  // reconstruction and therefore avoids malformed Cell/Row objects.
  unmergeAll(ws,merges);

  for(let r=last;r>=startRow;r--){
    copyRowSnapshot(ws.getRow(r+1),rows[r],startRow,maxCol,true);
  }

  // The inserted row inherits the visual format of the row directly above ST,
  // but it contains no product values or formulas.
  copyRowSnapshot(ws.getRow(startRow),rows[startRow-1],startRow,maxCol,false);
  clearRow(ws,startRow,maxCol);

  restoreMerges(ws,merges,startRow);
  return startRow;
}

function rebuildTotals(ws,stRow){
  const totalsRow=stRow+1;
  [["D",4],["F",6],["L",12]].forEach(([letter,col])=>{
    const cell=cellAt(ws,totalsRow,col);
    cell.value={formula:"SUM("+letter+PRODUCT_START_ROW+":"+letter+stRow+")"};
  });
}

function rebalanceSL(ws,totalRows){
  for(let i=0;i<totalRows;i++){
    cellAt(ws,PRODUCT_START_ROW+i,LEFT_SL_COL).value=i+1;
    cellAt(ws,PRODUCT_START_ROW+i,RIGHT_SL_COL).value=totalRows+i+1;
  }
}

function insertProductRowIntoWorksheet(ws){
  const stRow=findStRow(ws);
  shiftRowsDownWithoutSplice(ws,stRow);
  const totalRows=Math.max(4,stRow-PRODUCT_START_ROW+1);
  rebalanceSL(ws,totalRows);
  rebuildTotals(ws,stRow);
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

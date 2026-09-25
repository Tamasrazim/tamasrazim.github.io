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
  throw new Error('Could not find the invoice subtotal row.');
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

function bumpFormulaRefsAtOrBelow(ws,startRow){
  for(let r=startRow;r<=ws.rowCount;r++){
    const row=ws.getRow(r);
    row.eachCell({includeEmpty:false},cell=>{
      if(cell.formula){
        cell.value={formula:bumpFormula(cell.formula,startRow)};
      }
    });
  }
}

function mergeRanges(ws){
  if(ws._merges&&typeof ws._merges==="object"){
    return Object.values(ws._merges).filter(Boolean).map(v=>String(v.range));
  }
  const model=ws.model;
  if(Array.isArray(model?.merges))return model.merges.map(String);
  return [];
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

function adjustRowModel(model,newNumber,startRow){
  const next=clone(model);
  if(!next)return null;
  next.number=newNumber;
  if(Array.isArray(next.cells)){
    next.cells=next.cells.map(cell=>{
      const c=clone(cell);
      if(c.address)c.address=bumpAddress(c.address,startRow);
      if(c.master)c.master=bumpAddress(c.master,startRow);
      if(c.formula)c.formula=bumpFormula(c.formula,startRow);
      if(c.ref)c.ref=bumpAddress(c.ref,startRow);
      if(c.sharedFormula)c.sharedFormula=bumpAddress(c.sharedFormula,startRow);
      return c;
    });
  }
  return next;
}

function shiftRowsDownWithoutSplice(ws,startRow){
  const last=ws.rowCount;
  const merges=mergeRanges(ws);

  // ExcelJS's normal splice path can break templates with merged cells.
  // Detach the merge layer first, rebuild rows from models, then restore shifted merges.
  unmergeAll(ws,merges);

  // Update defined-name row references just like Worksheet.spliceRows(start,0,...)
  try{
    if(ws.workbook?.definedNames?.spliceRows){
      ws.workbook.definedNames.spliceRows(ws.name,startRow,0,1);
    }
  }catch(error){
    console.warn("BNC defined-name row shift skipped:",error);
  }

  bumpFormulaRefsAtOrBelow(ws,startRow);

  const models=[];
  for(let r=startRow;r<=last;r++){
    models[r]=ws.findRow(r)?.model||null;
  }

  // Detach all old row objects at and below the insertion point.
  for(let r=startRow;r<=last+1;r++)ws._rows[r-1]=undefined;

  // Rebuild shifted rows from row models. This never invokes insertRow/spliceRows.
  for(let r=last;r>=startRow;r--){
    const source=models[r];
    if(!source)continue;
    const targetModel=adjustRowModel(source,r+1,startRow);
    const target=ws.getRow(r+1);
    target.model=targetModel;
  }

  // Blank row with the same style/height as the row above ST.
  const sourceModel=models[startRow-1]||ws.getRow(startRow-1).model;
  const inserted=ws.getRow(startRow);
  if(sourceModel){
    const blankModel=clone(sourceModel);
    blankModel.number=startRow;
    if(Array.isArray(blankModel.cells)){
      blankModel.cells=blankModel.cells.map(cell=>{
        const c=clone(cell);
        if(c.address)c.address=bumpAddress(c.address,startRow);
        if(c.master)delete c.master;
        delete c.formula;
        delete c.sharedFormula;
        delete c.result;
        delete c.value;
        delete c.text;
        delete c.hyperlink;
        delete c.comment;
        c.type=0;
        return c;
      });
    }
    inserted.model=blankModel;
  }else{
    inserted.height=ws.getRow(startRow-1).height;
  }

  restoreMerges(ws,merges,startRow);
  return startRow;
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
  const stRow=findStRow(ws);
  shiftRowsDownWithoutSplice(ws,stRow);
  clearCellsAtoL(ws,stRow);
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
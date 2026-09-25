// BNC Agro Care · canonical workbook row rule
// Source of truth: reference/BNCFINAL.xlsx
(function(global){
"use strict";
const PRODUCT_START_ROW=11;
const LEFT_SL_COL=1;
const RIGHT_SL_COL=7;
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
  throw new Error('Could not find the "ST" row in BNCFINAL.xlsx');
}
function bumpFormula(formula,startRow){
  return String(formula).replace(/(\$?[A-Z]{1,3}\$?)(\d+)/g,(whole,col,rowText)=>{
    const row=Number(rowText);
    return row>=startRow?col+(row+1):whole;
  });
}
function bumpFormulaRefsAtOrBelow(ws,startRow){
  for(let r=startRow;r<=ws.rowCount;r++){
    ws.getRow(r).eachCell({includeEmpty:false},cell=>{
      if(cell.formula)cell.value={formula:bumpFormula(cell.formula,startRow)};
    });
  }
}
function copyFormats(source,target){
  target.style={...source.style};
  target.alignment={...source.alignment};
  target.font={...source.font};
  target.fill={...source.fill};
  target.border={...source.border};
  target.protection={...source.protection};
  target.numFmt=source.numFmt;
}
function clearCellsAtoL(ws,rowNumber){
  for(let c=1;c<=12;c++)cellAt(ws,rowNumber,c).value=null;
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
  bumpFormulaRefsAtOrBelow(ws,stRow);
  const inserted=ws.insertRow(stRow,[], "i+");
  inserted.height=ws.getRow(stRow-1).height;
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
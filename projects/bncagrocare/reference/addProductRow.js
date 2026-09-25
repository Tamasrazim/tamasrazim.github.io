// BNC AgroCare invoice row engine.
// BNCFINAL.xlsx is canonical. Every workbook cell write uses an explicit Row object.
// The Studio and standalone helper share this insertion algorithm.
(function(global){
"use strict";
const PRODUCT_START_ROW=11;
const LEFT_SL_COL=1;
const RIGHT_SL_COL=7;
function cellAt(ws,rowNumber,colNumber){
  const r=Number(rowNumber),c=Number(colNumber);
  if(!Number.isInteger(r)||r<1||!Number.isInteger(c)||c<1)return null;
  return ws.getRow(r).getCell(c);
}
function textOfCell(cell){
  const v=cell?.value;
  if(v==null)return "";
  if(typeof v==="string"||typeof v==="number")return String(v).trim();
  if(v.richText)return v.richText.map(x=>x.text||"").join("").trim();
  if(v.text)return String(v.text).trim();
  if(v.result!=null)return String(v.result).trim();
  return "";
}
function findStRow(ws){
  let stRow=null;
  ws.eachRow((row,rowNumber)=>{
    if(stRow!==null)return;
    if(textOfCell(row.getCell(2)).toUpperCase()==="ST")stRow=rowNumber;
  });
  if(!stRow)throw new Error('Could not find the "ST" row in BNCFINAL.xlsx');
  return stRow;
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
function copyStyleAndRelativeFormula(source,target){
  if(source?.style)target.style={...source.style};
  if(source?.formula){
    const sourceRow=source.row,targetRow=target.row;
    target.value={formula:String(source.formula).replace(/(\$?[A-Z]{1,3}\$?)(\d+)/g,(m,col,rowText)=>{
      return Number(rowText)===sourceRow?col+targetRow:m;
    })};
  }
}
function rebuildStTotals(ws,stRow){
  const totalsRow=stRow+1;
  [["D",4],["F",6],["L",12]].forEach(([letter,colNumber])=>{
    cellAt(ws,totalsRow,colNumber).value={formula:"SUM("+letter+"11:"+letter+stRow+")"};
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
  ws.insertRow(stRow,[],"i+");
  const above=ws.getRow(stRow-1);
  const inserted=ws.getRow(stRow);
  inserted.height=above.height;
  for(let c=1;c<=12;c++)copyStyleAndRelativeFormula(above.getCell(c),inserted.getCell(c));
  rebuildStTotals(ws,stRow);
  rebalanceSL(ws,Math.max(4,stRow-PRODUCT_START_ROW+1));
  return stRow;
}
async function addProductRow(file){
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
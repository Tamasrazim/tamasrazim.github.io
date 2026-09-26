import fs from "node:fs";
import {execFileSync} from "node:child_process";

const root=fs.existsSync("projects/bncagrocare")?"projects/bncagrocare":".";
const need=[
  "index.html",
  "reference/products.js",
  "reference/addProductRow.js",
  "reference/BNCFINAL.xlsx",
  "invoice/index.html",
  "invoice/css/app.css",
  "invoice/js/app.js",
  "invoice/sw.js"
];

for(const p of need){
  if(!fs.existsSync(root+"/"+p))throw Error("Missing required BNC asset");
}

const html=fs.readFileSync(root+"/invoice/index.html","utf8");
const js=fs.readFileSync(root+"/invoice/js/app.js","utf8");
const row=fs.readFileSync(root+"/reference/addProductRow.js","utf8");

if(!html.includes("Download XLSX"))throw Error("XLSX download control missing");
if(!js.includes("writeBuffer"))throw Error("XLSX export missing");
if(!js.includes("ensureLiveWorkbook"))throw Error("Live workbook loader missing");
if(!row.includes("ws.insertRow(stRow,[]"))throw Error("ExcelJS row insertion path missing");
if(!row.includes("unmergeAll(ws,merges)")||!row.includes("restoreMerges(ws,merges,stRow)"))throw Error("Merge-safe merge handling missing");

for(const file of ["invoice/js/app.js","invoice/sw.js","reference/addProductRow.js"]){
  execFileSync(process.execPath,["--check",root+"/"+file]);
}

console.log("BNC invoice validation passed");

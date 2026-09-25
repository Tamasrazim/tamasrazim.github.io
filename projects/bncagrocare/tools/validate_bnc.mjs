import fs from "node:fs";
import { execFileSync } from "node:child_process";

const root=fs.existsSync("projects/bncagrocare")?"projects/bncagrocare":".";
const read=p=>fs.readFileSync(root+"/"+p,"utf8");
const must=(ok,msg)=>{if(!ok)throw new Error(msg);console.log("PASS",msg)};

for(const p of [
 "index.html","invoice/index.html","invoice/css/app.css","invoice/js/app.js",
 "invoice/sw.js","invoice/manifest.webmanifest","reference/BNCFINAL.xlsx",
 "reference/addProductRow.js","reference/products.js"
])must(fs.existsSync(root+"/"+p),p+" exists");

const xlsxSha=execFileSync("git",["ls-tree","-r","HEAD","--",root+"/reference/BNCFINAL.xlsx"],{encoding:"utf8"}).trim().split(/\s+/)[2];
must(xlsxSha==="f705ea96084e0c9777effd400744a7f7d94cba69","BNCFINAL.xlsx is canonical");

const invoice=read("invoice/index.html");
must(invoice.includes("exceljs@4.4.0"),"Invoice Studio loads ExcelJS");
must(invoice.includes("Download XLSX"),"Invoice Studio exports XLSX");
must(!invoice.includes("pdf-lib"),"Invoice Studio has no pdf-lib");

const js=read("invoice/js/app.js");
must(js.includes("BNCFINAL.xlsx"),"Invoice Studio uses BNCFINAL.xlsx");
must(js.includes("addProductRow.js")===false,"row rule remains external in reference/addProductRow.js");
must(js.includes("ROWS_PER_SIDE=4"),"base invoice geometry is 4 rows per side");
must(js.includes("insertProductRow"),"Invoice Studio applies the row insertion rule");
must(js.includes("downloadXlsx"),"XLSX download path exists");
must(!js.includes("PDFDocument")&&!js.includes("pdf-lib"),"no PDF generation code");
execFileSync(process.execPath,["--check",root+"/invoice/js/app.js"],{stdio:"inherit"});

const sw=read("invoice/sw.js");
must(sw.includes("EXCEL_JS"),"service worker caches ExcelJS");
must(sw.includes("BNCFINAL.xlsx"),"service worker caches BNCFINAL.xlsx");
must(!sw.includes("pdf-lib")&&!sw.includes("invoice.pdf"),"service worker has no PDF dependency");
execFileSync(process.execPath,["--check",root+"/invoice/sw.js"],{stdio:"inherit"});

console.log("BNC XLSX validation complete");

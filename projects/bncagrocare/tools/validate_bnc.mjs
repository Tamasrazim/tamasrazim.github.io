import fs from "node:fs";
import {execFileSync} from "node:child_process";
const root=fs.existsSync("projects/bncagrocare")?"projects/bncagrocare":".";
const need=[
"index.html","18-09-26 0001.xlsx","18-09-26 0002.xlsx","invoice.pdf",
"IMG-20260713-WA0000.jpg","IMG-20260713-WA0001.jpg","IMG-20260713-WA0002.jpg","IMG-20260713-WA0003.jpg",
"reference/BNCFINAL.xlsx","reference/products.js","reference/addProductRow.js",
"invoice/index.html","invoice/css/app.css","invoice/js/app.js","invoice/sw.js"
];
for(const p of need)if(!fs.existsSync(root+"/"+p))throw Error("Missing "+p);
const js=fs.readFileSync(root+"/invoice/js/app.js","utf8");
const row=fs.readFileSync(root+"/reference/addProductRow.js","utf8");
if(!js.includes("getRow(")||!js.includes("getCell("))throw Error("Workbook writes are not row-based");
if(!js.includes("writeBuffer"))throw Error("XLSX export missing");
if(js.includes("PDFDocument")||js.includes("pdf-lib"))throw Error("PDF generator must not exist");
if(!row.includes("getRow(row)")||!row.includes("insertRow"))throw Error("Row engine incomplete");
execFileSync(process.execPath,["--check",root+"/invoice/js/app.js"]);
execFileSync(process.execPath,["--check",root+"/invoice/sw.js"]);
execFileSync(process.execPath,["--check",root+"/reference/addProductRow.js"]);
const sha=execFileSync("git",["ls-tree","-r","HEAD","--",root+"/reference/BNCFINAL.xlsx"],{encoding:"utf8"}).trim().split(/\s+/)[2];
if(sha!=="f705ea96084e0c9777effd400744a7f7d94cba69")throw Error("BNCFINAL.xlsx changed");
console.log("BNC rebuild validation passed");

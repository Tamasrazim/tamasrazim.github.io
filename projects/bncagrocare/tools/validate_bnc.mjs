// What this does: Validates BNC pages, shared product data, invoice controls and JavaScript syntax.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const root=fs.existsSync("projects/bncagrocare")?"projects/bncagrocare":".";
const required=["index.html","reference/products.js","catalog/index.html","catalog/sw.js","catalog/manifest.webmanifest","invoice/index.html","invoice/css/app.css","invoice/js/app.js","invoice/sw.js","invoice/manifest.webmanifest"];
for(const file of required)if(!fs.existsSync(root+"/"+file))throw new Error("Missing required BNC file: "+file);
const overview=fs.readFileSync(root+"/index.html","utf8"),catalogue=fs.readFileSync(root+"/catalog/index.html","utf8"),invoice=fs.readFileSync(root+"/invoice/index.html","utf8"),app=fs.readFileSync(root+"/invoice/js/app.js","utf8"),productData=fs.readFileSync(root+"/reference/products.js","utf8");
for(const path of ['/projects/bncagrocare/catalog/','/projects/bncagrocare/invoice/'])if(!overview.includes('href="'+path+'"'))throw new Error("Overview missing link to "+path);
for(const feature of ['id="search"','id="products"','window.BNC_PRODUCTS'])if(!catalogue.includes(feature))throw new Error("Catalogue feature missing: "+feature);
for(const feature of ['id="itemsBody"','id="xlsxBtn"','id="csvBtn"','id="printBtn"','id="history"'])if(!invoice.includes(feature))throw new Error("Invoice control missing: "+feature);
for(const feature of ['downloadXLSX','downloadCSV','window.print()','localStorage','function calc()','function renderPreview()'])if(!app.includes(feature))throw new Error("Invoice implementation missing: "+feature);
if((productData.match(/\{ code:/g)||[]).length!==10)throw new Error("Expected 10 shared BNC products");
for(const file of ["reference/products.js","catalog/reference/products.js","catalog/sw.js","invoice/sw.js","invoice/js/app.js"])if(file.endsWith(".js"))execFileSync(process.execPath,["--check",root+"/"+file]);
console.log("BNC rebuild validation passed: pages, controls, 10 products and JavaScript syntax.");
// What this does: Runs structural and syntax checks for the rebuilt BNC catalogue and invoice workspace.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const root="projects/bncagrocare";
const read=path=>fs.readFileSync(path,"utf8");
const must=(condition,message)=>{if(!condition)throw new Error(message);console.log("PASS",message);};
const required=[
"index.html","reference/products.js","catalog/index.html","catalog/sw.js","catalog/manifest.webmanifest",
"invoice/index.html","invoice/css/app.css","invoice/js/app.js","invoice/sw.js","invoice/manifest.webmanifest"
];
for(const path of required)must(fs.existsSync(root+"/"+path),"exists: "+path);
const overview=read(root+"/index.html");
const catalogue=read(root+"/catalog/index.html");
const invoice=read(root+"/invoice/index.html");
const app=read(root+"/invoice/js/app.js");
const products=read(root+"/reference/products.js");
must(overview.includes('href="./catalog/"')&&overview.includes('href="./invoice/"'),"overview links to both workspaces");
must(catalogue.includes('id="search"')&&catalogue.includes('id="products"')&&catalogue.includes("../reference/products.js"),"catalogue has search and shared product data");
must(invoice.includes('id="itemsBody"')&&invoice.includes('id="xlsxBtn"')&&invoice.includes('id="csvBtn"')&&invoice.includes('id="printBtn"'),"invoice editor and export controls exist");
must(invoice.includes('id="history"')&&invoice.includes('id="paper"'),"invoice history and live preview exist");
must(app.includes("localStorage")&&app.includes("downloadXLSX")&&app.includes("downloadCSV")&&app.includes("window.print()"),"local drafts and export paths exist");
must((products.match(/\{ code:/g)||[]).length===10,"shared catalogue has 10 products");
for(const path of ["reference/products.js","catalog/reference/products.js","catalog/sw.js","invoice/sw.js","invoice/js/app.js"])execFileSync(process.execPath,["--check",root+"/"+path],{stdio:"inherit"});
const catalogueManifest=JSON.parse(read(root+"/catalog/manifest.webmanifest"));
const invoiceManifest=JSON.parse(read(root+"/invoice/manifest.webmanifest"));
must(catalogueManifest.start_url==="./"&&invoiceManifest.start_url==="./","PWA start URLs are relative");
must(catalogueManifest.icons?.length>0&&invoiceManifest.icons?.length>0,"both PWA manifests declare icons");
console.log("BNC validation complete.");
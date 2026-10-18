// What this does: Checks catalogue rendering paths and shared product data.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const root=fs.existsSync("projects/bncagrocare/catalog")?"projects/bncagrocare/catalog":".";
const parent=root.endsWith("/catalog")?root.slice(0,-8):"..";
for(const file of ["index.html","sw.js","manifest.webmanifest","reference/products.js"])if(!fs.existsSync(root+"/"+file))throw new Error("Missing catalogue file: "+file);
const html=fs.readFileSync(root+"/index.html","utf8"),data=fs.readFileSync(parent+"/reference/products.js","utf8");
if(!html.includes('id="search"')||!html.includes('id="products"'))throw new Error("Catalogue search interface is incomplete");
if(!html.includes("../reference/products.js"))throw new Error("Catalogue must load shared BNC product data");
if((data.match(/\{ code:/g)||[]).length!==10)throw new Error("Expected 10 catalogue products");
execFileSync(process.execPath,["--check",root+"/sw.js"]);
execFileSync(process.execPath,["--check",parent+"/reference/products.js"]);
console.log("BNC catalogue validation passed.");
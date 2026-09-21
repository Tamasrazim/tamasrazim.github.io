(()=>{"use strict";
const $=s=>document.querySelector(s);
const PDF=()=>window.PDFLib||globalThis.PDFLib||{};
let pdfEnginePromise=null;
function loadPdfEngine(){
  if(PDF().PDFDocument)return Promise.resolve(PDF());
  if(pdfEnginePromise)return pdfEnginePromise;
  pdfEnginePromise=new Promise((resolve,reject)=>{
    const urls=["https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js","https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"];
    let n=0;
    const next=()=>{
      if(PDF().PDFDocument)return resolve(PDF());
      if(n>=urls.length)return reject(Error("PDF engine could not be loaded"));
      const s=document.createElement("script");s.src=urls[n++];s.async=false;
      s.onload=()=>PDF().PDFDocument?resolve(PDF()):next();
      s.onerror=next;document.head.append(s)
    };
    next()
  }).catch(e=>{pdfEnginePromise=null;throw e});
  return pdfEnginePromise
}
const TEMPLATE="../invoice.pdf",DB="bnc-invoice-pdf-v3",MAX_EXTRAROWS=10,TEMPLATE_ROWS=8;
const PRODUCTS=["NC Gold - 4cpa","NC Zinc - Mono 36%","NC Solu - Boron 20%","NC Solu+ - Boron 17%","NC Chilli - Chilted Zinc 10%","Pa- Cola - Paclobutazol 25 SC","NC Vit - (NHA 98%)","NC Leaf - GA-3","NC Gyp - Calcium 20% & sulfur 16%","Pachtara - 5 SG","NC Darma","Darma+++","NC Vit+++","NC Leaf+++"];
const blank=()=>({name:"",pack:"",ctn:"",rate:""});
const state={ref:"X2",invoiceNo:"0002",date:"",trader:"",buyer:"",address:"",mobile:"",commission:0,products:Array.from({length:TEMPLATE_ROWS},blank)};
let db=null,deferred=null,pdfUrl="",lastPdf=null;

const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const money=v=>num(v).toFixed(2);
const localDate=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const displayDate=v=>String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})$/)?.slice(1).reverse().join(".")||String(v||"");
const hasData=p=>!!(String(p?.name||"").trim()||String(p?.pack||"").trim()||String(p?.ctn||"").trim()||String(p?.rate||"").trim());

function words(n){n=Math.max(0,Math.round(num(n)*100))/100;const o=["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"],t=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];const w=x=>x<20?o[x]:x<100?t[Math.floor(x/10)]+(x%10?" "+o[x%10]:""):x<1000?o[Math.floor(x/100)]+" Hundred"+(x%100?" "+w(x%100):""):x<1e5?w(Math.floor(x/1e3))+" Thousand"+(x%1e3?" "+w(x%1e3):""):x<1e7?w(Math.floor(x/1e5))+" Lakh"+(x%1e5?" "+w(x%1e5):""):w(Math.floor(x/1e7))+" Crore"+(x%1e7?" "+w(x%1e7):"");const whole=Math.floor(n),p=Math.round((n-whole)*100);return w(whole)+" Taka"+(p?" and "+String(p).padStart(2,"0")+" Paisa":"")+" Only"}

function totals(){let cartons=0,total=0,leftAmount=0,rightAmount=0;state.products.forEach((p,i)=>{const c=Math.max(0,num(p.ctn)),a=c*Math.max(0,num(p.rate));cartons+=c;total+=a;const side=i<4?0:i<8?1:(i-8)%2;if(side===0)leftAmount+=a;else rightAmount+=a});const commission=total*Math.max(0,num(state.commission))/100;return{cartons,total,commission,final:Math.max(0,total-commission),leftAmount,rightAmount}}
function normalize(){state.products=Array.isArray(state.products)?state.products.map(p=>({...blank(),...p})):[];if(!state.products.length)state.products=Array.from({length:TEMPLATE_ROWS},blank);while(state.products.length<TEMPLATE_ROWS)state.products.push(blank());state.commission=Math.max(0,num(state.commission));if(!state.date)state.date=localDate()}
function cloneState(){return JSON.parse(JSON.stringify(state))}
function saveDraft(){if(!db)return;db.transaction("drafts","readwrite").objectStore("drafts").put({id:"current",data:cloneState(),updatedAt:Date.now()})}
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("drafts"))d.createObjectStore("drafts",{keyPath:"id"});if(!d.objectStoreNames.contains("invoices"))d.createObjectStore("invoices",{keyPath:"id"})};r.onsuccess=()=>{db=r.result;res()};r.onerror=()=>rej(r.error)})}

function render(){normalize();for(const el of document.querySelectorAll("[data-k]")){const k=el.dataset.k;if(document.activeElement!==el)el.value=state[k]??""}
const host=$("#products");host.replaceChildren();
state.products.forEach((p,i)=>{const row=document.createElement("div");row.className="prod";const n=document.createElement("div");n.className="n";n.textContent=String(i+1).padStart(2,"0");row.append(n);
["name","pack","ctn","rate"].forEach(k=>{const lab=document.createElement("label");lab.textContent=k==="ctn"?"Ctn":k==="rate"?"Rate / Ctn":k[0].toUpperCase()+k.slice(1);const inp=document.createElement("input");inp.value=p[k]||"";inp.placeholder=k==="name"?"Product":"";inp.autocomplete="off";inp.setAttribute("aria-label",(k==="ctn"?"Cartons":k==="rate"?"Rate per carton":k[0].toUpperCase()+k.slice(1))+" "+(i+1));if(k==="ctn"){inp.type="number";inp.min="0";inp.step="1";inp.inputMode="numeric"}if(k==="rate"){inp.type="number";inp.min="0";inp.step="0.01";inp.inputMode="decimal"}if(k==="name"){inp.setAttribute("list","productCatalog")}
inp.addEventListener("input",e=>{const v=(k==="ctn"||k==="rate")?Math.max(0,num(e.target.value)):e.target.value;state.products[i][k]=v;updateSummary();saveDraft()});lab.append(inp);row.append(lab)});
const amount=document.createElement("label");amount.textContent="Amount";const ai=document.createElement("input");ai.readOnly=true;ai.setAttribute("aria-label","Amount "+(i+1));ai.value=p.ctn&&p.rate?money(num(p.ctn)*num(p.rate)):"";amount.append(ai);row.append(amount);
const del=document.createElement("button");del.textContent="×";del.title="Remove product";del.setAttribute("aria-label","Remove product "+(i+1));del.onclick=()=>{if(state.products.length>TEMPLATE_ROWS){state.products.splice(i,1);render();saveDraft()}else{$("#status").textContent="Keep at least 8 template rows"}};row.append(del);host.append(row)});
const dl=document.createElement("datalist");dl.id="productCatalog";PRODUCTS.forEach(v=>{const o=document.createElement("option");o.value=v;dl.append(o)});document.body.append(dl);updateSummary()}
function updateSummary(){const t=totals();$("#summary").innerHTML='<div class="sum"><span>Cartons</span><strong>'+t.cartons+'</strong></div><div class="sum"><span>Gross taka</span><strong>'+money(t.total)+'</strong></div><div class="sum"><span>Commission</span><strong>'+money(t.commission)+'</strong></div><div class="sum final"><span>Final total</span><strong>'+money(t.final)+'</strong></div>'}
function bindFields(){document.querySelectorAll("[data-k]").forEach(el=>el.addEventListener("input",()=>{const k=el.dataset.k;const v=k==="commission"?Math.max(0,num(el.value)):el.value;state[k]=v;if(k==="commission")el.value=String(v);saveDraft();updateSummary()}))}
function addProduct(){state.products.push(blank());render();saveDraft();const inputs=document.querySelectorAll("#products input");requestAnimationFrame(()=>inputs[Math.max(0,inputs.length-5)]?.focus());$("#status").textContent="Product added"}
function reset(){Object.assign(state,{ref:"X2",invoiceNo:String((Number(state.invoiceNo)||1)+1).padStart(4,"0"),date:localDate(),trader:"",buyer:"",address:"",mobile:"",commission:0,products:Array.from({length:TEMPLATE_ROWS},blank)});lastPdf=null;render();saveDraft();if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=""}$("#pdf").removeAttribute("src");$("#emptyPdf").style.display="grid";$("#pdfState").textContent="No PDF generated";$("#status").textContent="New invoice"}

function saveInvoice(){if(!db)return;const t=totals(),id=(state.invoiceNo||Date.now())+"-"+Date.now();db.transaction("invoices","readwrite").objectStore("invoices").put({id,invoiceNumber:state.invoiceNo,updatedAt:Date.now(),data:cloneState(),total:t.final});history();saveDraft();$("#status").textContent="Saved"}
function history(){if(!db)return;const host=$("#history");host.replaceChildren();const req=db.transaction("invoices").objectStore("invoices").openCursor(null,"prev");req.onsuccess=()=>{const c=req.result;if(!c)return;const x=c.value,row=document.createElement("div");row.className="historyRow";const meta=document.createElement("div");meta.innerHTML="<strong>"+String(x.invoiceNumber).replace(/[<>&"]/g,"")+"</strong><small>"+money(x.total)+" · "+new Date(x.updatedAt).toLocaleString()+"</small>";const actions=document.createElement("div");const load=document.createElement("button");load.textContent="Load";load.onclick=()=>{Object.assign(state,x.data);render();saveDraft();$("#status").textContent="Loaded"};const copy=document.createElement("button");copy.textContent="Copy";copy.onclick=()=>{Object.assign(state,x.data);state.invoiceNo=String((Number(state.invoiceNo)||0)+1).padStart(4,"0");state.date=localDate();render();saveDraft();$("#status").textContent="Copied"};const del=document.createElement("button");del.className="del";del.textContent="Delete";del.onclick=()=>{db.transaction("invoices","readwrite").objectStore("invoices").delete(x.id).onsuccess=history};actions.append(load,copy,del);row.append(meta,actions);host.append(row);c.continue()}}

function putField(form,name,value){try{const f=form.getTextField(name);f.setText(String(value??""));return true}catch{return false}}
function drawTextFit(page,text,x,y,w,h,font,size,align="left"){const v=String(text??"");if(!v)return;let fs=size;while(fs>3.2&&font.widthOfTextAtSize(v,fs)>Math.max(1,w-4))fs-=.25;const tw=font.widthOfTextAtSize(v,fs),tx=align==="center"?x+(w-tw)/2:align==="right"?x+w-tw-2:x+2;page.drawText(v,{x:Math.max(x+1,tx),y:y+Math.max(1,(h-fs)/2+1.2),size:fs,font,color:PDF().rgb(0,0,0)})}
function drawBox(page,x,y,w,h){page.drawRectangle({x,y,width:w,height:h,borderColor:PDF().rgb(0,0,0),borderWidth:.75})}

const X=[22.883,35.553,96.994,152.482,172.693,211.939,259.504,272.572,334.409,393.852,412.476,462.422,521.496];
const BASE_BOTTOMS=[681.80975,671.69073,661.57074,651.45074],BASE_H=8.12;
const SUMMARY=[641.33179,632.33179,622.59479,612.85779,603.11975],SUMMARY_H=[7,9.74,9.74,9.74,8.12];
function colText(page,v,c,y,h,font,align){drawTextFit(page,v,X[c],y,X[c+1]-X[c],h,font,7.7,align||(c===0||c===3||c===4||c===5||c===6||c===9||c===10||c===11?"center":"left"))}
function itemAt(i){return state.products[i]||blank()}
function sideIndex(i){return i<4?0:i<8?1:(i%2===0?0:1)}
function sideRow(i){return i<4?i:i<8?i-4:4+Math.floor((i-8)/2)}
function sl(i){return i+1}

function drawProduct(page,p,i,rowY,rowH,font){
  const side=sideIndex(i),base=side===0?0:6,vals=[hasData(p)?String(sl(i)):"",hasData(p)?p.name:"",hasData(p)?p.pack:"",hasData(p)?p.ctn:"",hasData(p)?p.rate:"",hasData(p)&&p.ctn&&p.rate?money(num(p.ctn)*num(p.rate)):""];
  for(let c=0;c<6;c++){const col=base+c;colText(page,vals[c],col,rowY,rowH,font,[0,3,4,5].includes(c)?"center":"left")}
}
function drawExistingRows(page,font){for(let i=0;i<8;i++)drawProduct(page,itemAt(i),i,BASE_BOTTOMS[i<4?i:i-4],BASE_H,font)}
function drawExtraRows(page,font,bold){
  const extraProducts=state.products.slice(8).filter(hasData);if(!extraProducts.length)return 0;
  const maxExtraRows=Math.ceil(extraProducts.length/2),rows=Math.min(MAX_EXTRAROWS,maxExtraRows),rh=Math.min(10.12,45/Math.max(1,rows)),shift=rh*rows;
  // Blank only the original summary area; the invoice template itself remains the source page.
  page.drawRectangle({x:X[0],y:548,width:X[12]-X[0],height:93,color:PDF().rgb(1,1,1)});
  const extras=state.products.slice(8,8+rows*2);
  for(let r=0;r<rows;r++){const y=649.45-(r+1)*rh;const li=8+r*2,ri=li+1;drawProduct(page,itemAt(li),li,y,rh,font);if(ri<8+extras.length)drawProduct(page,itemAt(ri),ri,y,rh,font);for(let c=0;c<12;c++)drawBox(page,X[c],y,X[c+1]-X[c],rh)}
  drawSummary(page,totals(),shift,font,bold);
  return rows*2
}
function drawSummary(page,t,shift,font,bold){
  const y0=641.33179-shift,y1=632.33179-shift,y2=622.59479-shift,y3=612.85779-shift,y4=603.11975-shift;
  const ys=[y0,y1,y2,y3,y4],hs=SUMMARY_H,b1=X[1],b3=X[3],d=X[3],f=X[5],h=X[7],i=X[8],l=X[11],r=X[12];
  const row=(label,y,hgt,lv,rl,rv,mode)=>{if(mode===0){drawBox(page,b1,y,b3-b1,hgt);drawBox(page,d,y,f-d,hgt);drawBox(page,h,y,i-h,hgt);drawBox(page,l,y,r-l,hgt);drawTextFit(page,label,b1,y,b3-b1,hgt,bold,7.3,"center");drawTextFit(page,lv,d,y,f-d,hgt,font,7.3,"right");drawTextFit(page,rl,h,y,i-h,hgt,bold,7.3,"center");drawTextFit(page,rv,l,y,r-l,hgt,font,7.3,"right")}
  else if(mode===1){drawBox(page,b1,y,b3-b1,hgt);drawBox(page,d,y,f-d,hgt);drawBox(page,h,y,l-h,hgt);drawBox(page,l,y,r-l,hgt);drawTextFit(page,label,b1,y,b3-b1,hgt,bold,7.1,"center");drawTextFit(page,lv,d,y,f-d,hgt,font,7.3,"right");drawTextFit(page,rl,h,y,l-h,hgt,bold,7.1,"center");drawTextFit(page,rv,l,y,r-l,hgt,font,7.3,"right")}
  else {drawBox(page,b1,y,l-b1,hgt);drawBox(page,l,y,r-l,hgt);drawTextFit(page,label,b1,y,l-b1,hgt,bold,7.2,"right");drawTextFit(page,lv,l,y,r-l,hgt,font,7.2,mode===4?"left":"right")}};
  row("ST",ys[0],hs[0],money(t.leftAmount),"ST",money(t.rightAmount),0);
  row("Total Carton",ys[1],hs[1],String(t.cartons),"Total Taka",money(t.total),1);
  row("Commission %",ys[2],hs[2],String(state.commission),"","",2);
  row("Total Amount",ys[3],hs[3],money(t.final),"","",3);
  row("Total Taka (In words):",ys[4],hs[4],words(t.final),"","",4);
}

async function continuationPage(doc,items,start,font,bold){
  if(!items.length)return;
  let page=doc.addPage([595.28,841.89]);const green=PDF().rgb(.043,.239,.180);
  page.drawText("BNC AGROCARE",{x:36,y:790,size:17,font:bold,color:green});
  page.drawText("INVOICE CONTINUATION",{x:36,y:769,size:9,font:bold,color:PDF().rgb(.35,.39,.37)});
  const x=[36,64,272,350,415,468,559],headers=["SL","PRODUCT","PACK","CTN","RATE","AMOUNT"];
  headers.forEach((h,i)=>page.drawText(h,{x:x[i]+2,y:742,size:7,font:bold,color:green}));
  let y=724;
  for(const [n,p] of items.entries()){if(y<45)break;const vals=[String(start+n+1).padStart(2,"0"),p.name||"",p.pack||"",p.ctn||"",p.rate?money(p.rate):"",p.ctn&&p.rate?money(num(p.ctn)*num(p.rate)):""];for(let i=0;i<6;i++){drawBox(page,x[i],y-4,x[i+1]-x[i],18);drawTextFit(page,vals[i],x[i],y-4,x[i+1]-x[i],18,font,8,[0,3,4,5].includes(i)?"center":"left")}y-=21}
  page.drawText("Continuation generated only when the locked first-page table is full.",{x:36,y:23,size:6.5,font,color:PDF().rgb(.42,.46,.43)});
}

async function generate(){
  let engine;
  try{engine=await loadPdfEngine()}catch(e){$("#status").textContent="PDF engine error";$("#pdfState").textContent="PDF engine unavailable";throw e}
  const {PDFDocument,StandardFonts}=engine;if(!PDFDocument)throw Error("PDF engine unavailable");
  $("#status").textContent="Generating PDF…";
  const res=await fetch(TEMPLATE,{cache:"no-store"});if(!res.ok)throw Error("Locked invoice template unavailable");
  const doc=await PDFDocument.load(await res.arrayBuffer(),{updateMetadata:false,ignoreEncryption:true});
  const form=doc.getForm();
  putField(form,"header_B4_L4",state.ref);
  putField(form,"invoice_number",state.invoiceNo);
  putField(form,"invoice_date",displayDate(state.date));
  putField(form,"dealer_trader_name",state.trader);
  putField(form,"dealer_buyer_name",state.buyer);
  putField(form,"dealer_address",state.address);
  putField(form,"dealer_mobile",state.mobile);
  putField(form,"header_I6_L6","Md Rezaul Karim");
  putField(form,"header_I7_L7","Officer BNC AGRO CARE Area Manager");
  putField(form,"header_I8_L8","01718-306103");
  const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
  try{form.updateFieldAppearances(font)}catch{}
  const page=doc.getPage(0);
  drawExistingRows(page,font);
  const drawn=drawExtraRows(page,font,bold);
  const shown=8+drawn;
  if(!drawn)drawSummary(page,totals(),0,font,bold);
  const remaining=state.products.slice(shown).filter(hasData);
  for(let i=0;i<remaining.length;i+=18)await continuationPage(doc,remaining.slice(i,i+18),shown+i,font,bold);
  lastPdf=await doc.save({useObjectStreams:false});
  if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(new Blob([lastPdf],{type:"application/pdf"}));$("#pdf").src=pdfUrl;$("#emptyPdf").style.display="none";
  $("#pdfState").textContent=remaining.length?"PDF generated · continuation page":"PDF generated";$("#status").textContent="Ready";return lastPdf
}
async function download(){const b=lastPdf||await generate();const url=URL.createObjectURL(new Blob([b],{type:"application/pdf"})),a=document.createElement("a");a.href=url;a.download="BNC-Invoice-"+state.invoiceNo+".pdf";a.click();setTimeout(()=>URL.revokeObjectURL(url),1200)}
function exportJSON(){const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="BNC-Invoice-"+state.invoiceNo+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),800)}
function importJSON(file){file.text().then(t=>{const d=JSON.parse(t);if(!Array.isArray(d.products))throw Error();Object.assign(state,d);normalize();render();saveDraft();$("#status").textContent="Imported"}).catch(()=>alert("Invalid invoice JSON"))}
function install(){addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("#installBtn").hidden=false});$("#installBtn").onclick=async()=>{if(!deferred)return;await deferred.prompt();deferred=null;$("#installBtn").hidden=true};addEventListener("appinstalled",()=>$("#installBtn").hidden=true)}
(async()=>{try{await openDB();const q=db.transaction("drafts").objectStore("drafts").get("current");q.onsuccess=()=>{if(q.result?.data)Object.assign(state,q.result.data);normalize();render();bindFields();history();install()}}catch{normalize();render();bindFields();install()}$("#addBtn").onclick=addProduct;$("#newBtn").onclick=reset;$("#saveBtn").onclick=saveInvoice;$("#previewBtn").onclick=()=>generate().catch(e=>{const msg=String(e?.message||e||"Unknown PDF error");$("#status").textContent="PDF error";$("#pdfState").textContent="Generation failed";alert(msg)});$("#downloadBtn").onclick=()=>download().catch(e=>alert(e.message));$("#jsonOutBtn").onclick=exportJSON;$("#jsonInBtn").onclick=()=>$("#jsonFile").click();$("#jsonFile").onchange=e=>{const f=e.target.files?.[0];if(f)importJSON(f);e.target.value=""}})();
})();
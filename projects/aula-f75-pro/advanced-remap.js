(() => {
  "use strict";
  const panel = document.querySelector("#keys .grid2 > .panel:nth-child(2)");
  const keyboard = document.querySelector("#keyboard");
  if (!panel || !keyboard) return;

  const usages = [
    ["A","0x04","Standard"],["B","0x05","Standard"],["C","0x06","Standard"],["D","0x07","Standard"],["E","0x08","Standard"],["F","0x09","Standard"],["G","0x0A","Standard"],["H","0x0B","Standard"],["I","0x0C","Standard"],["J","0x0D","Standard"],["K","0x0E","Standard"],["L","0x0F","Standard"],["M","0x10","Standard"],["N","0x11","Standard"],["O","0x12","Standard"],["P","0x13","Standard"],["Q","0x14","Standard"],["R","0x15","Standard"],["S","0x16","Standard"],["T","0x17","Standard"],["U","0x18","Standard"],["V","0x19","Standard"],["W","0x1A","Standard"],["X","0x1B","Standard"],["Y","0x1C","Standard"],["Z","0x1D","Standard"],
    ["1","0x1E","Standard"],["2","0x1F","Standard"],["3","0x20","Standard"],["4","0x21","Standard"],["5","0x22","Standard"],["6","0x23","Standard"],["7","0x24","Standard"],["8","0x25","Standard"],["9","0x26","Standard"],["0","0x27","Standard"],
    ["Enter","0x28","Standard"],["Esc","0x29","Standard"],["Backspace","0x2A","Standard"],["Tab","0x2B","Standard"],["Space","0x2C","Standard"],["-","0x2D","Standard"],["=","0x2E","Standard"],["[","0x2F","Standard"],["]","0x30","Standard"],["\\","0x31","Standard"],[";","0x33","Standard"],["'","0x34","Standard"],["`","0x35","Standard"],[",","0x36","Standard"],[".","0x37","Standard"],["/","0x38","Standard"],["Caps","0x39","Standard"],
    ["F1","0x3A","Function"],["F2","0x3B","Function"],["F3","0x3C","Function"],["F4","0x3D","Function"],["F5","0x3E","Function"],["F6","0x3F","Function"],["F7","0x40","Function"],["F8","0x41","Function"],["F9","0x42","Function"],["F10","0x43","Function"],["F11","0x44","Function"],["F12","0x45","Function"],
    ["Print Screen","0x46","Navigation"],["Home","0x4A","Navigation"],["PgUp","0x4B","Navigation"],["Delete","0x4C","Navigation"],["End","0x4D","Navigation"],["PgDn","0x4E","Navigation"],["Right","0x4F","Navigation"],["Left","0x50","Navigation"],["Down","0x51","Navigation"],["Up","0x52","Navigation"],
    ["Left Ctrl","0xE0","Modifier"],["Left Shift","0xE1","Modifier"],["Left Alt","0xE2","Modifier"],["Left Win","0xE3","Modifier"],["Right Ctrl","0xE4","Modifier"],["Right Shift","0xE5","Modifier"],["Right Alt","0xE6","Modifier"],["Right Win","0xE7","Modifier"],
    ["Vol Up","0xE9","Media"],["Vol Down","0xEA","Media"],["Play/Pause","0xCD","Media"],["Next Track","0xB5","Media"],["Prev Track","0xB6","Media"],["Disabled","0x00","Special"],["Fn","0xFF","Special"]
  ];
  const presets = [["Copy","Ctrl + C"],["Paste","Ctrl + V"],["Cut","Ctrl + X"],["Undo","Ctrl + Z"],["Redo","Ctrl + Shift + Z"],["Save","Ctrl + S"],["Select All","Ctrl + A"],["Find","Ctrl + F"],["New Tab","Ctrl + T"],["Close Tab","Ctrl + W"],["Refresh","Ctrl + R"],["Screenshot","Win + Shift + S"],["Task Manager","Ctrl + Shift + Esc"],["Lock Screen","Win + L"],["File Explorer","Win + E"],["Run Dialog","Win + R"],["Alt + F4","Alt + F4"],["Alt + Tab","Alt + Tab"]];

  const box = document.createElement("div");
  box.className = "f75-editor";
  box.innerHTML = '<div class="f75-editor-head"><strong>ADVANCED KEYMAP EDITOR</strong><span id="f75MapCount">0 mapped</span></div><div class="f75-editor-tabs"><button data-mode="single" class="active">Single Key</button><button data-mode="combo">Shortcut / Combo</button><button data-mode="preset">Presets</button></div><div id="f75Single"><div class="f75-editor-tools"><div id="f75Cats"></div><input id="f75Search" placeholder="Search usage"></div><div id="f75UsageGrid"></div></div><div id="f75Combo" hidden><div class="f75-mods"><button data-mod="Ctrl">Ctrl</button><button data-mod="Shift">Shift</button><button data-mod="Alt">Alt</button><button data-mod="Win">Win</button></div><select id="f75ComboKey"></select><div id="f75ComboPreview">Shortcut: —</div></div><div id="f75Preset" hidden><div id="f75PresetGrid"></div></div><div class="f75-editor-actions"><button id="f75Add" class="main">Add / Apply</button><button id="f75Edit">Edit</button><button id="f75Delete" class="danger">Delete</button><button id="f75Reset">Reset selected</button><button id="f75ResetAll">Reset all</button><button id="f75Swap">Swap Win ↔ Alt</button><button id="f75Import">Import JSON</button><button id="f75Export">Export JSON</button></div><div id="f75EditorStatus">Select a key, then choose an output.</div>';
  panel.appendChild(box);

  const getMap = () => JSON.parse(localStorage.getItem("f75pro:mappings") || "{}");
  const setMap = map => { localStorage.setItem("f75pro:mappings", JSON.stringify(map)); window.dispatchEvent(new Event("f75:mappings-changed")); };
  const selectedIndex = () => window.__f75Selected && Number.isInteger(window.__f75Selected.index) ? window.__f75Selected.index : null;
  const keyLabel = idx => { const e = keyboard.querySelector("[data-matrix=\"" + idx + "\"] .lab"); return e ? e.textContent : "Matrix #" + idx; };
  const status = msg => { box.querySelector("#f75EditorStatus").textContent = msg; };
  const count = () => { box.querySelector("#f75MapCount").textContent = Object.keys(getMap()).length + " mapped"; };

  const cats = ["All","Standard","Function","Navigation","Modifier","Media","Special"];
  const catHost = box.querySelector("#f75Cats");
  let activeCat = "All";
  cats.forEach(cat => { const b=document.createElement("button"); b.textContent=cat; b.className=cat==="All"?"active":""; b.onclick=()=>{activeCat=cat; catHost.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b)); renderUsages();}; catHost.appendChild(b); });

  let selectedUsage = "A";
  const usageGrid = box.querySelector("#f75UsageGrid");
  const renderUsages = () => { const q=box.querySelector("#f75Search").value.toLowerCase(); usageGrid.innerHTML=""; usages.filter(u=>(activeCat==="All"||u[2]===activeCat)&& (u[0].toLowerCase().includes(q)||u[1].toLowerCase().includes(q))).forEach(u=>{const b=document.createElement("button");b.className="usage"+(u[0]===selectedUsage?" selected":"");b.innerHTML="<b></b><small></small>";b.querySelector("b").textContent=u[0];b.querySelector("small").textContent=u[1];b.onclick=()=>{selectedUsage=u[0];renderUsages();status("Selected output: "+u[0]+" ("+u[1]+")");};usageGrid.appendChild(b);}); };
  box.querySelector("#f75Search").oninput=renderUsages;

  const comboKey = box.querySelector("#f75ComboKey");
  usages.filter(u=>!["Modifier","Special"].includes(u[2])).forEach(u=>{const o=document.createElement("option");o.value=u[0];o.textContent=u[0]+" ("+u[1]+")";comboKey.appendChild(o);});
  const comboMods = new Set();
  box.querySelectorAll("[data-mod]").forEach(b=>b.onclick=()=>{const m=b.dataset.mod;comboMods.has(m)?comboMods.delete(m):comboMods.add(m);b.classList.toggle("selected",comboMods.has(m));renderCombo();});
  const renderCombo = ()=>{const parts=[...comboMods,comboKey.value];box.querySelector("#f75ComboPreview").textContent="Shortcut: "+parts.join(" + ");};
  comboKey.onchange=renderCombo;

  const mode = m => { box.querySelectorAll(".f75-editor-tabs button").forEach(b=>b.classList.toggle("active",b.dataset.mode===m)); box.querySelector("#f75Single").hidden=m!=="single"; box.querySelector("#f75Combo").hidden=m!=="combo"; box.querySelector("#f75Preset").hidden=m!=="preset"; };
  box.querySelectorAll(".f75-editor-tabs button").forEach(b=>b.onclick=()=>{mode(b.dataset.mode); if(b.dataset.mode==="combo")renderCombo();});

  presets.forEach(([name,value])=>{const b=document.createElement("button");b.className="preset";b.dataset.value=value;b.innerHTML="<b></b><small></small>";b.querySelector("b").textContent=name;b.querySelector("small").textContent=value;b.onclick=()=>{box.querySelectorAll(".preset").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");status("Selected preset: "+value);};box.querySelector("#f75PresetGrid").appendChild(b);});

  const selectedValue = () => {
    const active=box.querySelector(".f75-editor-tabs button.active")?.dataset.mode || "single";
    if(active==="combo") return box.querySelector("#f75ComboPreview").textContent.replace(/^Shortcut: /,"");
    if(active==="preset") return box.querySelector(".preset.selected")?.dataset.value || "";
    return selectedUsage;
  };
  const apply = replace => { const idx=selectedIndex(); if(idx===null){status("Select a physical key first.");return;} const value=selectedValue(); if(!value){status("Choose an output first.");return;} const map=getMap(); if(!replace && map[idx]!==undefined){status("Mapping already exists. Use Edit.");return;} map[idx]=value;setMap(map);count();status((replace?"Edited ":"Added ") + keyLabel(idx)+" (#"+idx+") → "+value); const main=document.querySelector("#outputSelect");if(main)main.value=value; };
  box.querySelector("#f75Add").onclick=()=>apply(false);
  box.querySelector("#f75Edit").onclick=()=>{const idx=selectedIndex();if(idx===null){status("Select a physical key first.");return;}if(getMap()[idx]===undefined){status("No existing mapping. Use Add / Apply.");return;}apply(true);};
  box.querySelector("#f75Delete").onclick=()=>{const idx=selectedIndex();if(idx===null){status("Select a physical key first.");return;}const map=getMap();if(map[idx]===undefined){status("Nothing to delete.");return;}delete map[idx];setMap(map);count();const main=document.querySelector("#outputSelect");if(main)main.value="";status("Deleted mapping for "+keyLabel(idx)+" (#"+idx+").");};
  box.querySelector("#f75Reset").onclick=()=>{const idx=selectedIndex();if(idx===null){status("Select a physical key first.");return;}const map=getMap();delete map[idx];setMap(map);count();status("Reset selected key: "+keyLabel(idx)+".");};
  box.querySelector("#f75ResetAll").onclick=()=>{if(!confirm("Reset every local mapping?"))return;setMap({});count();status("All local mappings reset.");};
  box.querySelector("#f75Swap").onclick=()=>{const map=getMap();const a=map[11],b=map[17];map[11]=b===undefined?"Alt":b;map[17]=a===undefined?"Win":a;setMap(map);count();status("Local Win ↔ Alt mapping swapped.");};

  const syncSelection = () => {
    const idx = selectedIndex();
    const map = getMap();
    const value = idx === null ? "" : (map[idx] || "");
    if (value && usages.some(u => u[0] === value)) {
      selectedUsage = value;
      renderUsages();
    }
    if (idx !== null) {
      status(value ? "Current mapping: " + keyLabel(idx) + " (#" + idx + ") → " + value : "No local mapping for " + keyLabel(idx) + " (#" + idx + ").");
      const main=document.querySelector("#outputSelect");
      if(main && Array.from(main.options).some(o=>o.value===value)) main.value=value;
    }
    renderCombo();
  };
  window.addEventListener("f75:key-select", syncSelection);

  const downloadJson = (name,data) => {
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),500);
  };
  box.querySelector("#f75Export").onclick=()=>downloadJson("f75-pro-keymap.json",{format:"f75-pro-control-deck/2",mappings:getMap()});
  box.querySelector("#f75Import").onclick=()=>{
    const input=document.createElement("input"); input.type="file"; input.accept=".json,application/json";
    input.onchange=async()=>{
      const file=input.files?.[0]; if(!file)return;
      try{
        const parsed=JSON.parse(await file.text());
        const mappings=parsed && typeof parsed.mappings==="object" ? parsed.mappings : parsed;
        if(!mappings || Array.isArray(mappings) || typeof mappings!=="object") throw new Error("Invalid mapping object");
        const clean={};
        Object.entries(mappings).forEach(([k,v])=>{const n=Number(k); if(Number.isInteger(n)&&n>=0&&n<=127&&typeof v==="string"&&v.trim()) clean[n]=v.trim();});
        setMap(clean); count(); syncSelection(); status("Imported "+Object.keys(clean).length+" local mappings.");
      }catch(err){status("Import failed: "+err.message);}
    };
    input.click();
  };

  renderUsages(); renderCombo(); count();

  const style=document.createElement("style");
  style.textContent=".f75-editor{margin-top:18px;padding-top:18px;border-top:1px solid #242424}.f75-editor-head{display:flex;justify-content:space-between;color:#eee;font:10px ui-monospace,monospace;letter-spacing:.08em}.f75-editor-head span{color:#d9ff57}.f75-editor-tabs,.f75-editor-actions,.f75-mods{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.f75-editor-tabs button,.f75-editor-actions button,.f75-mods button{border:1px solid #2c2c2c;background:#0d0d0d;color:#aaa;border-radius:6px;padding:7px 9px;cursor:pointer;font:9px ui-monospace,monospace}.f75-editor-tabs button.active,.f75-mods button.selected{background:#f3f3ef;color:#050505;border-color:#f3f3ef}.f75-editor-tools{display:flex;gap:7px;flex-wrap:wrap}.f75-editor-tools input,.f75-editor select{background:#090909;border:1px solid #303030;color:#eee;border-radius:6px;padding:8px;font:10px ui-monospace,monospace}.f75-editor-tools input{flex:1;min-width:160px}.f75-editor-tools>div{display:flex;gap:4px;flex-wrap:wrap}.f75-editor-tools>div button{background:#0d0d0d;border:1px solid #292929;color:#888;border-radius:6px;padding:6px 7px;font:8px ui-monospace,monospace}.f75-editor-tools>div button.active{background:#f3f3ef;color:#050505}.f75-editor-tools+div,.f75-editor #f75PresetGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;max-height:220px;overflow:auto;margin-top:9px}.f75-editor .usage,.f75-editor .preset{border:1px solid #242424;background:#0d0d0d;color:#c4c4be;border-radius:6px;padding:7px;text-align:left;cursor:pointer}.f75-editor .usage.selected,.f75-editor .preset.selected{border-color:#d9ff57;box-shadow:0 0 11px #d9ff5715}.f75-editor .usage b,.f75-editor .preset b{display:block;font:9px ui-monospace,monospace}.f75-editor .usage small,.f75-editor .preset small{display:block;color:#666;margin-top:2px;font:7px ui-monospace,monospace}.f75-editor .main{background:#f3f3ef;color:#050505;border-color:#f3f3ef}.f75-editor .danger{color:#ff9b9b;border-color:#4b2d2d}.f75-editor-actions button{white-space:nowrap}.f75-editor #f75EditorStatus,.f75-editor #f75ComboPreview{padding:8px;border:1px solid #232323;background:#070707;color:#777;border-radius:6px;font:9px ui-monospace,monospace}.f75-editor #f75ComboPreview{color:#bfe8f2;background:#071012;margin-top:8px}.f75-editor #f75Combo{padding:4px 0}@media(max-width:680px){.f75-editor-tools+div,.f75-editor #f75PresetGrid{grid-template-columns:repeat(3,1fr)}}";
  document.head.appendChild(style);
})();
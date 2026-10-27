/* SORYVYN web PWA. Official source directory and local 3D reader. */
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const STORAGE_KEY = "soryvyn.web.chunk01";
  const allowedCategories = new Set(["Manga", "Manhwa", "Manhua"]);

  const titles = [];
  const sourceSeed = [
    {id:"mangaplus",name:"MANGA Plus by SHUEISHA",symbol:"M+",language:"en",languageLabel:"MULTILINGUAL",categories:["Manga"],description:"The official Shueisha manga service. Chapter availability and languages depend on each title and region.",url:"https://mangaplus.shueisha.co.jp/",searchUrl:"https://mangaplus.shueisha.co.jp/titles"},
    {id:"webtoon",name:"WEBTOON",symbol:"W",language:"en",languageLabel:"ENGLISH",categories:["Manhwa"],description:"Official webcomics platform with original series, ongoing releases, and completed stories.",url:"https://www.webtoons.com/en/",searchUrl:"https://www.webtoons.com/en/search?keyword="},
    {id:"viz",name:"VIZ Manga",symbol:"V",language:"en",languageLabel:"ENGLISH",categories:["Manga"],description:"Official English manga publisher and digital reading catalogue. Availability varies by region and title.",url:"https://www.viz.com/",searchUrl:"https://www.viz.com/search?search="},
    {id:"kodansha",name:"KODANSHA",symbol:"K",language:"en",languageLabel:"ENGLISH",categories:["Manga"],description:"Publisher-operated catalogue for licensed manga, volume information, and available digital previews.",url:"https://kodansha.us/",searchUrl:"https://kodansha.us/?s="},
    {id:"tapas",name:"Tapas",symbol:"T",language:"en",languageLabel:"ENGLISH",categories:["Manhwa"],description:"Official digital comics and webnovel platform, including creator-published and licensed series.",url:"https://tapas.io/",searchUrl:"https://tapas.io/search?q="},
    {id:"globalcomix",name:"GlobalComix",symbol:"G",language:"en",languageLabel:"MULTILINGUAL",categories:["Manga","Manhwa","Manhua"],description:"Digital comics platform with manga, manhwa, manhua, and independent comics from participating publishers and creators.",url:"https://globalcomix.com/",searchUrl:"https://globalcomix.com/search?terms="}
  ];
  const localImportedTitles = [];
  const importedPageUrls = new Map();
  let localLibraryDBPromise = null;
  function openLocalLibraryDB(){
    if(!("indexedDB" in window)) return Promise.reject(new Error("IndexedDB is not available."));
    if(localLibraryDBPromise) return localLibraryDBPromise;
    localLibraryDBPromise = new Promise((resolve,reject)=>{
      const request=indexedDB.open("soryvyn-local-library",1);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains("titles")) db.createObjectStore("titles",{keyPath:"id"});
        if(!db.objectStoreNames.contains("pages")) db.createObjectStore("pages",{keyPath:"key"});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>{localLibraryDBPromise=null;reject(request.error);};
    });
    return localLibraryDBPromise;
  }
  function idbRequest(request){
    return new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }
  function idbDone(tx){
    return new Promise((resolve,reject)=>{
      tx.oncomplete=resolve;
      tx.onabort=()=>reject(tx.error || new Error("Local import was cancelled."));
      tx.onerror=()=>reject(tx.error || new Error("Local storage failed."));
    });
  }
  function localPageKey(id,page){return id+"|"+String(page).padStart(5,"0");}
  function pageCountFor(item){return item && item.localImport ? item.pageCount : TOTAL_PAGES;}
  function spreadCountFor(item){return Math.ceil(pageCountFor(item)/2);}
  function allKnownTitles(){return [...titles,...localImportedTitles];}
  async function localPageUrl(item,page){
    const key=item.id+"|"+page;
    if(importedPageUrls.has(key)) return importedPageUrls.get(key);
    const db=await openLocalLibraryDB();
    const tx=db.transaction("pages","readonly");
    const record=await idbRequest(tx.objectStore("pages").get(localPageKey(item.id,page)));
    if(!record || !record.blob) throw new Error("A saved image page is missing.");
    const url=URL.createObjectURL(record.blob);
    importedPageUrls.set(key,url);
    return url;
  }
  async function loadLocalPages(item){
    const db=await openLocalLibraryDB();
    const tx=db.transaction("pages","readonly");
    const store=tx.objectStore("pages");
    const records=await Promise.all(Array.from({length:item.pageCount},(_,i)=>idbRequest(store.get(localPageKey(item.id,i+1)))));
    if(records.some(record=>!record || !record.blob)) throw new Error("One or more saved image pages are missing.");
    item.pageUrls=records.map((record,i)=>{
      const key=item.id+"|"+(i+1);
      if(importedPageUrls.has(key)) return importedPageUrls.get(key);
      const url=URL.createObjectURL(record.blob);importedPageUrls.set(key,url);return url;
    });
    item.coverUrl=item.pageUrls[0] || "";
  }
  async function restoreLocalImports(){
    try{
      const db=await openLocalLibraryDB();
      const tx=db.transaction("titles","readonly");
      const records=await idbRequest(tx.objectStore("titles").getAll());
      for(const record of records){
        if(!record || !String(record.id).startsWith("local-") || !Number.isInteger(record.pageCount) || record.pageCount<1) continue;
        if(localImportedTitles.some(item=>item.id===record.id)) continue;
        const item={...record,localImport:true,pageUrls:null,coverUrl:""};
        localImportedTitles.push(item);
        try{item.coverUrl=await localPageUrl(item,1);}catch(_){}
      }
      renderCounters();renderLibrary();renderHistory();renderFavorites();renderRail();
    }catch(error){toast("Local image library unavailable: "+(error.message || "storage error."));}
  }
  async function inflateZipEntry(compressed,limit){
    if(typeof DecompressionStream==="undefined")throw new Error("This browser cannot decompress CBZ archives. Use an image folder instead.");
    const reader=new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
    const chunks=[];let total=0;
    try{
      while(true){
        const result=await reader.read();if(result.done)break;
        total+=result.value.byteLength;
        if(total>limit){await reader.cancel();throw new Error("An archive page expands beyond the 30 MB per-page limit.");}
        chunks.push(result.value);
      }
    }catch(error){try{await reader.cancel();}catch(_){}throw error;}
    const output=new Uint8Array(total);let offset=0;
    for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.byteLength;}
    return output;
  }

  async function extractZipImageFiles(file){
    if(!file) return [];
    const maxBytes=200*1024*1024;
    if(file.size>maxBytes)throw new Error("Archive exceeds the 200 MB import limit.");
    const buffer=await file.arrayBuffer();const view=new DataView(buffer);const bytes=new Uint8Array(buffer);
    const min=Math.max(0,bytes.length-65557);let end=-1;
    for(let offset=bytes.length-22;offset>=min;offset--){if(view.getUint32(offset,true)===0x06054b50){end=offset;break;}}
    if(end<0)throw new Error("This file is not a supported ZIP or CBZ archive.");
    if(view.getUint16(end+4,true)!==0||view.getUint16(end+6,true)!==0)throw new Error("Multi-disk ZIP archives are not supported.");
    const entryCount=view.getUint16(end+10,true);const directoryOffset=view.getUint32(end+16,true);
    if(entryCount===0xffff||directoryOffset===0xffffffff)throw new Error("ZIP64 archives are not supported yet.");
    if(entryCount>10000)throw new Error("Archive contains too many entries.");
    const entries=[];let cursor=directoryOffset;let totalDeclared=0;
    const imagePattern=/\.(png|jpe?g|webp|gif|avif|bmp|tiff?)$/i;
    for(let index=0;index<entryCount;index++){
      if(cursor+46>bytes.length||view.getUint32(cursor,true)!==0x02014b50)throw new Error("The archive directory is damaged.");
      const flags=view.getUint16(cursor+8,true);const method=view.getUint16(cursor+10,true);
      const compressedSize=view.getUint32(cursor+20,true);const uncompressedSize=view.getUint32(cursor+24,true);
      const nameLength=view.getUint16(cursor+28,true);const extraLength=view.getUint16(cursor+30,true);const commentLength=view.getUint16(cursor+32,true);
      const localOffset=view.getUint32(cursor+42,true);const nameStart=cursor+46;
      if(nameStart+nameLength+extraLength+commentLength>bytes.length)throw new Error("The archive directory contains an invalid filename.");
      let path=new TextDecoder("utf-8").decode(bytes.slice(nameStart,nameStart+nameLength)).replace(/\\/g,"/");
      cursor=nameStart+nameLength+extraLength+commentLength;
      if(!path||path.endsWith("/")||!imagePattern.test(path)||path.split("/").some(part=>part===".."||part.startsWith(".")||part==="__MACOSX"))continue;
      if(flags&1)throw new Error("Password-protected archives are not supported.");
      if(method!==0&&method!==8)throw new Error("The archive uses an unsupported compression method.");
      if(!uncompressedSize||uncompressedSize>30*1024*1024)throw new Error("An archive page exceeds the 30 MB per-page limit.");
      totalDeclared+=uncompressedSize;if(totalDeclared>maxBytes)throw new Error("Archive pages exceed the 200 MB total import limit.");
      entries.push({path,method,compressedSize,uncompressedSize,localOffset});
      if(entries.length>300)throw new Error("Import limited to 300 image pages per archive.");
    }
    if(!entries.length)return [];
    entries.sort((a,b)=>a.path.localeCompare(b.path,undefined,{numeric:true,sensitivity:"base"}));
    const files=[];
    for(const entry of entries){
      const local=entry.localOffset;
      if(local+30>bytes.length||view.getUint32(local,true)!==0x04034b50)throw new Error("An archive page has an invalid local header.");
      const localNameLength=view.getUint16(local+26,true);const localExtraLength=view.getUint16(local+28,true);
      const dataStart=local+30+localNameLength+localExtraLength;const dataEnd=dataStart+entry.compressedSize;
      if(dataStart<0||dataEnd>bytes.length)throw new Error("An archive page is truncated.");
      const compressed=bytes.slice(dataStart,dataEnd);
      const decoded=entry.method===0?compressed:await inflateZipEntry(compressed,entry.uncompressedSize);
      if(decoded.byteLength!==entry.uncompressedSize)throw new Error("An archive page size did not match its directory entry.");
      const baseName=entry.path.split("/").pop();
      const ext=baseName.split(".").pop().toLowerCase();
      const mime=({jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif",avif:"image/avif",bmp:"image/bmp",tif:"image/tiff",tiff:"image/tiff"})[ext]||"application/octet-stream";
      const extracted=new File([decoded],baseName,{type:mime});
      Object.defineProperty(extracted,"webkitRelativePath",{value:entry.path,configurable:true});
      files.push(extracted);
    }
    return files;
  }

  async function importImageArchive(file){
    if(!file)return;
    try{
      const files=await extractZipImageFiles(file);
      if(!files.length){toast("No supported manga page images were found in this archive.");return;}
      await importImageFolder(files);
    }catch(error){toast("Archive import failed: "+(error.message||"unsupported archive."));}
  }
  async function importImageFolder(fileList){
    const images=Array.from(fileList || []).filter(file=>
      (file.type || "").startsWith("image/") || /\.(png|jpe?g|webp|gif|avif|bmp|tiff?)$/i.test(file.name || "")
    ).sort((a,b)=>(a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name,undefined,{numeric:true,sensitivity:"base"}));
    if(!images.length){toast("No image pages found in that folder.");return;}
    if(images.length>300){toast("Import limited to 300 pages per folder.");return;}
    const bytes=images.reduce((sum,file)=>sum+file.size,0);
    if(bytes>200*1024*1024 || images.some(file=>file.size>30*1024*1024)){toast("Folder exceeds the 200 MB import or 30 MB per-page limit.");return;}
    const first=images[0].webkitRelativePath || images[0].name;
    const suggestion=first.includes("/")?first.split("/")[0]:first.replace(/\.[^.]+$/,"");
    const entered=window.prompt("Name this local manga or chapter:",suggestion || "My manga");
    if(entered===null)return;
    const name=entered.trim().slice(0,120);
    if(!name){toast("Enter a name for this import.");return;}
    const id="local-"+(crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+"-"+Math.random().toString(36).slice(2));
    const item={id:id,title:name,category:"Manga",genre:"Local Import",status:"Imported",rating:0,chapters:1,updated:Date.now(),language:"Local",source:"Local library",cover:"cover-a",coverNo:"LOCAL",kicker:"LOCAL IMAGE EDITION",creator:"Imported locally",description:"Images imported from this device and saved in this browser.",tags:["Local import"],chaptersLabel:images.length+" pages",localImport:true,pageCount:images.length,pageNames:images.map(file=>file.webkitRelativePath || file.name),pageUrls:null,coverUrl:""};
    try{
      const db=await openLocalLibraryDB();const tx=db.transaction(["titles","pages"],"readwrite");const done=idbDone(tx);
      const meta={...item};delete meta.pageUrls;delete meta.coverUrl;tx.objectStore("titles").put(meta);
      images.forEach((file,i)=>tx.objectStore("pages").put({key:localPageKey(id,i+1),titleId:id,pageNumber:i+1,fileName:file.name,blob:file}));
      await done;localImportedTitles.push(item);item.coverUrl=await localPageUrl(item,1).catch(()=>"");
      state.savedIds=[...new Set([...state.savedIds,id])];persist();renderLibrary();renderRail();changeRoute("library");
      toast("Imported "+images.length+" pages into My Library.");
    }catch(error){toast("Image import failed: "+(error.message || "browser storage error."));}
  }
  async function removeLocalImportFiles(id){
    const item=localImportedTitles.find(entry=>entry.id===id);
    if(!item)return;
    if(!window.confirm("Remove "+item.title+" and its saved pages from this browser?"))return;
    try{
      const db=await openLocalLibraryDB();
      const tx=db.transaction(["titles","pages"],"readwrite");
      const done=idbDone(tx);
      tx.objectStore("titles").delete(id);
      for(let page=1;page<=item.pageCount;page++)tx.objectStore("pages").delete(localPageKey(id,page));
      await done;
      for(let page=1;page<=item.pageCount;page++){
        const key=id+"|"+page;
        const url=importedPageUrls.get(key);
        if(url)URL.revokeObjectURL(url);
        importedPageUrls.delete(key);
      }
      const index=localImportedTitles.findIndex(entry=>entry.id===id);
      if(index>=0)localImportedTitles.splice(index,1);
      state.savedIds=state.savedIds.filter(value=>value!==id);
      state.favoriteIds=state.favoriteIds.filter(value=>value!==id);
      state.history=state.history.filter(value=>value!==id);
      delete state.progress[id];
      persist();renderLibrary();renderHistory();renderFavorites();renderRail();
      if($("#readerModal").open && currentTitleId===id)closeModal($("#readerModal"));
      closeModal($("#titleModal"));
      toast("Local import and stored pages removed.");
    }catch(error){
      toast("Could not remove the local import: "+(error.message || "storage error."));
    }
  }

  const defaultState = {
    savedIds:[], favoriteIds:[], history:[], progress:{}, bookmarks:[], enabledSources:["mangaplus","webtoon","viz","kodansha","tapas","globalcomix"],
    category:"All",genre:"all",status:"all",theme:"dark",noticeDismissed:false
  };

  function loadState(){
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return structuredClone(defaultState);
      return {
        ...structuredClone(defaultState),
        ...parsed,
        savedIds:Array.isArray(parsed.savedIds)?parsed.savedIds:[],
        favoriteIds:Array.isArray(parsed.favoriteIds)?parsed.favoriteIds:[],
        history:Array.isArray(parsed.history)?parsed.history:[],
        progress:parsed.progress && typeof parsed.progress === "object"?parsed.progress:{},
        bookmarks:Array.isArray(parsed.bookmarks)?parsed.bookmarks.filter(key=>typeof key==="string"):[],
        enabledSources:Array.isArray(parsed.enabledSources)?parsed.enabledSources:defaultState.enabledSources.slice()
      };
    } catch (_) {
      return structuredClone(defaultState);
    }
  }

  const state = loadState();
  let route = "discover";
  let gridView = "grid";
  let sourceTab = "discover";
  let embeddedHistory = ["discover"];
  let embeddedHistoryIndex = 0;
  let currentTitleId = null;
  let readerSpread = 0;
  const TOTAL_PAGES = 8;
  const TOTAL_SPREADS = Math.ceil(TOTAL_PAGES / 2);
  let isPageTurning = false;
  let activeFlip = null;
  let pointerDrag = null;
  let wheelLockUntil = 0;
  let installPrompt = null;
  let titleQuery = "";
  let libraryQuery = "";
  let sourceQuery = "";
  let sourceLanguage = "all";

  function persist(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (_) { toast("Browser storage is unavailable. Changes may not persist."); }
    renderCounters();
    renderRail();
  }


  function normalizeBackupState(backup){
    if(!backup || backup.format !== "soryvyn-backup" || backup.version !== 1 || !backup.state || typeof backup.state !== "object"){
      throw new Error("This is not a supported SORYVYN backup file.");
    }
    const incoming = backup.state;
    const knownTitles = new Set(allKnownTitles().map(item=>item.id));
    const knownSources = new Set(sourceSeed.map(item=>item.id));
    const uniqueKnown = (value,known) => Array.isArray(value)
      ? [...new Set(value.filter(id=>typeof id === "string" && known.has(id)))]
      : [];
    const progress = {};
    if(incoming.progress && typeof incoming.progress === "object" && !Array.isArray(incoming.progress)){
      for(const [id,value] of Object.entries(incoming.progress)){
        const knownTitle=titleById(id);
        if(knownTitle && Number.isInteger(value) && value >= 1 && value <= pageCountFor(knownTitle)) progress[id]=value;
      }
    }
    const bookmarks = Array.isArray(incoming.bookmarks)
      ? [...new Set(incoming.bookmarks.filter(key=>{
          const entry=parseBookmarkKey(key);
          return entry && knownTitles.has(entry.item.id);
        }))]
      : [];
    const knownGenres = new Set(["all",...new Set(titles.flatMap(item=>[item.genre,...item.tags]))]);
    return {
      savedIds:uniqueKnown(incoming.savedIds,knownTitles),
      favoriteIds:uniqueKnown(incoming.favoriteIds,knownTitles),
      history:uniqueKnown(incoming.history,knownTitles).slice(-100),
      progress,
      bookmarks,
      enabledSources:uniqueKnown(incoming.enabledSources,knownSources),
      category:incoming.category === "All" || allowedCategories.has(incoming.category) ? incoming.category : "All",
      genre:typeof incoming.genre === "string" && knownGenres.has(incoming.genre) ? incoming.genre : "all",
      status:["all","Ongoing","Completed"].includes(incoming.status) ? incoming.status : "all",
      theme:incoming.theme === "light" ? "light" : "dark",
      noticeDismissed:incoming.noticeDismissed === true
    };
  }

  function exportBackup(){
    // The portable JSON file intentionally excludes imported image bytes and their local-only IDs.
    const portableIds = new Set(titles.map(item=>item.id));
    const portableProgress = Object.fromEntries(
      Object.entries(state.progress).filter(([id])=>portableIds.has(id))
    );
    const backup = {
      format:"soryvyn-backup",
      version:1,
      exportedAt:new Date().toISOString(),
      state:{
        savedIds:state.savedIds.filter(id=>portableIds.has(id)),
        favoriteIds:state.favoriteIds.filter(id=>portableIds.has(id)),
        history:state.history.filter(id=>portableIds.has(id)).slice(-100),
        progress:portableProgress,
        bookmarks:state.bookmarks.filter(key=>{const entry=parseBookmarkKey(key);return entry && portableIds.has(entry.item.id);}),
        enabledSources:state.enabledSources.slice(),
        category:state.category,
        genre:state.genre,
        status:state.status,
        theme:state.theme,
        noticeDismissed:state.noticeDismissed
      }
    };
    const blob = new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "soryvyn-backup-" + new Date().toISOString().slice(0,10) + ".json";
    link.style.display = "none";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast("Preference backup exported. Local image files are not included.");
  }

  async function importBackup(file){
    if(!file) return;
    if(file.size > 1024 * 1024){
      toast("Backup file is larger than 1 MB.");
      return;
    }
    try{
      const parsed = JSON.parse(await file.text());
      const restored = normalizeBackupState(parsed);
      if(!window.confirm("Restore this SORYVYN backup and replace the current local library state?")){
        toast("Backup restore cancelled.");
        return;
      }
      Object.assign(state,restored);
      persist();
      renderTheme();
      titleQuery = "";
      libraryQuery = "";
      $("#globalSearch").value = "";
      $("#librarySearch").value = "";
      $("#filterCategory").value = state.category;
      $("#filterGenre").value = state.genre;
      $("#filterStatus").value = state.status;
      if(state.noticeDismissed){
        const notice = $("#dismissNotice")?.closest(".demo-notice");
        if(notice) notice.remove();
      }
      renderDiscover();
      renderLibrary();
      renderHistory();
      renderFavorites();
      renderSources();
      renderMiniSources();
      renderRail();
      toast("SORYVYN backup restored on this device.");
    }catch(error){
      toast(error instanceof SyntaxError ? "That file is not valid JSON." : (error.message || "Could not restore this backup."));
    }
  }

  function escapeHTML(value){
    return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }

  function titleById(id){ return titles.find(item=>item.id===id) || localImportedTitles.find(item=>item.id===id); }
  function sourceById(id){ return sourceSeed.find(item=>item.id===id); }
  function isSaved(id){ return state.savedIds.includes(id); }
  function isFavorite(id){ return state.favoriteIds.includes(id); }
  function bookmarkKey(titleId,spread){ return titleId+"|"+spread; }
  function parseBookmarkKey(key){
    if(typeof key!=="string")return null;
    const separator=key.lastIndexOf("|");
    if(separator<1)return null;
    const item=titleById(key.slice(0,separator));
    const spread=Number(key.slice(separator+1));
    if(!item || !Number.isInteger(spread) || spread<0 || spread>=spreadCountFor(item))return null;
    return {key,item,spread};
  }
  function isBookmarked(titleId,spread){ return state.bookmarks.includes(bookmarkKey(titleId,spread)); }

  function toast(message){
    const region = $("#toastRegion");
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    region.append(node);
    window.setTimeout(()=>node.remove(), 2800);
  }

  function renderCover(item, extraClass = ""){
    if(item.localImport && item.coverUrl){
      return '<div class="cover-art local-import-cover '+extraClass+'" aria-hidden="true"><img src="'+escapeHTML(item.coverUrl)+'" alt="" loading="lazy"><span class="local-import-badge">LOCAL</span><span class="local-import-title">'+escapeHTML(item.title)+'</span></div>';
    }
    const classes = item.cover || "cover-a";
    return `<div class="cover-art ${classes} ${extraClass}" aria-hidden="true">
      <span class="cover-label">SORYVYN LOCAL EDITION</span>
      <span class="cover-kicker">${escapeHTML(item.kicker || "STORIES IN MOTION")}</span>
      <i class="cover-shape one"></i><i class="cover-shape two"></i>
      <span class="cover-title">${escapeHTML(item.title)}</span>
      <span class="cover-no">${escapeHTML(item.coverNo || "SV—000")}</span>
    </div>`;
  }

  function renderTitleCard(item){
    const saved = isSaved(item.id);
    const progress = Number(state.progress[item.id] || 0);
    return `<article class="title-card" data-open-title="${escapeHTML(item.id)}" tabindex="0" role="button" aria-label="Open ${escapeHTML(item.title)} details">
      ${renderCover(item)}
      <div class="card-cardtop"><span class="card-source-mark">${escapeHTML(item.source)}</span><button class="save-button ${saved?"is-saved":""}" data-save-title="${escapeHTML(item.id)}" aria-label="${saved?"Remove from":"Add to"} library" aria-pressed="${saved}">
        <svg viewBox="0 0 24 24"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z"/></svg>
      </button></div>
      <div class="card-info">
        <div class="card-category"><span>${escapeHTML(item.category)}</span><i></i><span>${escapeHTML(item.genre)}</span></div>
        <h3 title="${escapeHTML(item.title)}">${escapeHTML(item.title)}</h3>
        <div class="card-subtitle"><span>${escapeHTML(item.status)} · ${item.chapters} ch.</span><span class="card-rating">★ ${item.rating.toFixed(1)}</span></div>
        ${progress>0?`<div class="card-progress" title="Reading progress"><span style="width:${Math.min(100,progress/8*100)}%"></span></div>`:""}
      </div>
    </article>`;
  }

  function activeTitleFilters(items){
    const query = titleQuery.trim().toLocaleLowerCase();
    const selectedCategory = state.category;
    const result = items.filter(item=>{
      if (!allowedCategories.has(item.category)) return false;
      if (selectedCategory !== "All" && item.category !== selectedCategory) return false;
      if (state.genre !== "all" && item.genre !== state.genre && !item.tags.includes(state.genre)) return false;
      if (state.status !== "all" && item.status !== state.status) return false;
      if (query){
        const haystack = [item.title,item.creator,item.category,item.genre,item.source,item.language,...item.tags].join(" ").toLocaleLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    switch ($("#sortSelect")?.value || "featured"){
      case "title": result.sort((a,b)=>a.title.localeCompare(b.title)); break;
      case "rating": result.sort((a,b)=>b.rating-a.rating); break;
      case "updated": result.sort((a,b)=>b.updated-a.updated); break;
    }
    return result;
  }

  function renderDiscover(){
    const filtered = activeTitleFilters(titles);
    $("#titleGrid").classList.toggle("list-view",gridView==="list");
    $("#titleGrid").innerHTML = filtered.map(renderTitleCard).join("");
    $("#resultCount").textContent = String(filtered.length).padStart(2,"0") + (filtered.length===1?" TITLE":" TITLES");
    $$("#categoryRow .category-chip").forEach(button=>{
      button.classList.toggle("is-active",button.dataset.category===state.category);
      const category=button.dataset.category;
      const count=category==="All"?titles.length:titles.filter(item=>item.category===category).length;
      const counter=$("span",button);
      if(counter) counter.textContent=String(count).padStart(2,"0");
    });
  }

  function renderGridInto(id, items, emptyId){
    const container = $(id);
    if(!container) return;
    container.classList.toggle("list-view",gridView==="list");
    container.innerHTML = items.map(renderTitleCard).join("");
    if(emptyId) $(emptyId).hidden=items.length!==0;
  }

  function renderLibrary(){
    const items=state.savedIds.map(titleById).filter(Boolean);
    const query=libraryQuery.trim().toLocaleLowerCase();
    renderGridInto("#libraryGrid",items.filter(item=>!query||[item.title,item.creator,item.genre,item.category].join(" ").toLocaleLowerCase().includes(query)),"#libraryEmpty");
    $("#librarySummary").textContent=String(items.length).padStart(2,"0")+" SAVED "+(items.length===1?"TITLE":"TITLES");
  }

  function renderHistory(){
    const ids=[...state.history].reverse();
    const seen=new Set();
    const items=ids.map(titleById).filter(item=>item&&!seen.has(item.id)&&seen.add(item.id));
    renderGridInto("#historyGrid",items,"#historyEmpty");
  }

  function renderFavorites(){
    const items=state.favoriteIds.map(titleById).filter(Boolean);
    renderGridInto("#favoritesGrid",items,"#favoritesEmpty");
  }

  function renderBookmarks(){
    const entries=state.bookmarks.map(parseBookmarkKey).filter(Boolean).sort((a,b)=>
      a.item.title.localeCompare(b.item.title) || a.spread-b.spread
    );
    $("#bookmarkCount").textContent=String(entries.length).padStart(2,"0");
    $("#bookmarksEmpty").hidden=entries.length!==0;
    $("#bookmarksList").innerHTML=entries.map(entry=>{
      const first=entry.spread*2+1;
      const last=Math.min(pageCountFor(entry.item),first+1);
      const range=String(first).padStart(2,"0")+"–"+String(last).padStart(2,"0");
      return '<article class="bookmark-row"><div class="bookmark-row-mark">S</div><div class="bookmark-row-main"><strong>'+escapeHTML(entry.item.title)+'</strong><small>'+escapeHTML(entry.item.category.toUpperCase())+' · PAGES '+range+'</small></div><div class="bookmark-row-actions"><button class="secondary-button" type="button" data-open-bookmark="'+escapeHTML(entry.key)+'">Open spread</button><button class="secondary-button" type="button" data-unbookmark="'+escapeHTML(entry.key)+'">Remove</button></div></article>';
    }).join("");
  }

  function toggleCurrentBookmark(){
    const item=titleById(currentTitleId);
    if(!item)return;
    const key=bookmarkKey(item.id,readerSpread);
    if(state.bookmarks.includes(key)){
      state.bookmarks=state.bookmarks.filter(value=>value!==key);
      toast("Bookmark removed from this spread.");
    }else{
      state.bookmarks.push(key);
      toast("Spread bookmarked.");
    }
    persist();
    renderBookmarks();
    updateReaderUI(false);
  }

  function unbookmarkSpread(key){
    if(!parseBookmarkKey(key))return;
    state.bookmarks=state.bookmarks.filter(value=>value!==key);
    persist();
    renderBookmarks();
    updateReaderUI(false);
    toast("Bookmark removed.");
  }

  function openBookmarkedSpread(key){
    const entry=parseBookmarkKey(key);
    if(!entry){
      renderBookmarks();
      toast("This bookmark no longer points to an available title.");
      return;
    }
    openReader(entry.item.id,entry.spread);
  }

  function renderCounters(){
    $("#libraryCount").textContent=String(state.savedIds.length).padStart(2,"0");
    $("#downloadCount").textContent="00";
    $("#savedStat").textContent=String(state.savedIds.length).padStart(2,"0");
    $("#historyStat").textContent=String(new Set(state.history).size).padStart(2,"0");
    const completedReads=Object.entries(state.progress).filter(([id,page])=>{
      const item=titleById(id);
      return item && Number(page)>=pageCountFor(item);
    }).length;
    $("#readStat").textContent=String(completedReads).padStart(2,"0");
    const capacity=Math.max(1,titles.length+localImportedTitles.length);
    $("#storagePercent").textContent=Math.min(100,Math.round(state.savedIds.length/capacity*100))+"%";
    $("#storageFill").style.width=Math.min(100,state.savedIds.length/capacity*100)+"%";
    $("#storageLabel").textContent=state.savedIds.length?state.savedIds.length+" saved "+(state.savedIds.length===1?"title":"titles"):"Local collection";
    $("#footerYear").textContent=new Date().getFullYear();
  }

  function renderMiniSources(){
    const target=$("#sourceMiniList");if(!target)return;
    target.innerHTML=sourceSeed.slice(0,3).map(source=>'<a class="source-mini" href="'+escapeHTML(source.url)+'" target="_blank" rel="noopener noreferrer"><span class="source-mini-icon">'+escapeHTML(source.symbol)+'</span><span class="source-mini-copy"><strong>'+escapeHTML(source.name)+'</strong><small>OFFICIAL · OPEN SITE</small></span><i class="source-mini-status"></i></a>').join("");
  }

  function renderRail(){
    const list=$("#railSourceList");
    if(!list) return;
    list.innerHTML=sourceSeed.slice(0,3).map(source=>`<a class="rail-source" href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer"><span class="rail-source-mark">${escapeHTML(source.symbol)}</span><span class="rail-source-copy"><strong>${escapeHTML(source.name)}</strong><small>OFFICIAL · OPEN SITE</small></span><i class="rail-source-state"></i></a>`).join("");
    const recently=[...state.history].reverse().map(titleById).filter(Boolean).filter((item,index,list)=>list.findIndex(x=>x.id===item.id)===index).slice(0,3);
    $("#continueReading").innerHTML=recently.length?recently.map(item=>`<div class="continue-item" data-open-title="${item.id}" tabindex="0" role="button"><div class="continue-thumb">${renderCover(item,"rail-cover")}</div><div class="continue-copy"><strong>${escapeHTML(item.title)}</strong><small>PAGE ${String(state.progress[item.id]||1).padStart(2,"0")} · ${item.category.toUpperCase()}</small><div class="mini-progress"><span style="width:${Math.min(100,(Number(state.progress[item.id]||1)/8)*100)}%"></span></div></div></div>`).join(""):`<div class="rail-empty">Open a title and it will appear here.</div>`;
    $$(".rail-cover").forEach(cover=>{cover.style.aspectRatio="unset";cover.style.width="100%";cover.style.height="100%";cover.querySelectorAll(".cover-label,.cover-kicker,.cover-title,.cover-no").forEach(node=>node.remove());});
  }

  function renderSources(){
    const query=sourceQuery.trim();
    const categoryByTab={discover:null,manga:"Manga",manhwa:"Manhwa",manhua:"Manhua"};
    const sources=sourceSeed.filter(source=>!categoryByTab[sourceTab]||source.categories.includes(categoryByTab[sourceTab]));
    $("#sourceCatalogue").innerHTML=sources.length?sources.map(source=>{
      const searchHref=query?(source.id==="mangaplus"?source.searchUrl:source.searchUrl+encodeURIComponent(query)):source.url;
      return '<article class="source-card" data-source-card="'+escapeHTML(source.id)+'"><div class="source-card-icon">'+escapeHTML(source.symbol)+'</div><div class="source-card-main"><div class="source-card-title"><strong>'+escapeHTML(source.name)+'</strong><span class="source-type">'+source.categories.join(" / ").toUpperCase()+'</span></div><p>'+escapeHTML(source.description)+'</p><div class="source-card-meta"><span>'+escapeHTML(source.languageLabel)+'</span><span>•</span><span>OFFICIAL PLATFORM</span></div><div class="source-card-actions"><a class="secondary-button" href="'+escapeHTML(source.url)+'" target="_blank" rel="noopener noreferrer">Open platform</a><a class="primary-button" href="'+escapeHTML(searchHref)+'" target="_blank" rel="noopener noreferrer">'+(query&&source.id!=="mangaplus"?"Search title":"Browse catalogue")+'</a></div></div></article>';
    }).join(""):'<div class="empty-state"><div class="empty-symbol">⌕</div><h2>No official platforms match.</h2><p>Try another category or search term.</p></div>';
    $("#sourceCount").textContent=String(sourceSeed.length).padStart(2,"0");
    $("#embeddedStatus").textContent=sources.length+" OFFICIAL "+(sources.length===1?"PLATFORM":"PLATFORMS");
    $("#embeddedAddress").textContent="soryvyn://official-sources/"+sourceTab;
    const titles={discover:"Read with official publishers.",manga:"Official manga publishers.",manhwa:"Official manhwa platforms.",manhua:"Platforms carrying manga, manhwa and manhua."};
    $("#embeddedTitle").textContent=titles[sourceTab]||titles.discover;
    $$(".embedded-tab").forEach(button=>button.classList.toggle("is-active",button.dataset.sourceTab===sourceTab));
  }

  function changeRoute(next){
    if(!["discover","library","updates","downloads","sources","history","favorites","bookmarks"].includes(next))return;
    route=next;
    $$(".page[data-page]").forEach(page=>page.hidden=page.dataset.page!==route);
    $$(".nav-item[data-route]").forEach(button=>button.classList.toggle("is-active",button.dataset.route===route));
    const labels={discover:"Discover",library:"My library",updates:"Updates",downloads:"Downloads",sources:"Source browser",history:"Reading history",favorites:"Favorites",bookmarks:"Bookmarks"};
    $("#crumbCurrent").textContent=labels[route];
    if(route==="discover")renderDiscover();
    if(route==="library")renderLibrary();
    if(route==="history")renderHistory();
    if(route==="favorites")renderFavorites();
    if(route==="bookmarks")renderBookmarks();
    if(route==="sources")renderSources();
    $("#scrollArea").scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    if(location.hash!== "#"+route)history.replaceState(null,"","#"+route);
  }

  function openTitle(id){
    const item=titleById(id);if(!item)return;
    if(!state.history.includes(id))state.history.push(id);
    else { state.history=state.history.filter(entry=>entry!==id);state.history.push(id); }
    state.history=state.history.slice(-100);
    currentTitleId=id;
    persist();
    $("#titleModalContent").innerHTML=`<div class="modal-title-layout">${renderCover(item,"modal-title-cover")}<div class="modal-title-copy"><div class="eyebrow">${item.category.toUpperCase()} <span>·</span> ${item.language.toUpperCase()}</div><h2 id="modalTitle">${escapeHTML(item.title)}</h2><p>${escapeHTML(item.description)}</p><div class="modal-tags">${item.tags.map(tag=>`<span>${escapeHTML(tag)}</span>`).join("")}</div><div class="modal-actions"><button class="primary-button" data-reader-open="${item.id}">Read in book <span>→</span></button><button class="secondary-button" data-save-title="${item.id}">${isSaved(id)?"Saved ✓":"Save to library"}</button><button class="secondary-button" data-favorite-title="${item.id}">${isFavorite(id)?"Favorited ✓":"♡ Favorite"}</button></div></div></div><div class="modal-bottom-meta"><span>${escapeHTML(item.creator)}</span><span>${item.chaptersLabel.toUpperCase()}</span><span>★ ${item.rating.toFixed(1)}</span></div>`;
    showModal($("#titleModal"));
    renderRail();
  }

  function showModal(dialog){
    if(!dialog.open) {
      if(typeof dialog.showModal==="function")dialog.showModal();
      else dialog.setAttribute("open","");
    }
  }
  function closeModal(dialog){
    if(dialog.open&&typeof dialog.close==="function")dialog.close();else dialog.removeAttribute("open");
  }

  function toggleSaved(id){
    if(!titleById(id))return;
    if(isSaved(id)){state.savedIds=state.savedIds.filter(value=>value!==id);toast("Removed from your library.");}
    else {state.savedIds.push(id);toast("Saved to your library.");}
    persist();renderDiscover();renderLibrary();renderFavorites();
    if($("#titleModal").open&&currentTitleId===id)openTitleModalRefresh(id);
  }
  function toggleFavorite(id){
    if(!titleById(id))return;
    if(isFavorite(id)){state.favoriteIds=state.favoriteIds.filter(value=>value!==id);toast("Removed from favorites.");}
    else {state.favoriteIds.push(id);toast("Added to favorites.");}
    persist();renderDiscover();renderFavorites();
    if($("#titleModal").open&&currentTitleId===id)openTitleModalRefresh(id);
  }
  function openTitleModalRefresh(id){
    const item=titleById(id);if(!item)return;
    const currentScroll=$("#titleModal").scrollTop;
    $("#titleModalContent").innerHTML=`<div class="modal-title-layout">${renderCover(item,"modal-title-cover")}<div class="modal-title-copy"><div class="eyebrow">${item.category.toUpperCase()} <span>·</span> ${item.language.toUpperCase()}</div><h2 id="modalTitle">${escapeHTML(item.title)}</h2><p>${escapeHTML(item.description)}</p><div class="modal-tags">${item.tags.map(tag=>`<span>${escapeHTML(tag)}</span>`).join("")}</div><div class="modal-actions"><button class="primary-button" data-reader-open="${item.id}">Read in book <span>→</span></button><button class="secondary-button" data-save-title="${item.id}">${isSaved(id)?"Saved ✓":"Save to library"}</button><button class="secondary-button" data-favorite-title="${item.id}">${isFavorite(id)?"Favorited ✓":"♡ Favorite"}</button></div></div></div><div class="modal-bottom-meta"><span>${escapeHTML(item.creator)}</span><span>${item.chaptersLabel.toUpperCase()}</span><span>★ ${item.rating.toFixed(1)}</span></div>`;
    $("#titleModal").scrollTop=currentScroll;
  }

  const mangaScenes = [
    {
      key:"moon",
      caption:"The night held its breath.",
      art:'<svg viewBox="0 0 280 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="280" height="180" fill="#d6d7ce"/><circle cx="191" cy="46" r="30" fill="#f1efe4" stroke="#171a18" stroke-width="2"/><path d="M0 116L31 91 56 115 88 72 120 109 148 87 178 121 210 95 244 115 280 82V180H0Z" fill="#70766d"/><path d="M0 143L36 128 74 146 109 118 142 148 177 126 220 146 252 130 280 141V180H0Z" fill="#202522"/><path d="M18 0L9 42M45 8L38 35M255 9l-8 21M230 79l-13 16" stroke="#333832" stroke-width="2"/><circle cx="54" cy="42" r="2" fill="#222"/><circle cx="100" cy="28" r="2" fill="#222"/><circle cx="134" cy="51" r="1.8" fill="#222"/></svg>'
    },
    {
      key:"portrait",
      caption:"Someone was still out there.",
      art:'<svg viewBox="0 0 280 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="280" height="180" fill="#c8cbc4"/><path d="M58 180Q54 99 70 54Q95 5 155 25Q219 20 227 92L245 180Z" fill="#252925"/><path d="M90 84Q85 45 125 34Q167 23 194 65L199 115Q185 155 141 159Q100 146 90 111Z" fill="#e6e5dc" stroke="#171a18" stroke-width="3"/><path d="M87 80Q89 26 135 20Q189 15 210 63L188 62 172 45 140 57 105 66Z" fill="#181b19"/><path d="M104 92l22-4M158 88l24 5M113 105l12 2M165 105l12-1M132 127q11 7 23-1" fill="none" stroke="#171a18" stroke-width="3" stroke-linecap="round"/><path d="M0 19L60 80M13 0L76 62M212 0l-22 31M250 11l-25 36M262 50l-20 22" stroke="#373a35" stroke-width="1.5" opacity=".8"/></svg>'
    },
    {
      key:"city",
      caption:"The signs all pointed nowhere.",
      art:'<svg viewBox="0 0 280 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="280" height="180" fill="#d1d3cc"/><path d="M0 48H42V180H0ZM48 22H93V180H48ZM101 65H139V180H101ZM149 13H201V180H149ZM211 51H280V180H211Z" fill="#777d74" stroke="#202420" stroke-width="2"/><path d="M57 34h9v9h-9zM74 34h9v9h-9zM57 55h9v9h-9zM74 55h9v9h-9zM161 27h10v13h-10zM180 27h10v13h-10zM161 51h10v13h-10zM180 51h10v13h-10z" fill="#171b18"/><path d="M0 145L62 125 112 147 175 117 223 140 280 119V180H0Z" fill="#222623"/><path d="M13 158l54-16m-34 31 52-17m83 0 44-13m-19 30 62-17" stroke="#a8aca1" stroke-width="2"/><circle cx="240" cy="22" r="8" fill="#e8e7dd" stroke="#171b18" stroke-width="2"/></svg>'
    },
    {
      key:"map",
      caption:"The map was drawing itself.",
      art:'<svg viewBox="0 0 280 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="280" height="180" fill="#deddd2"/><path d="M0 29Q37 4 64 36T123 28T182 33T245 21T280 34M-5 67Q32 43 71 68T140 67T205 59T285 66M-5 113Q36 88 76 114T145 112T211 102T283 115M-8 154Q42 135 77 153T145 151T215 142T281 158" fill="none" stroke="#777c70" stroke-width="1.5"/><path d="M35 0Q56 36 35 69T43 129T36 181M104 0Q128 30 103 65T111 127T104 180M190 0Q168 36 192 75T184 129T198 181M249 0Q230 39 251 77T242 133T250 182" fill="none" stroke="#9ba092" stroke-width="1.3"/><path d="M28 130C62 105 85 133 115 82S178 33 211 60 245 101 258 40" fill="none" stroke="#202420" stroke-width="3" stroke-dasharray="5 4"/><path d="M244 28l15 12-17 5" fill="none" stroke="#202420" stroke-width="3"/><circle cx="115" cy="82" r="5" fill="#f2f0e6" stroke="#171a18" stroke-width="2"/></svg>'
    },
    {
      key:"forest",
      caption:"A light moved between the trees.",
      art:'<svg viewBox="0 0 280 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="280" height="180" fill="#d2d4cb"/><circle cx="145" cy="54" r="25" fill="#eeeDE2" stroke="#202420" stroke-width="2"/><path d="M-10 180L34 26 82 180ZM55 180L105 10 160 180ZM135 180L197 27 244 180ZM196 180L252 4 301 180Z" fill="#535b52"/><path d="M0 180L41 83 76 180ZM80 180L137 75 174 180ZM168 180L221 79 266 180Z" fill="#1f2520"/><path d="M0 143Q74 123 140 146T280 133V180H0Z" fill="#111613"/><path d="M138 180l5-30 6 30M146 154l-12-9m15 18 10-12" stroke="#e1e2d8" stroke-width="2" fill="none"/></svg>'
    },
    {
      key:"silhouette",
      caption:"There was a figure beyond the gate.",
      art:'<svg viewBox="0 0 280 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="280" height="180" fill="#d8d9d0"/><path d="M41 180V29Q140 -3 239 29V180M57 180V42Q140 16 223 42V180" fill="none" stroke="#202420" stroke-width="4"/><path d="M70 180V62Q140 35 210 62V180" fill="#8b9187"/><circle cx="141" cy="93" r="12" fill="#171b18"/><path d="M124 109L157 109 170 157H112Z" fill="#171b18"/><path d="M140 157v23M115 135l-19 20M163 135l21 15" stroke="#171b18" stroke-width="7" stroke-linecap="round"/><path d="M0 171L54 152 88 170 125 159 164 172 210 153 280 170V180H0Z" fill="#242a24"/><path d="M20 13l-8 31M260 15l-13 29M235 8l-6 22" stroke="#343934" stroke-width="2"/></svg>'
    }
  ];

  function renderMangaPanel(pageNumber, panelIndex, item){
    const scene = mangaScenes[(pageNumber + panelIndex + item.id.length) % mangaScenes.length];
    const bubble = (panelIndex === 1 || (panelIndex === 3 && pageNumber % 2 === 0))
      ? '<span class="manga-speech-bubble">' + escapeHTML(scene.caption) + '</span>' : '';
    return '<div class="manga-panel scene-' + scene.key + '">' +
      '<span class="manga-panel-index">' + String(panelIndex + 1).padStart(2,"0") + '</span>' +
      '<div class="manga-panel-art">' + scene.art + '</div>' +
      bubble +
      '<span class="manga-panel-caption">' + escapeHTML(scene.caption) + '</span>' +
      '</div>';
  }

  function renderBookPageContent(pageNumber, item){
    if(item.localImport){
      const src=item.pageUrls && item.pageUrls[pageNumber-1];
      const filename=item.pageNames && item.pageNames[pageNumber-1] || ("Page "+pageNumber);
      return '<div class="imported-page-inner">'+(src
        ? '<img class="imported-page-image" src="'+escapeHTML(src)+'" alt="'+escapeHTML(filename)+'" draggable="false">'
        : '<div class="imported-page-loading">Local page unavailable</div>')+
        '<span class="imported-page-number">'+String(pageNumber).padStart(2,"0")+' / '+String(pageCountFor(item)).padStart(2,"0")+'</span></div>';
    }
    const layout = ["layout-a","layout-b","layout-c","layout-d"][(pageNumber - 1) % 4];
    const heading = item.title.split(" ").slice(0,5).join(" ");
    let panels = "";
    for(let index=0; index<4; index++) panels += renderMangaPanel(pageNumber,index,item);
    return '<div class="manga-page-inner">' +
      '<div class="manga-page-head"><span>' + escapeHTML(heading.toUpperCase()) + '</span><span>CH. 01</span></div>' +
      '<div class="manga-page-rule"></div>' +
      '<div class="manga-panels ' + layout + '">' + panels + '</div>' +
      '<div class="manga-page-foot"><span>SORYVYN · LOCAL EDITION</span><span class="manga-page-number">' + String(pageNumber).padStart(2,"0") + '</span></div>' +
      '</div>';
  }

  function setBookPage(element, pageNumber, item, side){
    element.className = "book-page " + side;
    element.dataset.page = String(pageNumber);
    if(pageNumber>pageCountFor(item)){element.classList.add("blank-page");element.innerHTML="";return;}
    element.classList.remove("blank-page");
    element.innerHTML = renderBookPageContent(pageNumber,item);
  }

  function renderBookSpread(){
    const item = titleById(currentTitleId);
    if(!item) return;
    const leftPage = readerSpread * 2 + 1;
    const rightPage = leftPage + 1;
    setBookPage($("#leftBookPage"),leftPage,item,"left");
    setBookPage($("#rightBookPage"),rightPage,item,"right");
    $("#bookSpread").querySelectorAll(".book-flip-sheet").forEach(sheet=>sheet.remove());
    $("#bookFrame").setAttribute("aria-label","Open book showing pages " + leftPage + " and " + rightPage + ". Drag the right page left to go forward or the left page right to go back. Mouse wheel and arrow keys also turn the spread.");
    updateReaderUI(false);
  }

  function updateReaderUI(saveProgress){
    const item = titleById(currentTitleId);
    if(!item) return;
    const totalPages=pageCountFor(item);
    const totalSpreads=spreadCountFor(item);
    const leftPage=readerSpread*2+1;
    const rightPage=Math.min(totalPages,leftPage+1);
    const pageRange=String(leftPage).padStart(2,"0")+"–"+String(rightPage).padStart(2,"0");
    const spreadNumber=String(readerSpread+1).padStart(2,"0");
    const spreadTotal=String(totalSpreads).padStart(2,"0");
    const label="SPREAD "+spreadNumber+" / "+spreadTotal+" · PAGES "+pageRange;
    $("#readerPageLabel").textContent=label;
    $("#readerProgressLabel").textContent=label+" / "+String(totalPages).padStart(2,"0")+" TOTAL PAGES";
    $("#readerSubtitle").textContent=(item.localImport?"LOCAL IMAGE IMPORT":"CHAPTER 01")+" · PAGES "+pageRange;
    $("#readerProgressFill").style.width=(rightPage/totalPages*100)+"%";
    $("#readerPrev").disabled=readerSpread<=0 || isPageTurning;
    $("#readerNext").disabled=readerSpread>=totalSpreads-1 || isPageTurning;
    $("#bookPrevZone").hidden=readerSpread<=0 || isPageTurning;
    $("#bookNextZone").hidden=readerSpread>=totalSpreads-1 || isPageTurning;
    const bookmarked=isBookmarked(item.id,readerSpread);
    $("#readerBookmark").setAttribute("aria-pressed",String(bookmarked));
    $("#readerBookmark").textContent=bookmarked?"Bookmarked":"Bookmark spread";
    if(saveProgress){
      state.progress[item.id] = rightPage;
      persist();
      renderDiscover();
    }
  }

  function openReader(id,requestedSpread=null){
    const item=titleById(id || currentTitleId);
    if(!item)return;
    currentTitleId=item.id;
    const totalPages=pageCountFor(item);
    const totalSpreads=spreadCountFor(item);
    const previousPage=Math.max(1,Math.min(totalPages,Number(state.progress[item.id] || 1)));
    const savedSpread=Math.floor((previousPage-1)/2);
    readerSpread=Number.isInteger(requestedSpread)
      ? Math.min(totalSpreads-1,Math.max(0,requestedSpread))
      : Math.min(totalSpreads-1,Math.max(0,savedSpread));
    isPageTurning=false;activeFlip=null;pointerDrag=null;
    $("#readerTitle").textContent=item.title;
    closeModal($("#titleModal"));
    showModal($("#readerModal"));
    if(item.localImport){
      $("#readerPageLabel").textContent="LOADING LOCAL PAGES";
      $("#readerProgressLabel").textContent="READING FROM THIS DEVICE";
      loadLocalPages(item).then(()=>{
        if(currentTitleId!==item.id || !$("#readerModal").open)return;
        renderBookSpread();
        updateReaderUI(true);
      }).catch(error=>toast("Could not load local pages: "+(error.message || "storage error.")));
      return;
    }
    renderBookSpread();
    updateReaderUI(true);
  }

  function prepareFlip(direction,quiet){
    if(isPageTurning || !currentTitleId) return null;
    const activeItem=titleById(currentTitleId);
    const totalSpreads=spreadCountFor(activeItem);
    const totalPages=pageCountFor(activeItem);
    const targetSpread = readerSpread + direction;
    if(targetSpread < 0 || targetSpread >= totalSpreads){
      if(!quiet) toast(direction > 0 ? "You have reached the end of this book." : "You're at the beginning of this book.");
      return null;
    }
    const item = activeItem;
    if(!item) return null;
    const currentLeft = readerSpread * 2 + 1;
    const currentRight = Math.min(totalPages,currentLeft + 1);
    const targetLeft = targetSpread * 2 + 1;
    const targetRight = Math.min(totalPages,targetLeft + 1);

    if(direction > 0){
      setBookPage($("#leftBookPage"),currentLeft,item,"left");
      setBookPage($("#rightBookPage"),targetRight,item,"right");
    }else{
      setBookPage($("#leftBookPage"),targetLeft,item,"left");
      setBookPage($("#rightBookPage"),currentRight,item,"right");
    }

    const frontPage = direction > 0 ? currentRight : currentLeft;
    const backPage = direction > 0 ? targetLeft : targetRight;
    const frontSide = direction > 0 ? "right" : "left";
    const backSide = direction > 0 ? "left" : "right";
    const sheet = document.createElement("div");
    sheet.className = "book-flip-sheet " + (direction > 0 ? "forward" : "backward");
    sheet.style.left = direction > 0 ? "50%" : "0";
    sheet.style.transformOrigin = direction > 0 ? "left center" : "right center";
    sheet.style.transform = "rotateY(0deg)";
    sheet.innerHTML = '<div class="book-flip-face front book-page ' + frontSide + '">' +
      renderBookPageContent(frontPage,item) +
      '</div><div class="book-flip-face back book-page ' + backSide + '">' +
      renderBookPageContent(backPage,item) +
      '</div><div class="book-flip-shade"></div>';
    $("#bookSpread").append(sheet);
    isPageTurning = true;
    activeFlip = {sheet:sheet,direction:direction,fromSpread:readerSpread,toSpread:targetSpread,finishing:false,timer:null};
    updateReaderUI(false);
    return activeFlip;
  }

  function finishFlip(flip,commit){
    if(!flip || activeFlip !== flip) return;
    if(flip.timer) window.clearTimeout(flip.timer);
    if(commit) readerSpread = flip.toSpread;
    activeFlip = null;
    isPageTurning = false;
    pointerDrag = null;
    renderBookSpread();
    updateReaderUI(true);
  }

  function settleFlip(commit){
    const flip = activeFlip;
    if(!flip || flip.finishing) return;
    flip.finishing = true;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(reducedMotion){
      finishFlip(flip,commit);
      return;
    }
    flip.sheet.style.transition = "transform 560ms cubic-bezier(.22,.72,.16,1)";
    flip.sheet.style.setProperty("--flip-progress",commit ? "1" : "0");
    flip.sheet.style.transform = commit
      ? "rotateY(" + (flip.direction > 0 ? "-180deg" : "180deg") + ")"
      : "rotateY(0deg)";
    flip.sheet.addEventListener("transitionend",function(event){
      if(event.target === flip.sheet && event.propertyName === "transform") finishFlip(flip,commit);
    },{once:true});
    flip.timer = window.setTimeout(()=>finishFlip(flip,commit),640);
  }

  function turnSpread(direction){
    const flip = prepareFlip(direction);
    if(!flip) return;
    void flip.sheet.offsetWidth;
    settleFlip(true);
  }

  function attachBookInteractions(){
    const frame = $("#bookFrame");
    frame.addEventListener("pointerdown",event=>{
      if(!$("#readerModal").open || isPageTurning) return;
      if(event.pointerType === "mouse" && event.button !== 0) return;
      if(event.target.closest("button") || event.target.closest(".book-drag-indicator")) return;
      const page = event.target.closest(".book-page");
      if(!page) return;
      const direction = page.classList.contains("right") ? 1 : -1;
      const flip = prepareFlip(direction,true);
      if(!flip) return;
      pointerDrag = {pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,pageWidth:Math.max(1,frame.getBoundingClientRect().width/2),direction,moved:false,flip};
      try{frame.setPointerCapture(event.pointerId);}catch(_){}
      event.preventDefault();
    });

    frame.addEventListener("pointermove",event=>{
      if(!pointerDrag || event.pointerId !== pointerDrag.pointerId || !activeFlip) return;
      const dx = event.clientX - pointerDrag.startX;
      const directedDistance = pointerDrag.direction > 0 ? -dx : dx;
      const progress = Math.max(0,Math.min(1,directedDistance / pointerDrag.pageWidth));
      pointerDrag.moved = pointerDrag.moved || Math.abs(dx) > 5;
      if(!activeFlip.finishing){
        activeFlip.sheet.style.transition = "none";
        activeFlip.sheet.style.setProperty("--flip-progress",String(progress));
        activeFlip.sheet.style.transform = "rotateY(" + (pointerDrag.direction > 0 ? -180*progress : 180*progress) + "deg)";
      }
      if(pointerDrag.moved) event.preventDefault();
    });

    frame.addEventListener("pointerup",event=>{
      if(!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;
      const drag = pointerDrag;
      const dx = event.clientX - drag.startX;
      const directedDistance = drag.direction > 0 ? -dx : dx;
      const progress = directedDistance / drag.pageWidth;
      try{frame.releasePointerCapture(event.pointerId);}catch(_){}
      pointerDrag = null;
      if(!drag.moved){finishFlip(drag.flip,false);return;}
      settleFlip(progress >= 0.18);
    });

    frame.addEventListener("pointercancel",event=>{
      if(!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;
      const drag=pointerDrag;
      pointerDrag=null;
      try{frame.releasePointerCapture(event.pointerId);}catch(_){}
      settleFlip(false);
    });

    frame.addEventListener("wheel",event=>{
      if(!$("#readerModal").open || isPageTurning) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if(Math.abs(delta) < 14) return;
      event.preventDefault();
      const now = Date.now();
      if(now < wheelLockUntil) return;
      wheelLockUntil = now + 650;
      turnSpread(delta > 0 ? 1 : -1);
    },{passive:false});

    $("#bookPrevZone").addEventListener("click",()=>turnSpread(-1));
    $("#bookNextZone").addEventListener("click",()=>turnSpread(1));
  }

  function toggleSource(id){
    if(!sourceById(id))return;
    if(state.enabledSources.includes(id)){
      state.enabledSources=state.enabledSources.filter(value=>value!==id);
      toast("Official source removed from quick list.");
    }else{
      state.enabledSources.push(id);
      toast("Official source added to quick list.");
    }
    persist();renderSources();renderRail();
  }

  function navigateEmbedded(tab, record=true){
    if(!["discover","manga","manhwa","manhua"].includes(tab))return;
    if(record){
      embeddedHistory=embeddedHistory.slice(0,embeddedHistoryIndex+1);
      embeddedHistory.push(tab);
      embeddedHistoryIndex=embeddedHistory.length-1;
    }
    sourceTab=tab;renderSources();
  }

  function renderTheme(){
    document.documentElement.dataset.theme=state.theme;
    $("#themeToggle").setAttribute("aria-label",state.theme==="dark"?"Switch to light theme":"Switch to dark theme");
    $("#themeToggle").title=state.theme==="dark"?"Switch to light theme":"Switch to dark theme";
    $("#themeToggle").innerHTML=state.theme==="dark"?'<svg viewBox="0 0 24 24"><path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    document.querySelector('meta[name="theme-color"]').content=state.theme==="dark"?"#0b0c0d":"#e9e9e5";
  }

  function toggleTheme(){state.theme=state.theme==="dark"?"light":"dark";persist();renderTheme();}

  // Global interaction delegation keeps actions consistent across card grids and modal content.
  document.addEventListener("click",event=>{
    const routeButton=event.target.closest("[data-route]");
    if(routeButton){event.preventDefault();changeRoute(routeButton.dataset.route);return;}
    const saveButton=event.target.closest("[data-save-title]");
    if(saveButton){event.preventDefault();event.stopPropagation();toggleSaved(saveButton.dataset.saveTitle);return;}
    const favButton=event.target.closest("[data-favorite-title]");
    if(favButton){event.preventDefault();event.stopPropagation();toggleFavorite(favButton.dataset.favoriteTitle);return;}
    const openBookmarkButton=event.target.closest("[data-open-bookmark]");
    if(openBookmarkButton){openBookmarkedSpread(openBookmarkButton.dataset.openBookmark);return;}
    const removeBookmarkButton=event.target.closest("[data-unbookmark]");
    if(removeBookmarkButton){unbookmarkSpread(removeBookmarkButton.dataset.unbookmark);return;}
    const readerButton=event.target.closest("[data-reader-open]");
    if(readerButton){openReader(readerButton.dataset.readerOpen);return;}
    const titleButton=event.target.closest("[data-open-title]");
    if(titleButton){if(event.target.closest("button"))return;openTitle(titleButton.dataset.openTitle);return;}
    const closeButton=event.target.closest("[data-close-modal]");
    if(closeButton){closeModal(closeButton.closest("dialog"));return;}
    const sourceToggle=event.target.closest("[data-toggle-source]");
    if(sourceToggle){toggleSource(sourceToggle.dataset.toggleSource);return;}
  });

  document.addEventListener("keydown",event=>{
    const titleButton=event.target.closest?.("[data-open-title]");
    if(titleButton&&(event.key==="Enter"||event.key===" ")){event.preventDefault();openTitle(titleButton.dataset.openTitle);}
    if(event.key==="Escape"){$("dialog[open]").forEach(dialog=>closeModal(dialog));}
    const target=event.target;
    const isTyping=target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement||target.isContentEditable;
    if($("#readerModal").open&&!isTyping&&!event.altKey&&!event.ctrlKey&&!event.metaKey){
      if(event.key==="ArrowRight"||event.key==="PageDown"){event.preventDefault();turnSpread(1);return;}
      if(event.key==="ArrowLeft"||event.key==="PageUp"){event.preventDefault();turnSpread(-1);return;}
    }
    if(event.key==="/"&&!isTyping){event.preventDefault();$("#globalSearch").focus();}
    if((event.metaKey||event.ctrlKey)&&/^[1-7]$/.test(event.key)){
      event.preventDefault();const routes=["discover","library","updates","downloads","sources","history","favorites"];changeRoute(routes[Number(event.key)-1]);
    }
  });

  $(".category-chip").forEach(button=>button.addEventListener("click",()=>{
    state.category=button.dataset.category;
    $("#filterCategory").value=state.category;
    renderDiscover();
  }));
  $("#globalSearch").addEventListener("input",event=>{titleQuery=event.target.value;renderDiscover();});
  $("#globalSearch").addEventListener("keydown",event=>{if(event.key!=="Enter"||!event.currentTarget.value.trim())return;sourceQuery=event.currentTarget.value.trim();$("#sourceSearch").value=sourceQuery;changeRoute("sources");renderSources();});
  $("#sortSelect").addEventListener("change",renderDiscover);
  $("#filterButton").addEventListener("click",()=>showModal($("#filterModal")));
  $("#dismissNotice").addEventListener("click",()=>{$("#dismissNotice").closest(".demo-notice").remove();state.noticeDismissed=true;persist();});
  $("#applyFilters").addEventListener("click",()=>{
    state.category=$("#filterCategory").value;
    state.genre=$("#filterGenre").value;
    state.status=$("#filterStatus").value;
    closeModal($("#filterModal"));renderDiscover();toast("Discovery filters applied.");
  });
  $("#resetFilters").addEventListener("click",()=>{
    state.category="All";state.genre="all";state.status="all";titleQuery="";$("#globalSearch").value="";$("#filterCategory").value="All";$("#filterGenre").value="all";$("#filterStatus").value="all";renderDiscover();toast("Filters reset.");
  });
  $("#librarySearch").addEventListener("input",event=>{libraryQuery=event.target.value;renderLibrary();});
  $("#exportBackupButton").addEventListener("click",exportBackup);
  $("#importImagesButton").addEventListener("click",()=>$("#importImagesFile").click());
  $("#libraryEmptyImportButton").addEventListener("click",()=>$("#importImagesFile").click());
  $("#libraryEmptyArchiveButton").addEventListener("click",()=>$("#importArchiveFile").click());
  $("#importArchiveButton").addEventListener("click",()=>$("#importArchiveFile").click());
  $("#heroArchiveButton").addEventListener("click",()=>$("#importArchiveFile").click());
  $("#discoverArchiveButton").addEventListener("click",()=>$("#importArchiveFile").click());
  $("#downloadsArchiveButton").addEventListener("click",()=>$("#importArchiveFile").click());
  $("#importArchiveFile").addEventListener("change",event=>{const file=event.target.files&&event.target.files[0];event.target.value="";void importImageArchive(file);});
  $("#downloadsImportButton").addEventListener("click",()=>$("#importImagesFile").click());
  $("#heroImportButton").addEventListener("click",()=>$("#importImagesFile").click());
  $("#discoverImportButton").addEventListener("click",()=>$("#importImagesFile").click());
  $("#importImagesFile").addEventListener("change",event=>{
    const files=event.target.files;
    event.target.value="";
    importImageFolder(files);
  });
  $("#importBackupButton").addEventListener("click",()=>$("#importBackupFile").click());
  $("#importBackupFile").addEventListener("change",event=>{
    const file=event.target.files && event.target.files[0];
    event.target.value = "";
    importBackup(file);
  });
  $$(".view-toggle").forEach(button=>button.addEventListener("click",()=>{
    gridView=button.dataset.view;
    $$(".view-toggle").forEach(btn=>btn.classList.toggle("is-selected",btn===button));
    renderDiscover();renderLibrary();renderHistory();renderFavorites();
  }));
  $("#themeToggle").addEventListener("click",toggleTheme);
  $("#railCollapse").addEventListener("click",()=>{
    $("#app").classList.toggle("rail-collapsed");
    toast($("#app").classList.contains("rail-collapsed")?"Reading desk collapsed.":"Reading desk restored.");
  });
  $("#sourceWindowRefresh").addEventListener("click",()=>{renderMiniSources();toast("Official source panel refreshed.");});
  $("#sourceSearch").addEventListener("input",event=>{sourceQuery=event.target.value;renderSources();});
  if($("#sourceLanguage"))$("#sourceLanguage").addEventListener("change",event=>{sourceLanguage=event.target.value;renderSources();});
  $$(".embedded-tab").forEach(button=>button.addEventListener("click",()=>navigateEmbedded(button.dataset.sourceTab)));
  $("#embeddedBack").addEventListener("click",()=>{
    if(embeddedHistoryIndex>0){embeddedHistoryIndex--;navigateEmbedded(embeddedHistory[embeddedHistoryIndex],false);}
    else toast("You're at the start of the source preview.");
  });
  $("#embeddedForward").addEventListener("click",()=>{
    if(embeddedHistoryIndex<embeddedHistory.length-1){embeddedHistoryIndex++;navigateEmbedded(embeddedHistory[embeddedHistoryIndex],false);}
    else toast("There are no more source categories in history.");
  });
  $("#embeddedReload").addEventListener("click",()=>{renderSources();toast("Official source directory refreshed.");});
  $("#embeddedHome").addEventListener("click",()=>navigateEmbedded("discover"));
  $("#profileButton").addEventListener("click",()=>toast("SORYVYN stores your reading data on this device."));
  $("#profileTop").addEventListener("click",()=>toast("SORYVYN · local browser storage."));
  $("#roadmapLink").addEventListener("click",event=>{event.preventDefault();showModal($("#roadmapModal"));});
  $("#readerPrev").addEventListener("click",()=>turnSpread(-1));
  $("#readerBookmark").addEventListener("click",toggleCurrentBookmark);
  $("#readerNext").addEventListener("click",()=>turnSpread(1));
  attachBookInteractions();
  $("#readerModal").addEventListener("close",()=>{
    if(activeFlip){
      if(activeFlip.timer)window.clearTimeout(activeFlip.timer);
      activeFlip.sheet.remove();
      activeFlip=null;
      isPageTurning=false;
      pointerDrag=null;
    }
  });

  window.addEventListener("online",()=>{$("#connectionLabel").textContent="LOCAL MODE";toast("Connection restored. Local library is available.");});
  window.addEventListener("offline",()=>{$("#connectionLabel").textContent="OFFLINE MODE";toast("Offline mode. Cached app shell remains available.");});
  window.addEventListener("beforeinstallprompt",event=>{
    event.preventDefault();installPrompt=event;$("#installButton").hidden=false;
  });
  $("#installButton").addEventListener("click",async()=>{
    if(!installPrompt){toast("Use your browser menu to install this app when PWA install is available.");return;}
    installPrompt.prompt();
    await installPrompt.userChoice.catch(()=>null);
    installPrompt=null;$("#installButton").hidden=true;
  });
  window.addEventListener("appinstalled",()=>{installPrompt=null;$("#installButton").hidden=true;toast("SORYVYN installed.");});

  // Initial application state.
  $("#footerYear").textContent=new Date().getFullYear();
  if(state.noticeDismissed)$("#dismissNotice").closest(".demo-notice").remove();
  renderTheme();renderCounters();renderMiniSources();renderDiscover();renderRail();renderSources();
  restoreLocalImports();
  const initialRoute=location.hash.replace("#","").trim();
  if(initialRoute)changeRoute(initialRoute);
  if("serviceWorker" in navigator && (location.protocol==="https:"||location.hostname==="localhost")){
    navigator.serviceWorker.register("./sw.js",{scope:"./"}).then(()=>{}).catch(()=>{});
  }
})();
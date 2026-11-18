const $ = (selector) => document.querySelector(selector);

const state = {
  files: [], profiles: [30], mode: "fast", includeLast: true,
  workspaceMode: "normal", advancedPlan: "duration", timelineFileId: null, timelineDrag: null,
  globalPlanSettings: null, perFilePlans: {},
  running: false, packaging: false, cancelled: false, ffmpeg: null, JSZip: null,
  zipUrl: null, previewUrl: null, previewClipUrl: null, clips: [], zipDirty: true, currentTask: 0, totalTasks: 0, taskProgress: 0
};

const els = {
  fileInput: $("#fileInput"), browseFiles: $("#browseFiles"), dropzone: $("#dropzone"),
  fileList: $("#fileList"), emptyQueue: $("#emptyQueue"), fileCount: $("#fileCount"),
  clearFiles: $("#clearFiles"), previewWrap: $("#previewWrap"), previewVideo: $("#previewVideo"),
  previewName: $("#previewName"), durationPresets: $("#durationPresets"),
  selectedProfiles: $("#selectedProfiles"), selectedCount: $("#selectedCount"),
  customMinutes: $("#customMinutes"), customSeconds: $("#customSeconds"),
  addDuration: $("#addDuration"), includeLast: $("#includeLast"), methodNote: $("#methodNote"),
  estimateCount: $("#estimateCount"), estimateDetail: $("#estimateDetail"),
  startSplit: $("#startSplit"), progressPanel: $("#progressPanel"),
  progressTitle: $("#progressTitle"), progressMessage: $("#progressMessage"),
  progressBar: $("#progressBar"), progressStage: $("#progressStage"),
  progressPercent: $("#progressPercent"), cancelSplit: $("#cancelSplit"),
  resultsPanel: $("#resultsPanel"), resultsTitle: $("#resultsTitle"),
  resultsDetail: $("#resultsDetail"), resultStats: $("#resultStats"),
  failureList: $("#failureList"), downloadZip: $("#downloadZip"), newBatch: $("#newBatch"),
  clipManager: $("#clipManager"), clipList: $("#clipList"), clipSummary: $("#clipSummary"), createZip: $("#createZip"),
  previewDialog: $("#clipPreviewDialog"), previewClip: $("#previewClip"), previewClipTitle: $("#previewClipTitle"), closeClipPreview: $("#closeClipPreview"),
  advancedSettings: $("#advancedSettings"), durationSettings: $("#durationSettings"),
  advancedPlan: $("#advancedPlan"), rangeStart: $("#rangeStart"), rangeEnd: $("#rangeEnd"),
  equalParts: $("#equalParts"), manualCuts: $("#manualCuts"),
  advancedEqualSettings: $("#advancedEqualSettings"), advancedManualSettings: $("#advancedManualSettings"),
  advancedValidation: $("#advancedValidation"), perVideoMode: $("#perVideoMode"), perVideoStatus: $("#perVideoStatus"), timeline: $("#advancedTimeline"), timelineSource: $("#timelineSource"),
  timelineTrack: $("#timelineTrack"), timelineRange: $("#timelineRange"), timelineMarkers: $("#timelineMarkers"),
  timelineStartLabel: $("#timelineStartLabel"), timelineEndLabel: $("#timelineEndLabel"), timelineStatus: $("#timelineStatus"),
  partialSetting: $("#partialSetting"),
  partialTitle: $("#partialTitle"), partialCopy: $("#partialCopy")
};

const FILE_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3.5h8l4 4V20H6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 3.5V8h4M9 12h6M9 15.5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return bytes + " B";
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2) + " " + units[unit];
}
function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "Duration unavailable";
  const whole = Math.floor(seconds), hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60), secs = whole % 60;
  return hours ? hours + ":" + String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0")
    : minutes + ":" + String(secs).padStart(2, "0");
}
function formatDuration(seconds) {
  if (seconds < 60) return seconds + " sec";
  if (seconds % 60 === 0) return seconds / 60 + " min";
  return Math.floor(seconds / 60) + "m " + seconds % 60 + "s";
}
function durationFolder(seconds) {
  if (seconds < 60) return seconds + "-seconds";
  if (seconds % 60 === 0) return seconds / 60 + "-minutes";
  return Math.floor(seconds / 60) + "-minutes-" + seconds % 60 + "-seconds";
}
function safeName(name) {
  return String(name).replace(/\.[^.]+$/, "").normalize("NFKD")
    .replace(/[^\w.-]+/g, "_").replace(/^[-_.]+|[-_.]+$/g, "").slice(0, 72) || "video";
}
function fileExtension(name) {
  const match = String(name).toLowerCase().match(/\.([a-z0-9]{1,8})$/);
  return match ? match[1] : "mp4";
}
function fastContainer(fileName) {
  const ext = fileExtension(fileName);
  const formats = {
    mp4: ["mp4", "mp4"], m4v: ["mp4", "mp4"], mov: ["mov", "mov"], qt: ["mov", "mov"],
    mkv: ["matroska", "mkv"], webm: ["webm", "webm"], avi: ["avi", "avi"],
    flv: ["flv", "flv"], ts: ["mpegts", "ts"], mts: ["mpegts", "ts"],
    m2ts: ["mpegts", "ts"], mpg: ["mpeg", "mpg"], mpeg: ["mpeg", "mpeg"], "3gp": ["3gp", "3gp"]
  };
  const choice = formats[ext] || ["matroska", "mkv"];
  return { format: choice[0], extension: choice[1] };
}

function parseTimecode(value){
 const input=String(value??"").trim();if(!input)return null;
 if(/^\d+(?:\.\d+)?$/.test(input))return Number(input);
 const parts=input.split(":");if(parts.length!==2&&parts.length!==3)return null;
 if(parts.some(part=>part.trim()===""||!/^\d+(?:\.\d+)?$/.test(part.trim())))return null;
 const nums=parts.map(Number),seconds=nums[nums.length-1],minutes=nums[nums.length-2];
 if(seconds>=60||(parts.length===3&&minutes>=60))return null;
 return parts.length===3?nums[0]*3600+minutes*60+seconds:minutes*60+seconds;
}
function secondsText(value){return Number(value.toFixed(6)).toString();}
function readPlanSettings(){return {plan:state.advancedPlan,rangeStart:els.rangeStart.value,rangeEnd:els.rangeEnd.value,equalParts:els.equalParts.value,manualCuts:els.manualCuts.value,profiles:state.profiles.slice(),includeLast:els.includeLast.checked};}
function clonePlanSettings(settings){return JSON.parse(JSON.stringify(settings));}
function writePlanSettings(settings){const value=settings||state.globalPlanSettings||{plan:"duration",rangeStart:"00:00:00.000",rangeEnd:"",equalParts:"4",manualCuts:"",profiles:[30],includeLast:true};state.advancedPlan=value.plan||"duration";els.advancedPlan.value=state.advancedPlan;els.rangeStart.value=value.rangeStart??"00:00:00.000";els.rangeEnd.value=value.rangeEnd??"";els.equalParts.value=String(value.equalParts??4);els.manualCuts.value=value.manualCuts??"";state.profiles=Array.isArray(value.profiles)?value.profiles.slice():[30];state.includeLast=value.includeLast!==false;els.includeLast.checked=state.includeLast;renderProfiles();}
function persistActivePlanSettings(){const settings=readPlanSettings(),entry=state.files.find(file=>file.id===state.timelineFileId);if(state.workspaceMode==="advanced"&&entry&&els.perVideoMode?.value==="custom")state.perFilePlans[entry.id]=settings;else state.globalPlanSettings=settings;}
function getPlanSettingsForEntry(entry){if(state.workspaceMode==="advanced"&&entry&&state.perFilePlans[entry.id])return state.perFilePlans[entry.id];return state.globalPlanSettings||readPlanSettings();}
function loadPlanSettingsForEntry(entry){if(!entry){if(state.globalPlanSettings)writePlanSettings(state.globalPlanSettings);return;}const custom=state.perFilePlans[entry.id];els.perVideoMode.value=custom?"custom":"inherit";writePlanSettings(custom||state.globalPlanSettings||readPlanSettings());}
function getSplitJobsFromSettings(settings){const profiles=(settings.profiles||[]).slice().sort((a,b)=>a-b);if(state.workspaceMode!=="advanced"||settings.plan==="duration"){if(!profiles.length)throw new Error("Select at least one clip duration.");return profiles.map(seconds=>({type:"duration",seconds,label:formatDuration(seconds),folder:durationFolder(seconds)}));}if(settings.plan==="equal"){const parts=Number(settings.equalParts);if(!Number.isInteger(parts)||parts<2||parts>200)throw new Error("Choose between 2 and 200 equal parts.");return [{type:"equal",parts,label:parts+" equal parts",folder:"equal-parts-"+parts}];}const lines=String(settings.manualCuts||"").split(/\r?\n/).map(line=>line.trim()).filter(Boolean);if(!lines.length)throw new Error("Enter at least one manual cut timestamp.");if(lines.length>500)throw new Error("Use no more than 500 manual cut timestamps per plan.");const cuts=lines.map(parseTimecode);if(cuts.some(time=>!Number.isFinite(time)||time<0))throw new Error("A manual cut timestamp is invalid. Use HH:MM:SS.mmm, MM:SS.mmm, or seconds.");for(let i=1;i<cuts.length;i++)if(cuts[i]<=cuts[i-1])throw new Error("Manual cut timestamps must be in strictly ascending order.");return [{type:"manual",cuts,label:cuts.length+" manual cut points",folder:"manual-cuts"}];}
function getSplitJobs(){return getSplitJobsFromSettings(readPlanSettings());}
function getSplitJobsForEntry(entry){return getSplitJobsFromSettings(getPlanSettingsForEntry(entry));}
function getAdvancedRange(duration,settings=readPlanSettings()){const start=parseTimecode(settings.rangeStart||"0"),endInput=String(settings.rangeEnd||"").trim(),end=endInput?parseTimecode(endInput):duration;if(!Number.isFinite(start)||start<0)throw new Error("The source range start time is invalid.");if(!Number.isFinite(end)||end<=start)throw new Error("The source range end must be later than its start.");if(end>duration+0.05)throw new Error("The selected source range extends beyond the video duration ("+formatTime(duration)+").");return {start,end:Math.min(end,duration)};}
function buildAdvancedPlan(duration,job,settings=readPlanSettings()){const range=getAdvancedRange(duration,settings),rangeLength=range.end-range.start;if(rangeLength<=0.02)throw new Error("The selected source range is too short.");let effectiveDuration=rangeLength,splitTimes=[];if(job.type==="duration"){if(!settings.includeLast)effectiveDuration=Math.floor((rangeLength+0.000001)/job.seconds)*job.seconds;if(effectiveDuration<=0.02)return null;for(let time=job.seconds;time<effectiveDuration-0.000001;time+=job.seconds)splitTimes.push(Number(time.toFixed(6)));}else if(job.type==="equal"){for(let part=1;part<job.parts;part++)splitTimes.push(Number((rangeLength*part/job.parts).toFixed(6)));}else{for(const cut of job.cuts)if(cut<=range.start+0.001||cut>=range.end-0.001)throw new Error("Every manual cut must fall strictly inside the selected source range.");const relativeCuts=job.cuts.map(cut=>Number((cut-range.start).toFixed(6)));if(settings.includeLast)splitTimes=relativeCuts;else{effectiveDuration=relativeCuts[relativeCuts.length-1];splitTimes=relativeCuts.slice(0,-1);}if(effectiveDuration<=0.02)return null;}return {start:range.start,duration:effectiveDuration,splitTimes,clipCount:splitTimes.length+1};}
function buildAdvancedCommand(inputPath,plan,mode,extension,format){
 const args=[];if(plan.start>0)args.push("-ss",secondsText(plan.start));
 args.push("-i",inputPath,"-t",secondsText(plan.duration),"-map","0:v:0","-map","0:a?");
 if(mode==="fast")args.push("-c","copy");
 else{
  args.push("-c:v","libx264","-preset","veryfast","-crf","19","-pix_fmt","yuv420p","-sc_threshold","0","-c:a","aac","-b:a","192k");
  if(plan.splitTimes.length)args.push("-force_key_frames",plan.splitTimes.map(secondsText).join(","));
 }
 args.push("-f","segment","-reset_timestamps","1","-segment_format",format);
 if(plan.splitTimes.length)args.push("-segment_times",plan.splitTimes.map(secondsText).join(","));
 else args.push("-segment_time",secondsText(plan.duration+1));
 if(mode==="precise")args.push("-segment_format_options","movflags=+faststart");
 args.push("part_%03d."+extension);return args;
}
function setWorkspaceMode(mode){
 const nextMode=mode==="advanced"?"advanced":"normal";
 if(state.workspaceMode==="advanced")persistActivePlanSettings();
 else state.globalPlanSettings=readPlanSettings();
 state.workspaceMode=nextMode;
 if(nextMode==="normal"){if(state.globalPlanSettings)writePlanSettings(state.globalPlanSettings);}
 else{const entry=selectedTimelineEntry();if(entry){state.timelineFileId=entry.id;loadPlanSettingsForEntry(entry);}else if(state.globalPlanSettings)writePlanSettings(state.globalPlanSettings);}
 document.querySelectorAll("[data-workspace-mode]").forEach(button=>{
  const active=button.dataset.workspaceMode===state.workspaceMode;
  button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));
 });
 els.advancedSettings.hidden=state.workspaceMode!=="advanced";renderAdvancedOptions();
}
function renderAdvancedOptions(){
 const advanced=state.workspaceMode==="advanced",plan=state.advancedPlan;
 els.durationSettings.hidden=advanced&&plan!=="duration";
 els.advancedEqualSettings.hidden=!advanced||plan!=="equal";
 els.advancedManualSettings.hidden=!advanced||plan!=="manual";
 els.partialSetting.hidden=advanced&&plan==="equal";
 if(advanced&&plan==="manual"){els.partialTitle.textContent="Include final remainder";els.partialCopy.textContent="Keep the footage after the last manual cut point.";}
 else{els.partialTitle.textContent="Last partial clip";els.partialCopy.textContent="Keep the remaining footage when the video does not divide evenly.";}
 if(!advanced)els.advancedValidation.textContent="Advanced controls are off in Normal Mode.";
 else{
  try{
   let issue="";for(const entry of state.files){const jobs=getSplitJobsForEntry(entry),settings=getPlanSettingsForEntry(entry);if(Number.isFinite(entry.duration)&&entry.duration>0)for(const job of jobs){try{buildAdvancedPlan(entry.duration,job,settings);}catch(error){issue=entry.file.name+": "+error.message;break;}}if(issue)break;}
   const customCount=state.files.filter(entry=>!!state.perFilePlans[entry.id]).length;els.perVideoStatus.textContent=customCount+" of "+state.files.length+" videos use custom plans; "+(state.files.length-customCount)+" inherit the global plan.";els.perVideoMode.disabled=state.files.length===0;
   els.advancedValidation.textContent=issue||("Per-video plans validated. "+(state.mode==="fast"?"Fast split":"Precise split")+" will be used.");
  }catch(error){els.advancedValidation.textContent=error.message;}
 }
 renderAdvancedTimeline();updateControls();updateEstimate();
}


function formatTimecode(seconds){
 const safe=Math.max(0,Number(seconds)||0),whole=Math.floor(safe),millis=Math.round((safe-whole)*1000);
 const total=whole+(millis===1000?1:0),ms=millis===1000?0:millis;
 const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
 return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")+"."+String(ms).padStart(3,"0");
}
function selectedTimelineEntry(){return state.files.find(entry=>entry.id===state.timelineFileId)||state.files[0]||null;}
function timelinePercent(time,duration){return duration>0?Math.max(0,Math.min(100,(time/duration)*100)):0;}
function updateTimelineGeometry(duration){
 if(!els.timelineRange||!duration)return;
 const parsedStart=parseTimecode(els.rangeStart.value||"0"),parsedEnd=els.rangeEnd.value.trim()?parseTimecode(els.rangeEnd.value):duration;
 const start=Number.isFinite(parsedStart)?Math.max(0,Math.min(duration,parsedStart)):0,end=Number.isFinite(parsedEnd)?Math.max(start,Math.min(duration,parsedEnd)):duration;
 const left=timelinePercent(start,duration),right=timelinePercent(end,duration);
 els.timelineRange.style.left=left+"%";els.timelineRange.style.width=Math.max(0,right-left)+"%";
 const startHandle=els.timelineTrack.querySelector('[data-range-handle="start"]'),endHandle=els.timelineTrack.querySelector('[data-range-handle="end"]');
 if(startHandle)startHandle.style.left=left+"%";if(endHandle)endHandle.style.left=right+"%";
}
function renderAdvancedTimeline(){
 if(!els.timeline)return;
 const advanced=state.workspaceMode==="advanced"&&state.files.length>0;
 els.timeline.hidden=!advanced;if(!advanced)return;
 els.timelineSource.innerHTML=state.files.map(entry=>'<option value="'+escapeHTML(entry.id)+'">'+escapeHTML(entry.file.name)+(Number.isFinite(entry.duration)?" · "+escapeHTML(formatTime(entry.duration)):" · reading…")+"</option>").join("");
 const entry=selectedTimelineEntry();if(!entry){els.timelineStatus.textContent="Add a video to build its timeline.";return;}
 state.timelineFileId=entry.id;els.timelineSource.value=entry.id;if(els.perVideoMode)els.perVideoMode.value=state.perFilePlans[entry.id]?"custom":"inherit";
 if(!Number.isFinite(entry.duration)||entry.duration<=0){
  els.timelineStartLabel.textContent="00:00:00.000";els.timelineEndLabel.textContent="Duration pending";
  els.timelineMarkers.innerHTML="";els.timelineRange.style.left="0%";els.timelineRange.style.width="100%";
  els.timelineTrack.querySelectorAll("[data-range-handle]").forEach(handle=>handle.style.left=handle.dataset.rangeHandle==="start"?"0%":"100%");
  els.timelineStatus.textContent="Reading source duration. The timeline will become interactive when metadata is available.";return;
 }
 const duration=entry.duration,settings=getPlanSettingsForEntry(entry);let start=0,end=duration,rangeError="";
 try{const range=getAdvancedRange(duration,settings);start=range.start;end=range.end;}
 catch(error){
  rangeError=error.message;const parsedStart=parseTimecode(settings.rangeStart||"0"),parsedEnd=String(settings.rangeEnd||"").trim()?parseTimecode(settings.rangeEnd):duration;
  start=Number.isFinite(parsedStart)?Math.max(0,Math.min(duration,parsedStart)):0;
  end=Number.isFinite(parsedEnd)?Math.max(start,Math.min(duration,parsedEnd)):duration;
  if(end-start<0.02){start=0;end=duration;}
 }
 els.timelineStartLabel.textContent=formatTimecode(start);els.timelineEndLabel.textContent=formatTimecode(end);updateTimelineGeometry(duration);
 const markers=[];
 if(!rangeError){try{for(const job of getSplitJobsForEntry(entry)){
  const plan=buildAdvancedPlan(duration,job,settings);if(!plan)continue;
  for(const relative of plan.splitTimes){const absolute=plan.start+relative,cutIndex=job.type==="manual"?job.cuts.findIndex(value=>Math.abs(value-absolute)<0.002):-1;
   markers.push({time:absolute,label:job.label,cutIndex,draggable:job.type==="manual"});}
 }}catch(_){}}
 markers.sort((a,b)=>a.time-b.time);
 els.timelineMarkers.innerHTML=markers.map(marker=>{
  const position=timelinePercent(marker.time,duration),label=escapeHTML(marker.label+" · "+formatTimecode(marker.time));
  if(marker.draggable)return '<button class="timeline-cut-marker is-draggable" type="button" data-cut-index="'+marker.cutIndex+'" style="left:'+position+'%" title="'+label+'" aria-label="Manual cut at '+formatTimecode(marker.time)+'. Drag to adjust."></button>';
  return '<span class="timeline-cut-marker" style="left:'+position+'%" title="'+label+'" aria-label="'+label+'"></span>';
 }).join("");
 els.timelineStatus.textContent=rangeError?rangeError+" Adjust the range fields or drag the range handles."
  :(markers.length?markers.length+" planned cut"+(markers.length===1?"":"s")+" shown. "+(settings.plan==="manual"?"Drag a cut marker to adjust its timestamp.":"Split markers are preview-only; the range edges are draggable."):"No internal cuts for this plan. Drag the range edges to change the source range.");
 els.timelineTrack.setAttribute("aria-label","Video timeline from zero to "+formatTimecode(duration)+", selected range "+formatTimecode(start)+" to "+formatTimecode(end));
}
function setTimelineControlTime(type,edge,index,duration,value){
 const time=Math.max(0,Math.min(duration,value));
 if(type==="range"){
  const currentStart=parseTimecode(els.rangeStart.value||"0")??0,currentEnd=els.rangeEnd.value.trim()?parseTimecode(els.rangeEnd.value):duration;
  if(edge==="start")els.rangeStart.value=formatTimecode(Math.max(0,Math.min(currentEnd-0.02,time)));
  else els.rangeEnd.value=formatTimecode(Math.max(currentStart+0.02,Math.min(duration,time)));
 }else if(type==="cut"){
  const lines=els.manualCuts.value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean),cuts=lines.map(parseTimecode);
  if(index<0||index>=cuts.length)return;
  const rangeStart=parseTimecode(els.rangeStart.value||"0")??0,rangeEnd=els.rangeEnd.value.trim()?parseTimecode(els.rangeEnd.value):duration;
  const min=index===0?rangeStart+0.002:cuts[index-1]+0.002,max=index===cuts.length-1?rangeEnd-0.002:cuts[index+1]-0.002;
  if(max<=min)return;
  cuts[index]=Math.max(min,Math.min(max,time));els.manualCuts.value=cuts.map(formatTimecode).join("\n");
 }
}
function timelineTimeFromPointer(event,duration){
 const rect=els.timelineTrack.getBoundingClientRect();return rect.width?Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width))*duration:0;
}
function updateTimelineDuringDrag(duration,activeHandle){
 updateTimelineGeometry(duration);
 if(activeHandle&&activeHandle.dataset.cutIndex!==undefined){
  const cuts=els.manualCuts.value.split(/\r?\n/).map(line=>parseTimecode(line.trim())).filter(Number.isFinite),index=Number(activeHandle.dataset.cutIndex),time=cuts[index];
  if(Number.isFinite(time)){activeHandle.style.left=timelinePercent(time,duration)+"%";activeHandle.title="Manual cut · "+formatTimecode(time);}
 }
 const start=parseTimecode(els.rangeStart.value||"0")??0,end=els.rangeEnd.value.trim()?parseTimecode(els.rangeEnd.value):duration;
 els.timelineStartLabel.textContent=formatTimecode(start);els.timelineEndLabel.textContent=formatTimecode(end);
}


function clipMime(ext){return ({mp4:"video/mp4",m4v:"video/mp4",mov:"video/quicktime",webm:"video/webm",mkv:"video/x-matroska",avi:"video/x-msvideo",ts:"video/mp2t",mpg:"video/mpeg",mpeg:"video/mpeg",flv:"video/x-flv","3gp":"video/3gpp"})[ext]||"application/octet-stream";}
function clearArchive(){if(state.zipUrl)URL.revokeObjectURL(state.zipUrl);state.zipUrl=null;state.zipDirty=true;if(els.downloadZip){els.downloadZip.hidden=true;els.downloadZip.removeAttribute("href");}}
function getClipMemoryProfile(){const clipBytes=state.clips.reduce((sum,c)=>sum+c.size,0),largestSource=state.files.reduce((max,e)=>Math.max(max,e.file?.size||0),0);return {clipBytes,estimatedPeak:clipBytes*2+largestSource*2+128*1024*1024,heap:performance?.memory?.jsHeapSizeLimit||null};}
function updateMemoryWarning(){const warning=els.clipManager.querySelector(".clip-memory-warning");if(!warning)return;const p=getClipMemoryProfile(),show=p.clipBytes>=512*1024*1024||p.estimatedPeak>=1024*1024*1024;warning.hidden=!show;if(show){warning.querySelector("strong").textContent=p.clipBytes>=1024*1024*1024?"High-memory export":"Memory estimate";warning.querySelector("span").textContent="Clip data: "+formatBytes(p.clipBytes)+". Rough ZIP working-set estimate: "+formatBytes(p.estimatedPeak)+" (not a guaranteed limit). Packaging may need additional browser memory. Download clips individually or split large batches if needed."+(p.heap?" Browser-reported JS heap limit: "+formatBytes(p.heap)+".":"");}}
function invalidateArchive(){clearArchive();if(els.createZip)els.createZip.textContent="Create ZIP";}
function clearClipOutput(){
 if(state.previewClipUrl)URL.revokeObjectURL(state.previewClipUrl);state.previewClipUrl=null;
 if(els.previewDialog?.open)els.previewDialog.close();
 if(els.previewClip){els.previewClip.pause();els.previewClip.removeAttribute("src");els.previewClip.load();}
 state.clips=[];clearArchive();if(els.clipManager)els.clipManager.hidden=true;
}
function renderClipManager(){
 const clips=state.clips,bytes=clips.reduce((n,c)=>n+c.size,0);els.clipManager.hidden=!clips.length;
 els.clipSummary.textContent=clips.length+" clips · "+formatBytes(bytes)+" · included in export";
 const groups=new Map();clips.forEach(c=>{const k=c.sourceFolder+"|"+c.jobLabel;if(!groups.has(k))groups.set(k,{source:c.sourceName,job:c.jobLabel,items:[]});groups.get(k).items.push(c);});
 els.clipList.innerHTML=[...groups.values()].map(g=>'<section class="clip-group"><header><div><strong>'+escapeHTML(g.source)+'</strong><span>'+escapeHTML(g.job)+'</span></div><small>'+g.items.length+' clips</small></header>'+g.items.map(c=>'<article class="clip-row"><div class="clip-row-main"><strong>'+escapeHTML(c.name)+'</strong><small>'+formatBytes(c.size)+' · '+(Number.isFinite(c.duration)?c.duration.toFixed(2)+' sec'+(state.mode==='fast'?' approx.':''):'Duration n/a')+' · '+escapeHTML(c.extension.toUpperCase())+'</small></div><div class="clip-row-actions"><button data-action="preview" data-id="'+c.id+'">Preview</button><button data-action="download" data-id="'+c.id+'">Download</button><button data-action="remove" data-id="'+c.id+'">Remove</button></div><div class="clip-row-rename"><input data-rename="'+c.id+'" value="'+escapeHTML(c.name)+'" aria-label="Output filename"><button data-action="rename" data-id="'+c.id+'">Rename</button></div></article>').join('')+'</section>').join('');
 updateMemoryWarning();
 els.createZip.textContent=state.zipDirty?'Create ZIP':'Rebuild ZIP';els.createZip.disabled=state.packaging||!clips.length;updateControls();
}
function findClip(id){return state.clips.find(c=>c.id===id);}
function renameClip(id,value){
 const c=findClip(id);if(!c)return;let name=String(value||'').trim().replace(/[\\/]/g,'_'),suffix='.'+c.extension;
 if(name.toLowerCase().endsWith(suffix.toLowerCase()))name=name.slice(0,-suffix.length);
 name=safeName(name)+suffix;const folder=c.archivePath.slice(0,c.archivePath.lastIndexOf('/')+1),base=name.slice(0,-suffix.length);let candidate=name,n=2;
 while(state.clips.some(x=>x.id!==id&&x.archivePath.toLowerCase()===(folder+candidate).toLowerCase()))candidate=base+'_'+n+++suffix;
 c.name=candidate;c.archivePath=folder+candidate;invalidateArchive();renderClipManager();
}
function removeClip(id){
 const c=findClip(id);if(!c)return;
 if(state.previewClip?.dataset.clipId===id){if(state.previewClipUrl)URL.revokeObjectURL(state.previewClipUrl);state.previewClipUrl=null;els.previewDialog.close();els.previewClip.pause();els.previewClip.removeAttribute('src');els.previewClip.load();}
 state.clips=state.clips.filter(x=>x.id!==id);invalidateArchive();renderClipManager();
 els.resultsTitle.textContent=state.clips.length?'Review your clips':'No clips left in the export queue.';
}
function previewClip(id){
 const c=findClip(id);if(!c)return;if(state.previewClipUrl)URL.revokeObjectURL(state.previewClipUrl);
 state.previewClipUrl=URL.createObjectURL(c.blob);els.previewClip.dataset.clipId=id;els.previewClipTitle.textContent=c.name;
 els.previewClip.src=state.previewClipUrl;els.previewDialog.showModal();els.previewClip.play().catch(()=>{});
}
function downloadClip(id){
 const c=findClip(id);if(!c)return;const url=URL.createObjectURL(c.blob),a=document.createElement('a');a.href=url;a.download=c.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function createZip(){
 if(state.packaging||!state.clips.length)return;const p=getClipMemoryProfile();
 if(p.clipBytes>=512*1024*1024&&!window.confirm("This export contains "+formatBytes(p.clipBytes)+" of clips. ZIP packaging may temporarily require substantially more memory (rough estimate: "+formatBytes(p.estimatedPeak)+"). This is not a guarantee. Continue? You can download clips individually instead."))return;
 state.packaging=true;updateControls();showProgress("Creating your ZIP archive","Preparing "+state.clips.length+" clips · "+formatBytes(p.clipBytes)+"…");
 try{const zip=new state.JSZip();state.clips.forEach(c=>zip.file(c.archivePath,c.blob,{binary:true,compression:"STORE"}));
 const blob=await zip.generateAsync({type:"blob",compression:"STORE"},m=>setProgress(m.percent,"Creating ZIP","Packaging reviewed clips…"));
 clearArchive();state.zipUrl=URL.createObjectURL(blob);state.zipDirty=false;els.downloadZip.href=state.zipUrl;els.downloadZip.download="Splytie_Export.zip";els.downloadZip.hidden=false;
 els.progressTitle.textContent="ZIP archive ready";els.progressMessage.textContent="Your reviewed clips are packaged and ready to download.";setProgress(100,"Complete","ZIP created · "+state.clips.length+" clips · "+formatBytes(blob.size));
 }catch(e){els.progressTitle.textContent="ZIP creation failed";els.progressMessage.textContent=friendlyError(e);setProgress(0,"Failed","Your clips remain available for individual download.");}
 finally{state.packaging=false;els.progressPanel.hidden=true;els.resultsPanel.hidden=false;updateControls();renderClipManager();}
}

function updateControls(){
 let settingsReady=true;try{getSplitJobs();}catch(_){settingsReady=false;}
 const busy=state.running||state.packaging;
 const ready=state.files.length>0&&settingsReady&&!busy;
  els.startSplit.disabled = !ready;
  els.clearFiles.disabled = state.files.length === 0 || state.running;
  els.fileInput.disabled = state.running;
  els.browseFiles.disabled = state.running;
  els.addDuration.disabled = state.running;
  els.includeLast.disabled = state.running;
  els.advancedPlan.disabled = state.running;
  [els.rangeStart, els.rangeEnd, els.equalParts, els.manualCuts].forEach((control) => { control.disabled = state.running; });
  if(els.timelineSource)els.timelineSource.disabled=state.running;
  if(els.perVideoMode)els.perVideoMode.disabled=state.running||state.files.length===0;
  if(els.timelineTrack)els.timelineTrack.querySelectorAll("button").forEach(button=>button.disabled=state.running);
  els.selectedCount.textContent = state.profiles.length + " selected";
  els.startSplit.querySelector("span").textContent = state.running ? "Splitting…" : state.packaging ? "Packaging…" : "Split videos";
  if(els.createZip)els.createZip.disabled=busy||!state.clips.length;
  if(els.clipList)els.clipList.querySelectorAll("button,input").forEach(control=>control.disabled=busy);
}
function renderProfiles() {
  els.durationPresets.querySelectorAll("[data-seconds]").forEach((button) => {
    const active = state.profiles.includes(Number(button.dataset.seconds));
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  els.selectedProfiles.innerHTML = '<span class="profiles-label">Selected:</span>' +
    state.profiles.slice().sort((a, b) => a - b).map((seconds) =>
      '<span class="profile-tag">' + escapeHTML(formatDuration(seconds)) +
      '<button type="button" data-remove-duration="' + seconds + '" aria-label="Remove ' + seconds + ' seconds">×</button></span>'
    ).join("");
  renderAdvancedTimeline();updateControls();
  updateEstimate();
}
function renderQueue() {
  els.fileCount.textContent = state.files.length + (state.files.length === 1 ? " file" : " files");
  els.emptyQueue.hidden = state.files.length > 0;
  els.fileList.innerHTML = state.files.map((entry) => {
    const details = entry.duration !== null
      ? formatTime(entry.duration) + (entry.width && entry.height ? " · " + entry.width + " × " + entry.height : "")
      : entry.metadataState === "error" ? "Metadata unavailable · will probe during processing" : "Reading video details…";
    return '<div class="file-item" data-file-id="' + entry.id + '">' +
      '<div class="file-thumb">' + FILE_ICON + '</div><div class="file-details">' +
      '<div class="file-name" title="' + escapeHTML(entry.file.name) + '">' + escapeHTML(entry.file.name) + '</div>' +
      '<div class="file-meta"><span>' + formatBytes(entry.file.size) + '</span><span>' + escapeHTML(details) + '</span></div></div>' +
      '<button class="file-remove" type="button" data-remove-file="' + entry.id + '" aria-label="Remove ' + escapeHTML(entry.file.name) + '">×</button></div>';
  }).join("");
  renderAdvancedTimeline();updateControls();
  updateEstimate();
}
function updatePreview() {
  const first = state.files[0];
  if (state.previewUrl) { URL.revokeObjectURL(state.previewUrl); state.previewUrl = null; }
  if (!first) {
    els.previewWrap.hidden = true;
    els.previewVideo.removeAttribute("src");
    els.previewVideo.load();
    return;
  }
  state.previewUrl = URL.createObjectURL(first.file);
  els.previewVideo.src = state.previewUrl;
  els.previewName.textContent = first.file.name;
  els.previewWrap.hidden = false;
}
async function readMetadata(entry) {
  const url = URL.createObjectURL(entry.file), video = document.createElement("video");
  video.preload = "metadata";
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Metadata timeout")), 15000);
      video.onloadedmetadata = () => { clearTimeout(timer); resolve(); };
      video.onerror = () => { clearTimeout(timer); reject(new Error("Could not read metadata")); };
      video.src = url;
    });
    entry.duration = Number.isFinite(video.duration) ? video.duration : null;
    entry.width = video.videoWidth || null;
    entry.height = video.videoHeight || null;
    entry.metadataState = entry.duration ? "ready" : "error";
  } catch (_) { entry.metadataState = "error"; }
  finally {
    video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url);
  }
  renderQueue();
}
function addFiles(fileList) {
  const incoming = Array.from(fileList || []).filter((file) =>
    file.type.startsWith("video/") || /\.(mp4|m4v|mov|mkv|webm|avi|mts|m2ts|ts|mpg|mpeg|3gp|flv)$/i.test(file.name)
  );
  const added = [];
  for (const file of incoming) {
    const duplicate = state.files.some((entry) =>
      entry.file.name === file.name && entry.file.size === file.size && entry.file.lastModified === file.lastModified
    );
    if (duplicate) continue;
    const entry = {
      id: "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      file, duration: null, width: null, height: null, metadataState: "loading"
    };
    state.files.push(entry);
    added.push(entry);
  }
  renderQueue();
  updatePreview();
  if(added.length){clearClipOutput();els.resultsPanel.hidden=true;els.progressPanel.hidden=true;}
  added.forEach(readMetadata);
}
function updateEstimate(){
 if(!state.files.length){els.estimateCount.textContent="Ready for your videos";els.estimateDetail.textContent="Add files to calculate the estimated number of clips.";return;}
 if(state.workspaceMode==="advanced"){
  let total=0,known=0,unknown=0,invalid=0,tasks=0,custom=0;
  for(const entry of state.files){let jobs,settings;try{jobs=getSplitJobsForEntry(entry);settings=getPlanSettingsForEntry(entry);tasks+=jobs.length;}catch(_){invalid++;continue;}if(state.perFilePlans[entry.id])custom++;if(!Number.isFinite(entry.duration)||entry.duration<=0){unknown++;continue;}known++;for(const job of jobs){try{const plan=buildAdvancedPlan(entry.duration,job,settings);if(plan)total+=plan.clipCount;}catch(_){invalid++;}}}
  if(invalid){els.estimateCount.textContent="Review per-video settings";els.estimateDetail.textContent=invalid+" invalid plan or source-range setting"+(invalid===1?"":"s")+". Check each video's plan.";return;}
  els.estimateCount.textContent=total+(unknown?"+ estimated clips":" estimated clips");els.estimateDetail.textContent=unknown?known+" of "+state.files.length+" video durations read · "+tasks+" split jobs":state.files.length+" videos · "+tasks+" split jobs · "+custom+" custom plans";return;
 }
 if(!state.profiles.length){els.estimateCount.textContent="Choose a duration";els.estimateDetail.textContent="Select at least one clip duration to continue.";return;}
 let total=0,known=0,unknown=0;
 for(const entry of state.files){
  if(!Number.isFinite(entry.duration)){unknown++;continue;}known++;
  for(const duration of state.profiles){const count=state.includeLast?Math.ceil(entry.duration/duration):Math.floor(entry.duration/duration);total+=Math.max(0,count);}
 }
 const tasks=state.files.length*state.profiles.length;
 els.estimateCount.textContent=total+(unknown?"+ estimated clips":" estimated clips");
 els.estimateDetail.textContent=unknown?known+" of "+state.files.length+" video durations read · "+tasks+" split jobs":state.files.length+" videos × "+state.profiles.length+" duration profiles";
}
function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".mode-option").forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  els.methodNote.innerHTML = mode === "fast"
    ? "<b>i</b><span>Fast split copies the original streams without re-encoding. Cuts happen at keyframes, so each clip can run past the selected duration.</span>"
    : "<b>i</b><span>Precise split re-encodes to H.264 MP4 and places cut points on frame boundaries. It takes longer and changes the original encoding.</span>";
  updateEstimate();
}
function setProgress(percent, stage, message) {
  const safe = Math.max(0, Math.min(100, Number(percent) || 0));
  els.progressBar.style.width = safe + "%";
  els.progressPercent.textContent = Math.round(safe) + "%";
  if (stage) els.progressStage.textContent = stage;
  if (message) els.progressMessage.textContent = message;
}
function showProgress(title, message) {
  els.progressPanel.hidden = false;
  els.progressTitle.textContent = title;
  els.progressMessage.textContent = message;
  setProgress(0, "Preparing", message);
  els.resultsPanel.hidden = true;
  els.progressPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function loadEngine() {
  if (state.ffmpeg && state.JSZip) return;
  els.progressTitle.textContent = "Loading video engine";
  els.progressMessage.textContent = "Downloading the browser processing engine. This is only needed once per session.";
  setProgress(1, "Loading engine", "Fetching the processing engine…");
  const [ffmpegModule, zipModule] = await Promise.all([
    import("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/esm/index.js"),
    import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm")
  ]);
  const FFmpeg = ffmpegModule.FFmpeg;
  state.JSZip = zipModule.default || zipModule;
  state.ffmpeg = new FFmpeg();
  state.ffmpeg.on("progress", ({ progress }) => {
    if (!state.running || !Number.isFinite(progress)) return;
    state.taskProgress = Math.max(0, Math.min(1, progress));
    const percent = ((state.currentTask + state.taskProgress) / Math.max(1, state.totalTasks)) * 94;
    setProgress(percent, "Splitting " + (state.currentTask + 1) + " of " + state.totalTasks, "Processing video segments in this browser…");
  });
  const coreBase = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
  await state.ffmpeg.load({
    classWorkerURL: new URL("./ffmpeg-worker.js", window.location.href).href,
    coreURL: coreBase + "/ffmpeg-core.js",
    wasmURL: coreBase + "/ffmpeg-core.wasm"
  });
}
async function probeDuration(ffmpeg, inputPath) {
  const path = "probe_duration.txt";
  try {
    await ffmpeg.ffprobe(["-v", "error", "-show_entries", "format=duration", "-of",
      "default=noprint_wrappers=1:nokey=1", inputPath, "-o", path]);
    const raw = await ffmpeg.readFile(path, "utf8");
    const duration = Number.parseFloat(String(raw).trim());
    await removeIfPresent(ffmpeg, path);
    return Number.isFinite(duration) && duration > 0 ? duration : null;
  } catch (_) {
    await removeIfPresent(ffmpeg, path);
    return null;
  }
}
async function removeIfPresent(ffmpeg, path) {
  try { await ffmpeg.deleteFile(path); } catch (_) {}
}
function buildCommand(inputPath, seconds, mode, includeLast, videoDuration, extension, format) {
  const args = ["-i", inputPath, "-map", "0:v:0", "-map", "0:a?"];
  if (mode === "fast") args.push("-c", "copy");
  else args.push(
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p",
    "-sc_threshold", "0", "-force_key_frames", "expr:gte(t,n_forced*" + String(seconds) + ")",
    "-c:a", "aac", "-b:a", "192k"
  );
  if (!includeLast) {
    const fullLength = Math.floor(videoDuration / seconds) * seconds;
    if (fullLength <= 0) return null;
    args.push("-t", String(fullLength));
  }
  args.push("-f", "segment", "-segment_time", String(seconds), "-reset_timestamps", "1", "-segment_format", format);
  if (mode === "precise") args.push("-segment_format_options", "movflags=+faststart");
  args.push("part_%03d." + extension);
  return args;
}
function getOutputNames(entries, extension) {
  return entries.filter((entry) => !entry.isDir && /^part_\d+\./i.test(entry.name) && entry.name.toLowerCase().endsWith("." + extension))
    .map((entry) => entry.name)
    .sort((a, b) => Number((a.match(/part_(\d+)/i) || [])[1] || 0) - Number((b.match(/part_(\d+)/i) || [])[1] || 0));
}
function friendlyError(error) {
  const message = String(error && error.message ? error.message : error || "Unknown error");
  if (/memory|allocate|out of bounds|abort\(\)/i.test(message))
    return "The browser ran out of working memory. Try fewer or smaller source videos, or split them in separate batches.";
  if (/network|fetch|load|import|worker|wasm|failed to compile/i.test(message))
    return "The video engine could not load. Check your connection and reload the page, then try again.";
  if (/codec|decoder|invalid data|could not find codec|not supported/i.test(message))
    return "This source uses a codec the browser engine could not read. Try another source format or re-encode it before splitting.";
  return message.length > 260 ? message.slice(0, 257) + "…" : message;
}

function updateTaskProgress(index,total,fileName,label){
 state.currentTask=index;state.taskProgress=0;
 setProgress((index/Math.max(1,total))*94,"Split job "+(index+1)+" of "+total,fileName+" · "+label);
}

async function runBatch(){
 if(state.running||!state.files.length)return;
 let jobsByFile;
 try{jobsByFile=state.files.map(entry=>getSplitJobsForEntry(entry));if(state.workspaceMode==="advanced")for(let i=0;i<state.files.length;i++){const entry=state.files[i],settings=getPlanSettingsForEntry(entry);if(!Number.isFinite(entry.duration)||entry.duration<=0)continue;for(const job of jobsByFile[i])buildAdvancedPlan(entry.duration,job,settings);}}
 catch(error){els.advancedValidation.textContent=error.message;els.advancedValidation.scrollIntoView({behavior:"smooth",block:"nearest"});return;}
 state.running=true;state.cancelled=false;state.totalTasks=jobsByFile.reduce((sum,jobs)=>sum+jobs.length,0);
  state.currentTask = 0;
  state.taskProgress = 0;
  updateControls();
  els.cancelSplit.hidden = false;
  els.cancelSplit.disabled = false;
  els.cancelSplit.textContent = "Cancel";
  showProgress("Preparing your batch", "Initialising the browser video engine…");
  els.startSplit.disabled = true;

  const failures = [];
  let outputCount = 0, outputBytes = 0, completedTasks = 0;
  try {
    await loadEngine();
    const ffmpeg = state.ffmpeg;
    clearClipOutput();
    for (let fileIndex = 0; fileIndex < state.files.length; fileIndex += 1) {
      if (state.cancelled) throw new Error("Cancelled");
      const entry = state.files[fileIndex],splitJobs=jobsByFile[fileIndex],entrySettings=getPlanSettingsForEntry(entry);
      const extension = fileExtension(entry.file.name);
      const inputPath = "input_" + fileIndex + "." + extension;
      els.progressTitle.textContent = "Splitting your videos";
      els.progressMessage.textContent = "Reading " + entry.file.name;
      setProgress((completedTasks / state.totalTasks) * 94, "Preparing source", entry.file.name);

      try {
        let buffer = await entry.file.arrayBuffer();
        let inputData = new Uint8Array(buffer);
        await ffmpeg.writeFile(inputPath, inputData);
        // Drop the temporary references; FFmpeg owns its virtual-filesystem copy.
        inputData = null;
        buffer = null;
      } catch (error) {
        await removeIfPresent(ffmpeg,inputPath);failures.push(entry.file.name + ": could not load this source file (" + friendlyError(error) + ").");
        completedTasks += splitJobs.length;
        continue;
      }

      let duration = entry.duration;
      if (!Number.isFinite(duration) || duration <= 0) duration = await probeDuration(ffmpeg, inputPath);
      if (!Number.isFinite(duration) || duration <= 0) {
        failures.push(entry.file.name + ": the video duration could not be read.");
        await removeIfPresent(ffmpeg, inputPath);
        completedTasks += splitJobs.length;
        continue;
      }
      entry.duration = duration;
      const baseName = safeName(entry.file.name);
      const sourceFolder = String(fileIndex + 1).padStart(2, "0") + "_" + baseName;

      for(let jobIndex=0;jobIndex<splitJobs.length;jobIndex+=1){
        if(state.cancelled)throw new Error("Cancelled");
        const job=splitJobs[jobIndex];
        updateTaskProgress(completedTasks,state.totalTasks,entry.file.name,job.label);
        const output=state.mode==="precise"?{format:"mp4",extension:"mp4"}:fastContainer(entry.file.name);
        let command=null,expectedClipDurations=[];
        try{
          if(state.workspaceMode==="advanced"){
            const plan=buildAdvancedPlan(duration,job,entrySettings);
            if(plan){command=buildAdvancedCommand(inputPath,plan,state.mode,output.extension,output.format);const points=[0,...plan.splitTimes,plan.duration];expectedClipDurations=points.slice(1).map((point,index)=>point-points[index]);}
          }else{
            command=buildCommand(inputPath,job.seconds,state.mode,state.includeLast,duration,output.extension,output.format);
            const effective=state.includeLast?duration:Math.floor(duration/job.seconds)*job.seconds;
            for(let offset=0;offset<effective-0.000001;offset+=job.seconds)expectedClipDurations.push(Math.min(job.seconds,effective-offset));
          }
        }catch(error){failures.push(entry.file.name+" · "+job.label+": "+friendlyError(error));completedTasks+=1;continue;}
        if(!command){failures.push(entry.file.name+" · "+job.label+": no clips fit the selected range with the current final-clip setting.");completedTasks+=1;continue;}
        try{
          const exitCode=await ffmpeg.exec(command);
          if (exitCode !== 0) throw new Error("FFmpeg exited with code " + exitCode);
          const names = getOutputNames(await ffmpeg.listDir("/"), output.extension);
          if (!names.length) throw new Error("No output segments were produced.");
          for (let part = 0; part < names.length; part += 1) {
            if (state.cancelled) throw new Error("Cancelled");
            const outputName = names[part];
            let fileData = await ffmpeg.readFile(outputName);
            const segment = fileData instanceof Uint8Array ? fileData : new Uint8Array(fileData);
            const segmentSize=segment.byteLength;
            const filename=baseName+"_part_"+String(part+1).padStart(3,"0")+"."+output.extension;
            const archivePath=sourceFolder+"/"+job.folder+"/"+filename;
            const blob=new Blob([segment],{type:clipMime(output.extension)});
            segment.fill(0);fileData=null;
            state.clips.push({id:"c"+Date.now().toString(36)+Math.random().toString(36).slice(2,8),sourceName:entry.file.name,sourceFolder,jobLabel:job.label,name:filename,archivePath,extension:output.extension,blob,size:segmentSize,duration:expectedClipDurations[part]??null});
            outputCount += 1;
            outputBytes += segmentSize;
            await removeIfPresent(ffmpeg, outputName);
          }
        } catch (error) {
          if (state.cancelled) throw error;
          failures.push(entry.file.name + " · " + job.label + ": " + friendlyError(error));
          const leftovers = getOutputNames(await ffmpeg.listDir("/"), output.extension);
          for (const path of leftovers) await removeIfPresent(ffmpeg, path);
        }
        completedTasks += 1;
        setProgress((completedTasks / Math.max(1, state.totalTasks)) * 94,
          "Split job " + completedTasks + " of " + state.totalTasks,
          "Processed " + entry.file.name + " · " + job.label);
      }
      await removeIfPresent(ffmpeg, inputPath);
    }

    if (state.cancelled) throw new Error("Cancelled");
    if (outputCount === 0) throw new Error(failures.length ? failures.join(" ") : "No segments were produced.");
    els.progressTitle.textContent="Clip review ready";els.progressMessage.textContent="Inspect your clips before creating the ZIP archive.";
    setProgress(100,"Review","Ready · "+outputCount+" clips · "+formatBytes(outputBytes));
    els.resultsTitle.textContent=failures.length?"Review your clips. Some jobs were skipped.":"Review your clips.";
    els.resultsDetail.textContent="Preview, rename, download or remove individual clips before creating the ZIP.";
    els.resultStats.innerHTML='<span class="result-stat">'+outputCount+' clips</span><span class="result-stat">'+state.files.length+' source videos</span><span class="result-stat">'+formatBytes(outputBytes)+' video data</span><span class="result-stat">'+(state.mode==="fast"?"Original streams":"H.264 MP4")+'</span>'+(state.workspaceMode==="advanced"?'<span class="result-stat">Advanced split plan</span>':'');
    if(failures.length){els.failureList.hidden=false;els.failureList.innerHTML="<strong>"+failures.length+" skipped job"+(failures.length===1?"":"s")+"</strong><br>"+failures.slice(0,8).map(escapeHTML).join("<br>")+(failures.length>8?"<br>…and "+(failures.length-8)+" more.":"");}
    else{els.failureList.hidden=true;els.failureList.textContent="";}
    els.downloadZip.hidden=true;renderClipManager();els.progressPanel.hidden=true;els.resultsPanel.hidden=false;
    els.resultsPanel.scrollIntoView({behavior:"smooth",block:"nearest"});
  } catch (error) {
    if (state.cancelled || error.message === "Cancelled") {
      els.progressTitle.textContent = "Batch cancelled";
      els.progressMessage.textContent = "The active processing worker was stopped. No new segments will be generated.";
      setProgress(0, "Cancelled", "Processing stopped");
    } else {
      els.progressTitle.textContent = "The batch could not finish";
      els.progressMessage.textContent = friendlyError(error);
      setProgress(0, "Stopped", "Review the message above and try again.");
    }
    els.cancelSplit.hidden = true;
  } finally {
    state.running = false;
    updateControls();
    let settingsReady=true;try{state.files.forEach(entry=>getSplitJobsForEntry(entry));}catch(_){settingsReady=false;}
    els.startSplit.disabled=state.files.length===0||!settingsReady;
  }
}

function resetBatch() {
  if (state.running) return;
  state.files = [];state.perFilePlans={};state.globalPlanSettings=null;state.timelineFileId=null;
  clearClipOutput();
  state.profiles=[30];state.includeLast=true;state.advancedPlan="duration";state.perFilePlans={};state.globalPlanSettings=null;state.timelineFileId=null;
  els.advancedPlan.value="duration";els.rangeStart.value="00:00:00.000";els.rangeEnd.value="";
  els.equalParts.value="4";els.manualCuts.value="";els.includeLast.checked=true;
  setWorkspaceMode("normal");
  els.customMinutes.value = "0";
  els.customSeconds.value = "20";
  els.progressPanel.hidden = true;
  els.resultsPanel.hidden = true;
  els.failureList.hidden = true;
  updatePreview();
  renderQueue();
  renderProfiles();
  setMode("fast");
  window.scrollTo({ top: $("#workspace").offsetTop - 20, behavior: "smooth" });
}
function cancelBatch() {
  if (!state.running) return;
  state.cancelled = true;
  els.cancelSplit.disabled = true;
  els.cancelSplit.textContent = "Stopping…";
  if (state.ffmpeg) {
    state.ffmpeg.terminate();
    state.ffmpeg = null;
  }
}
els.browseFiles.addEventListener("click", (event) => { event.stopPropagation(); els.fileInput.click(); });
els.dropzone.addEventListener("click", (event) => { if (!event.target.closest("button")) els.fileInput.click(); });
els.dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); els.fileInput.click(); }
});
els.fileInput.addEventListener("change", (event) => { addFiles(event.target.files); event.target.value = ""; });
els.dropzone.addEventListener("dragover", (event) => { event.preventDefault(); els.dropzone.classList.add("dragover"); });
els.dropzone.addEventListener("dragleave", () => els.dropzone.classList.remove("dragover"));
els.dropzone.addEventListener("drop", (event) => {
  event.preventDefault(); els.dropzone.classList.remove("dragover"); addFiles(event.dataTransfer.files);
});
els.fileList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-file]");
  if (!button || state.running) return;
  state.files = state.files.filter((entry) => entry.id !== button.dataset.removeFile);delete state.perFilePlans[button.dataset.removeFile];
  if(state.timelineFileId===button.dataset.removeFile)state.timelineFileId=state.files[0]?.id||null;
  if(state.workspaceMode==="advanced"&&state.timelineFileId)loadPlanSettingsForEntry(state.files.find(entry=>entry.id===state.timelineFileId));
  renderQueue(); updatePreview();
});
els.clearFiles.addEventListener("click", () => {
  if (state.running) return;
  state.files = [];state.perFilePlans={};state.timelineFileId=null;renderQueue(); updatePreview();
});
els.durationPresets.addEventListener("click", (event) => {
  const button = event.target.closest("[data-seconds]");
  if (!button || state.running) return;
  const value = Number(button.dataset.seconds);
  state.profiles = state.profiles.includes(value) ? state.profiles.filter((item) => item !== value) : state.profiles.concat(value);
  persistActivePlanSettings();renderProfiles();
});
els.selectedProfiles.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-duration]");
  if (!button || state.running) return;
  const value = Number(button.dataset.removeDuration);
  state.profiles = state.profiles.filter((item) => item !== value);
  persistActivePlanSettings();renderProfiles();
});
els.addDuration.addEventListener("click", () => {
  if (state.running) return;
  const minutes = Number(els.customMinutes.value), seconds = Number(els.customSeconds.value);
  if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    els.customMinutes.setCustomValidity("Enter minutes and seconds between 0 and 59.");
    els.customMinutes.reportValidity(); return;
  }
  els.customMinutes.setCustomValidity("");
  const total = minutes * 60 + seconds;
  if (total < 1 || total > 3599) {
    els.customSeconds.setCustomValidity("Choose a duration between 1 second and 59 minutes 59 seconds.");
    els.customSeconds.reportValidity(); return;
  }
  els.customSeconds.setCustomValidity("");
  if (!state.profiles.includes(total)) state.profiles.push(total);
  persistActivePlanSettings();renderProfiles();
});
document.querySelectorAll(".mode-option").forEach((button) => button.addEventListener("click", () => {
  if (!state.running) setMode(button.dataset.mode);
}));
els.includeLast.addEventListener("change", () => { state.includeLast = els.includeLast.checked;persistActivePlanSettings(); updateEstimate();renderAdvancedTimeline(); });
els.startSplit.addEventListener("click", runBatch);
els.cancelSplit.addEventListener("click", cancelBatch);
els.newBatch.addEventListener("click",resetBatch);
els.createZip.addEventListener("click",createZip);
els.clipList.addEventListener("click",event=>{const b=event.target.closest("[data-action]");if(!b||state.running||state.packaging)return;const id=b.dataset.id,action=b.dataset.action;if(action==="preview")previewClip(id);else if(action==="download")downloadClip(id);else if(action==="remove")removeClip(id);else if(action==="rename"){const input=els.clipList.querySelector("[data-rename=\""+CSS.escape(id)+"\"]");if(input)renameClip(id,input.value);}});
els.closeClipPreview.addEventListener("click",()=>els.previewDialog.close());
els.previewDialog.addEventListener("close",()=>{els.previewClip.pause();els.previewClip.removeAttribute("src");els.previewClip.load();if(state.previewClipUrl)URL.revokeObjectURL(state.previewClipUrl);state.previewClipUrl=null;});
document.querySelectorAll("[data-workspace-mode]").forEach(button=>button.addEventListener("click",()=>{if(!state.running)setWorkspaceMode(button.dataset.workspaceMode);}));
els.advancedPlan.addEventListener("change",()=>{state.advancedPlan=els.advancedPlan.value;persistActivePlanSettings();renderAdvancedOptions();});

els.timelineSource.addEventListener("change",()=>{persistActivePlanSettings();state.timelineFileId=els.timelineSource.value;loadPlanSettingsForEntry(state.files.find(file=>file.id===state.timelineFileId));renderAdvancedOptions();});
els.perVideoMode.addEventListener("change",()=>{const entry=state.files.find(file=>file.id===state.timelineFileId);if(!entry)return;if(els.perVideoMode.value==="custom"){if(!state.globalPlanSettings)state.globalPlanSettings=readPlanSettings();state.perFilePlans[entry.id]=clonePlanSettings(state.globalPlanSettings);}else delete state.perFilePlans[entry.id];loadPlanSettingsForEntry(entry);renderAdvancedOptions();});
let timelinePointer=null;
els.timelineTrack.addEventListener("pointerdown",event=>{
 const target=event.target.closest("[data-range-handle],[data-cut-index]");if(!target||state.running)return;
 const entry=selectedTimelineEntry();if(!entry||!Number.isFinite(entry.duration)||entry.duration<=0)return;
 const type=target.dataset.rangeHandle!==undefined?"range":"cut";if(type==="cut"&&state.advancedPlan!=="manual")return;
 timelinePointer={pointerId:event.pointerId,target,type,edge:target.dataset.rangeHandle||"",index:Number(target.dataset.cutIndex),duration:entry.duration};
 try{target.setPointerCapture(event.pointerId);}catch(_){}event.preventDefault();
});
window.addEventListener("pointermove",event=>{
 if(!timelinePointer||event.pointerId!==timelinePointer.pointerId)return;
 const active=timelinePointer;setTimelineControlTime(active.type,active.edge,active.index,active.duration,timelineTimeFromPointer(event,active.duration));
 updateTimelineDuringDrag(active.duration,active.target);
});
function finishTimelinePointer(event){if(!timelinePointer||event.pointerId!==timelinePointer.pointerId)return;timelinePointer=null;renderAdvancedOptions();}
window.addEventListener("pointerup",finishTimelinePointer);window.addEventListener("pointercancel",finishTimelinePointer);
els.timelineTrack.addEventListener("keydown",event=>{
 const target=event.target.closest("[data-range-handle],[data-cut-index]");if(!target||!["ArrowLeft","ArrowRight"].includes(event.key)||state.running)return;
 const entry=selectedTimelineEntry();if(!entry||!Number.isFinite(entry.duration)||entry.duration<=0)return;
 const type=target.dataset.rangeHandle!==undefined?"range":"cut",index=Number(target.dataset.cutIndex);
 const time=type==="range"?(target.dataset.rangeHandle==="start"?(parseTimecode(els.rangeStart.value||"0")??0):(els.rangeEnd.value.trim()?parseTimecode(els.rangeEnd.value):entry.duration))
  :(els.manualCuts.value.split(/\r?\n/).map(line=>parseTimecode(line.trim())).filter(Number.isFinite)[index]);
 if(!Number.isFinite(time))return;event.preventDefault();
 setTimelineControlTime(type,target.dataset.rangeHandle||"",index,entry.duration,time+(event.key==="ArrowRight"?1:-1)*(event.shiftKey?1:0.1));renderAdvancedOptions();
});

[els.rangeStart,els.rangeEnd,els.equalParts,els.manualCuts].forEach(control=>{
 control.addEventListener("input",()=>{if(state.workspaceMode==="advanced"){persistActivePlanSettings();renderAdvancedOptions();}});
 control.addEventListener("change",()=>{if(state.workspaceMode==="advanced"){persistActivePlanSettings();renderAdvancedOptions();}});
});

renderProfiles();
renderQueue();
setWorkspaceMode("normal");
setMode("fast");
els.cancelSplit.hidden = true;

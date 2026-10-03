const invoke = window.__TAURI__?.core?.invoke;
const $ = id => document.getElementById(id);
const state = {running:false,enabled:true,monitoring:true};

function call(name,args={}) {
  if (!invoke) throw new Error("This is the native desktop build. Open the compiled Spiral Mic application.");
  return invoke(name,args);
}

const controls = {
  rate: ["Hz", 2], depth:["ms",1], delay:["ms",1], fb:["%",0], mix:["%",0], reverb:["%",0], out:["dB",1]
};
function renderLabels(){
  $("rateV").textContent = Number($("rate").value).toFixed(2)+" Hz";
  $("depthV").textContent = Number($("depth").value).toFixed(1)+" ms";
  $("delayV").textContent = Number($("delay").value).toFixed(1)+" ms";
  $("fbV").textContent = Math.round(Number($("fb").value)*100)+"%";
  $("mixV").textContent = Math.round(Number($("mix").value)*100)+"%";
  $("reverbV").textContent = Math.round(Number($("reverb").value)*100)+"%";
  $("outV").textContent = Number($("out").value).toFixed(1)+" dB";
}
async function pushParams(){
  try{
    await call("set_audio_params",{
      rateHz:Number($("rate").value),
      depthMs:Number($("depth").value),
      delayMs:Number($("delay").value),
      feedback:Number($("fb").value),
      mix:Number($("mix").value),
      reverb:Number($("reverb").value),
      outputDb:Number($("out").value),
      enabled:state.enabled,
      monitoring:state.monitoring
    });
  }catch(e){ $("readout").textContent=String(e); }
}
async function refreshDevices(){
  try{
    const devices=await call("list_audio_devices");
    $("input").innerHTML=devices.inputs.map(d=>'<option value="'+esc(d.name)+'">'+esc(d.name)+'</option>').join("");
    $("output").innerHTML=devices.outputs.map(d=>'<option value="'+esc(d.name)+'">'+esc(d.name)+'</option>').join("");
    if(!devices.inputs.length) $("input").innerHTML='<option>No input devices</option>';
    if(!devices.outputs.length) $("output").innerHTML='<option>No output devices</option>';
  }catch(e){ $("readout").textContent=String(e); }
}
async function toggleEngine(){
  if(!state.running){
    try{
      const result=await call("start_audio",{input:$("input").value||"",output:$("output").value||""});
      state.running=true;
      $("engineState").textContent="NATIVE ENGINE ONLINE";
      $("power").textContent="STOP ENGINE";
      $("readout").textContent=result.sampleRate+" Hz · "+result.input+" → "+result.output;
      await pushParams();
    }catch(e){ $("readout").textContent=String(e); }
  }else{
    await call("stop_audio");
    state.running=false;
    $("engineState").textContent="NATIVE ENGINE OFFLINE";
    $("power").textContent="START ENGINE";
    $("readout").textContent="Stopped";
  }
}
function esc(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function poll(){
  try{
    const s=await call("audio_status");
    if(s.running){
      state.running=true;
      $("engineState").textContent="NATIVE ENGINE ONLINE";
      $("power").textContent="STOP ENGINE";
      $("inMeter").style.width=Math.min(100,s.inputPeak*100)+"%";
      $("outMeter").style.width=Math.min(100,s.outputPeak*100)+"%";
    }else{
      $("inMeter").style.width="0%";
      $("outMeter").style.width="0%";
    }
  }catch(_){}
}
["rate","depth","delay","fb","mix","reverb","out"].forEach(id=>$(id).addEventListener("input",()=>{renderLabels();pushParams();}));
$("power").addEventListener("click",toggleEngine);
$("refresh").addEventListener("click",refreshDevices);
$("bypass").addEventListener("click",async()=>{state.enabled=!state.enabled;$("bypass").textContent=state.enabled?"BYPASS EFFECT":"ENABLE EFFECT";await pushParams();});
$("monitor").addEventListener("click",async()=>{state.monitoring=!state.monitoring;$("monitor").textContent=state.monitoring?"MUTE MONITORING":"ENABLE MONITORING";await pushParams();});
renderLabels();
refreshDevices();
setInterval(poll,80);

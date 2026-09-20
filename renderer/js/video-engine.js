(function(){
'use strict';
function concat(parts){
  var total=0;for(var i=0;i<parts.length;i++)total+=parts[i].byteLength;
  var out=new Uint8Array(total),off=0;
  for(var j=0;j<parts.length;j++){out.set(parts[j],off);off+=parts[j].byteLength;}
  return out;
}
function bytes(){return new Uint8Array(Array.prototype.slice.call(arguments))}
function u32(n){return bytes((n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255)}
function u64(n){
  var x=BigInt(Math.max(0,Math.floor(n))),a=new Uint8Array(8);
  for(var i=7;i>=0;i--){a[i]=Number(x&255n);x>>=8n;}return a;
}
function text(s){return new TextEncoder().encode(String(s))}
function id(hex){
  var h=hex.replace(/^0x/,'');if(h.length%2)h='0'+h;var a=new Uint8Array(h.length/2);
  for(var i=0;i<a.length;i++)a[i]=parseInt(h.slice(i*2,i*2+2),16);return a;
}
function size(n){
  if(n===null)return bytes(1,255,255,255,255,255,255,255);
  var x=BigInt(Math.max(0,Math.floor(n)));
  for(var len=1;len<=8;len++){
    var max=(1n<<BigInt(7*len))-1n;
    if(x<=max){
      var out=new Uint8Array(len);
      for(var i=len-1;i>=0;i--){out[i]=Number(x&255n);x>>=8n;}
      out[0]|=1<<(8-len);return out;
    }
  }
  throw new Error('EBML size too large');
}
function element(hex,payload){
  var p=payload===null?new Uint8Array(0):(payload instanceof Uint8Array?payload:concat(payload));
  return concat([id(hex),size(payload===null?null:p.byteLength===0&&payload===null?null:p.byteLength),p]);
}
function master(hex,parts){return element(hex,concat(parts))}
function simpleBlock(track,timecode,key,data){
  var tc=timecode<0?timecode+65536:timecode;
  return element('A3',concat([bytes(track&127|128,(tc>>8)&255,tc&255,key?128:0),data]));
}
function WebMMuxer(width,height,fps,codec){
  this.width=width;this.height=height;this.fps=fps;this.codec=codec;
  this.parts=[];this.current=null;this.clusterParts=[];this.started=false;this.frameCount=0;
}
WebMMuxer.prototype.init=function(){
  var ebml=master('1A45DFA3',[
    element('4286',bytes(1)),element('42F7',bytes(1)),element('42F2',bytes(4)),
    element('42F3',bytes(8)),element('4282',text('webm')),element('4287',bytes(2)),element('4285',bytes(2))
  ]);
  var codecId=this.codec.indexOf('av01')===0?'V_AV1':this.codec.indexOf('vp09')===0?'V_VP9':'V_VP8';
  var info=master('1549A966',[element('2AD7B1',u32(1000000)),element('4D80',text('Tamasrazim Renderer')),element('5741',text('Tamasrazim'))]);
  var tracks=master('1654AE6B',[master('AE',[
    element('D7',bytes(1)),element('73C5',u64(1)),element('83',bytes(1)),element('86',text(codecId)),
    master('E0',[element('B0',u32(this.width)),element('BA',u32(this.height)),element('54B0',u32(this.width)),element('54BA',u32(this.height))])
  ])]);
  this.parts.push(ebml,element('18538067',null),info,tracks);this.started=true;
};
WebMMuxer.prototype.begin=function(ms){this.flush();this.current=Math.max(0,Math.round(ms));this.clusterParts=[element('E7',u32(this.current))]};
WebMMuxer.prototype.add=function(ms,key,data){
  if(!this.started)this.init();
  if(this.current===null||ms-this.current>5000)this.begin(ms);
  var rel=Math.round(ms-this.current);
  if(rel>32767){this.begin(ms);rel=0;}
  this.clusterParts.push(simpleBlock(1,rel,key,data));this.frameCount++;
};
WebMMuxer.prototype.flush=function(){if(this.clusterParts.length)this.parts.push(master('1F43B675',this.clusterParts));this.clusterParts=[]};
WebMMuxer.prototype.finalize=function(){this.flush();return new Blob(this.parts,{type:'video/webm'})};

function waitForQueue(enc,max){
  if(enc.encodeQueueSize<=max)return Promise.resolve();
  return new Promise(function(resolve){
    var done=false;
    function finish(){if(done)return;done=true;enc.removeEventListener('dequeue',check);resolve()}
    function check(){if(enc.encodeQueueSize<=max)finish()}
    enc.addEventListener('dequeue',check);check();setTimeout(finish,2500);
  });
}
var CODECS=[
  {id:'vp9',label:'VP9',codec:'vp09.00.10.08'},
  {id:'vp8',label:'VP8',codec:'vp8'},
  {id:'av1',label:'AV1',codec:'av01.0.04M.08'}
];
async function probe(config){
  if(typeof VideoEncoder==='undefined'||typeof VideoFrame==='undefined')return [];
  var found=[];
  for(var i=0;i<CODECS.length;i++){
    var c=CODECS[i];
    try{
      var r=await VideoEncoder.isConfigSupported({
        codec:c.codec,width:config.width,height:config.height,bitrate:config.bitrate||16000000,
        framerate:config.fps,latencyMode:'quality',
        hardwareAcceleration:config.hardwareAcceleration==='auto'?undefined:config.hardwareAcceleration
      });
      if(r&&r.supported)found.push({id:c.id,label:c.label,codec:c.codec,container:'WebM',mode:'webcodecs'});
    }catch(e){}
  }
  return found;
}
async function render(o){
  if(typeof VideoEncoder==='undefined'||typeof VideoFrame==='undefined')throw new Error('WebCodecs is unavailable in this browser.');
  var total=Math.max(1,Math.round(o.duration*o.fps)),loop=o.loopMode==='loop',loopDuration=Math.max(.001,Number(o.loopDuration)||o.duration);
  var mux=new WebMMuxer(o.width,o.height,o.fps,o.codec),error=null,start=performance.now();
  var enc=new VideoEncoder({
    output:function(chunk){
      try{var data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);mux.add((chunk.timestamp||0)/1000,chunk.type==='key',data)}
      catch(e){error=e}
    },
    error:function(e){error=e instanceof Error?e:new Error(String(e&&e.message||e))}
  });
  var cfg={codec:o.codec,width:o.width,height:o.height,displayWidth:o.width,displayHeight:o.height,
    bitrate:Math.max(100000,Number(o.bitrate)||16000000),framerate:o.fps,latencyMode:'quality'};
  if(o.hardwareAcceleration&&o.hardwareAcceleration!=='auto')cfg.hardwareAcceleration=o.hardwareAcceleration;
  var support=await VideoEncoder.isConfigSupported(cfg);
  if(!support.supported)throw new Error('Selected encoder configuration is not supported.');
  enc.configure(cfg);
  try{
    var keyEvery=Math.max(1,Math.round(o.fps*Math.max(.5,Number(o.keyframeSeconds)||2)));
    for(var i=0;i<total;i++){
      if(error)throw error;
      var outputTime=i/o.fps,animTime=loop?(outputTime%loopDuration):outputTime,animFrame=Math.floor(animTime*o.fps);
      await o.renderFrame(animTime,animFrame,o.fps);
      await waitForQueue(enc,8);
      var vf=new VideoFrame(o.canvas,{timestamp:Math.round(i*1000000/o.fps),duration:Math.max(1,Math.round(1000000/o.fps))});
      enc.encode(vf,{keyFrame:i===0||i%keyEvery===0});vf.close();
      if((i&3)===0){
        var elapsed=(performance.now()-start)/1000,pct=i/Math.max(1,total-1);
        o.onProgress&&o.onProgress({frame:i+1,total:total,percent:pct*100,renderRate:(i+1)/Math.max(.001,elapsed),
          renderSeconds:elapsed,encodeQueue:enc.encodeQueueSize,droppedFrames:0});
        await new Promise(function(r){setTimeout(r,0)});
      }
    }
    await enc.flush();if(error)throw error;
    return {blob:mux.finalize(),mime:'video/webm',extension:'webm',frames:mux.frameCount,droppedFrames:0,deterministic:true};
  }finally{try{enc.close()}catch(e){}}
}
window.TamasrazimVideoEngine={probe:probe,render:render};
})();
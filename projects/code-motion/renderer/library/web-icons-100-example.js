/* TRILYVA — 100 WEB ICONS | 16:9 showcase example */
import { WEB_ICON_PACK_150 } from "./web-icons-150-data.js";

let cache = null;

function makeCode(icons){
  const dataset = JSON.stringify(icons.map(function(it){ return {t:it.title,d:it.d}; }));
  return [
    "function renderFrame(time, frame, fps, ctx, width, height, motion){",
    "  var loopFrames=Math.max(1,Math.round(fps*12));",
    "  var p=((frame%loopFrames)+loopFrames)%loopFrames/loopFrames;",
    "  var phase=p*Math.PI*2;",
    "  ctx.clearRect(0,0,width,height);",
    "  ctx.fillStyle='#050608';ctx.fillRect(0,0,width,height);",
    "  var icons="+dataset+";",
    "  var cols=10,rows=10,cellW=width/cols,cellH=height/rows;",
    "  for(var i=0;i<icons.length;i++){",
    "    var col=i%cols,row=Math.floor(i/cols);",
    "    var cx=cellW*(col+.5),cy=cellH*(row+.5);",
    "    var wave=Math.sin(phase+i*.19);",
    "    var scale=(Math.min(cellW,cellH)*.46/24)*(1+wave*.025);",
    "    ctx.save();",
    "    ctx.translate(cx,cy);ctx.scale(scale,scale);",
    "    ctx.globalAlpha=.72+wave*.10;",
    "    ctx.strokeStyle='#ffffff';ctx.lineWidth=1.35/scale;ctx.lineCap='round';ctx.lineJoin='round';",
    "    ctx.stroke(new Path2D(icons[i].d));",
    "    ctx.restore();",
    "    ctx.globalAlpha=.34+Math.max(0,wave)*.08;",
    "    ctx.fillStyle='#ffffff';ctx.font=Math.max(8,Math.min(13,cellH*.095))+'px system-ui,sans-serif';",
    "    ctx.textAlign='center';ctx.textBaseline='top';",
    "    ctx.fillText(icons[i].t,cx,cy+cellH*.34);",
    "  }",
    "  ctx.globalAlpha=1;",
    "}"
  ].join("\n");
}

export default {
  id:"web-icons-100-example",
  title:"100 WEB ICONS — 16:9",
  description:"100 original web UI vectors arranged as a seamless 10×10 showcase on a 16:9 canvas.",
  async load(){
    if(cache) return cache;
    var icons=WEB_ICON_PACK_150.filter(function(it){return it&&it.d&&it.title;}).slice(0,100);
    cache=[{
      id:"web-icons-showcase-100",
      title:"100 Web Icons — 16:9 Showcase",
      category:"web icon showcase",
      description:"100 original web UI icons in a clean 10×10 composition designed for a 16:9 canvas.",
      duration:12,loop:true,loopDuration:12,fps:60,
      code:makeCode(icons)
    }];
    return cache;
  }
};

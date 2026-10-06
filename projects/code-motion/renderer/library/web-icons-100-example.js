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
    "  ctx.fillStyle='#03040a';ctx.fillRect(0,0,width,height);",
    "  var icons="+dataset+";",
    "  var cols=10,rows=10,cellW=width/cols,cellH=height/rows;",
    "  var spectrum=['#ff3b81','#ff8a2a','#ffd84a','#8cff55','#36f1c9','#39b9ff','#6f5cff','#d45cff'];",
    "  for(var i=0;i<icons.length;i++){",
    "    var col=i%cols,row=Math.floor(i/cols);",
    "    var cx=cellW*(col+.5),cy=cellH*(row+.5);",
    "    var wave=Math.sin(phase+i*.19),pulse=.5+.5*Math.sin(phase*1.5+i*.31);",
    "    var scale=(Math.min(cellW,cellH)*.46/24)*(1+wave*.025);",
    "    var tone=(i*.073+p*.12)%1;",
    "    var rgb=(tone*360+phase*8)%360;",
    "    ctx.save();",
    "    ctx.translate(cx,cy);ctx.scale(scale,scale);",
    "    ctx.globalCompositeOperation='screen';",
    "    ctx.lineCap='round';ctx.lineJoin='round';",
    "    var ghost=new Path2D(icons[i].d);",
    "    ctx.lineWidth=2.6/scale;",
    "    ctx.globalAlpha=.16+.08*pulse;ctx.strokeStyle='hsl('+(rgb-34)+',100%,60%)';ctx.translate(-.45,.2);ctx.stroke(ghost);",
    "    ctx.globalAlpha=.16+.08*pulse;ctx.strokeStyle='hsl('+(rgb+34)+',100%,62%)';ctx.translate(.9,-.4);ctx.stroke(ghost);",
    "    ctx.translate(-.45,.2);",
    "    var g=ctx.createLinearGradient(-12,-12,12,12);",
    "    g.addColorStop(0,'hsl('+(rgb+55)+',100%,66%)');",
    "    g.addColorStop(.22,'hsl('+(rgb+5)+',100%,68%)');",
    "    g.addColorStop(.48,'hsl('+(rgb+105)+',100%,72%)');",
    "    g.addColorStop(.7,'hsl('+(rgb+185)+',100%,68%)');",
    "    g.addColorStop(1,'hsl('+(rgb+265)+',100%,66%)');",
    "    ctx.globalAlpha=.88+.08*pulse;ctx.strokeStyle=g;ctx.lineWidth=1.25/scale;ctx.stroke(ghost);",
    "    ctx.restore();",
    "    ctx.globalAlpha=.55+.15*pulse;",
    "    ctx.fillStyle='hsl('+(rgb+100)+',90%,86%)';ctx.font=Math.max(8,Math.min(13,cellH*.095))+'px system-ui,sans-serif';
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
  description:"100 original web UI vectors in a full-color prism spectral style, arranged as a seamless 10×10 showcase on a 16:9 canvas.",
  async load(){
    if(cache) return cache;
    var icons=WEB_ICON_PACK_150.filter(function(it){return it&&it.d&&it.title;}).slice(0,100);
    cache=[{
      id:"web-icons-showcase-100",
      title:"100 Web Icons — 16:9 Showcase",
      category:"web icon showcase",
      description:"100 original web UI icons with animated spectral prism gradients and chromatic edge layers in a 16:9 composition.",
      duration:12,loop:true,loopDuration:12,fps:60,
      code:makeCode(icons)
    }];
    return cache;
  }
};

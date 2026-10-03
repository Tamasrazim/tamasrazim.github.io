/* TRILYVA — WEB ICONS | 150 original vectors */
import { WEB_ICON_PACK_150 } from "./web-icons-150-data.js";
function iconCode(d){
  const src=JSON.stringify(d);
  return [
    "function renderFrame(time, frame, fps, ctx, width, height, motion){",
    "ctx.clearRect(0,0,width,height);ctx.save();",
    "ctx.translate(width/2,height/2);ctx.scale(Math.min(width,height)/24,Math.min(width,height)/24);",
    "ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';",
    "ctx.stroke(new Path2D("+src+"));ctx.restore();",
    "}"
  ].join("\n");
}
export default {
  id:"web-icons",title:"WEB ICONS",
  description:"150 original precision-outline web and UI vector icons.",
  async load(){return WEB_ICON_PACK_150.map(it=>({id:"web-"+it.slug,title:it.title,category:"web icon / "+it.category,code:iconCode(it.d)}));}
};

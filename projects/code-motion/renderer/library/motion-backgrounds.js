/* TRILYVA — MOTION BACKGROUNDS | 100 procedural 12-second seamless loops */

function source(family, v){
  var speed=v[0], count=v[1], scale=v[2], hue=v[3], alpha=v[4], phase=v[5], alt=v[6];
  var s=["function renderFrame(time, frame, fps, ctx, width, height){",
    "var p=motion.loopProgress,a=p*TAU*"+speed+",s=Math.min(width,height);",
    "ctx.fillStyle=\"#040406\";ctx.fillRect(0,0,width,height);",
    "ctx.globalCompositeOperation=\"screen\";",
    familyCode(family),
    "ctx.globalCompositeOperation=\"source-over\";","];
  return s.join("\\n");
}

function familyCode(name){
  if(name==="AURORA") return "for(var k=0;k<"+count+";k++){var q=k/"+count+",y0=(q-.5)*s*.85;ctx.beginPath();for(var i=0;i<=64;i++){var x=i/64*width;var y=height*.5+y0+Math.sin(i/64*TAU*"+(2+alt)+"+a+q*phase)*s*scale+Math.sin(i/64*TAU*"+(4+alt%4)+"-a*1.31+q)*s*.025;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=\"hsla("+hue+",72%,\"+(58+(k%5)*6)+\"%,\"+(alpha*(1-q*.42))+\" )\";ctx.lineWidth="+(1.2+scale*8)+ ";ctx.stroke();}";
  if(name==="RINGS") return "for(var k=0;k<"+count+";k++){var q=k/"+count+",r=s*(.035+q*scale),rot=a*(1+q*.22)+q*TAU+phase*.01;ctx.beginPath();ctx.ellipse(width*.5,height*.5,r,r*(.48+q*.36),rot,0,TAU);ctx.strokeStyle=\"hsla("+hue+",80%,\"+(58+q*24)+\"%,\"+(alpha*(1-q*.45))+\" )\";ctx.lineWidth="+(1+scale*3)+ ";ctx.stroke();}";
  if(name==="FLOW") return "for(var k=0;k<"+count+";k++){var q=k/"+count+",y0=(k+.5)/"+count+"*height;ctx.beginPath();for(var i=0;i<=72;i++){var x=i/72*width;var y=y0+Math.sin(i/72*TAU*"+(2+alt)+"+a+k*.23)*s*scale+Math.sin(i/72*TAU*"+(5+alt%3)+"-a*1.23)*s*.02;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=\"hsla("+hue+",68%,\"+(55+(k%4)*7)+\"%,\"+alpha+"\)\";ctx.lineWidth="+(0.7+scale*12)+ ";ctx.stroke();}";
  if(name==="BLOBS") return "ctx.filter=\"blur("+Math.max(2,Math.round(scale*90))+"px)\";for(var k=0;k<"+count+";k++){var q=k/"+count+",ang=a*(.55+q*.2)+k*2.399963,rad=s*(.18+q*.28),x=width*.5+Math.cos(ang+phase*.01)*rad,y=height*.5+Math.sin(ang*1.17)*rad*.62,rr=s*(.035+q*.018);var g=ctx.createRadialGradient(x,y,0,x,y,rr);g.addColorStop(0,\"hsla("+hue+",80%,82%,\"+(alpha*.95)+\" )\");g.addColorStop(1,\"hsla("+(hue+30)+",75%,40%,0)\");ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,rr,0,TAU);ctx.fill();}ctx.filter=\"none\";";
  if(name==="GRID") return "for(var r=0;r<"+count+";r++){var yy=r/("+(count-1)+")*height;ctx.beginPath();for(var i=0;i<=48;i++){var x=i/48*width,y=yy+Math.sin(i/48*TAU*"+(2+alt)+"+a+r*.21)*s*scale;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=\"hsla("+hue+",62%,\"+(56+(r%5)*6)+\"%,\"+alpha*.8+"\)\";ctx.lineWidth=.7;ctx.stroke();}";
  if(name==="STARS") return "for(var i=0;i<"+count+";i++){var q=i/"+count+",z=(i*.61803398875)%1,ang=i*2.399963+a*(.2+q*.3)+phase*.01,r=s*(.03+z*scale),x=width*.5+Math.cos(ang)*r,y=height*.5+Math.sin(ang)*r*.62,tw=.35+.65*(.5+.5*Math.sin(a*"+(1.5+alt*.07)+"+i*1.71)),rr="+Math.max(.6,scale*18)+"*(.35+z)*tw;ctx.fillStyle=\"hsla("+hue+",45%,\"+(72+z*20)+\"%,\"+(.04+tw*alpha)+"\)\";ctx.beginPath();ctx.arc(x,y,rr,0,TAU);ctx.fill();}";
  if(name==="GEOMETRY") return "for(var k=0;k<"+count+";k++){var q=k/"+count+",r=s*(.08+q*scale*.9),rot=a*(1+q*.6)+q*TAU*.5+phase*.01;ctx.save();ctx.translate(width*.5,height*.5);ctx.rotate(rot);ctx.beginPath();var n="+(5+alt%6)+ ";for(var i=0;i<=n;i++){var ang=i/n*TAU,rr=r*(i%2?.4:1),x=Math.cos(ang)*rr,y=Math.sin(ang)*rr;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.strokeStyle=\"hsla("+hue+",76%,\"+(58+q*22)+\"%,\"+(alpha*(1-q*.48))+"\)\";ctx.lineWidth=1.1;ctx.stroke();ctx.restore();}";
  if(name==="TUNNEL") return "for(var k=0;k<"+count+";k++){var q=k/"+count+",z=(q+p)%1,r=s*(.028+z*scale),rot=a*(.18+q*.4)+phase*.01;ctx.beginPath();ctx.ellipse(width*.5,height*.5,r,r*.58,rot,0,TAU);ctx.strokeStyle=\"hsla("+hue+",70%,\"+(56+z*25)+\"%,\"+(alpha*(1-z*.35))+"\)\";ctx.lineWidth=.8+(1-z)*1.8;ctx.stroke();}for(var j=0;j<18;j++){var ang=j/18*TAU+a*.17;ctx.beginPath();ctx.moveTo(width*.5+Math.cos(ang)*s*.03,height*.5+Math.sin(ang)*s*.03*.58);ctx.lineTo(width*.5+Math.cos(ang)*s*.58,height*.5+Math.sin(ang)*s*.58*.58);ctx.strokeStyle=\"hsla("+(hue+24)+",52%,70%,\"+(alpha*.35)+"\)\";ctx.lineWidth=.7;ctx.stroke();}";
  return "for(var i=0;i<"+count+";i++){var q=i/"+count+",ang=i*.53+a*(1.1+q),rad=s*(.025+q*scale),x=width*.5+Math.cos(ang)*rad,y=height*.5+Math.sin(ang)*rad*.67,tail=s*.018*(1-q);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(ang)*tail,y-Math.sin(ang)*tail);ctx.strokeStyle=\"hsla("+hue+",66%,\"+(58+q*20)+\"%,\"+(alpha*(1-q*.3))+"\)\";ctx.lineWidth=.7+(1-q)*1.5;ctx.stroke();}";
}

function item(id,title,name,v){
  return {id:id,title:title,category:"motion background",description:"Procedural seamless 12 second motion background.",duration:12,loop:true,loopDuration:12,fps:60,code:source(name,v)};
}

var families=[
  ["AURORA",[.45,.72,.9,1.08,1.22,.61,.83,.97,1.18,1.37]],
  ["RINGS",[.42,.58,.77,.96,1.13,.53,.71,.9,1.16,1.34]],
  ["FLOW",[.48,.66,.84,1.02,1.21,.57,.76,.95,1.17,1.39]],
  ["BLOBS",[.44,.6,.79,.98,1.17,.51,.73,.92,1.14,1.36]],
  ["GRID",[.43,.61,.79,.98,1.16,.54,.72,.91,1.12,1.35]],
  ["STARS",[.46,.63,.81,.99,1.18,.56,.74,.93,1.15,1.38]],
  ["GEOMETRY",[.41,.6,.78,.97,1.19,.52,.73,.94,1.14,1.33]],
  ["TUNNEL",[.45,.64,.82,1.01,1.2,.55,.75,.96,1.17,1.4]],
  ["VORTEX",[.47,.65,.83,1.03,1.24,.59,.77,.98,1.2,1.42]],
  ["AURORA",[.52,.69,.88,1.06,1.28,.63,.81,1.0,1.22,1.45]]
];

var items=[],n=1;
families.forEach(function(f,fi){
  f[1].forEach(function(sp,vi){
    var count=fi===0?7+vi%4:fi===1?12+vi%8:fi===2?16+vi%9:fi===3?6+vi%5:fi===4?18+vi%10:fi===5?90+vi*9:fi===6?7+vi%7:fi===7?16+vi%10:75+vi*11;
    var scale=fi===0?.07+vi*.008:fi===1?.42+vi*.018:fi===2?.05+vi*.004:fi===3?.42+vi*.018:fi===4?.025+vi*.002:fi===5?.72+vi*.018:fi===6?.34+vi*.015:fi===7?.54+vi*.02:.55+vi*.012;
    var hue=(180+fi*31+vi*17)%360,alpha=.11+vi*.006,phase=13+fi*7+vi*5,alt=fi+vi+1;
    var family=fi===0?"AURORA":fi===1?"RINGS":fi===2?"FLOW":fi===3?"BLOBS":fi===4?"GRID":fi===5?"STARS":fi===6?"GEOMETRY":fi===7?"TUNNEL":"VORTEX";
    if(fi===9) family="AURORA";
    items.push(item("motion-bg-"+String(n).padStart(3,"0"),family+" "+String(vi+1).padStart(2,"0")+" · "+String(fi+1).padStart(2,"0"),family,[sp,count,scale,hue,alpha,phase,alt]));
    n++;
  });
});

export default {id:"motion-backgrounds",title:"MOTION BACKGROUNDS",description:"100 distinct procedural seamless 12-second motion backgrounds.",async load(){return items.slice();}};
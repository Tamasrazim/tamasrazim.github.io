/* TRILYVA — MOTION BACKGROUNDS | 100 distinct procedural 12-second loops */

function makeCode(kind,v){
  var speed=v[0],count=v[1],scale=v[2],hue=v[3],alpha=v[4],phase=v[5],alt=v[6];
  var head=[
    "function renderFrame(time, frame, fps, ctx, width, height){",
    "var p=motion.loopProgress,a=p*TAU*"+speed+",s=Math.min(width,height);",
    "ctx.fillStyle=\"#040406\";ctx.fillRect(0,0,width,height);",
    "ctx.globalCompositeOperation=\"screen\";"
  ];
  var body="";
  if(kind==="AURORA"){
    body="for(var k=0;k<"+count+";k++){var q=k/"+count+",y0=(q-.5)*s*.82;ctx.beginPath();for(var i=0;i<=64;i++){var x=i/64*width,y=height*.5+y0+Math.sin(i/64*TAU*"+(2+alt)+"+a+q*phase)*s*scale+Math.sin(i/64*TAU*"+(4+alt%4)+"-a*1.27)*s*.025;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=\"hsla("+hue+",72%,\"+(58+(k%5)*6)+\"%,\"+(alpha*(1-q*.42))+\" )\";ctx.lineWidth="+(1+scale*9)+";ctx.stroke();}";
  }else if(kind==="RINGS"){
    body="for(var k=0;k<"+count+";k++){var q=k/"+count+",r=s*(.035+q*scale),rot=a*(1+q*.24)+q*TAU+phase*.008;ctx.beginPath();ctx.ellipse(width*.5,height*.5,r,r*(.48+q*.34),rot,0,TAU);ctx.strokeStyle=\"hsla("+hue+",80%,\"+(58+q*24)+\"%,\"+(alpha*(1-q*.45))+\" )\";ctx.lineWidth="+(1+scale*2.8)+";ctx.stroke();}";
  }else if(kind==="FLOW"){
    body="for(var k=0;k<"+count+";k++){var q=k/"+count+",y0=(k+.5)/"+count+"*height;ctx.beginPath();for(var i=0;i<=72;i++){var x=i/72*width,y=y0+Math.sin(i/72*TAU*"+(2+alt)+"+a+k*.23)*s*scale+Math.sin(i/72*TAU*"+(5+alt%3)+"-a*1.23)*s*.022;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=\"hsla("+hue+",68%,\"+(55+(k%4)*7)+\"%,\"+alpha+"\" );ctx.lineWidth="+(0.7+scale*12)+";ctx.stroke();}";
  }else if(kind==="BLOBS"){
    body="ctx.filter=\"blur("+Math.max(2,Math.round(scale*90))+"px)\";for(var k=0;k<"+count+";k++){var q=k/"+count+",ang=a*(.55+q*.2)+k*2.399963,rad=s*(.18+q*.28),x=width*.5+Math.cos(ang+phase*.01)*rad,y=height*.5+Math.sin(ang*1.17)*rad*.62,rr=s*(.035+q*.018);var g=ctx.createRadialGradient(x,y,0,x,y,rr);g.addColorStop(0,\"hsla("+hue+",80%,82%,\"+(alpha*.95)+" )\");g.addColorStop(1,\"hsla("+(hue+30)+",75%,40%,0)\");ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,rr,0,TAU);ctx.fill();}ctx.filter=\"none\";";
  }else if(kind==="GRID"){
    body="for(var r=0;r<"+count+";r++){var yy=r/("+(count-1)+")*height;ctx.beginPath();for(var i=0;i<=48;i++){var x=i/48*width,y=yy+Math.sin(i/48*TAU*"+(2+alt)+"+a+r*.21)*s*scale;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=\"hsla("+hue+",62%,\"+(56+(r%5)*6)+\"%,\"+(alpha*.8)+"\)";ctx.lineWidth=.7;ctx.stroke();}";
  }else if(kind==="STARS"){
    body="for(var i=0;i<"+count+";i++){var q=i/"+count+",z=(i*.61803398875)%1,ang=i*2.399963+a*(.2+q*.3)+phase*.01,r=s*(.03+z*scale),x=width*.5+Math.cos(ang)*r,y=height*.5+Math.sin(ang)*r*.62,tw=.35+.65*(.5+.5*Math.sin(a*"+(1.5+alt*.07)+"+i*1.71)),rr="+Math.max(.6,scale*18)+"*(.35+z)*tw;ctx.fillStyle=\"hsla("+hue+",45%,\"+(72+z*20)+\"%,\"+(.04+tw*alpha)+"\)";ctx.beginPath();ctx.arc(x,y,rr,0,TAU);ctx.fill();}";
  }else if(kind==="GEOMETRY"){
    body="for(var k=0;k<"+count+";k++){var q=k/"+count+",r=s*(.08+q*scale*.9),rot=a*(1+q*.6)+q*TAU*.5+phase*.01;ctx.save();ctx.translate(width*.5,height*.5);ctx.rotate(rot);ctx.beginPath();var n="+(5+alt%6)+";for(var i=0;i<=n;i++){var ang=i/n*TAU,rr=r*(i%2?.4:1),x=Math.cos(ang)*rr,y=Math.sin(ang)*rr;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.strokeStyle=\"hsla("+hue+",76%,\"+(58+q*22)+\"%,\"+(alpha*(1-q*.48))+"\)";ctx.lineWidth=1.1;ctx.stroke();ctx.restore();}";
  }else if(kind==="TUNNEL"){
    body="for(var k=0;k<"+count+";k++){var q=k/"+count+",z=(q+p)%1,r=s*(.028+z*scale),rot=a*(.18+q*.4)+phase*.01;ctx.beginPath();ctx.ellipse(width*.5,height*.5,r,r*.58,rot,0,TAU);ctx.strokeStyle=\"hsla("+hue+",70%,\"+(56+z*25)+\"%,\"+(alpha*(1-z*.35))+"\)";ctx.lineWidth=.8+(1-z)*1.8;ctx.stroke();}for(var j=0;j<18;j++){var ang=j/18*TAU+a*.17;ctx.beginPath();ctx.moveTo(width*.5+Math.cos(ang)*s*.03,height*.5+Math.sin(ang)*s*.03*.58);ctx.lineTo(width*.5+Math.cos(ang)*s*.58,height*.5+Math.sin(ang)*s*.58*.58);ctx.strokeStyle=\"hsla("+(hue+24)+",52%,70%,\"+(alpha*.35)+"\)";ctx.lineWidth=.7;ctx.stroke();}";
  }else if(kind==="VORTEX"){
    body="for(var i=0;i<"+count+";i++){var q=i/"+count+",ang=i*.53+a*(1.1+q),rad=s*(.025+q*scale),x=width*.5+Math.cos(ang)*rad,y=height*.5+Math.sin(ang)*rad*.67,tail=s*.018*(1-q);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(ang)*tail,y-Math.sin(ang)*tail);ctx.strokeStyle=\"hsla("+hue+",66%,\"+(58+q*20)+\"%,\"+(alpha*(1-q*.3))+"\)";ctx.lineWidth=.7+(1-q)*1.5;ctx.stroke();}";
  }else{
    body="for(var i=0;i<"+count+";i++){var q=i/"+count+",ang=i*2.399963+a*(.35+q*.8)+phase*.01,r=s*(.05+q*scale),x=width*.5+Math.cos(ang)*r,y=height*.5+Math.sin(ang)*r*.65;ctx.beginPath();ctx.arc(x,y,1.2+2.8*q,0,TAU);ctx.fillStyle=\"hsla("+hue+",62%,75%,\"+(alpha*(.5+q))+"\)";ctx.fill();}";
  }
  return head.concat([body,"ctx.globalCompositeOperation=\"source-over\";","}"]).join("\n");
}

var kinds=["AURORA","RINGS","FLOW","BLOBS","GRID","STARS","GEOMETRY","TUNNEL","VORTEX","SWARM"];
var names=["Aurora Ribbons","Orbital Rings","Flow Lines","Liquid Blobs","Wire Waves","Drifting Constellations","Geometric Bloom","Infinite Tunnel","Vortex Trails","Luminous Swarm"];
var items=[];
for(var g=0;g<10;g++){
  for(var i=0;i<10;i++){
    var id=g*10+i+1, speed=0.42+i*.105+g*.006, count=(g===5?95+i*9:g===8?75+i*10:7+(i*3+g)%24);
    var scale=g===0?.07+i*.009:g===1?.42+i*.018:g===2?.05+i*.004:g===3?.42+i*.018:g===4?.025+i*.002:g===5?.72+i*.018:g===6?.34+i*.015:g===7?.54+i*.02:g===8?.55+i*.012:.08+i*.004;
    var hue=(178+g*29+i*17)%360, alpha=.09+i*.006, phase=11+g*5+i*3, alt=g+i+1;
    items.push({
      id:"motion-bg-"+String(id).padStart(3,"0"),
      title:names[g]+" "+String(i+1).padStart(2,"0"),
      category:"motion background",
      description:"Procedural seamless 12-second motion background.",
      duration:12,loop:true,loopDuration:12,fps:60,
      code:makeCode(kinds[g],[speed,count,scale,hue,alpha,phase,alt])
    });
  }
}

export default {
  id:"motion-backgrounds",
  title:"MOTION BACKGROUNDS",
  description:"100 distinct procedural seamless 12-second motion backgrounds.",
  async load(){return items.slice();}
};
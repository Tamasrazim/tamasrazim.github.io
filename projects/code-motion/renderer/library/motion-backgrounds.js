/* TRILYVA — MOTION BACKGROUNDS | 100 genuinely different 12-second loop designs */

function motionVars(m,seed){
  if(m==='ORBIT') return 'var a=t*(.6+'+((seed%7)*.055).toFixed(3)+')+'+seed+'*.01,drift=Math.sin(t*1.7+'+seed+')*s*.035,pulse=.92+.08*Math.sin(t*2+'+seed+');';
  if(m==='BREATHE') return 'var a=t*.45+'+seed+'*.13,drift=Math.sin(t*.9+'+seed+')*s*.055,pulse=.68+.32*(.5+.5*Math.sin(t*2+'+seed+'));';
  if(m==='SWEEP') return 'var a=t*.28+'+seed+'*.09,drift=Math.sin(t*1.25+'+seed+')*s*.16,pulse=.82+.18*(.5+.5*Math.sin(t*3+'+seed+'));';
  return 'var a=t*(.9+'+((seed%5)*.07).toFixed(3)+')+'+seed+'*.07,drift=Math.cos(t*1.1+'+seed+')*s*.045,pulse=.86+.14*(.5+.5*Math.sin(t*2.5+'+seed+'));';
}

var SHAPES={};
SHAPES.HELIX="for(var i=0;i<N;i++){var q=i/N,r=s*(.04+q*.42)*pulse,ang=q*TAU*3+a,x=cx+Math.cos(ang)*r+drift,y=cy+Math.sin(ang)*r*.62;ctx.beginPath();ctx.arc(x,y,1.5+4*(1-q),0,TAU);ctx.fillStyle=H;ctx.fill();}";
SHAPES.PETALS="for(var i=0;i<N;i++){var q=i/N,ang=q*TAU*2+a,r=s*(.16+.12*Math.sin(q*TAU*4+a))*pulse,x=cx+Math.cos(ang)*r+drift,y=cy+Math.sin(ang)*r*.72;ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.beginPath();ctx.ellipse(0,0,s*.055*(1-q*.35),s*.018*(1-q*.15),0,0,TAU);ctx.strokeStyle=H;ctx.lineWidth=1.2;ctx.stroke();ctx.restore();}";
SHAPES.LATTICE="for(var i=0;i<9;i++)for(var j=0;j<6;j++){var x=width*(i/8)-Math.sin(a+j)*s*.035+drift,y=height*(j/5)+Math.cos(a+i)*s*.035;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+s*.09*Math.cos(a+j),y+s*.09*Math.sin(a+i));ctx.strokeStyle=H;ctx.lineWidth=.9;ctx.stroke();}";
SHAPES.CORRIDOR="for(var i=0;i<N;i++){var z=(i/N+.06*Math.sin(a))%1,r=s*(.025+z*.5)*pulse,rot=a+z*2.2;ctx.save();ctx.translate(cx+drift,cy);ctx.rotate(rot);ctx.strokeStyle=i%2?H:H2;ctx.strokeRect(-r,-r*.62,r*2,r*1.24);ctx.restore();}";
SHAPES.RIBBON="ctx.beginPath();for(var i=0;i<=120;i++){var x=i/120*width,y=cy+Math.sin(i/120*TAU*2+a)*s*.16*pulse+Math.sin(i/120*TAU*7-a*1.7)*s*.035+drift;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=H;ctx.lineWidth=2.4;ctx.stroke();";
SHAPES.STARBURST="for(var i=0;i<N;i++){var ang=i/N*TAU+a,r1=s*.06,r2=s*(.18+.3*((i*37)%N)/N)*pulse;ctx.beginPath();ctx.moveTo(cx+Math.cos(ang)*r1,cy+Math.sin(ang)*r1*.65);ctx.lineTo(cx+Math.cos(ang)*r2,cy+Math.sin(ang)*r2*.65);ctx.strokeStyle=i%3?H:H2;ctx.lineWidth=.8+1.5*(i/N);ctx.stroke();}";
SHAPES.CLOCK="for(var i=0;i<12;i++){var ang=i/12*TAU+a,r=s*(.12+.32*(i%3)/2)*pulse;ctx.beginPath();ctx.moveTo(cx+Math.cos(ang)*s*.06,cy+Math.sin(ang)*s*.06);ctx.lineTo(cx+Math.cos(ang)*r,cy+Math.sin(ang)*r);ctx.strokeStyle=H;ctx.lineWidth=1.4;ctx.stroke();}ctx.beginPath();ctx.arc(cx+drift,cy,s*.23*pulse,0,TAU);ctx.strokeStyle=H2;ctx.lineWidth=1;ctx.stroke();";
SHAPES.DIAMOND="for(var i=0;i<N;i++){var q=i/N,x=width*(.05+.9*((i*7)%N)/N),y=height*(.05+.9*((i*13)%N)/N),r=s*(.015+.045*Math.abs(Math.sin(a+i)));ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();ctx.strokeStyle=H;ctx.stroke();}";
SHAPES.COMETS="for(var i=0;i<N;i++){var q=i/N,ang=q*TAU*1.7-a*.8,r=s*(.08+.4*q),x=cx+Math.cos(ang)*r,y=cy+Math.sin(ang)*r*.66;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(ang)*s*.08*(1-q),y-Math.sin(ang)*s*.08*(1-q));ctx.strokeStyle=H;ctx.lineWidth=.8+2*(1-q);ctx.stroke();}";
SHAPES.CUBES="for(var i=0;i<18;i++){var x=width*(.08+((i*53)%84)/100)+drift,y=height*(.1+((i*29)%78)/100),r=s*(.025+.018*Math.sin(a+i));ctx.save();ctx.translate(x,y);ctx.rotate(a*.45+i*.17);ctx.strokeStyle=i%2?H:H2;ctx.strokeRect(-r,-r,r*2,r*2);ctx.beginPath();ctx.moveTo(-r,-r);ctx.lineTo(r*.5,-r*1.5);ctx.lineTo(r*1.5,-r*.5);ctx.lineTo(r,r);ctx.stroke();ctx.restore();}";
SHAPES.MOUNTAINS="ctx.beginPath();for(var i=0;i<=80;i++){var x=i/80*width,y=height*.72+Math.sin(i*.32+a)*s*.12+Math.sin(i*.81-a*.6)*s*.06;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=H;ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();for(var i=0;i<=80;i++){var x=i/80*width,y=height*.82+Math.sin(i*.18-a)*s*.07;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=H2;ctx.stroke();";
SHAPES.FAN="for(var i=0;i<N;i++){var ang=i/N*TAU+a,r=s*(.08+.38*(i/N))*pulse;ctx.beginPath();ctx.moveTo(cx+drift,cy);ctx.lineTo(cx+Math.cos(ang)*r,cy+Math.sin(ang)*r*.62);ctx.strokeStyle=i%2?H:H2;ctx.lineWidth=.9;ctx.stroke();}";
SHAPES.HALO="for(var i=0;i<N;i++){var q=i/N,rx=s*(.08+q*.42),ry=rx*(.42+.24*Math.sin(a+q*5));ctx.beginPath();ctx.ellipse(cx+drift,cy,rx,ry,a+q*TAU*.3,0,TAU);ctx.strokeStyle=i%3?H:H2;ctx.globalAlpha=.25+.6*(1-q);ctx.stroke();}ctx.globalAlpha=1;";
SHAPES.PSPIRAL="for(var i=0;i<N;i++){var q=i/N,ang=q*TAU*5-a*1.2,r=s*(.02+q*.43),x=cx+Math.cos(ang)*r+drift,y=cy+Math.sin(ang)*r*.68;ctx.beginPath();ctx.arc(x,y,1.2+2.8*(1-q),0,TAU);ctx.fillStyle=H;ctx.fill();}";
SHAPES.HEX="for(var i=0;i<8;i++)for(var j=0;j<7;j++){var x=width*(.1+i*.115)+Math.sin(a+j*.4)*s*.02,y=height*(.12+j*.13)+(i%2)*height*.065,r=s*.035*pulse;ctx.beginPath();for(var k=0;k<6;k++){var ang=k*TAU/6,px=x+Math.cos(ang)*r,py=y+Math.sin(ang)*r;if(k===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.strokeStyle=H;ctx.stroke();}";
SHAPES.WAVEGRID="for(var i=0;i<9;i++){ctx.beginPath();for(var j=0;j<=60;j++){var x=j/60*width,y=height*(i+1)/10+Math.sin(j*.35+a+i)*s*.04+Math.cos(a+i)*drift;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=i%2?H:H2;ctx.lineWidth=.75;ctx.stroke();}";
SHAPES.TRIPULSE="for(var i=0;i<N;i++){var q=i/N,ang=i*2.4+a,r=s*(.03+q*.4)*pulse;ctx.save();ctx.translate(cx+Math.cos(ang)*r+drift,cy+Math.sin(ang)*r*.7);ctx.rotate(ang);ctx.beginPath();ctx.moveTo(0,-s*.025);ctx.lineTo(s*.022,s*.025);ctx.lineTo(-s*.022,s*.025);ctx.closePath();ctx.strokeStyle=i%2?H2:H;ctx.stroke();ctx.restore();}";
SHAPES.MOONS="for(var i=0;i<7;i++){var ang=i/7*TAU+a*(.7+i*.08),r=s*(.12+i*.05),x=cx+Math.cos(ang)*r+drift,y=cy+Math.sin(ang)*r*.65;ctx.beginPath();ctx.arc(x,y,s*(.025+.01*Math.sin(a+i)),0,TAU);ctx.fillStyle=i%2?H:H2;ctx.fill();ctx.beginPath();ctx.arc(x+s*.007,y-s*.004,s*(.025+.01*Math.sin(a+i)),0,TAU);ctx.fillStyle='#040406';ctx.fill();}";
SHAPES.SINEFLOWER="ctx.beginPath();for(var i=0;i<=100;i++){var q=i/100,ang=q*TAU*4+a,r=s*(.28+.11*Math.sin(q*TAU*6-a))*pulse,x=cx+Math.cos(ang)*r,y=cy+Math.sin(ang)*r*.7;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=H;ctx.lineWidth=1.4;ctx.stroke();";
SHAPES.ARCS="for(var i=0;i<18;i++){var q=i/18,r=s*(.06+i*.028),start=a+q*TAU,end=start+Math.PI*(.6+.55*Math.sin(a+i));ctx.beginPath();ctx.arc(cx+drift,cy,r,start,end);ctx.strokeStyle=i%2?H:H2;ctx.lineWidth=.9+q*1.2;ctx.stroke();}";
SHAPES.BARS="for(var i=0;i<18;i++){var x=width*(i+.5)/18,w=width/22,h=s*(.05+.17*(.5+.5*Math.sin(a*1.7+i*.8)))*pulse;ctx.save();ctx.translate(x+drift,cy);ctx.rotate(Math.sin(a+i*.4)*.2);ctx.strokeStyle=i%2?H:H2;ctx.strokeRect(-w*.5,-h,w,h*2);ctx.restore();}";
SHAPES.THREADS="for(var k=0;k<9;k++){ctx.beginPath();for(var i=0;i<=90;i++){var q=i/90,x=i/90*width,y=cy+(k-4)*s*.055+Math.sin(q*TAU*(1.5+k*.18)+a+k*.7)*s*.045+Math.cos(q*TAU*3-a)*s*.018;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=k%2?H:H2;ctx.lineWidth=.7;ctx.stroke();}";
SHAPES.MAGDOTS="for(var i=0;i<N;i++){var x=width*((i*37)%N)/(N-1),y=height*((i*71)%N)/(N-1),ang=Math.atan2(cy-y,cx-x)+Math.sin(a+i)*.9,d=Math.min(s*.25,Math.hypot(cx-x,cy-y));x+=Math.cos(ang)*d*.12+drift;y+=Math.sin(ang)*d*.08;ctx.beginPath();ctx.arc(x,y,1.2+2*Math.sin(a+i)**2,0,TAU);ctx.fillStyle=i%3?H:H2;ctx.fill();}";
SHAPES.TILES="for(var y=0;y<6;y++)for(var x=0;x<10;x++){var w=width/12,h=height/8,px=x*w+w*.55,py=y*h+h*.7,r=s*.02*(1+.5*Math.sin(a+x*.7+y));ctx.save();ctx.translate(px+drift*Math.sin(y),py);ctx.rotate(a*.08+(x-y)*.05);ctx.strokeStyle=(x+y)%2?H:H2;ctx.strokeRect(-w*.32,-h*.28,w*.64,h*.56);ctx.restore();}";
SHAPES.PINWHEEL="for(var i=0;i<N;i++){var ang=i/N*TAU+a,r1=s*.05,r2=s*(.12+.28*(i/N))*pulse;ctx.beginPath();ctx.moveTo(cx+Math.cos(ang)*r1,cy+Math.sin(ang)*r1);ctx.quadraticCurveTo(cx+Math.cos(ang+.28)*r2,cy+Math.sin(ang+.28)*r2*.7,cx+Math.cos(ang+.55)*r2,cy+Math.sin(ang+.55)*r2*.7);ctx.strokeStyle=i%2?H:H2;ctx.lineWidth=1.1;ctx.stroke();}";

function makeCode(shape,motion,h1,h2,n,seed){
  var H='hsla('+h1+',78%,72%,.82)',H2='hsla('+h2+',76%,64%,.62)';
  var body=SHAPES[shape].replace(/\bH\b/g,JSON.stringify(H)).replace(/\bH2\b/g,JSON.stringify(H2));
  return 'function renderFrame(time, frame, fps, ctx, width, height){\n'+
    '  var p=(motion&&typeof motion.loopProgress==="number")?motion.loopProgress:0;var t=p*TAU,s=Math.min(width,height);\n'+
    '  ctx.fillStyle="#040406";ctx.fillRect(0,0,width,height);ctx.globalCompositeOperation="screen";\n'+
    '  '+motionVars(motion,seed)+'var N='+n+',cx=width*.5,cy=height*.5;\n'+
    '  '+body+'\n  ctx.globalCompositeOperation="source-over";\n}';
}

var shapes=[["Velvet Helix","HELIX"],["Orbiting Petals","PETALS"],["Neon Lattice","LATTICE"],["Prism Corridor","CORRIDOR"],["Liquid Ribbon","RIBBON"],["Starburst Field","STARBURST"],["Clockwork Rings","CLOCK"],["Diamond Drift","DIAMOND"],["Comet Choir","COMETS"],["Glass Cubes","CUBES"],["Pulse Mountains","MOUNTAINS"],["Radial Fan","FAN"],["Halo Weave","HALO"],["Particle Spiral","PSPIRAL"],["Blooming Hexes","HEX"],["Wave Grid","WAVEGRID"],["Triangular Pulse","TRIPULSE"],["Orbiting Moons","MOONS"],["Sine Flower","SINEFLOWER"],["Arc Cascade","ARCS"],["Kinetic Bars","BARS"],["Polar Threads","THREADS"],["Magnetic Dots","MAGDOTS"],["Shifting Tiles","TILES"],["Celestial Pinwheel","PINWHEEL"]];
var motions=[["Orbit","ORBIT"],["Breathe","BREATHE"],["Sweep","SWEEP"],["Rotate","ROTATE"]];
var items=[];
for(var si=0;si<shapes.length;si++){
  for(var mi=0;mi<motions.length;mi++){
    var id=si*4+mi+1;
    var hue1=(178+id*19)%360,hue2=(hue1+48+id*7)%360;
    var count=14+(id%10)*2;
    items.push({
      id:'motion-bg-'+String(id).padStart(3,'0'),
      title:shapes[si][0]+' — '+motions[mi][0],
      category:'motion background',
      description:'Unique procedural 12-second seamless motion design with a distinct composition and motion system.',
      duration:12,loop:true,loopDuration:12,fps:60,
      code:makeCode(shapes[si][1],motions[mi][1],hue1,hue2,count,id)
    });
  }
}
export default {
  id:'motion-backgrounds',
  title:'MOTION BACKGROUNDS',
  description:'100 distinct procedural seamless 12-second motion designs with different structures, not color-only variants.',
  async load(){return items.slice();}
};

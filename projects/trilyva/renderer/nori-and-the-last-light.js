// What this does: Builds the Nori and the Last Light story sequence, coordinating the scenes and their animation timing.

// NORI AND THE LAST LIGHT — full 5-minute short, 16:9
// Pure procedural vector animation. No images, fonts, network or runtime dependencies.
// TRILYVA frame contract: renderFrame(time, frame, fps, ctx, width, height).

const STORY_DURATION = 300;
const STORY_CUES = [
[1,"NARRATOR","At the edge of the blue sea, there was a village that trusted one little lighthouse."],
[9,"NARRATOR","Every evening, Nori the fox climbed the tower to make sure its light could be seen for miles."],
[18,"NORI","There you go, old friend. One bright light to bring everyone home."],
[28,"NARRATOR","Nori was small and the lighthouse was old, but together they made the night less frightening."],
[39,"NORI","Another perfect evening. Now, let us keep that light shining."],
[52,"NARRATOR","Then the wind changed. Clouds covered the moon, and thunder rolled over the sea."],
[60,"NORI","That cloud is moving awfully fast. Something does not feel right."],
[70,"NARRATOR","Rain struck the tower. A flash lit the horizon, and the lighthouse suddenly went dark."],
[80,"CAPTAIN","The beacon is gone! Keep the little lamp high and stay together!"],
[89,"BUNNY","I cannot see the shore. Captain, how will we find the harbor?"],
[98,"NARRATOR","Far beyond the rocks, the little boat lost its way. The captain searched the black water for a familiar golden beam."],
[108,"NORI","I can see their tiny lamp. I have to get the lighthouse working again."],
[117,"NARRATOR","Nori packed his lantern, an empty glass jar, and a warm scarf, then hurried into the rain."],
[126,"NORI","Easy, Nori. One step, then another. We can do this."],
[135,"NARRATOR","The pier shook under every wave. The wind tugged at his scarf, and the lantern trembled in his paw."],
[144,"NORI","I am frightened too, little light. But we cannot turn back."],
[152,"NARRATOR","Under the trees, tiny lights trembled among the reeds. They were fireflies, hiding from the storm."],
[161,"NORI","I will not trap you. I need your help. Someone out there is waiting to get home."],
[170,"NARRATOR","One firefly drifted closer. Then another. Soon the air glowed like a field of little stars."],
[180,"NARRATOR","The path crossed a broken bridge above a deep ravine. Nori took a breath and stepped onto the first plank."],
[188,"NORI","Stay with me, little lights. We will cross together."],
[197,"NARRATOR","On the other side, a sea cave opened beneath the cliff. At its center stood an ancient mirror, cold and silent."],
[207,"NORI","Maybe you can catch the lightning. Maybe you can show the lighthouse where to shine."],
[216,"NARRATOR","The fireflies circled the mirror. Their reflections multiplied until the cave glittered with a thousand golden points."],
[226,"NORI","You do not have to be big to make a difference. You only have to shine together."],
[235,"NARRATOR","One by one, the fireflies formed a golden spiral. The old mirror gathered their glow and sent it back as a warm beam."],
[246,"NORI","Come on, old friend. Remember your light."],
[255,"NARRATOR","Gold swept across the waves. The lighthouse lens began to turn, and the captain saw the harbor again."],
[264,"CAPTAIN","There! Follow that golden beam! Land is just ahead!"],
[272,"BUNNY","I can see the village! I can see the lights in the windows!"],
[282,"NARRATOR","The boat slipped into calm water. The storm moved away, and the first pale color of dawn touched the clouds."],
[292,"NORI","You made it. I knew we could do it, together."],
[297,"NARRATOR","From that night on, no light ever stood alone."]
];

function nllClamp(v,a,b){return Math.max(a,Math.min(b,v));}
function nllMix(a,b,p){return a+(b-a)*nllClamp(p,0,1);}
function nllEase(a,b,t){const p=nllClamp((t-a)/(b-a),0,1);return p*p*(3-2*p);}
function nllHash(n){const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);}
function nllRound(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function nllGrad(ctx,y0,y1,stops){const g=ctx.createLinearGradient(0,y0,0,y1);stops.forEach(s=>g.addColorStop(s[0],s[1]));return g;}
function nllLine(ctx,x1,y1,x2,y2,color,w){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}

function nllSky(ctx,t,storm,dawn){
  const g=ctx.createLinearGradient(0,0,0,670);
  g.addColorStop(0,"rgb("+Math.round(nllMix(5,89,dawn))+","+Math.round(nllMix(13,78,dawn))+","+Math.round(nllMix(34,126,dawn))+")");
  g.addColorStop(.58,"rgb("+Math.round(nllMix(10,233,dawn))+","+Math.round(nllMix(43,161,dawn))+","+Math.round(nllMix(75,143,dawn))+")");
  g.addColorStop(1,"rgb("+Math.round(nllMix(21,255,dawn))+","+Math.round(nllMix(71,202,dawn))+","+Math.round(nllMix(105,177,dawn))+")");
  ctx.fillStyle=g;ctx.fillRect(0,0,1920,1080);
  if(dawn<.95){
    const a=(1-storm)*(1-dawn);ctx.save();ctx.globalAlpha=.84*a;ctx.fillStyle="#e1e9f7";ctx.beginPath();ctx.arc(1470,144,41,0,Math.PI*2);ctx.fill();ctx.fillStyle="#14213b";ctx.beginPath();ctx.arc(1489,130,39,0,Math.PI*2);ctx.fill();ctx.restore();
    for(let i=0;i<72;i++){ctx.globalAlpha=(.2+nllHash(i+37)*.58)*a;ctx.fillStyle="#e5edff";ctx.beginPath();ctx.arc(nllHash(i+8)*1920,nllHash(i+93)*470,.7+nllHash(i+193)*1.8,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  }
  for(let i=0;i<12;i++){
    const x=((nllHash(i+7)*2200+t*(storm?25:5))%2220)-140,y=72+nllHash(i+40)*350,s=105+nllHash(i+80)*145,shade=storm?nllMix(36,16,nllHash(i+12)):nllMix(39,92,dawn);
    ctx.fillStyle="rgba("+Math.round(shade*.65)+","+Math.round(shade*.82)+","+Math.round(shade*1.25)+","+(storm?.4:.16)+")";
    ctx.beginPath();ctx.ellipse(x,y,s,26+s*.16,0,0,Math.PI*2);ctx.ellipse(x+s*.48,y-17,s*.47,s*.28,0,0,Math.PI*2);ctx.ellipse(x-s*.42,y-10,s*.43,s*.22,0,0,Math.PI*2);ctx.fill();
  }
  const glow=ctx.createRadialGradient(1370,500,10,1370,500,650);glow.addColorStop(0,"rgba(255,197,105,"+(.18+storm*.2+dawn*.5)+")");glow.addColorStop(1,"rgba(255,197,105,0)");ctx.fillStyle=glow;ctx.fillRect(700,0,1220,800);
}
function nllSea(ctx,t,storm,dawn){
  ctx.fillStyle=nllGrad(ctx,510,1080,[[0,"#163e5d"],[.34,storm?"#071729":"#0c304f"],[1,"#030813"]]);ctx.fillRect(0,510,1920,570);
  for(let b=0;b<24;b++){const y=545+b*22,d=b/23,amp=(3+d*13)*(1+storm),speed=t*(.8+d*2.7)*(storm?1.7:1);ctx.beginPath();for(let i=0;i<=48;i++){const x=i/48*1920,yy=y+Math.sin(x*.013+speed+b*.78)*amp+Math.sin(x*.026-speed*.65)*amp*.33;i?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}ctx.strokeStyle="rgba("+Math.round(45+70*dawn)+","+Math.round(109+59*dawn)+","+Math.round(153+45*dawn)+","+( .11+d*.13+storm*.08)+")";ctx.lineWidth=.8+d*1.5;ctx.stroke();}
  if(storm>.08){ctx.fillStyle="rgba(2,6,17,"+(.06+storm*.16)+")";ctx.fillRect(0,510,1920,570);for(let i=0;i<90;i++){const x=nllHash(i+400)*1920,y=((nllHash(i+700)*640+t*(225+nllHash(i+40)*230))%675)+370;nllLine(ctx,x,y,x-9,y+25,"rgba(171,201,229,"+(.08+storm*.2)+")",.8);}}
}
function nllLand(ctx){
  ctx.fillStyle=nllGrad(ctx,400,810,[[0,"#13263a"],[1,"#091526"]]);ctx.beginPath();ctx.moveTo(0,660);ctx.lineTo(0,510);ctx.bezierCurveTo(190,365,318,440,475,510);ctx.bezierCurveTo(640,385,800,410,970,545);ctx.bezierCurveTo(1150,400,1300,420,1430,515);ctx.bezierCurveTo(1590,385,1785,440,1920,500);ctx.lineTo(1920,810);ctx.closePath();ctx.fill();
  ctx.fillStyle="#06101c";ctx.beginPath();ctx.moveTo(0,755);ctx.bezierCurveTo(280,645,430,700,620,760);ctx.bezierCurveTo(880,660,1080,688,1290,747);ctx.bezierCurveTo(1540,650,1770,690,1920,744);ctx.lineTo(1920,900);ctx.lineTo(0,900);ctx.closePath();ctx.fill();
}
function nllHouse(ctx,x,y,w,h,lit,t){
  ctx.save();ctx.translate(x,y);ctx.fillStyle="#111c2a";ctx.fillRect(0,0,w,h);ctx.fillStyle="#243349";ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(w*.5,-h*.46);ctx.lineTo(w+10,0);ctx.closePath();ctx.fill();ctx.fillStyle="#080f1a";ctx.fillRect(w*.42,h*.48,w*.18,h*.52);
  for(let r=0;r<2;r++)for(let c=0;c<2;c++){const on=lit&&nllHash(x+c*11+r*23)>(t<70?.13:.32);ctx.fillStyle=on?"#ffd99a":"#243348";ctx.globalAlpha=on?.96:.75;ctx.fillRect(w*(.13+c*.47),h*(.17+r*.36),w*.18,h*.19);}ctx.globalAlpha=1;ctx.restore();
}
function nllLighthouse(ctx,t,on,storm){
  const x=1475,base=760,top=228;ctx.save();ctx.fillStyle="#17283d";ctx.beginPath();ctx.moveTo(x-78,base);ctx.lineTo(x-48,top+14);ctx.lineTo(x+43,top+14);ctx.lineTo(x+79,base);ctx.closePath();ctx.fill();
  ctx.fillStyle="rgba(196,208,217,.28)";ctx.beginPath();ctx.moveTo(x-44,top+28);ctx.lineTo(x-5,top+28);ctx.lineTo(x-8,base-18);ctx.lineTo(x-58,base-18);ctx.closePath();ctx.fill();
  ctx.fillStyle="#050a12";ctx.fillRect(x-65,base-95,130,95);ctx.fillStyle="#ebc982";ctx.fillRect(x-45,base-63,21,40);ctx.fillRect(x+20,base-63,21,40);
  ctx.fillStyle="#0a101a";ctx.fillRect(x-57,top,114,92);ctx.fillStyle="#7f95a8";ctx.fillRect(x-62,top+30,124,12);ctx.fillStyle="#b7c8d5";ctx.fillRect(x-57,top+7,114,12);ctx.fillStyle="#263b50";ctx.fillRect(x-54,top+18,108,61);ctx.fillStyle=on?"#fff0bd":"#151e2c";ctx.fillRect(x-38,top+25,76,42);
  if(on){ctx.save();ctx.translate(x,top+45);ctx.rotate(Math.sin(t*.32)*.58);const g=ctx.createLinearGradient(-12,0,-1380,0);g.addColorStop(0,"rgba(255,229,163,"+(.68+storm*.13)+")");g.addColorStop(1,"rgba(255,207,120,0)");ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-6,-6);ctx.lineTo(-1380,-205);ctx.lineTo(-1380,205);ctx.lineTo(-6,6);ctx.closePath();ctx.fill();ctx.restore();
    const halo=ctx.createRadialGradient(x,top+45,4,x,top+45,185);halo.addColorStop(0,"rgba(255,246,202,.95)");halo.addColorStop(.28,"rgba(255,203,116,.28)");halo.addColorStop(1,"rgba(255,203,116,0)");ctx.fillStyle=halo;ctx.fillRect(x-190,top-145,380,380);}
  ctx.fillStyle="#111c2c";ctx.fillRect(x-84,top-12,168,24);ctx.fillStyle=on?"#ffe6a5":"#6c7b8c";ctx.fillRect(x-66,top-40,132,28);ctx.strokeStyle="#d8e4ec";ctx.globalAlpha=.6;ctx.lineWidth=4;ctx.strokeRect(x-63,top-37,126,24);ctx.globalAlpha=1;ctx.restore();
}
function nllFox(ctx,x,y,s,t,mood){
  ctx.save();ctx.translate(x,y+Math.sin(t*3.1)*1.2);ctx.scale(s,s);
  const fur=ctx.createLinearGradient(-45,-60,32,35);
  fur.addColorStop(0,"#ffb064");fur.addColorStop(.4,"#df7438");fur.addColorStop(1,"#8b3929");
  const ground=ctx.createRadialGradient(0,61,3,0,61,56);
  ground.addColorStop(0,"rgba(0,0,0,.38)");ground.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=ground;ctx.beginPath();ctx.ellipse(0,61,53,12,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=fur;ctx.beginPath();ctx.moveTo(-18,12);ctx.bezierCurveTo(-49,9,-89,-17,-81,-49);ctx.bezierCurveTo(-74,-77,-48,-79,-32,-61);ctx.bezierCurveTo(-18,-46,-28,-29,-43,-24);ctx.bezierCurveTo(-24,-8,-11,-4,-6,3);ctx.closePath();ctx.fill();
  ctx.fillStyle="#fff1d9";ctx.beginPath();ctx.moveTo(-73,-51);ctx.bezierCurveTo(-65,-71,-49,-70,-39,-60);ctx.bezierCurveTo(-33,-52,-38,-43,-49,-38);ctx.bezierCurveTo(-61,-39,-71,-43,-73,-51);ctx.fill();
  const leg=(px,phase)=>{ctx.save();ctx.translate(px,30);ctx.rotate(Math.sin(t*8+phase)*.13);ctx.fillStyle="#ad4d2f";nllRound(ctx,-7,0,14,26,5);ctx.fill();ctx.fillStyle="#f4c28d";nllRound(ctx,-10,19,21,8,4);ctx.fill();ctx.restore();};
  leg(-15,0);leg(13,Math.PI);
  ctx.fillStyle=fur;ctx.beginPath();ctx.moveTo(-22,-13);ctx.quadraticCurveTo(-34,4,-24,30);ctx.quadraticCurveTo(-5,47,18,33);ctx.quadraticCurveTo(31,15,18,-7);ctx.quadraticCurveTo(0,-19,-22,-13);ctx.fill();
  const cream=ctx.createLinearGradient(-7,0,15,32);cream.addColorStop(0,"#fff4dc");cream.addColorStop(1,"#e7b989");
  ctx.fillStyle=cream;ctx.beginPath();ctx.moveTo(-9,-5);ctx.quadraticCurveTo(0,6,5,12);ctx.quadraticCurveTo(14,6,16,0);ctx.quadraticCurveTo(22,19,12,31);ctx.quadraticCurveTo(-1,38,-11,25);ctx.quadraticCurveTo(-16,9,-9,-5);ctx.fill();
  ctx.fillStyle="#425e70";ctx.beginPath();ctx.moveTo(-23,-9);ctx.quadraticCurveTo(-3,2,18,-8);ctx.lineTo(21,0);ctx.quadraticCurveTo(-1,13,-22,1);ctx.closePath();ctx.fill();
  ctx.save();ctx.translate(0,-24+Math.sin(t*2)*.6);ctx.rotate(mood==="scared"?-.09:Math.sin(t*.9)*.018);
  ctx.fillStyle=fur;ctx.beginPath();ctx.moveTo(-26,-31);ctx.lineTo(-34,-70);ctx.quadraticCurveTo(-15,-63,-5,-47);ctx.quadraticCurveTo(7,-62,27,-69);ctx.lineTo(23,-29);ctx.quadraticCurveTo(34,-9,19,9);ctx.quadraticCurveTo(0,21,-21,5);ctx.quadraticCurveTo(-35,-8,-26,-31);ctx.fill();
  ctx.fillStyle="#f5c89f";ctx.beginPath();ctx.moveTo(-29,-60);ctx.lineTo(-31,-68);ctx.lineTo(-15,-53);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(13,-53);ctx.lineTo(24,-65);ctx.lineTo(21,-42);ctx.closePath();ctx.fill();
  ctx.fillStyle="#fff0d6";ctx.beginPath();ctx.ellipse(8,-3,22,13,.12,0,Math.PI*2);ctx.fill();
  const blink=Math.sin(t*1.27+1.1)>.994;
  if(blink){ctx.strokeStyle="#32242a";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-19,-24);ctx.lineTo(-9,-24);ctx.moveTo(8,-24);ctx.lineTo(18,-24);ctx.stroke();}
  else{ctx.fillStyle="#fff5df";ctx.beginPath();ctx.ellipse(-13,-25,5,7,0,0,Math.PI*2);ctx.ellipse(12,-25,5,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#27303b";ctx.beginPath();ctx.ellipse(-12,-24,2.7,4.8,0,0,Math.PI*2);ctx.ellipse(13,-24,2.7,4.8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(-13,-27,1.3,0,Math.PI*2);ctx.arc(12,-27,1.3,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle="#f8dcb8";ctx.beginPath();ctx.ellipse(18,-9,12,7,.28,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#2a1e23";ctx.beginPath();ctx.moveTo(24,-12);ctx.quadraticCurveTo(30,-14,30,-9);ctx.quadraticCurveTo(27,-5,23,-8);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#92503e";ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(15,-3);ctx.quadraticCurveTo(20,2,25,-3);ctx.stroke();
  if(mood==="scared"){ctx.strokeStyle="#65352c";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-19,-33);ctx.quadraticCurveTo(-12,-37,-5,-32);ctx.moveTo(5,-33);ctx.quadraticCurveTo(12,-37,19,-32);ctx.stroke();}
  if(mood==="happy"){ctx.fillStyle="rgba(232,119,85,.33)";ctx.beginPath();ctx.ellipse(-22,-9,5,3,0,0,Math.PI*2);ctx.fill();}
  ctx.restore();
  ctx.strokeStyle="#a64a2f";ctx.lineWidth=9;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(16,2);ctx.quadraticCurveTo(29,3,36,12);ctx.stroke();
  const glow=ctx.createRadialGradient(39,17,1,39,17,67);glow.addColorStop(0,"rgba(255,239,180,.72)");glow.addColorStop(.24,"rgba(255,207,113,.28)");glow.addColorStop(1,"rgba(255,197,100,0)");
  ctx.fillStyle=glow;ctx.fillRect(-26,-35,132,110);const lantern=ctx.createLinearGradient(31,9,49,39);lantern.addColorStop(0,"#fff0ba");lantern.addColorStop(.5,"#dba352");lantern.addColorStop(1,"#8b542f");
  ctx.fillStyle=lantern;nllRound(ctx,31,9,18,28,3);ctx.fill();ctx.fillStyle="#ffe8ad";ctx.fillRect(35,14,10,17);
  ctx.strokeStyle="#f9df9f";ctx.lineWidth=2;ctx.strokeRect(33,11,14,22);ctx.strokeStyle="#e9b964";ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(40,10,5,Math.PI,Math.PI*2);ctx.stroke();
  ctx.restore();
}
function nllRabbit(ctx,x,y,s,t,captain){
  ctx.save();ctx.translate(x,y+Math.sin(t*2.8+(captain?1:0))*2);ctx.scale(s,s);ctx.fillStyle=captain?"#9ba4ad":"#e4dcca";ctx.beginPath();ctx.ellipse(-10,-43,11,33,-.22,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(13,-45,10,35,.18,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=captain?"#b9c4ce":"#f1e8d8";ctx.beginPath();ctx.ellipse(-9,-44,5,24,-.22,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(13,-46,4,26,.18,0,Math.PI*2);ctx.fill();ctx.fillStyle=captain?"#344c66":"#d5d0c7";ctx.beginPath();ctx.ellipse(0,4,28,38,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=captain?"#1f334d":"#e7e1d6";ctx.beginPath();ctx.ellipse(0,-21,30,29,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#35313a";ctx.beginPath();ctx.arc(-10,-23,3.8,0,Math.PI*2);ctx.arc(11,-23,3.8,0,Math.PI*2);ctx.fill();ctx.fillStyle="#eaa6a1";ctx.beginPath();ctx.arc(0,-13,3.4,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#8d6f70";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,-7);ctx.quadraticCurveTo(0,-2,5,-7);ctx.stroke();
  if(captain){ctx.fillStyle="#17263c";ctx.beginPath();ctx.moveTo(-35,-36);ctx.lineTo(-29,-52);ctx.lineTo(26,-52);ctx.lineTo(34,-36);ctx.closePath();ctx.fill();ctx.fillStyle="#263b59";ctx.fillRect(-27,-62,54,12);ctx.fillStyle="#f0cd80";ctx.fillRect(-5,-48,10,8);ctx.fillStyle="#e7e3d9";ctx.fillRect(-13,-1,26,27);}else{ctx.fillStyle="#8b9baf";ctx.beginPath();ctx.moveTo(-18,-2);ctx.lineTo(18,-2);ctx.lineTo(5,17);ctx.lineTo(-5,17);ctx.closePath();ctx.fill();}
  ctx.fillStyle="#272633";ctx.fillRect(-19,29,13,16);ctx.fillRect(7,29,13,16);ctx.restore();
}
function nllBoat(ctx,x,y,s,t,storm){
  ctx.save();ctx.translate(x,y+Math.sin(t*2.3)*9*storm);ctx.scale(s,s);ctx.fillStyle="#382b32";ctx.beginPath();ctx.moveTo(-115,4);ctx.quadraticCurveTo(-68,38,67,31);ctx.quadraticCurveTo(104,25,118,-2);ctx.lineTo(77,9);ctx.lineTo(-85,8);ctx.closePath();ctx.fill();ctx.fillStyle="#b66b45";ctx.beginPath();ctx.moveTo(-105,2);ctx.lineTo(100,2);ctx.quadraticCurveTo(70,31,-66,26);ctx.closePath();ctx.fill();
  ctx.fillStyle="#ead7ad";ctx.fillRect(-23,-89,5,93);ctx.fillStyle="#fff0d2";ctx.beginPath();ctx.moveTo(-16,-78);ctx.lineTo(39,-26);ctx.lineTo(-16,-26);ctx.closePath();ctx.fill();ctx.strokeStyle="#bcb9bc";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-20,-84);ctx.lineTo(44,-21);ctx.stroke();nllRabbit(ctx,-41,-11,.55,t,true);nllRabbit(ctx,20,-1,.47,t,false);
  const g=ctx.createRadialGradient(82,-8,2,82,-8,53);g.addColorStop(0,"rgba(255,222,143,.95)");g.addColorStop(1,"rgba(255,213,124,0)");ctx.fillStyle=g;ctx.fillRect(25,-64,115,105);ctx.fillStyle="#ffd78a";ctx.beginPath();ctx.arc(82,-8,5,0,Math.PI*2);ctx.fill();ctx.restore();
}
function nllTree(ctx,x,y,h){
  ctx.save();ctx.translate(x,y);ctx.fillStyle="#151e2b";ctx.fillRect(-7,-h*.25,14,h*.5);ctx.fillStyle="#102d37";ctx.beginPath();ctx.moveTo(0,-h);ctx.lineTo(-h*.28,-h*.45);ctx.lineTo(-h*.17,-h*.47);ctx.lineTo(-h*.39,-h*.18);ctx.lineTo(-h*.22,-h*.22);ctx.lineTo(-h*.31,0);ctx.lineTo(h*.29,0);ctx.lineTo(h*.2,-h*.25);ctx.lineTo(h*.39,-h*.19);ctx.lineTo(h*.18,-h*.49);ctx.lineTo(h*.29,-h*.46);ctx.closePath();ctx.fill();ctx.restore();
}
function nllFireflies(ctx,t,amount,cx,cy){
  if(amount<=0)return;
  for(let i=0;i<50;i++){const p=nllHash(i+100)*Math.PI*2,r=24+nllHash(i+300)*230,x=cx+Math.cos(t*(.27+nllHash(i+8)*.42)+p)*r,y=cy+Math.sin(t*(.34+nllHash(i+19)*.31)+p)*r*.54,pulse=.45+.55*(.5+.5*Math.sin(t*3.2+i*1.7)),size=(1.8+nllHash(i+55)*4.2)*amount;
    const g=ctx.createRadialGradient(x,y,0,x,y,size*7);g.addColorStop(0,"rgba(255,220,120,"+(.48*amount*pulse)+")");g.addColorStop(1,"rgba(255,210,100,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,size*7,0,Math.PI*2);ctx.fill();ctx.fillStyle="rgba(255,241,174,"+(amount*pulse)+")";ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();}
}
function nllForest(ctx,t){
  ctx.fillStyle="#08111e";ctx.fillRect(0,0,1920,1080);ctx.fillStyle="#0a1c27";ctx.beginPath();ctx.moveTo(0,470);for(let i=0;i<=20;i++){const x=i/20*1920;ctx.lineTo(x,450+Math.sin(i*1.5)*105+nllHash(i+18)*45);}ctx.lineTo(1920,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.fill();
  for(let i=0;i<15;i++)nllTree(ctx,i*143-35,920,460+nllHash(i+120)*370);
  ctx.fillStyle="#162c32";ctx.beginPath();ctx.moveTo(0,940);ctx.bezierCurveTo(500,810,690,1005,960,930);ctx.bezierCurveTo(1240,830,1450,850,1920,955);ctx.lineTo(1920,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.fill();ctx.fillStyle="#354344";ctx.beginPath();ctx.moveTo(840,1080);ctx.bezierCurveTo(820,890,1050,790,950,625);ctx.bezierCurveTo(890,540,1000,500,1100,475);ctx.lineTo(1190,492);ctx.bezierCurveTo(1080,555,1035,600,1060,685);ctx.bezierCurveTo(1120,825,990,930,1025,1080);ctx.closePath();ctx.fill();
  ctx.strokeStyle="rgba(168,190,179,.19)";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(854,1080);ctx.bezierCurveTo(837,880,1066,790,968,625);ctx.stroke();
}
function nllBridge(ctx,t){
  ctx.fillStyle="#070d1d";ctx.fillRect(0,0,1920,1080);ctx.fillStyle="#080c15";ctx.beginPath();ctx.moveTo(0,450);ctx.lineTo(330,510);ctx.lineTo(540,690);ctx.lineTo(710,930);ctx.lineTo(930,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(1920,390);ctx.lineTo(1530,500);ctx.lineTo(1350,710);ctx.lineTo(1200,925);ctx.lineTo(1000,1080);ctx.lineTo(1920,1080);ctx.closePath();ctx.fill();
  const g=ctx.createLinearGradient(800,470,1120,1080);g.addColorStop(0,"rgba(17,44,68,.6)");g.addColorStop(1,"rgba(0,0,0,.95)");ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(470,610);ctx.lineTo(1510,565);ctx.lineTo(1140,1080);ctx.lineTo(800,1080);ctx.closePath();ctx.fill();
  for(let i=0;i<12;i++){const y=630+i*37;nllLine(ctx,610-i*16,y,1360+i*10,y+Math.sin(t*2+i)*7,"rgba(92,139,160,.22)",2);}
  ctx.save();ctx.translate(0,Math.sin(t*2)*3);ctx.strokeStyle="#8d7967";ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(250,522);ctx.lineTo(1620,494);ctx.stroke();ctx.strokeStyle="#514239";ctx.lineWidth=19;ctx.beginPath();ctx.moveTo(258,570);ctx.lineTo(682,562);ctx.lineTo(735,590);ctx.lineTo(865,581);ctx.lineTo(1030,575);ctx.lineTo(1104,600);ctx.lineTo(1623,540);ctx.stroke();
  for(let i=0;i<20;i++){if(i===8||i===13)continue;const x=260+i*69,y=570+(x-250)*(-.022);ctx.save();ctx.translate(x,y);ctx.rotate(-.02);ctx.fillStyle="#634f40";ctx.fillRect(-30,-2,61,25);ctx.restore();}
  ctx.strokeStyle="#736452";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(257,508);ctx.quadraticCurveTo(860,390,1620,478);ctx.stroke();for(let i=0;i<17;i++){const x=270+i*80,y=510+(x-250)*(-.022);nllLine(ctx,x,y,x-3,y+58,"#67584b",4);}ctx.restore();
}
function nllCave(ctx,t,amount){
  const bg=ctx.createRadialGradient(990,440,30,990,440,650);bg.addColorStop(0,"#2c4555");bg.addColorStop(.38,"#101f31");bg.addColorStop(1,"#03050a");ctx.fillStyle=bg;ctx.fillRect(0,0,1920,1080);ctx.fillStyle="#050911";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(520,0);ctx.quadraticCurveTo(650,110,670,280);ctx.quadraticCurveTo(740,500,600,760);ctx.quadraticCurveTo(470,950,540,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(1920,0);ctx.lineTo(1380,0);ctx.quadraticCurveTo(1250,180,1320,370);ctx.quadraticCurveTo(1410,540,1280,760);ctx.quadraticCurveTo(1200,900,1330,1080);ctx.lineTo(1920,1080);ctx.closePath();ctx.fill();
  ctx.fillStyle="#172733";ctx.beginPath();ctx.ellipse(980,420,206,255,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#b9a778";ctx.lineWidth=12;ctx.beginPath();ctx.ellipse(980,420,176,224,0,0,Math.PI*2);ctx.stroke();const m=ctx.createRadialGradient(980,420,5,980,420,215);m.addColorStop(0,"rgba(255,237,178,.86)");m.addColorStop(.35,"rgba(212,174,112,.48)");m.addColorStop(1,"rgba(37,68,83,.05)");ctx.fillStyle=m;ctx.beginPath();ctx.ellipse(980,420,161,207,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="rgba(255,237,178,.54)";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(920,270);ctx.quadraticCurveTo(1060,390,900,520);ctx.stroke();ctx.strokeStyle="rgba(255,255,255,.22)";ctx.beginPath();ctx.moveTo(1017,257);ctx.quadraticCurveTo(1100,408,1018,579);ctx.stroke();
  ctx.globalAlpha=amount;for(let i=0;i<9;i++){ctx.beginPath();ctx.ellipse(980,420,84+i*16,112+i*18,t*.05+i*.2,0,Math.PI*2);ctx.strokeStyle="rgba(255,222,143,"+(.04+i*.015)+")";ctx.lineWidth=2;ctx.stroke();}ctx.globalAlpha=1;ctx.fillStyle="#0d141f";ctx.beginPath();ctx.moveTo(730,800);ctx.lineTo(1210,800);ctx.lineTo(1360,1080);ctx.lineTo(580,1080);ctx.closePath();ctx.fill();
}
function nllTrails(ctx,t,amount,cx,cy){
  if(amount<=0)return;ctx.save();ctx.globalCompositeOperation="lighter";for(let i=0;i<8;i++){const phase=t*.8+i*Math.PI/4;ctx.beginPath();for(let k=0;k<=64;k++){const p=k/64,a=phase+p*Math.PI*4,r=20+p*205,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.56;k?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.strokeStyle="rgba(255,210,115,"+(amount*.12)+")";ctx.lineWidth=2+amount*1.4;ctx.stroke();}ctx.restore();
}
function nllCaveApproach(ctx,t){
  const g=ctx.createLinearGradient(0,0,0,1080);
  g.addColorStop(0,"#081422");g.addColorStop(.55,"#102130");g.addColorStop(1,"#02060d");
  ctx.fillStyle=g;ctx.fillRect(0,0,1920,1080);
  ctx.fillStyle="#111d2b";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(480,0);ctx.lineTo(565,190);ctx.lineTo(465,355);ctx.lineTo(555,535);ctx.lineTo(420,740);ctx.lineTo(555,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.fill();
  ctx.fillStyle="#172537";ctx.beginPath();ctx.moveTo(1920,0);ctx.lineTo(1420,0);ctx.lineTo(1320,175);ctx.lineTo(1435,340);ctx.lineTo(1325,520);ctx.lineTo(1450,730);ctx.lineTo(1320,1080);ctx.lineTo(1920,1080);ctx.closePath();ctx.fill();
  for(let i=0;i<10;i++){const y=100+i*88;nllLine(ctx,60+(i%3)*40,y,420+(i%4)*20,y+Math.sin(i)*20,"rgba(117,154,177,.16)",2);nllLine(ctx,1480-(i%3)*31,y+22,1840-(i%4)*20,y-7,"rgba(117,154,177,.14)",2);}
  ctx.fillStyle="#283541";ctx.beginPath();ctx.moveTo(670,1080);ctx.bezierCurveTo(790,900,955,835,1040,730);ctx.bezierCurveTo(1110,655,1120,600,1120,535);ctx.lineTo(1310,535);ctx.bezierCurveTo(1310,720,1250,840,1155,920);ctx.bezierCurveTo(1055,1000,990,1040,970,1080);ctx.closePath();ctx.fill();
  ctx.strokeStyle="rgba(141,179,188,.25)";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(705,1080);ctx.bezierCurveTo(810,914,955,850,1060,745);ctx.bezierCurveTo(1130,670,1150,608,1145,550);ctx.stroke();
  ctx.fillStyle="#03060c";ctx.beginPath();ctx.moveTo(1090,540);ctx.bezierCurveTo(1040,410,1070,245,1185,190);ctx.bezierCurveTo(1315,115,1450,245,1450,540);ctx.closePath();ctx.fill();
  ctx.strokeStyle="rgba(94,139,158,.44)";ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(1090,540);ctx.bezierCurveTo(1040,410,1070,245,1185,190);ctx.bezierCurveTo(1315,115,1450,245,1450,540);ctx.stroke();
  const glow=ctx.createRadialGradient(1260,390,4,1260,390,255);glow.addColorStop(0,"rgba(255,217,133,.28)");glow.addColorStop(1,"rgba(255,217,133,0)");ctx.fillStyle=glow;ctx.fillRect(1000,150,520,500);
  ctx.fillStyle="#302d29";ctx.beginPath();ctx.ellipse(1262,365,68,91,.04,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#a89c7d";ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(1262,365,59,82,.04,0,Math.PI*2);ctx.stroke();ctx.fillStyle="rgba(251,223,159,.4)";ctx.beginPath();ctx.ellipse(1262,365,49,72,0,0,Math.PI*2);ctx.fill();
  nllFireflies(ctx,t,nllEase(197,215,t)*.55,1170,450);
}
function nllOverlay(ctx,t,chapter){
  ctx.save();ctx.globalAlpha=.76;ctx.fillStyle="#edf0ef";ctx.font="500 16px ui-monospace, Consolas, monospace";ctx.textAlign="left";ctx.textBaseline="top";ctx.fillText(chapter.toUpperCase(),74,55);ctx.textAlign="right";ctx.fillStyle="rgba(241,241,237,.72)";ctx.fillText("TRILYVA SHORT FILM  /  "+String(Math.floor(t/60)).padStart(2,"0")+":"+String(Math.floor(t%60)).padStart(2,"0"),1846,55);nllLine(ctx,74,88,1846,88,"rgba(240,240,230,.18)",1);ctx.restore();
  let cue=null,next=300;for(let i=0;i<STORY_CUES.length;i++){if(t>=STORY_CUES[i][0]){cue=STORY_CUES[i];next=i+1<STORY_CUES.length?STORY_CUES[i+1][0]:300;}else break;}if(!cue)return;
  ctx.save();ctx.globalAlpha=nllClamp(Math.min((t-cue[0])/.18,(next-t)/.2),0,1);const g=ctx.createLinearGradient(0,855,0,1080);g.addColorStop(0,"rgba(2,6,13,0)");g.addColorStop(.35,"rgba(2,6,13,.73)");g.addColorStop(1,"rgba(2,6,13,.91)");ctx.fillStyle=g;ctx.fillRect(0,855,1920,225);ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="600 18px ui-monospace, Consolas, monospace";ctx.fillStyle="#f2c978";ctx.fillText(cue[1],960,928);ctx.font="500 29px ui-sans-serif, system-ui, sans-serif";ctx.fillStyle="#f6f4ed";
  const words=cue[2].split(/\s+/),lines=[];let line="";for(const word of words){const test=line?line+" "+word:word;if(ctx.measureText(test).width>1530&&line){lines.push(line);line=word;}else line=test;}if(line)lines.push(line);const shown=lines.slice(0,2),startY=966-(shown.length-1)*18;shown.forEach((s,i)=>ctx.fillText(s,960,startY+i*38));ctx.restore();
}
function renderFrame(time,frame,fps,ctx,width,height){
  const t=nllClamp(Number.isFinite(time)?time:frame/Math.max(1,fps),0,STORY_DURATION),scale=Math.min(width/1920,height/1080),ox=(width-1920*scale)/2,oy=(height-1080*scale)/2;
  const storm=nllEase(52,71,t)*(1-nllEase(236,265,t)),dawn=nllEase(272,300,t);ctx.save();ctx.fillStyle="#020309";ctx.fillRect(0,0,width,height);ctx.translate(ox,oy);ctx.scale(scale,scale);
  const chapter=t<52?"THE LIGHTHOUSE":t<98?"THE STORM":t<137?"THE JOURNEY":t<180?"THE FIREFLIES":t<197?"THE BROKEN BRIDGE":t<217?"THE CAVE":t<245?"THE LAST LIGHT":t<282?"THE WAY HOME":"A NEW DAWN";
  let x=1290,y=730,mood="calm",sceneFoxScale=1.05;if(t<9){x=1325;y=746;mood="happy";}else if(t<18){const p=nllEase(9,18,t);x=nllMix(1360,1450,p);y=nllMix(746,370,p);sceneFoxScale=.8;mood="happy";}else if(t<29){x=1450;y=370;sceneFoxScale=.72;mood="happy";}else if(t<39){const p=nllEase(29,39,t);x=nllMix(1450,1360,p);y=nllMix(370,720,p);sceneFoxScale=nllMix(.72,1.05,p);mood="happy";}else if(t<52){x=1325;y=746;mood="happy";}else if(t<95){x=1300;y=746;mood="scared";}else if(t<137){x=nllMix(1290,1020,nllEase(98,137,t));y=750;mood="scared";}else if(t<180){x=nllMix(1020,410,nllEase(137,180,t));y=800;mood=t<159?"scared":"calm";}else if(t<197){x=nllMix(410,750,nllEase(180,197,t));y=501;mood="scared";}else if(t<217){x=nllMix(790,1040,nllEase(197,217,t));y=nllMix(795,760,nllEase(197,217,t));mood="calm";}else if(t<245){x=nllMix(1040,1000,nllEase(217,245,t));y=760;mood=t<226?"calm":"happy";}else if(t<255){x=nllMix(1000,1435,nllEase(245,255,t));y=nllMix(746,410,nllEase(245,255,t));sceneFoxScale=nllMix(1.05,.78,nllEase(245,255,t));mood="happy";}else if(t<282){x=1435;y=385;sceneFoxScale=.72;mood="happy";}else if(t<294){x=nllMix(1435,1330,nllEase(282,294,t));y=nllMix(385,746,nllEase(282,294,t));sceneFoxScale=nllMix(.72,1.05,nllEase(282,294,t));mood="happy";}else{x=1330;y=746;mood="happy";}
  if(t<137||t>=245){
    nllSky(ctx,t,storm,dawn);nllSea(ctx,t,storm,dawn);nllLand(ctx);for(let i=0;i<8;i++)nllHouse(ctx,60+i*116,698+(i%3)*12,96,125+(i%3)*14,t>=282,t);
    for(let i=0;i<7;i++){const px=800+i*55,py=752+Math.sin(i*.6)*20;ctx.fillStyle="#302d2b";ctx.fillRect(px,py,8,55);ctx.fillStyle="#ffd99b";ctx.beginPath();ctx.arc(px+4,py,5,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle="#26303a";ctx.beginPath();ctx.moveTo(670,805);ctx.lineTo(1215,826);ctx.lineTo(1270,857);ctx.lineTo(705,838);ctx.closePath();ctx.fill();nllLighthouse(ctx,t,t<70||t>=255,storm);
    if(t<137)nllBoat(ctx,t<95?nllMix(600,680,t/95):nllMix(680,760,(t-95)/42),691,1.1,t,storm);else nllBoat(ctx,nllMix(790,710,(t-245)/37),695,1.03,t,storm);
    nllFox(ctx,x,y,sceneFoxScale,t,mood);if(t>=120&&t<160){ctx.strokeStyle="#b5cce1";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x-4,y-25);ctx.bezierCurveTo(x-28,y-12,x-20,y+3,x+2,y-1);ctx.stroke();}
    if(t>=245&&t<282)nllFireflies(ctx,t,nllEase(245,260,t)*(1-nllEase(278,282,t)),1270,435);
  }else if(t<180){
    nllForest(ctx,t);ctx.fillStyle="rgba(77,142,170,.26)";ctx.beginPath();ctx.ellipse(1310,520,410,85,0,0,Math.PI*2);ctx.fill();for(let i=0;i<10;i++)nllLine(ctx,970+i*45,520+Math.sin(i)*9,1040+i*40,526+Math.sin(i*2)*12,"rgba(176,203,210,.32)",2);
    ctx.fillStyle="#111f2d";ctx.fillRect(1515,270,42,300);ctx.beginPath();ctx.moveTo(1500,290);ctx.lineTo(1536,235);ctx.lineTo(1573,290);ctx.closePath();ctx.fill();nllFireflies(ctx,t,nllEase(158,178,t),1075,570);nllFox(ctx,x,y,1.15,t,mood);
    if(t>163)nllTrails(ctx,t,.7,1080,590);for(let i=0;i<26;i++){const px=90+i*68,py=1000-nllHash(i+50)*65;ctx.strokeStyle="#324a48";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px,py);ctx.quadraticCurveTo(px+Math.sin(t*2+i)*15,py-56,px+Math.sin(t*1.7+i)*23,py-100-nllHash(i+10)*25);ctx.stroke();}
  }else if(t<197){nllBridge(ctx,t);nllFireflies(ctx,t,.8,780,480);y=501;nllFox(ctx,x,y,1.02,t,mood);}
  else if(t<217){nllCaveApproach(ctx,t);x=nllMix(790,1040,nllEase(197,217,t));y=nllMix(795,760,nllEase(197,217,t));nllFireflies(ctx,t,nllEase(204,216,t)*.8,1060,545);nllFox(ctx,x,y,1.0,t,mood);}
  else if(t<245){nllCave(ctx,t,nllEase(216,237,t));const a=nllEase(216,240,t);nllFireflies(ctx,t,a,980,420);nllTrails(ctx,t,a,980,420);nllFox(ctx,x,y,1.08,t,mood);ctx.save();ctx.globalAlpha=nllEase(232,244,t)*.42;const g=ctx.createLinearGradient(1080,400,1920,260);g.addColorStop(0,"rgba(255,224,147,.65)");g.addColorStop(1,"rgba(255,220,139,0)");ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(1065,365);ctx.lineTo(1920,170);ctx.lineTo(1920,365);ctx.lineTo(1065,443);ctx.closePath();ctx.fill();ctx.restore();}
  if(t>=52&&t<250){const flash=Math.pow(Math.max(0,Math.sin((t-54)*2.17)),38)*nllEase(53,57,t)*(1-nllEase(248,250,t));if(flash>.01){ctx.fillStyle="rgba(207,228,250,"+(flash*.54)+")";ctx.fillRect(0,0,1920,1080);ctx.strokeStyle="rgba(245,249,255,"+flash+")";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(320,120);ctx.lineTo(380,240);ctx.lineTo(330,310);ctx.lineTo(440,445);ctx.stroke();}}
  if(t>=235&&t<272){const p=nllEase(235,252,t)*(1-nllEase(266,272,t));ctx.save();ctx.globalAlpha=p*.55;ctx.strokeStyle="#ffe7a0";ctx.lineWidth=4;ctx.beginPath();for(let i=0;i<=100;i++){const u=i/100,px=760+u*760,py=470+Math.sin(u*10*Math.PI+t*.5)*72+(u-.5)*(u-.5)*105;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();ctx.restore();}
  if(t>=290){ctx.save();ctx.globalAlpha=nllEase(290,294,t)*.8;ctx.fillStyle="rgba(4,9,17,.72)";nllRound(ctx,390,210,1140,360,18);ctx.fill();ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#fff0c6";ctx.font="700 52px ui-sans-serif, system-ui, sans-serif";ctx.fillText("NORI AND THE LAST LIGHT",960,340);ctx.fillStyle="#c3d7e1";ctx.font="500 22px ui-monospace, Consolas, monospace";ctx.fillText("A STORY ABOUT SHARING YOUR LIGHT",960,407);ctx.fillStyle="#efcc83";ctx.fillRect(790,455,260,2);ctx.restore();}
  const marks=[137,180,197,217,245];let cutFade=0;for(let i=0;i<marks.length;i++){const d=Math.abs(t-marks[i]);if(d<1.25)cutFade=Math.max(cutFade,.2*(1-d/1.25));}if(cutFade>0){ctx.fillStyle="rgba(1,4,9,"+cutFade+")";ctx.fillRect(0,0,1920,1080);}nllOverlay(ctx,t,chapter);ctx.restore();
}
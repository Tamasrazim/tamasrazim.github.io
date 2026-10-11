// PIP AND THE RUNAWAY PANCAKE — original five-minute cartoon short, 16:9.
// Hand-authored procedural 2D animation for TRILYVA. Deterministic by timestamp.
// Character acting, layered painted backgrounds, camera easing, story beats and subtitles.
// No network, image, font or runtime dependencies.

const FILM_DURATION = 300;
const FILM_CUES = [
[1,"NARRATOR","On a sunny morning in Cloverfield Meadow, Pip promised his friends the biggest pancake breakfast ever."],
[8,"PIP","One giant pancake, coming right up!"],
[16,"OLLIE","I'll be the official blueberry inspector!"],
[25,"TUCK","And I will keep the syrup perfectly safe."],
[34,"NARRATOR","Pip flipped the pancake high above the pan. It spun like a golden flying saucer."],
[42,"PIP","That is much higher than I planned!"],
[51,"NARRATOR","It landed on the counter, bounced off a cushion, and rolled straight toward the open door."],
[61,"OLLIE","It's rolling for the back door! After it!"],
[70,"NARRATOR","Out across the sunny meadow went the giant pancake, tumbling faster and faster."],
[79,"PIP","Catch it before it reaches the creek!"],
[88,"TUCK","Don't chase in a straight line. Cut across the little bridge!"],
[97,"NARRATOR","The pancake bounced onto the dry log and wobbled above the bubbling water."],
[106,"OLLIE","Left! No, my other left!"],
[115,"PIP","A pancake has never been this much work!"],
[124,"NARRATOR","At the blueberry patch, the pancake rolled into a soft bush and wore a crown of berries."],
[133,"OLLIE","I can see it! It's wearing blueberries!"],
[142,"PIP","Let's tilt the branch, not tug the pancake."],
[151,"NARRATOR","The branch lifted. The pancake slid onto Tuck's broad shell and bounced gently away."],
[160,"TUCK","My shell has never smelled so delicious."],
[169,"NARRATOR","Near the old windmill, the three friends stopped to make a proper catching plan."],
[178,"PIP","We need something wide, soft, and easy to hold."],
[187,"NARRATOR","Ollie fluttered in front of the pancake while Pip and Tuck stretched out a picnic cloth."],
[196,"OLLIE","Look over here, you gorgeous golden disc!"],
[205,"PIP","On three, lift the cloth. One, two..."],
[214,"NARRATOR","The pancake bounced once, twice, then floated right toward their soft little net."],
[223,"TUCK","Ready, steady, softly..."],
[232,"NARRATOR","Plop! They caught it and slid it onto Pip's waiting serving pan."],
[241,"PIP","Caught! Still fluffy, still warm, and still enormous!"],
[250,"NARRATOR","The friends carried their prize back to the kitchen table, taking turns with the pan."],
[258,"OLLIE","Breakfast is best when everybody gets a piece."],
[267,"PIP","One very big pancake, coming right up... for all of us!"],
[276,"NARRATOR","They added berries, a little syrup, and a tower of smaller pancakes beside the giant one."],
[286,"TUCK","I kept the syrup safe. Not even one taste!"],
[292,"PIP","Let's eat while it's warm!"],
[297,"NARRATOR","And in Cloverfield Meadow, the best breakfast was the one they made and shared together."]
];

function filmClamp(v,a,b){return Math.max(a,Math.min(b,v));}
function filmMix(a,b,p){return a+(b-a)*filmClamp(p,0,1);}
function filmEase(a,b,t){const p=filmClamp((t-a)/(b-a),0,1);return p*p*(3-2*p);}
function filmHash(n){const x=Math.sin(n*127.1+311.7)*43758.5453123;return x-Math.floor(x);}
function filmGrad(ctx,x0,y0,x1,y1,stops){const g=ctx.createLinearGradient(x0,y0,x1,y1);stops.forEach(s=>g.addColorStop(s[0],s[1]));return g;}
function filmRound(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function filmLine(ctx,x1,y1,x2,y2,color,w){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function filmGlow(ctx,x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,color.replace(/[\d.]+\)$/,"0)"));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function filmCloud(ctx,x,y,s,tone,drift){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  const g=ctx.createLinearGradient(0,-50,0,35);g.addColorStop(0,"#ffffff");g.addColorStop(.58,tone||"#f7fbff");g.addColorStop(1,"#d7e9f4");
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,66,26,0,0,Math.PI*2);ctx.ellipse(-35,-11,32,29,-.15,0,Math.PI*2);ctx.ellipse(0,-28,39,41,0,0,Math.PI*2);ctx.ellipse(35,-14,36,31,.12,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=.48;ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(-4,-43,22,8,-.15,0,Math.PI*2);ctx.fill();ctx.restore();
}
function filmSun(ctx,t,storm){
  const x=1570+Math.sin(t*.12)*8,y=170;
  const pulse=1+Math.sin(t*2.1)*.025;
  filmGlow(ctx,x,y,170,"rgba(255,225,110,"+(.28*(1-storm)) +")");
  ctx.save();ctx.translate(x,y);ctx.rotate(t*.025);ctx.strokeStyle="rgba(255,201,66,"+(.7*(1-storm))+")";ctx.lineCap="round";ctx.lineWidth=10;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.beginPath();ctx.moveTo(Math.cos(a)*92,Math.sin(a)*92);ctx.lineTo(Math.cos(a)*112,Math.sin(a)*112);ctx.stroke();}
  ctx.fillStyle=filmGrad(ctx,-55,-58,58,60,[[0,"#fff5a9"],[.55,"#ffd846"],[1,"#ffab36"]]);ctx.beginPath();ctx.arc(0,0,77*pulse,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#9c5a33";ctx.beginPath();ctx.arc(-24,-7,5.5,0,Math.PI*2);ctx.arc(24,-7,5.5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#9c5a33";ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,6,23,.18,Math.PI-.18);ctx.stroke();ctx.restore();
}
function filmTree(ctx,x,y,s,willow,t){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  const trunk=ctx.createLinearGradient(-45,0,50,0);trunk.addColorStop(0,"#7f4b31");trunk.addColorStop(.5,"#b97541");trunk.addColorStop(1,"#6d3b2a");
  ctx.fillStyle=trunk;ctx.beginPath();ctx.moveTo(-36,0);ctx.bezierCurveTo(-24,-92,-39,-176,-10,-254);ctx.quadraticCurveTo(12,-287,30,-248);ctx.bezierCurveTo(44,-172,30,-82,48,0);ctx.closePath();ctx.fill();
  ctx.fillStyle="rgba(255,206,139,.28)";ctx.beginPath();ctx.moveTo(-20,-28);ctx.bezierCurveTo(-3,-95,-13,-188,4,-244);ctx.lineWidth=8;ctx.strokeStyle="rgba(255,206,139,.28)";ctx.stroke();
  if(willow){
    for(let i=0;i<17;i++){
      const sx=-93+i*13,sy=-218-filmHash(i+4)*62,len=95+filmHash(i+23)*105;
      ctx.strokeStyle=i%2?"#4b9b59":"#63b968";ctx.lineWidth=5+filmHash(i+31)*3;ctx.beginPath();ctx.moveTo(sx,sy);ctx.bezierCurveTo(sx-18,sy+len*.35+Math.sin(t*1.6+i)*8,sx+22,sy+len*.75,sx+Math.sin(t*1.4+i)*13,sy+len);ctx.stroke();
      for(let k=0;k<4;k++){const yy=sy+len*(.25+k*.16);ctx.fillStyle=k%2?"#8ed56c":"#4da653";ctx.beginPath();ctx.ellipse(sx+Math.sin(t*1.4+i)*8+(k%2?7:-6),yy,13,6,Math.sin(t+i)*.22,0,Math.PI*2);ctx.fill();}
    }
    const g=ctx.createRadialGradient(-20,-264,10,0,-224,160);g.addColorStop(0,"#b0e77c");g.addColorStop(.58,"#55b85f");g.addColorStop(1,"#27854d");
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(-22,-243,132,84,-.12,0,Math.PI*2);ctx.ellipse(70,-227,94,76,.14,0,Math.PI*2);ctx.ellipse(-94,-205,68,68,0,0,Math.PI*2);ctx.fill();
  }else{
    const g=ctx.createRadialGradient(-34,-294,8,0,-256,150);g.addColorStop(0,"#a8e777");g.addColorStop(.58,"#53b85f");g.addColorStop(1,"#27884e");ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(-54,-254,84,0,Math.PI*2);ctx.arc(29,-286,101,0,Math.PI*2);ctx.arc(96,-239,75,0,Math.PI*2);ctx.fill();
    for(let i=0;i<14;i++){const a=filmHash(i+10)*Math.PI*2,rr=40+filmHash(i+50)*75;ctx.fillStyle=i%2?"#d6f487":"#74cf66";ctx.beginPath();ctx.ellipse(Math.cos(a)*rr, -257+Math.sin(a)*rr*.55,7,4,a,0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();
}
function filmFlower(ctx,x,y,s,color,phase){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  const sway=Math.sin(phase)*.055;ctx.strokeStyle="#398e49";ctx.lineWidth=5;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(Math.sin(phase)*7,-32,sway*14,-62);ctx.stroke();
  ctx.fillStyle="#52ab56";ctx.beginPath();ctx.ellipse(-10,-25,12,5,-.55,0,Math.PI*2);ctx.ellipse(10,-39,11,5,.55,0,Math.PI*2);ctx.fill();
  ctx.translate(0,-67);ctx.rotate(sway);
  for(let i=0;i<7;i++){ctx.save();ctx.rotate(i*Math.PI*2/7);ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,-12,7,14,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  const g=ctx.createRadialGradient(-2,-3,1,0,0,9);g.addColorStop(0,"#fff9bb");g.addColorStop(1,"#f5ad30");ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();ctx.restore();
}
function filmMeadow(ctx,t,storm){
  const sky=ctx.createLinearGradient(0,0,0,760);sky.addColorStop(0,storm?"#8daec8":"#72d5ff");sky.addColorStop(.52,storm?"#b6ccd6":"#b4edff");sky.addColorStop(1,storm?"#d7d9ca":"#fff7c5");ctx.fillStyle=sky;ctx.fillRect(0,0,1920,1080);
  filmSun(ctx,t,storm);
  filmCloud(ctx,240+Math.sin(t*.08)*18,160,1.02,storm?"#d4dfe7":"#f9fdff",0);
  filmCloud(ctx,670+Math.sin(t*.06+1)*25,220,.78,storm?"#c9d6df":"#f6fbff",0);
  filmCloud(ctx,1115+Math.sin(t*.09+2)*22,135,.84,storm?"#d6e0e7":"#fff",0);
  ctx.fillStyle="#addd91";ctx.beginPath();ctx.moveTo(0,550);ctx.bezierCurveTo(230,465,390,520,590,548);ctx.bezierCurveTo(805,425,1020,473,1197,553);ctx.bezierCurveTo(1450,444,1645,475,1920,535);ctx.lineTo(1920,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.fill();
  ctx.fillStyle=filmGrad(ctx,0,580,0,1080,[[0,"#80ce70"],[.42,"#58bc65"],[1,"#2b914e"]]);ctx.beginPath();ctx.moveTo(0,675);ctx.bezierCurveTo(210,594,400,646,610,666);ctx.bezierCurveTo(850,562,1090,610,1300,670);ctx.bezierCurveTo(1540,585,1740,617,1920,652);ctx.lineTo(1920,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.fill();
  // Curved paths create a clear foreground-to-background read.
  ctx.fillStyle="#f7e5ad";ctx.beginPath();ctx.moveTo(700,1080);ctx.bezierCurveTo(740,948,898,882,1010,844);ctx.bezierCurveTo(1120,800,1205,801,1305,824);ctx.lineTo(1415,858);ctx.bezierCurveTo(1240,878,1110,934,1070,1080);ctx.closePath();ctx.fill();
  ctx.strokeStyle="rgba(255,255,225,.45)";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(748,1075);ctx.bezierCurveTo(802,965,930,905,1034,866);ctx.stroke();
  filmTree(ctx,150,685,.9,false,t);filmTree(ctx,1785,706,1.03,false,t);
  // Midground shrubs, repeated flower patches and small stones.
  for(let i=0;i<24;i++){
    const x=25+i*83+(i%2)*13,y=700+filmHash(i+55)*120,s=.35+filmHash(i+85)*.42;
    ctx.fillStyle=i%2?"#3a9c50":"#4eb35a";ctx.beginPath();ctx.ellipse(x,y,48*s,22*s,0,0,Math.PI*2);ctx.fill();
    if(i%2===0)filmFlower(ctx,x-13,y+4,.48+filmHash(i+22)*.23,["#ff6c8e","#fff1ac","#8e86ff","#ffa85c"][i%4],t*1.8+i);
  }
  for(let i=0;i<58;i++){
    const x=filmHash(i+151)*1920,y=865+filmHash(i+251)*210,s=.42+filmHash(i+351)*.64;
    if(i%3===0)filmFlower(ctx,x,y,s,["#ff6a91","#fff0a2","#b39aff","#ffb35c","#f8f7e8"][i%5],t*1.5+i);
    else{ctx.fillStyle="rgba(32,111,56,.22)";ctx.beginPath();ctx.ellipse(x,y,9*s,3*s,-.25,0,Math.PI*2);ctx.fill();}
  }
  // A faint drifting pollen layer, deterministic and calm.
  for(let i=0;i<27;i++){const x=(filmHash(i+601)*2020+t*(storm?11:3))%1980-30,y=250+filmHash(i+701)*500;ctx.fillStyle="rgba(255,255,208,"+(.12+filmHash(i+801)*.16)*(1-storm)+")";ctx.beginPath();ctx.arc(x,y,1.8+filmHash(i+901)*2,0,Math.PI*2);ctx.fill();}
  if(storm>.01){
    ctx.fillStyle="rgba(47,70,94,"+(.12+storm*.2)+")";ctx.fillRect(0,0,1920,1080);
    for(let i=0;i<115;i++){const x=(filmHash(i+921)*2060+t*(190+filmHash(i+991)*80))%2060-40,y=(filmHash(i+1021)*650+t*(165+filmHash(i+1041)*110))%760;filmLine(ctx,x,y,x-12,y+32,"rgba(240,249,255,"+(.18+storm*.2)+")",1.8);}
  }
}
function filmCreek(ctx,t,storm){
  filmMeadow(ctx,t,storm);
  // The creek occupies a stable band across the scene; banks overlap its edge.
  ctx.fillStyle="#48bde5";ctx.beginPath();ctx.moveTo(0,625);ctx.bezierCurveTo(330,588,535,668,800,636);ctx.bezierCurveTo(1040,608,1320,570,1920,626);ctx.lineTo(1920,785);ctx.bezierCurveTo(1430,755,1220,805,900,766);ctx.bezierCurveTo(610,736,320,792,0,750);ctx.closePath();ctx.fill();
  const water=ctx.createLinearGradient(0,625,0,790);water.addColorStop(0,"rgba(191,247,255,.55)");water.addColorStop(.35,"rgba(49,184,224,.5)");water.addColorStop(1,"rgba(19,137,198,.7)");ctx.fillStyle=water;ctx.fill();
  for(let i=0;i<32;i++){const x=(i*79+t*25)%2000,y=644+Math.sin(i*1.7+t*.9)*22+(i%4)*23;filmLine(ctx,x,y,x+22+filmHash(i+6)*24,y+Math.sin(t+i)*2,"rgba(226,255,255,.55)",2.5);}
  // Dry crossing log and rounded stones make the route readable.
  const log=ctx.createLinearGradient(590,0,1340,0);log.addColorStop(0,"#93603c");log.addColorStop(.5,"#d49a5b");log.addColorStop(1,"#8a5133");
  ctx.fillStyle=log;ctx.beginPath();ctx.moveTo(565,650);ctx.quadraticCurveTo(920,620,1370,645);ctx.lineTo(1356,676);ctx.quadraticCurveTo(930,649,570,683);ctx.closePath();ctx.fill();
  ctx.strokeStyle="rgba(255,218,155,.55)";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(620,654);ctx.quadraticCurveTo(970,632,1300,650);ctx.stroke();
  for(let i=0;i<11;i++){const x=100+i*167,y=753+Math.sin(i*2)*15;ctx.fillStyle=i%2?"#8bb4a3":"#699b91";ctx.beginPath();ctx.ellipse(x,y,26+filmHash(i+61)*18,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="rgba(255,255,255,.25)";ctx.beginPath();ctx.ellipse(x-4,y-4,10,3,-.2,0,Math.PI*2);ctx.fill();}
  filmTree(ctx,1470,700,1.4,true,t);
  // Willow roots anchor the tree to the same bank.
  ctx.strokeStyle="#89512f";ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(1450,698);ctx.quadraticCurveTo(1395,753,1320,744);ctx.moveTo(1466,700);ctx.quadraticCurveTo(1530,760,1610,740);ctx.stroke();
}
function filmBerryPatch(ctx,t){
  filmMeadow(ctx,t,0);
  // Neat pick-your-own blueberry hedge, with soft leaves and an orchard fence.
  for(let i=0;i<7;i++){const x=970+i*120;ctx.fillStyle="#c08b55";ctx.fillRect(x,620,16,260);ctx.fillStyle="#dfb77d";ctx.fillRect(x-8,620,32,18);}
  filmLine(ctx,965,690,1740,690,"#d9b17b",13);filmLine(ctx,965,774,1740,774,"#c69360",13);
  for(let i=0;i<18;i++){const x=1040+i*39,y=700+Math.sin(i*1.7)*42,s=.75+filmHash(i+27)*.36;ctx.fillStyle=i%2?"#268e4c":"#3ca655";ctx.beginPath();ctx.ellipse(x,y,52*s,35*s,Math.sin(i)*.15,0,Math.PI*2);ctx.fill();ctx.fillStyle=i%2?"#5fbe60":"#73ce6a";ctx.beginPath();ctx.ellipse(x-9,y-14,29*s,16*s,-.3,0,Math.PI*2);ctx.fill();
    for(let j=0;j<5;j++){const bx=x-22+(j%3)*20,by=y-4+Math.floor(j/3)*15;ctx.fillStyle=["#364d96","#4968b5","#263d7a"][j%3];ctx.beginPath();ctx.arc(bx,by,7*s,0,Math.PI*2);ctx.fill();ctx.fillStyle="rgba(255,255,255,.36)";ctx.beginPath();ctx.arc(bx-2*s,by-2*s,2*s,0,Math.PI*2);ctx.fill();}
  }
  // A low basket and clean stepping stones make the route and rescue plan readable.
  const basket=ctx.createLinearGradient(0,875,0,972);basket.addColorStop(0,"#e9bb72");basket.addColorStop(1,"#b87947");ctx.fillStyle=basket;ctx.beginPath();ctx.moveTo(1510,880);ctx.lineTo(1685,880);ctx.lineTo(1660,972);ctx.lineTo(1535,972);ctx.closePath();ctx.fill();ctx.strokeStyle="#94613c";ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle="#f2d097";ctx.lineWidth=4;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(1525+i*30,893);ctx.lineTo(1544+i*24,956);ctx.stroke();}
  for(let i=0;i<7;i++){ctx.fillStyle="#638e91";ctx.beginPath();ctx.ellipse(620+i*75,810+Math.sin(i)*12,34,12,0,0,Math.PI*2);ctx.fill();}
}
function filmMillGlade(ctx,t){
  filmMeadow(ctx,t,0);
  // Friendly red windmill, with visibly rotating sails; the prop gives this scene a new silhouette.
  ctx.fillStyle="#f3d5a3";ctx.beginPath();ctx.moveTo(1460,470);ctx.lineTo(1715,470);ctx.lineTo(1750,880);ctx.lineTo(1420,880);ctx.closePath();ctx.fill();ctx.strokeStyle="#bd8254";ctx.lineWidth=8;ctx.stroke();
  ctx.fillStyle="#d85c4f";ctx.beginPath();ctx.moveTo(1398,481);ctx.lineTo(1586,333);ctx.lineTo(1770,481);ctx.closePath();ctx.fill();ctx.strokeStyle="#a84643";ctx.lineWidth=8;ctx.stroke();
  ctx.fillStyle="#fbe4a9";filmRound(ctx,1510,595,140,120,9);ctx.fill();ctx.strokeStyle="#ba7b4e";ctx.lineWidth=6;ctx.stroke();
  ctx.strokeStyle="#ae7849";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(1558,595);ctx.lineTo(1558,715);ctx.moveTo(1510,652);ctx.lineTo(1650,652);ctx.stroke();
  ctx.save();ctx.translate(1588,465);ctx.rotate(t*.18);for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*Math.PI/2);ctx.fillStyle="#fff1d0";filmRound(ctx,-13,-156,26,146,10);ctx.fill();ctx.strokeStyle="#cf5c4c";ctx.lineWidth=4;ctx.stroke();ctx.fillStyle="#df6654";ctx.fillRect(-9,-150,18,105);ctx.restore();}ctx.fillStyle="#f4c54f";ctx.beginPath();ctx.arc(0,0,22,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#ba6c45";ctx.lineWidth=4;ctx.stroke();ctx.restore();
  for(let i=0;i<13;i++){const x=200+i*96,y=760+Math.sin(i*1.2)*28;ctx.fillStyle=i%2?"#4eac5c":"#58b962";ctx.beginPath();ctx.ellipse(x,y,45,18,0,0,Math.PI*2);ctx.fill();}
  filmPuddle(ctx,910,1010,77,t); // A drying puddle from the irrigation wheel adds a small reflective detail.
}

function filmButterfly(ctx,x,y,s,t,c){
  ctx.save();ctx.translate(x,y+Math.sin(t*3+x)*4);ctx.scale(s,s);const flap=Math.sin(t*12+x)*.18;
  ctx.fillStyle=c||"#ff8ab5";ctx.beginPath();ctx.ellipse(-10,-2,14,19,-.5-flap,0,Math.PI*2);ctx.ellipse(10,-2,14,19,.5+flap,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="rgba(255,255,255,.55)";ctx.beginPath();ctx.arc(-13,-8,4,0,Math.PI*2);ctx.arc(13,-8,4,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#54465d";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(0,12);ctx.moveTo(0,-5);ctx.quadraticCurveTo(-7,-17,-10,-16);ctx.moveTo(0,-5);ctx.quadraticCurveTo(7,-17,10,-16);ctx.stroke();ctx.restore();
}
function filmFox(ctx,x,y,s,t,mood,pose){
  ctx.save();ctx.translate(x,y+Math.sin(t*3.2)*2);ctx.scale(s,s);
  const run=pose==="run",wave=pose==="wave",reach=pose==="reach",bounce=run?Math.abs(Math.sin(t*10))*8:Math.sin(t*2.4)*1.4;
  ctx.translate(0,-bounce);
  const shadow=ctx.createRadialGradient(0,0,2,0,0,65);shadow.addColorStop(0,"rgba(27,68,39,.24)");shadow.addColorStop(1,"rgba(27,68,39,0)");
  ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(0,4,58,13,0,0,Math.PI*2);ctx.fill();
  const fur=ctx.createLinearGradient(-75,-105,32,4);fur.addColorStop(0,"#ffb66b");fur.addColorStop(.4,"#f58b48");fur.addColorStop(1,"#d55c39");
  // Fluffy tail and pale tip.
  ctx.fillStyle=fur;ctx.beginPath();ctx.moveTo(-18,-39);ctx.bezierCurveTo(-63,-37,-99,-71,-82,-105);ctx.bezierCurveTo(-65,-130,-38,-119,-29,-97);ctx.bezierCurveTo(-22,-78,-35,-69,-47,-65);ctx.bezierCurveTo(-27,-60,-15,-52,-12,-46);ctx.closePath();ctx.fill();
  ctx.fillStyle="#fff4db";ctx.beginPath();ctx.moveTo(-78,-99);ctx.bezierCurveTo(-65,-121,-45,-109,-40,-96);ctx.bezierCurveTo(-37,-83,-50,-76,-61,-78);ctx.bezierCurveTo(-73,-82,-80,-89,-78,-99);ctx.fill();
  // Legs swing on alternate phases for a readable trot.
  const leg=(lx,phase)=>{ctx.save();ctx.translate(lx,-24);ctx.rotate(run?Math.sin(t*10+phase)*.48:Math.sin(t*2.2+phase)*.05);ctx.fillStyle="#d35d39";filmRound(ctx,-8,-1,16,32,6);ctx.fill();ctx.fillStyle="#ffe0af";filmRound(ctx,-12,23,24,10,5);ctx.fill();ctx.restore();};
  leg(-16,0);leg(15,Math.PI);
  ctx.fillStyle=fur;ctx.beginPath();ctx.moveTo(-31,-103);ctx.bezierCurveTo(-44,-78,-39,-42,-23,-29);ctx.quadraticCurveTo(0,-12,23,-31);ctx.bezierCurveTo(39,-54,33,-84,18,-103);ctx.closePath();ctx.fill();
  const cream=ctx.createLinearGradient(-8,-80,15,-27);cream.addColorStop(0,"#fff5df");cream.addColorStop(1,"#f4d09d");ctx.fillStyle=cream;ctx.beginPath();ctx.moveTo(-10,-91);ctx.quadraticCurveTo(-7,-72,6,-64);ctx.quadraticCurveTo(18,-74,21,-92);ctx.quadraticCurveTo(27,-52,14,-38);ctx.quadraticCurveTo(-2,-29,-13,-45);ctx.quadraticCurveTo(-20,-66,-10,-91);ctx.fill();
  // Scarf flutters in the direction of travel.
  ctx.fillStyle="#36b9d0";ctx.beginPath();ctx.moveTo(-25,-88);ctx.quadraticCurveTo(0,-77,26,-91);ctx.lineTo(29,-80);ctx.quadraticCurveTo(2,-65,-25,-76);ctx.closePath();ctx.fill();
  ctx.fillStyle="#90edeb";ctx.beginPath();ctx.moveTo(12,-81);ctx.lineTo(37,-78);ctx.lineTo(24,-62);ctx.lineTo(18,-75);ctx.closePath();ctx.fill();
  // Arms pose toward the prop or out for balance.
  ctx.strokeStyle="#e77742";ctx.lineWidth=13;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-20,-84);ctx.quadraticCurveTo(reach?-37:-34,reach?-94:-66,reach?-52:-42,reach?-116:-55);ctx.stroke();
  ctx.beginPath();ctx.moveTo(20,-84);ctx.quadraticCurveTo(wave?36:36,wave?-111:-65,wave?39:40,wave?-132:-59);ctx.stroke();
  // Head is deliberately larger than the body for clear preschool acting.
  ctx.fillStyle=fur;ctx.beginPath();ctx.moveTo(-36,-123);ctx.lineTo(-45,-171);ctx.quadraticCurveTo(-20,-161,-8,-143);ctx.quadraticCurveTo(8,-162,34,-169);ctx.lineTo(30,-120);ctx.bezierCurveTo(43,-98,32,-79,15,-75);ctx.quadraticCurveTo(-14,-69,-32,-92);ctx.quadraticCurveTo(-44,-105,-36,-123);ctx.fill();
  ctx.fillStyle="#ffdfae";ctx.beginPath();ctx.moveTo(-38,-158);ctx.lineTo(-41,-166);ctx.lineTo(-22,-145);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(13,-145);ctx.lineTo(29,-163);ctx.lineTo(25,-137);ctx.closePath();ctx.fill();
  ctx.fillStyle="#fff4d9";ctx.beginPath();ctx.ellipse(12,-99,23,15,.12,0,Math.PI*2);ctx.fill();
  // Face uses distinct open/closed expressions, catchlights and cheeks.
  if(mood==="surprised"){ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(-17,-121,7,10,0,0,Math.PI*2);ctx.ellipse(12,-121,7,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#49343a";ctx.beginPath();ctx.arc(-16,-120,3.5,0,Math.PI*2);ctx.arc(13,-120,3.5,0,Math.PI*2);ctx.fill();}
  else if(Math.sin(t*1.2+1.7)>.993){ctx.strokeStyle="#53343a";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-24,-118);ctx.quadraticCurveTo(-17,-112,-10,-118);ctx.moveTo(5,-118);ctx.quadraticCurveTo(12,-112,20,-118);ctx.stroke();}
  else{ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(-17,-121,6.2,8.1,0,0,Math.PI*2);ctx.ellipse(12,-121,6.2,8.1,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#382c3c";ctx.beginPath();ctx.ellipse(-16,-120,3,5.3,0,0,Math.PI*2);ctx.ellipse(13,-120,3,5.3,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(-18,-123,1.6,0,Math.PI*2);ctx.arc(11,-123,1.6,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle="rgba(255,131,135,.45)";ctx.beginPath();ctx.ellipse(-28,-102,7,4,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#fff0d2";ctx.beginPath();ctx.ellipse(23,-103,12,8,.15,0,Math.PI*2);ctx.fill();ctx.fillStyle="#84433b";ctx.beginPath();ctx.ellipse(31,-104,4,3,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#8a433d";ctx.lineWidth=2.5;ctx.beginPath();
  if(mood==="surprised"){ctx.ellipse(18,-89,5,7,0,0,Math.PI*2);ctx.stroke();}
  else if(filmTalking("PIP",t)){ctx.fillStyle="#813b3c";ctx.beginPath();ctx.ellipse(15,-93,6,4.5+Math.abs(Math.sin(t*17))*2.7,.05,0,Math.PI*2);ctx.fill();ctx.fillStyle="#f58f95";ctx.beginPath();ctx.ellipse(16,-90,3.2,1.8,0,0,Math.PI*2);ctx.fill();}
  else{ctx.arc(15,-94,10,.2,Math.PI-.2);ctx.stroke();}
  // Small paw pads are drawn in Pip's local coordinate system.
  if(reach||wave){ctx.fillStyle="#ffe7be";ctx.beginPath();ctx.arc(wave?39:-52,-120,5,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}
function filmBird(ctx,x,y,s,t,pose){
  ctx.save();ctx.translate(x,y+Math.sin(t*4+x*.01)*4);ctx.scale(s,s);
  const flap=Math.sin(t*12)*.55;
  ctx.fillStyle="#168abf";ctx.beginPath();ctx.ellipse(0,-29,31,32,-.1,0,Math.PI*2);ctx.fill();
  const belly=ctx.createLinearGradient(-15,-22,15,4);belly.addColorStop(0,"#fff3c8");belly.addColorStop(1,"#ffd78b");ctx.fillStyle=belly;ctx.beginPath();ctx.ellipse(5,-21,19,23,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#27b7db";ctx.beginPath();ctx.ellipse(-5,-55,24,22,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#4dd2e8";ctx.beginPath();ctx.moveTo(-22,-68);ctx.quadraticCurveTo(-18,-87,-5,-72);ctx.quadraticCurveTo(0,-86,9,-71);ctx.closePath();ctx.fill();
  ctx.fillStyle="#097cae";ctx.beginPath();ctx.ellipse(-26,-27,13,22,flap*.7,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.translate(-22,-31);ctx.rotate(pose==="fly"?flap*.9:Math.sin(t*2)*.12);ctx.fillStyle="#35c3e6";ctx.beginPath();ctx.ellipse(-3,0,17,10,-.2,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(7,-59,7.5,9,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#243c55";ctx.beginPath();ctx.arc(9,-58,4.3,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(8,-61,1.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#ffad43";ctx.beginPath();ctx.moveTo(23,-52);ctx.lineTo(43,-45);ctx.lineTo(24,-39);ctx.closePath();ctx.fill();
  if(filmTalking("OLLIE",t)){ctx.fillStyle="#e98731";ctx.beginPath();ctx.moveTo(24,-46);ctx.lineTo(41,-44);ctx.lineTo(24,-42);ctx.closePath();ctx.fill();}
  if(filmTalking("OLLIE",t)){ctx.fillStyle="#e98731";ctx.beginPath();ctx.moveTo(24,-46);ctx.lineTo(41,-44);ctx.lineTo(24,-42);ctx.closePath();ctx.fill();}
  ctx.strokeStyle="#d18c3c";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(25,-25);ctx.lineTo(25,-12);ctx.moveTo(10,-12);ctx.lineTo(27,-12);ctx.moveTo(38,-25);ctx.lineTo(39,-12);ctx.stroke();
  ctx.strokeStyle="#7a5a5b";ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(11,-43);ctx.quadraticCurveTo(16,-38,21,-43);ctx.stroke();
  ctx.restore();
}
function filmTurtle(ctx,x,y,s,t,pose){
  ctx.save();ctx.translate(x,y+Math.sin(t*2.1+x*.01)*1.5);ctx.scale(s,s);
  const shadow=ctx.createRadialGradient(0,0,1,0,0,66);shadow.addColorStop(0,"rgba(24,74,48,.27)");shadow.addColorStop(1,"rgba(24,74,48,0)");ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(0,5,64,13,0,0,Math.PI*2);ctx.fill();
  for(let i=0;i<4;i++){const px=-36+(i%2)*60,py=-17+Math.floor(i/2)*19;ctx.fillStyle="#6dbb63";ctx.beginPath();ctx.ellipse(px,py,11,9,0,0,Math.PI*2);ctx.fill();}
  const shell=ctx.createLinearGradient(-48,-66,48,-2);shell.addColorStop(0,"#ffd568");shell.addColorStop(.42,"#e69e43");shell.addColorStop(1,"#a65b34");ctx.fillStyle=shell;ctx.beginPath();ctx.ellipse(-3,-29,52,36,-.04,Math.PI,Math.PI*2);ctx.quadraticCurveTo(47,3,-4,4);ctx.quadraticCurveTo(-58,1,-55,-29);ctx.fill();
  ctx.strokeStyle="#9b5e35";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-3,-64);ctx.lineTo(-3,2);ctx.moveTo(-44,-34);ctx.quadraticCurveTo(-3,-46,40,-34);ctx.moveTo(-36,-51);ctx.quadraticCurveTo(-22,-33,-36,-13);ctx.moveTo(30,-51);ctx.quadraticCurveTo(16,-33,30,-13);ctx.stroke();
  ctx.fillStyle="#6ac96c";ctx.beginPath();ctx.ellipse(40,-37,27,23,.15,0,Math.PI*2);ctx.fill();ctx.fillStyle="#7bdd77";ctx.beginPath();ctx.ellipse(58,-39,18,19,.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(60,-45,5.5,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#233e36";ctx.beginPath();ctx.arc(62,-44,2.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#489c58";ctx.beginPath();ctx.ellipse(12,-1,14,7,.12,0,Math.PI*2);ctx.ellipse(-22,-1,14,7,-.12,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#447b49";ctx.beginPath();ctx.ellipse(71,-31,4,3,0,0,Math.PI*2);ctx.fill();
  if(filmTalking("TUCK",t)){ctx.fillStyle="#276c43";ctx.beginPath();ctx.ellipse(66,-26,5,3+Math.abs(Math.sin(t*12))*2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#f29d9a";ctx.beginPath();ctx.ellipse(66,-24,2.5,1.1,0,0,Math.PI*2);ctx.fill();}
  else{if(filmTalking("TUCK",t)){ctx.fillStyle="#276c43";ctx.beginPath();ctx.ellipse(66,-26,5,3+Math.abs(Math.sin(t*12))*2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#f29d9a";ctx.beginPath();ctx.ellipse(66,-24,2.5,1.1,0,0,Math.PI*2);ctx.fill();}else{ctx.strokeStyle="#337b4c";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(59,-26);ctx.quadraticCurveTo(65,-22,71,-27);ctx.stroke();}}
  if(pose==="wave"){ctx.strokeStyle="#69b95e";ctx.lineWidth=8;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(26,-46);ctx.quadraticCurveTo(38,-63,42+Math.sin(t*7)*4,-73);ctx.stroke();}
  ctx.restore();
}
function filmPancake(ctx,x,y,s,t,rotation,shine){
  ctx.save();ctx.translate(x,y+Math.sin(t*5.4)*2.4);ctx.rotate(rotation||0);ctx.scale(s,s);
  const shadow=ctx.createRadialGradient(0,8,3,0,8,83);shadow.addColorStop(0,"rgba(101,58,24,.25)");shadow.addColorStop(1,"rgba(101,58,24,0)");ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(0,20,84,26,0,0,Math.PI*2);ctx.fill();
  const edge=ctx.createLinearGradient(-72,-55,65,78);edge.addColorStop(0,"#c26a2e");edge.addColorStop(.28,"#efad49");edge.addColorStop(.7,"#d78135");edge.addColorStop(1,"#a85129");
  ctx.fillStyle=edge;ctx.beginPath();ctx.moveTo(-75,-2);ctx.bezierCurveTo(-76,-43,-47,-72,-5,-75);ctx.bezierCurveTo(35,-83,72,-52,76,-15);ctx.bezierCurveTo(84,17,52,62,14,71);ctx.bezierCurveTo(-24,80,-70,51,-76,14);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#a8562c";ctx.lineWidth=4;ctx.stroke();
  const top=ctx.createRadialGradient(-24,-38,8,0,0,88);top.addColorStop(0,"#ffe4a0");top.addColorStop(.44,"#f8c76f");top.addColorStop(.84,"#e9a64e");top.addColorStop(1,"#dc8b39");ctx.fillStyle=top;ctx.beginPath();ctx.moveTo(-67,-4);ctx.bezierCurveTo(-66,-40,-42,-61,-7,-65);ctx.bezierCurveTo(30,-73,62,-47,67,-14);ctx.bezierCurveTo(75,16,46,53,12,60);ctx.bezierCurveTo(-20,68,-59,44,-67,12);ctx.closePath();ctx.fill();
  ctx.strokeStyle="rgba(255,244,197,.6)";ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(-5,-8,57,49,-.1,Math.PI*1.08,Math.PI*1.83);ctx.stroke();
  // Tiny air pockets, browned freckles, glossy syrup and a pat of butter.
  for(let i=0;i<11;i++){const a=i*2.399,r=12+filmHash(i+9)*43,px=Math.cos(a)*r,py=Math.sin(a)*r*.72;ctx.fillStyle=i%3?"rgba(171,92,38,.24)":"rgba(255,248,202,.55)";ctx.beginPath();ctx.ellipse(px,py,2.3+filmHash(i+21)*2,1.7+filmHash(i+31)*1.4,a,0,Math.PI*2);ctx.fill();}
  ctx.strokeStyle="rgba(174,83,36,.75)";ctx.lineWidth=2.5;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(18,-40);ctx.bezierCurveTo(4,-27,28,-16,12,-2);ctx.bezierCurveTo(-2,9,19,15,9,27);ctx.stroke();
  ctx.save();ctx.translate(-17,-19);ctx.rotate(.12+Math.sin(t*1.7)*.04);const butter=ctx.createLinearGradient(-10,-12,12,12);butter.addColorStop(0,"#fff4a4");butter.addColorStop(1,"#f5c638");ctx.fillStyle=butter;filmRound(ctx,-15,-12,30,25,5);ctx.fill();ctx.strokeStyle="rgba(255,255,255,.62)";ctx.lineWidth=2;filmLine(ctx,-8,-7,6,-7,"rgba(255,255,255,.62)",2);ctx.restore();
  for(let i=0;i<5;i++){const a=i*1.6+t*.025,px=Math.cos(a)*47,py=Math.sin(a)*35;ctx.fillStyle="#355d9b";ctx.beginPath();ctx.arc(px,py,5.5,0,Math.PI*2);ctx.fill();ctx.fillStyle="rgba(255,255,255,.4)";ctx.beginPath();ctx.arc(px-1.5,py-1.5,1.8,0,Math.PI*2);ctx.fill();}
  if(shine){ctx.strokeStyle="rgba(255,255,255,.6)";ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(-31,-32,24,10,-.42,Math.PI*1.1,Math.PI*1.8);ctx.stroke();}
  ctx.restore();
}
function filmPan(ctx,x,y,s,t,withPancake){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ctx.strokeStyle="#686e78";ctx.lineCap="round";ctx.lineWidth=19;ctx.beginPath();ctx.moveTo(20,7);ctx.lineTo(108,32);ctx.stroke();ctx.strokeStyle="#363f4e";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(28,7);ctx.lineTo(100,28);ctx.stroke();
  ctx.fillStyle="#575e69";ctx.beginPath();ctx.ellipse(0,0,91,28,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#aebbc6";ctx.beginPath();ctx.ellipse(0,-3,87,25,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#464c57";ctx.beginPath();ctx.ellipse(0,-7,79,21,0,0,Math.PI*2);ctx.fill();
  if(withPancake)filmPancake(ctx,0,-26,.82,t,t*.7,true);
  ctx.restore();
}
function filmPicnicTable(ctx,t){
  ctx.fillStyle="#b7784a";filmRound(ctx,660,755,690,42,9);ctx.fill();ctx.fillStyle="#e9b575";filmRound(ctx,665,748,680,24,8);ctx.fill();
  ctx.fillStyle="#a86942";filmRound(ctx,710,788,33,196,6);ctx.fill();filmRound(ctx,1266,788,33,196,6);ctx.fill();
  for(let i=0;i<5;i++){ctx.strokeStyle="rgba(255,235,186,.26)";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(690+i*132,753);ctx.lineTo(690+i*132,773);ctx.stroke();}
  // Gingham tablecloth hangs in soft, rounded folds.
  ctx.fillStyle="#fff1d3";ctx.beginPath();ctx.moveTo(680,773);ctx.lineTo(1333,773);ctx.lineTo(1314,860);ctx.quadraticCurveTo(1294,873,1274,856);ctx.lineTo(1184,853);ctx.quadraticCurveTo(1162,872,1141,854);ctx.lineTo(1040,852);ctx.quadraticCurveTo(1020,870,999,853);ctx.lineTo(900,854);ctx.quadraticCurveTo(881,873,859,853);ctx.lineTo(697,852);ctx.closePath();ctx.fill();
  const cols=["#ed778e","#ffc05b","#72c98c","#7cbce9"];for(let i=0;i<5;i++){ctx.fillStyle=cols[i%cols.length];ctx.globalAlpha=.17;ctx.fillRect(698+i*128,774,103,76);ctx.globalAlpha=1;}
}
function filmPancakeStack(ctx,x,y,s,t){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ctx.fillStyle="#fff6dc";ctx.beginPath();ctx.ellipse(0,0,100,26,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#e4c9a1";ctx.lineWidth=4;ctx.stroke();
  for(let i=0;i<5;i++){const yy=-16-i*21,xx=Math.sin(i*3+t*.3)*4;ctx.fillStyle=i%2?"#d88737":"#e5a14a";ctx.beginPath();ctx.ellipse(xx,yy,83-i*2,21,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#b96d32";ctx.lineWidth=3;ctx.stroke();ctx.fillStyle="rgba(255,224,149,.58)";ctx.beginPath();ctx.ellipse(xx-18,yy-8,32,6,-.2,Math.PI*1.1,Math.PI*1.8);ctx.strokeStyle="rgba(255,228,156,.66)";ctx.lineWidth=3;ctx.stroke();for(let j=0;j<3;j++){ctx.fillStyle="#3c65a2";ctx.beginPath();ctx.arc(xx+(j-1)*35,yy-3,4.8,0,Math.PI*2);ctx.fill();}}
  ctx.fillStyle="#f5cb37";filmRound(ctx,-20,-125,40,22,4);ctx.fill();ctx.strokeStyle="#fff0a3";ctx.lineWidth=2;filmLine(ctx,-13,-119,13,-119,"#fff0a3",2);
  ctx.strokeStyle="#b36b33";ctx.lineWidth=4;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(15,-125);ctx.bezierCurveTo(5,-109,24,-100,11,-89);ctx.bezierCurveTo(2,-83,15,-78,9,-71);ctx.stroke();
  ctx.restore();
}


function filmCatchCloth(ctx,t){
  ctx.save();const flutter=Math.sin(t*5)*12;ctx.fillStyle="#fff0d2";ctx.beginPath();ctx.moveTo(780,680);ctx.quadraticCurveTo(960,650+flutter,1100,675);ctx.quadraticCurveTo(1270,704+flutter,1410,674);ctx.lineTo(1390,772);ctx.quadraticCurveTo(1200,802-flutter,1040,778);ctx.quadraticCurveTo(900,760,800,780);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#f6b85f";ctx.lineWidth=8;ctx.stroke();
  for(let i=0;i<7;i++){ctx.strokeStyle=i%2?"rgba(240,119,139,.23)":"rgba(93,179,189,.25)";ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(810+i*85,692);ctx.lineTo(826+i*82,772);ctx.stroke();}
  ctx.restore();
}






function filmString(ctx,x1,y1,x2,y2,t){
  ctx.strokeStyle="rgba(74,81,101,.75)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x1,y1);ctx.bezierCurveTo(x1+(x2-x1)*.3,y1+20+Math.sin(t*2)*8,x1+(x2-x1)*.7,y2-30,x2,y2);ctx.stroke();
}
function filmRibbon(ctx,x,y,s,t){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.rotate(Math.sin(t*3)*.08);
  ctx.fillStyle="#ffdd75";ctx.beginPath();ctx.ellipse(0,0,16,8,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#4fcbe2";ctx.beginPath();ctx.moveTo(-9,2);ctx.lineTo(-18,12);ctx.lineTo(-8,10);ctx.closePath();ctx.fill();
  ctx.fillStyle="#f0749a";ctx.beginPath();ctx.moveTo(8,2);ctx.lineTo(18,11);ctx.lineTo(8,10);ctx.closePath();ctx.fill();ctx.restore();
}
function filmPuddle(ctx,x,y,w,t){
  const g=ctx.createRadialGradient(x,y,1,x,y,w);g.addColorStop(0,"rgba(205,247,255,.7)");g.addColorStop(1,"rgba(66,165,196,.08)");ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,w,w*.18,0,0,Math.PI*2);ctx.fill();
  for(let i=0;i<3;i++){const r=((t*.6+i*.33)%1)*w*.8;ctx.strokeStyle="rgba(234,252,255,"+((1-r/w)*.35)+")";ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y,r,r*.1,0,0,Math.PI*2);ctx.stroke();}
}
function filmTalking(speaker,t){
  for(let i=0;i<FILM_CUES.length;i++){
    const cue=FILM_CUES[i];if(cue[1]!==speaker||t<cue[0])continue;
    const next=i+1<FILM_CUES.length?FILM_CUES[i+1][0]:FILM_DURATION;
    const words=cue[2].replace(/[^A-Za-z\s']/g,"").trim().split(/\s+/).length;
    const duration=Math.min(Math.max(.5,next-cue[0]-.25),Math.max(.72,words/2.65));
    if(t<cue[0]+duration)return true;
  }
  return false;
}
function filmCaption(ctx,t,chapter){
  ctx.save();ctx.globalAlpha=.92;
  ctx.fillStyle="rgba(255,255,247,.8)";filmRound(ctx,72,44,chapter.length*13+36,35,16);ctx.fill();
  ctx.font="700 15px ui-monospace,Consolas,monospace";ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillStyle="#316d53";ctx.fillText(chapter.toUpperCase(),90,62);
  ctx.textAlign="right";ctx.fillStyle="rgba(255,255,255,.83)";ctx.font="600 15px ui-monospace,Consolas,monospace";ctx.fillText("CLOVERFIELD CARTOON  /  "+String(Math.floor(t/60)).padStart(2,"0")+":"+String(Math.floor(t%60)).padStart(2,"0"),1845,62);ctx.restore();
  let cue=null,next=300;for(let i=0;i<FILM_CUES.length;i++){if(t>=FILM_CUES[i][0]){cue=FILM_CUES[i];next=i+1<FILM_CUES.length?FILM_CUES[i+1][0]:300;}else break;}if(!cue)return;
  ctx.save();ctx.globalAlpha=filmClamp(Math.min((t-cue[0])/.15,(next-t)/.22),0,1);
  const g=ctx.createLinearGradient(0,855,0,1080);g.addColorStop(0,"rgba(17,36,34,0)");g.addColorStop(.32,"rgba(21,45,42,.72)");g.addColorStop(1,"rgba(13,30,28,.86)");ctx.fillStyle=g;ctx.fillRect(0,850,1920,230);
  ctx.fillStyle="#ffe680";ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="800 19px ui-rounded,system-ui,sans-serif";ctx.fillText(cue[1],960,918);
  ctx.fillStyle="#fffdf5";ctx.font="600 29px ui-rounded,system-ui,sans-serif";const words=cue[2].split(/\s+/),lines=[];let line="";for(const word of words){const test=line?line+" "+word:word;if(ctx.measureText(test).width>1500&&line){lines.push(line);line=word;}else line=test;}if(line)lines.push(line);const shown=lines.slice(0,2);shown.forEach((z,i)=>ctx.fillText(z,960,967+i*38));ctx.restore();
}
function filmKitchen(ctx,t){
  const wall=ctx.createLinearGradient(0,0,0,820);wall.addColorStop(0,"#fff0cf");wall.addColorStop(1,"#efc28b");ctx.fillStyle=wall;ctx.fillRect(0,0,1920,1080);
  // Cream tiles, painted cupboards and warm timber trim.
  ctx.fillStyle="#f6d9ac";ctx.fillRect(0,490,1920,210);
  for(let row=0;row<4;row++)for(let col=0;col<16;col++){ctx.strokeStyle="rgba(184,123,78,.23)";ctx.lineWidth=2;filmRound(ctx,col*122+8,row*49+500,109,38,5);ctx.stroke();}
  // Window view establishes the same meadow as the chase outside.
  ctx.fillStyle="#a85d3b";filmRound(ctx,108,77,500,386,19);ctx.fill();
  const sky=ctx.createLinearGradient(0,95,0,450);sky.addColorStop(0,"#71d1ff");sky.addColorStop(1,"#dbf5bb");ctx.fillStyle=sky;filmRound(ctx,126,95,464,350,10);ctx.fill();
  ctx.fillStyle="#9bdb87";ctx.beginPath();ctx.moveTo(126,324);ctx.quadraticCurveTo(260,265,383,326);ctx.quadraticCurveTo(495,278,590,331);ctx.lineTo(590,445);ctx.lineTo(126,445);ctx.closePath();ctx.fill();
  ctx.fillStyle="#5abc65";ctx.beginPath();ctx.moveTo(126,373);ctx.quadraticCurveTo(280,342,400,382);ctx.quadraticCurveTo(480,359,590,388);ctx.lineTo(590,445);ctx.lineTo(126,445);ctx.closePath();ctx.fill();
  ctx.fillStyle="#ffcf4e";ctx.beginPath();ctx.arc(490,158,39,0,Math.PI*2);ctx.fill();filmCloud(ctx,272,167,.58,"#fff",0);
  ctx.fillStyle="#fff1d2";ctx.fillRect(352,95,14,350);ctx.fillRect(126,260,464,13);
  ctx.fillStyle="#f59c94";ctx.beginPath();ctx.moveTo(93,69);ctx.quadraticCurveTo(157,155,126,310);ctx.lineTo(115,432);ctx.lineTo(92,433);ctx.lineTo(96,271);ctx.quadraticCurveTo(119,151,76,90);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(617,69);ctx.quadraticCurveTo(555,151,585,310);ctx.lineTo(604,432);ctx.lineTo(627,433);ctx.lineTo(619,271);ctx.quadraticCurveTo(595,151,636,90);ctx.closePath();ctx.fill();
  for(let i=0;i<3;i++){const x=1230+i*210;const cab=ctx.createLinearGradient(x,0,x+190,0);cab.addColorStop(0,"#d9905f");cab.addColorStop(.5,"#f6c287");cab.addColorStop(1,"#c87f51");ctx.fillStyle=cab;filmRound(ctx,x,102,185,247,11);ctx.fill();ctx.strokeStyle="#b56e46";ctx.lineWidth=5;filmRound(ctx,x+8,110,169,231,7);ctx.stroke();ctx.fillStyle="#ffe2ae";filmRound(ctx,x+18,120,149,210,5);ctx.fill();ctx.fillStyle="#9e5c3e";ctx.beginPath();ctx.arc(x+151,223,5,0,Math.PI*2);ctx.fill();}
  const fridge=ctx.createLinearGradient(35,0,268,0);fridge.addColorStop(0,"#cce2dc");fridge.addColorStop(.5,"#fff");fridge.addColorStop(1,"#bed5d0");ctx.fillStyle=fridge;filmRound(ctx,35,468,224,336,16);ctx.fill();ctx.strokeStyle="#a5c4ba";ctx.lineWidth=5;filmRound(ctx,35,468,224,336,16);ctx.stroke();ctx.beginPath();ctx.moveTo(50,620);ctx.lineTo(244,620);ctx.stroke();ctx.strokeStyle="#a5bfb7";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(222,528);ctx.lineTo(222,585);ctx.stroke();
  ctx.fillStyle="#ffe96e";filmRound(ctx,81,511,96,80,6);ctx.fill();ctx.strokeStyle="#ee6e86";ctx.lineWidth=5;ctx.beginPath();ctx.arc(128,543,21,0,Math.PI*2);ctx.stroke();filmLine(ctx,113,562,104,580,"#55bce0",5);filmLine(ctx,143,562,152,580,"#55bce0",5);
  for(let i=0;i<5;i++){ctx.fillStyle=["#ee7288","#5fc6e2","#f5ca44","#86cd75","#9e8ef4"][i];ctx.beginPath();ctx.arc(73+i*34,680+(i%2)*8,8,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle="#b77549";ctx.fillRect(940,621,980,26);ctx.fillStyle="#f3c48d";ctx.fillRect(940,647,980,30);ctx.fillStyle="#c27f50";filmRound(ctx,1014,674,850,132,12);ctx.fill();ctx.fillStyle="#a86543";ctx.fillRect(1044,695,792,103);
  for(let i=0;i<4;i++){ctx.fillStyle="#f0b677";ctx.beginPath();ctx.arc(1227+i*92,682,17,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#aa6547";ctx.lineWidth=4;ctx.beginPath();ctx.arc(1227+i*92,682,8,0,Math.PI*2);ctx.stroke();}
  ctx.fillStyle="#fff0c9";filmRound(ctx,1004,557,110,66,9);ctx.fill();ctx.fillStyle="#dac28f";ctx.beginPath();ctx.ellipse(1058,577,43,13,0,0,Math.PI*2);ctx.fill();
  const bowl=ctx.createLinearGradient(0,565,0,656);bowl.addColorStop(0,"#8de2e9");bowl.addColorStop(1,"#288fad");ctx.fillStyle=bowl;ctx.beginPath();ctx.moveTo(1510,575);ctx.quadraticCurveTo(1520,646,1581,649);ctx.quadraticCurveTo(1651,647,1664,575);ctx.closePath();ctx.fill();ctx.strokeStyle="#e4faf7";ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(1586,576,77,18,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#f4c85c";ctx.beginPath();ctx.ellipse(1586,575,68,12,0,0,Math.PI*2);ctx.fill();
  for(let i=0;i<8;i++){ctx.fillStyle="#375b98";ctx.beginPath();ctx.arc(1540+(i*37)%95,564+(i%3)*3,5,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle=filmGrad(ctx,0,800,0,1080,[[0,"#e0b579"],[1,"#a66b48"]]);ctx.fillRect(0,805,1920,275);
  for(let i=0;i<12;i++){ctx.strokeStyle="rgba(112,64,42,.19)";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,830+i*22);ctx.lineTo(1920,830+i*22);ctx.stroke();}
  for(let i=0;i<7;i++){ctx.strokeStyle="rgba(112,64,42,.14)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(i*290+40,805);ctx.lineTo(i*290+40,1080);ctx.stroke();}
  const sunbeam=ctx.createLinearGradient(220,350,900,970);sunbeam.addColorStop(0,"rgba(255,249,190,.23)");sunbeam.addColorStop(1,"rgba(255,249,190,0)");ctx.fillStyle=sunbeam;ctx.beginPath();ctx.moveTo(200,450);ctx.lineTo(600,450);ctx.lineTo(1100,1080);ctx.lineTo(560,1080);ctx.closePath();ctx.fill();
}
function renderFrame(time,frame,fps,ctx,width,height){
  const t=filmClamp(Number.isFinite(time)?time:frame/Math.max(1,fps),0,FILM_DURATION);
  const scale=Math.min(width/1920,height/1080),ox=(width-1920*scale)/2,oy=(height-1080*scale)/2;
  ctx.save();ctx.fillStyle="#8eddf7";ctx.fillRect(0,0,width,height);ctx.translate(ox,oy);ctx.scale(scale,scale);
  const chapter=t<36?"BREAKFAST IN THE KITCHEN":t<82?"THE GREAT ESCAPE":t<124?"CROSSING THE CREEK":t<170?"THE BLUEBERRY PATCH":t<216?"THE CATCHING PLAN":t<249?"GENTLE CATCH":"PICNIC TIME";
  const cuts=[36,82,124,170,216,249];
  function sceneFor(v){return v<36?0:v<82?1:v<124?2:v<170?3:v<216?4:v<249?5:6;}
  function paintScene(scene,alpha){
    ctx.save();ctx.globalAlpha*=alpha;
    const travel=scene===1?filmEase(36,82,t):scene===2?filmEase(82,124,t):scene===3?filmEase(124,170,t):scene===6?filmEase(249,276,t):0;
    const zoom=1.012+.01*Math.sin(t*.22+scene*.7)+(scene===3?filmEase(132,143,t)*(1-filmEase(153,162,t))*.035:0);
    const panX=(scene===1?filmMix(-20,50,travel):scene===2?filmMix(20,-10,travel):scene===3?filmMix(5,-24,travel):scene===6?filmMix(-8,14,travel):0)+Math.sin(t*.28+scene)*3;
    ctx.translate(960,540);ctx.scale(zoom,zoom);ctx.translate(-960+panX,-540+Math.sin(t*.24+scene)*2);
    if(scene===0){
      filmKitchen(ctx,t);
      filmPan(ctx,1285,637,.83,t,true);
      filmFox(ctx,655,959,1.11,t,"happy",t<25?"wave":"reach");
      filmBird(ctx,900,860,.88,t,"perch");
      filmTurtle(ctx,1690,949,.92,t,"wave");
      // Batter bubbles and steam rise in short, overlapping curls.
      for(let i=0;i<3;i++){const p=(t*.55+i*.33)%1,x=1280+i*18,y=548-p*76;ctx.strokeStyle="rgba(255,255,255,"+((1-p)*.58)+")";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y+16);ctx.bezierCurveTo(x-16,y+4,x+16,y-8,x,y-22);ctx.stroke();}
      if(t>29){const p=filmEase(29,35,t);filmPan(ctx,filmMix(1285,1480,p),filmMix(637,510,p),.83,t,false);filmPancake(ctx,filmMix(1285,1480,p),filmMix(584,470,p),.8,t,t*1.2,true);}
    }else if(scene===1){
      filmMeadow(ctx,t,0);filmTree(ctx,1610,720,1.25,true,t);
      // A readable silhouette trail sells the pancake's speed without obscuring it.
      const p=filmEase(36,82,t),px=filmMix(760,1540,p),py=filmMix(550,684,p)+Math.sin((t-36)*5)*46;
      for(let i=0;i<5;i++){const q=i+1;ctx.globalAlpha*=.1;filmPancake(ctx,px-q*42,py-q*18,.58,t-q*.12,t*4-q*.3,false);ctx.globalAlpha/=.1;}
      ctx.globalAlpha=alpha;filmPancake(ctx,px,py,.65,t,t*4.5,true);
      filmFox(ctx,filmMix(670,1015,filmEase(36,80,t)),930,1.08,t,t<46?"surprised":"focused","run");
      filmBird(ctx,filmMix(930,1390,filmEase(36,78,t)),filmMix(620,470,filmEase(36,78,t)),.8,t,"fly");
      filmTurtle(ctx,filmMix(380,650,filmEase(72,82,t)),951,1.02,t,"walk");
      for(let i=0;i<28;i++){const x=(filmHash(i+1601)*1920+t*(120+filmHash(i+1701)*70))%2000;const y=465+filmHash(i+1801)*350;filmLine(ctx,x,y,x-22,y-4,"rgba(255,255,255,.38)",2);}
      if(t>48&&t<64){ctx.save();ctx.globalAlpha=filmEase(48,51,t)*(1-filmEase(61,64,t));ctx.fillStyle="#fff3bb";ctx.font="1000 64px ui-rounded,system-ui,sans-serif";ctx.textAlign="center";ctx.fillText("SPROING!",990,340);ctx.restore();}
    }else if(scene===2){
      filmCreek(ctx,t,0);
      const p=filmEase(82,124,t),px=filmMix(890,1450,p),py=filmMix(624,602,p)+Math.sin(t*6)*18;
      filmPancake(ctx,px,py,.62,t,t*5,true);
      filmFox(ctx,filmMix(810,1050,p),931,1.04,t,t<96?"worried":"focused","run");
      filmBird(ctx,filmMix(1300,1385,p),filmMix(515,480,p),.79,t,"fly");
      filmTurtle(ctx,610,940,1.04,t,"wave");
      if(t>95&&t<116){filmString(ctx,px-60,py+15,1120,772,t);filmLine(ctx,1120,772,1270,758,"#f4d6a2",8);}
      for(let i=0;i<8;i++){const x=650+i*72,y=632+Math.sin(t*3+i)*4;filmLine(ctx,x,y,x+23,y-2,"rgba(255,255,255,.45)",2.2);}
    }else if(scene===3){
      filmBerryPatch(ctx,t);
      const p=filmEase(144,158,t),px=filmMix(1460,1240,p),py=filmMix(520,620,p)+Math.sin(t*2)*4;
      filmPancake(ctx,px,py,.68,t,t*.8,true);
      for(let i=0;i<6;i++){ctx.fillStyle=["#3f5595","#5f78bd","#293d81"][i%3];ctx.beginPath();ctx.arc(1390+i*16,495+Math.sin(i)*12,7,0,Math.PI*2);ctx.fill();}
      filmFox(ctx,filmMix(790,850,filmEase(124,143,t)),929,1.05,t,t<140?"worried":"focused","reach");
      filmBird(ctx,filmMix(1270,1190,filmEase(124,146,t)),580,.77,t,"fly");
      filmTurtle(ctx,1030,943,.99,t,"wave");
      if(t>138){const p2=filmEase(138,151,t);ctx.strokeStyle="#f0d6a0";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(1270,500);ctx.quadraticCurveTo(1255,470,1238+p2*20,448+p2*25);ctx.stroke();}
      for(let i=0;i<5;i++)filmButterfly(ctx,460+i*70,530+Math.sin(t*2+i)*32,.5,t,["#ff94b6","#a992ff","#ffca56","#72dfe7","#fff"][i]);
    }else if(scene===4){
      filmMillGlade(ctx,t);
      const px=filmMix(1400,1330,filmEase(170,214,t))+Math.sin(t*3)*34,py=filmMix(685,740,filmEase(170,214,t))-Math.abs(Math.sin(t*4))*65;
      filmPancake(ctx,px,py,.65,t,t*3.3,true);
      filmFox(ctx,760,934,1.05,t,t<188?"thinking":"happy","reach");
      filmBird(ctx,filmMix(1140,1330,filmEase(170,194,t)),filmMix(570,460,filmEase(170,194,t)),.82,t,"fly");
      filmTurtle(ctx,1090,944,1.0,t,"wave");
      // Each friend holds a corner of the folded picnic cloth; the cloth is the catch net.
      if(t>186){const p=filmEase(186,207,t);ctx.save();ctx.globalAlpha=p;filmCatchCloth(ctx,t);filmLine(ctx,804,775,760,838,"#fff0d2",5);filmLine(ctx,1375,770,1435,834,"#fff0d2",5);ctx.restore();}
      if(t>207){ctx.save();ctx.globalAlpha=filmEase(207,215,t);ctx.fillStyle="#fff8e6";ctx.font="900 30px ui-rounded,system-ui,sans-serif";ctx.textAlign="center";ctx.fillText("READY... STEADY...",1080,500);ctx.restore();}
    }else if(scene===5){
      filmMeadow(ctx,t,0);
      filmTree(ctx,330,770,.75,false,t);
      filmCatchCloth(ctx,t);
      const p=filmEase(216,234,t),px=filmMix(1400,1100,p),py=filmMix(610,665,p)+Math.sin(t*4)*10*(1-p);
      filmPancake(ctx,px,py,.67,t,t*4.1,true);
      filmPan(ctx,1185,728,.78,t,false);
      if(t>230){const q=filmEase(230,239,t);ctx.save();ctx.globalAlpha=q;filmPancake(ctx,1185,708,.64,t,t*.7,true);ctx.restore();}
      filmFox(ctx,filmMix(760,705,filmEase(216,248,t)),936,1.04,t,"happy","reach");
      filmBird(ctx,filmMix(1410,1080,filmEase(216,242,t)),filmMix(490,720,filmEase(216,242,t)),.79,t,"fly");
      filmTurtle(ctx,filmMix(1370,1255,filmEase(216,245,t)),948,.93,t,"wave");
      if(t>238){ctx.save();ctx.globalAlpha=filmEase(238,246,t);ctx.fillStyle="#fff5c2";ctx.font="1000 48px ui-rounded,system-ui,sans-serif";ctx.textAlign="center";ctx.fillText("WE CAUGHT IT!",965,352);ctx.restore();}
    }else{
      filmMeadow(ctx,t,0);filmTree(ctx,330,770,.75,false,t);
      filmPicnicTable(ctx,t);
      filmPancakeStack(ctx,1020,729,.94,t);
      // Syrup pot, berry bowls and mugs are laid out with clear foreground spacing.
      ctx.fillStyle="#e8f5ec";filmRound(ctx,765,710,58,38,8);ctx.fill();ctx.strokeStyle="#9ecbb8";ctx.lineWidth=4;filmRound(ctx,765,710,58,38,8);ctx.stroke();ctx.fillStyle="#b76d47";filmRound(ctx,780,715,28,25,4);ctx.fill();
      ctx.fillStyle="#b74f51";filmRound(ctx,1163,690,42,59,8);ctx.fill();ctx.fillStyle="#f7d7ad";filmRound(ctx,1168,682,32,15,5);ctx.fill();filmLine(ctx,1170,694,1195,735,"#ffe79b",4);
      for(let i=0;i<9;i++){ctx.fillStyle="#365da0";ctx.beginPath();ctx.arc(1200+(i%3)*13,722+Math.floor(i/3)*8,5.5,0,Math.PI*2);ctx.fill();}
      filmFox(ctx,605,961,1.08,t,"happy","wave");
      filmBird(ctx,1025,772,.88,t,"perch");
      filmTurtle(ctx,1370,955,.98,t,"wave");
      for(let i=0;i<5;i++)filmButterfly(ctx,330+i*290,424+Math.sin(t*1.8+i)*33,.5,t,["#ff94b6","#a992ff","#ffca56","#72dfe7","#fff"][i]);
      if(t>278){const p=filmEase(278,286,t);ctx.save();ctx.globalAlpha=p;ctx.fillStyle="rgba(255,249,225,.92)";filmRound(ctx,435,160,1050,180,28);ctx.fill();ctx.strokeStyle="#e9b45a";ctx.lineWidth=4;filmRound(ctx,435,160,1050,180,28);ctx.stroke();ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#267a5c";ctx.font="1000 60px ui-rounded,system-ui,sans-serif";ctx.fillText("PIP AND THE RUNAWAY PANCAKE",960,218);ctx.fillStyle="#d97954";ctx.font="800 24px ui-rounded,system-ui,sans-serif";ctx.fillText("A CLOVERFIELD MEADOW CARTOON",960,280);ctx.restore();}
    }
    ctx.restore();
  }
  const scene=sceneFor(t);let nearest=-1;for(let i=0;i<cuts.length;i++)if(Math.abs(t-cuts[i])<1.35){nearest=i;break;}
  if(nearest>=0){const p=filmEase(cuts[nearest]-1.35,cuts[nearest]+1.35,t);paintScene(nearest,1-p);paintScene(nearest+1,p);}else paintScene(scene,1);
  // Warm grade and subtle lens falloff, without muting the bright cartoon palette.
  const grade=ctx.createLinearGradient(0,0,0,1080);grade.addColorStop(0,"rgba(255,255,255,.035)");grade.addColorStop(.62,"rgba(255,249,232,0)");grade.addColorStop(1,"rgba(77,50,30,.10)");ctx.fillStyle=grade;ctx.fillRect(0,0,1920,1080);
  const vignette=ctx.createRadialGradient(960,520,370,960,520,1120);vignette.addColorStop(0,"rgba(0,0,0,0)");vignette.addColorStop(.84,"rgba(60,42,25,.025)");vignette.addColorStop(1,"rgba(60,42,25,.11)");ctx.fillStyle=vignette;ctx.fillRect(0,0,1920,1080);
  filmCaption(ctx,t,chapter);
  if(t>=291){ctx.save();ctx.globalAlpha=filmEase(291,296,t);ctx.fillStyle="rgba(255,249,226,.95)";filmRound(ctx,360,190,1200,210,28);ctx.fill();ctx.strokeStyle="#e6b45e";ctx.lineWidth=5;filmRound(ctx,360,190,1200,210,28);ctx.stroke();ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#267b5d";ctx.font="1000 62px ui-rounded,system-ui,sans-serif";ctx.fillText("PIP AND THE RUNAWAY PANCAKE",960,260);ctx.fillStyle="#c86d4c";ctx.font="800 24px ui-rounded,system-ui,sans-serif";ctx.fillText("A CLOVERFIELD MEADOW CARTOON",960,322);ctx.restore();}
  ctx.restore();
}
// PIP AND THE RAINBOW KITE — original five-minute cartoon short, 16:9.
// Hand-authored procedural 2D animation for TRILYVA. Deterministic by timestamp.
// Character acting, layered painted backgrounds, camera easing, story beats and subtitles.
// No network, image, font or runtime dependencies.

const FILM_DURATION = 300;
const FILM_CUES = [
[1,"NARRATOR","In Cloverfield Meadow, Pip was making a kite for the Spring Sky Day."],
[8,"PIP","This sky needs something colourful!"],
[16,"OLLIE","A tail of ribbons! Every colour can dance."],
[25,"NARRATOR","They folded, tied and tested a little rainbow kite, bright as a box of crayons."],
[35,"PIP","Ready, steady, up you go!"],
[43,"NARRATOR","The kite caught a wiggly wind. Then came one big WOOOOSH, and it danced right out of Pip's paws."],
[52,"PIP","My kite! Wait, little rainbow!"],
[59,"OLLIE","I can fly ahead, but I cannot pull it down alone."],
[68,"NARRATOR","Across the meadow, the kite fluttered to a willow branch above the bubbling brook."],
[77,"TUCK","We can solve it together. Slow feet, clever ideas."],
[86,"PIP","I'll hold the branch, Ollie will guide, and Tuck can steady the log."],
[97,"NARRATOR","They crossed the little brook on a broad, dry log, one friend at a time."],
[106,"OLLIE","Left a little! Now just a tiny bit right!"],
[115,"NARRATOR","A breezy gust lifted the kite again, carrying it to the flower path."],
[124,"PIP","Oh! Another snag? This time, we'll be gentle."],
[133,"NARRATOR","The silky string looped around a thorny rose stem. Tugging would tear the kite."],
[142,"TUCK","I'll hold the stem still. Pip, lift the ribbon; Ollie, take the loose end."],
[151,"PIP","Easy does it... a little up... and we're free!"],
[160,"NARRATOR","The friends repaired the bent tail with petals, leaves, and their spare ribbons."],
[169,"NARRATOR","Then the sky turned silver. A soft rain pattered through the meadow."],
[178,"PIP","Our kite is getting damp. Let's find a warm, dry place."],
[187,"NARRATOR","Beneath the old willow, the friends folded the kite safely while raindrops danced on the leaves."],
[196,"OLLIE","Plip, plop, plip! The rain is making a rhythm."],
[205,"PIP","We can make something beautiful while we wait."],
[214,"NARRATOR","Together they patched a tiny tear, smoothed each corner, and tied the last loose ribbon."],
[223,"TUCK","A good plan takes patience... and friends who hold things steady."],
[232,"NARRATOR","The rain passed. Sunlight peeked through the clouds, and a rainbow stretched over Cloverfield."],
[241,"PIP","Look! The sky made a rainbow of its own!"],
[250,"OLLIE","Our kite can join it!"],
[258,"NARRATOR","They returned to the hill where the breeze was gentle, not wild."],
[267,"PIP","This time, everyone holds a piece of the string."],
[276,"NARRATOR","One, two, three—up rose the rainbow kite, bright against the morning sky."],
[286,"TUCK","Teamwork looks wonderful from down here!"],
[292,"PIP","And it's even better when everyone gets to fly."],
[297,"NARRATOR","In Cloverfield Meadow, every colour had a friend, and every friend had a place in the sky."]
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
function filmBriar(ctx,t){
  filmMeadow(ctx,t,.04);
  // A friendly flower arch, not a dangerous-looking wall of thorns.
  ctx.fillStyle="#3e984b";ctx.beginPath();ctx.moveTo(1145,880);ctx.bezierCurveTo(1110,650,1205,450,1390,398);ctx.bezierCurveTo(1510,382,1600,460,1640,590);ctx.lineWidth=35;ctx.strokeStyle="#3e984b";ctx.stroke();ctx.closePath();
  for(let i=0;i<19;i++){
    const x=1165+i*25,y=600+Math.sin(i*.4)*90;
    ctx.fillStyle=i%2?"#4ca951":"#73c45b";ctx.beginPath();ctx.ellipse(x,y,26,12,Math.sin(i)*.5,0,Math.PI*2);ctx.fill();
    if(i%3===0){ctx.fillStyle="#e96d8c";ctx.beginPath();ctx.arc(x+8,y-8,12,0,Math.PI*2);ctx.arc(x+20,y-6,10,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ffe7a3";ctx.beginPath();ctx.arc(x+14,y-7,5,0,Math.PI*2);ctx.fill();}
    const thx=x+12;filmLine(ctx,thx,y-2,thx+17,y-13,"#2f7f41",3);
  }
  for(let i=0;i<14;i++){const x=1210+i*29,y=880-filmHash(i+51)*120;filmFlower(ctx,x,y,.44+filmHash(i+66)*.22,["#ff7c9b","#ffd967","#a99cff"][i%3],t+i);}
}
function filmStormShelter(ctx,t){
  filmMeadow(ctx,t,.85);
  // Low camera and a large willow canopy create a protected, intimate pocket.
  filmTree(ctx,510,1010,2.35,true,t);
  const shade=ctx.createLinearGradient(0,420,0,1080);shade.addColorStop(0,"rgba(24,67,72,.18)");shade.addColorStop(1,"rgba(19,62,52,.55)");ctx.fillStyle=shade;ctx.fillRect(260,420,1240,660);
  // Rain runs past the canopy, not through the friends' safe space.
  for(let i=0;i<100;i++){const x=(filmHash(i+1121)*1600+t*(130+filmHash(i+1221)*70))%1600+180,y=(filmHash(i+1321)*640+t*(180+filmHash(i+1421)*80))%700;filmLine(ctx,x,y,x-8,y+22,"rgba(230,246,255,.32)",1.6);}
  for(let i=0;i<9;i++){const x=590+i*92,y=985+Math.sin(i)*7;ctx.fillStyle=i%2?"#e4c18b":"#cda36c";ctx.beginPath();ctx.ellipse(x,y,19,7,-.15,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle="rgba(255,231,166,.12)";ctx.beginPath();ctx.ellipse(1000,875,400,165,0,0,Math.PI*2);ctx.fill();
}
function filmRainbow(ctx,t,amount){
  if(amount<=0)return;ctx.save();ctx.globalAlpha=amount*.86;ctx.lineCap="round";
  const cx=970,cy=810,r=635,widths=[32,29,27,25,24,22,19],colors=["#f34e59","#ff9f43","#ffe55c","#71d777","#5dd6ee","#6688fa","#ae76ef"];
  for(let i=0;i<colors.length;i++){ctx.strokeStyle=colors[i];ctx.lineWidth=widths[i];ctx.beginPath();ctx.arc(cx,cy,r-i*27,Math.PI,Math.PI*2);ctx.stroke();}
  ctx.globalAlpha=amount*.24;ctx.strokeStyle="#fff";ctx.lineWidth=13;ctx.beginPath();ctx.arc(cx,cy,r+9,Math.PI+.12,Math.PI*1.72);ctx.stroke();ctx.restore();
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
  if(mood==="surprised")ctx.ellipse(18,-89,5,7,0,0,Math.PI*2);else ctx.arc(15,-94,10,.2,Math.PI-.2);
  ctx.stroke();
  ctx.restore();
  // Small paw pads are visible when Pip reaches up.
  if(reach||wave){ctx.fillStyle="#ffe7be";ctx.beginPath();ctx.arc(x+(wave?39:-52)*s,y-120*s,5*s,0,Math.PI*2);ctx.fill();}
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
  ctx.strokeStyle="#337b4c";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(59,-26);ctx.quadraticCurveTo(65,-22,71,-27);ctx.stroke();
  if(pose==="wave"){ctx.strokeStyle="#69b95e";ctx.lineWidth=8;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(26,-46);ctx.quadraticCurveTo(38,-63,42+Math.sin(t*7)*4,-73);ctx.stroke();}
  ctx.restore();
}
function filmKite(ctx,x,y,s,t,tilt,tailOn){
  ctx.save();ctx.translate(x,y);ctx.rotate(tilt+Math.sin(t*2.6)*.045);ctx.scale(s,s);
  // The kite has sewn fabric panels, a wooden spine, edge stitching and individually animated bows.
  const cloth=ctx.createLinearGradient(-60,-112,62,112);cloth.addColorStop(0,"#fff9db");cloth.addColorStop(.5,"#f3f4ff");cloth.addColorStop(1,"#d8efff");
  ctx.fillStyle=cloth;ctx.beginPath();ctx.moveTo(0,-120);ctx.quadraticCurveTo(45,-52,72,0);ctx.quadraticCurveTo(45,57,0,111);ctx.quadraticCurveTo(-47,57,-72,0);ctx.quadraticCurveTo(-44,-59,0,-120);ctx.closePath();ctx.fill();
  const panes=[["#f34f60",[-70,0,0,-120,0,0]],["#ff9e43",[0,-120,72,0,0,0]],["#ffe35b",[-72,0,0,0,0,110]],["#55cf80",[0,0,72,0,0,110]],["#55cdee",[0,-120,0,0,-72,0]],["#9380f6",[0,0,0,110,-72,0]]];
  panes.forEach(p=>{ctx.fillStyle=p[0];ctx.beginPath();ctx.moveTo(p[1][0],p[1][1]);ctx.lineTo(p[1][2],p[1][3]);ctx.lineTo(p[1][4],p[1][5]);ctx.closePath();ctx.fill();});
  ctx.save();ctx.globalAlpha=.28;ctx.strokeStyle="#fff";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-29,-63);ctx.lineTo(-4,-87);ctx.stroke();ctx.restore();
  ctx.strokeStyle="#8d6c49";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-120);ctx.lineTo(0,110);ctx.moveTo(-72,0);ctx.lineTo(72,0);ctx.stroke();
  ctx.strokeStyle="rgba(255,255,255,.75)";ctx.lineWidth=2;ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(0,-110);ctx.quadraticCurveTo(51,-40,62,0);ctx.quadraticCurveTo(40,55,0,100);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle="#fff8d7";ctx.beginPath();ctx.arc(0,-2,10,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ff9e43";ctx.beginPath();ctx.arc(0,-2,4,0,Math.PI*2);ctx.fill();
  if(tailOn!==false){
    ctx.strokeStyle="#fff2c7";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,108);ctx.bezierCurveTo(-12,158+Math.sin(t*4)*12,23,185,0,219+Math.sin(t*3)*13);ctx.stroke();
    const bowColors=["#f34f60","#ff9e43","#ffe35b","#55cf80","#55cdee","#9380f6"];
    for(let i=0;i<6;i++){const by=130+i*19,flap=Math.sin(t*7+i*1.4)*.16;ctx.save();ctx.translate(Math.sin(t*2.7+i)*9,by);ctx.rotate(flap);ctx.fillStyle=bowColors[i];ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-12,11);ctx.lineTo(0,9);ctx.lineTo(12,13);ctx.closePath();ctx.fill();ctx.restore();}
  }
  // Fine thread runs from the keel into the scene; it never obscures the face.
  ctx.strokeStyle="rgba(99,92,105,.75)";ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(0,112);ctx.bezierCurveTo(-9,145,-22,168,-18,192);ctx.stroke();
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
function renderFrame(time,frame,fps,ctx,width,height){
  const t=filmClamp(Number.isFinite(time)?time:frame/Math.max(1,fps),0,FILM_DURATION);
  const scale=Math.min(width/1920,height/1080),ox=(width-1920*scale)/2,oy=(height-1080*scale)/2;
  const storm=filmEase(169,183,t)*(1-filmEase(210,228,t)),sunbreak=filmEase(222,247,t);
  ctx.save();ctx.fillStyle="#8eddf7";ctx.fillRect(0,0,width,height);ctx.translate(ox,oy);ctx.scale(scale,scale);
  const chapter=t<36?"THE KITE":t<82?"WILD WIND":t<124?"THE BROOK":t<170?"THE FLOWER PATH":t<216?"RAINY DAY":t<249?"A RAINBOW BREAK": "SPRING SKY DAY";
  const cuts=[36,82,124,170,216,249];
  function sceneFor(v){return v<36?0:v<82?1:v<124?2:v<170?3:v<216?4:v<249?5:6;}
  function paintScene(scene,alpha){
    ctx.save();ctx.globalAlpha*=alpha;
    const travel=scene===1?filmEase(36,82,t):scene===2?filmEase(82,124,t):scene===3?filmEase(124,170,t):scene===6?filmEase(249,276,t):0;
    const zoom=1.015+.012*Math.sin(t*.25+scene*.7),panX=(scene===1?filmMix(-18,70,travel):scene===2?filmMix(30,-15,travel):scene===3?filmMix(10,-20,travel):scene===6?filmMix(-12,16,travel):0)+Math.sin(t*.33+scene)*4;
    const panY=Math.sin(t*.24+scene)*3+storm*Math.sin(t*17)*1.4;
    ctx.translate(960,540);ctx.scale(zoom,zoom);ctx.translate(-960+panX,-540+panY);
    if(scene===0){
      filmMeadow(ctx,t,0);filmTree(ctx,330,770,.75,false,t);
      // A low craft table makes the kite assembly clear at a glance.
      ctx.fillStyle="#e4b273";filmRound(ctx,1110,696,272,25,8);ctx.fill();ctx.fillStyle="#a76e42";ctx.fillRect(1134,718,18,130);ctx.fillRect(1342,718,18,130);
      ctx.strokeStyle="#cf965c";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(1134,720);ctx.lineTo(1150,847);ctx.moveTo(1343,720);ctx.lineTo(1357,847);ctx.stroke();
      for(let i=0;i<5;i++){filmRibbon(ctx,1165+i*43,683,.7,t+i);ctx.fillStyle=["#f34f60","#ff9e43","#ffe35b","#55cf80","#9380f6"][i];ctx.fillRect(1148+i*43,660,17,4);}
      filmFox(ctx,790,878,1.18,t,"happy","wave");filmBird(ctx,1025,765,.98,t,"perch");
      const k=filmEase(23,36,t);filmKite(ctx,1262,650-k*105,.66,t,-.18-k*.45,true);
      if(t>27){ctx.strokeStyle="rgba(74,81,101,.7)";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(790,792);ctx.quadraticCurveTo(950,750,1110,706);ctx.stroke();}
      for(let i=0;i<4;i++)filmButterfly(ctx,420+i*65,465+Math.sin(t*1.8+i)*30,.65,t,["#ff94b6","#a992ff","#ffca56","#72dfe7"][i]);
    }else if(scene===1){
      filmMeadow(ctx,t,.04);filmTree(ctx,1625,718,1.42,true,t);
      // Wind reads through grass lean, ribbon tails and a moving kite arc.
      for(let i=0;i<36;i++){const x=(i*61+t*150)%2020-50,y=500+(i%7)*43;filmLine(ctx,x,y,x+38,y-5,"rgba(255,255,255,.45)",2);}
      const p=filmEase(36,82,t),kx=filmMix(980,1492,p),ky=filmMix(445,370,p)+Math.sin(t*4.1)*22;
      filmKite(ctx,kx,ky,filmMix(.72,.88,p),t,-.55+Math.sin(t*2.5)*.09,true);
      filmString(ctx,kx-4,ky+155,filmMix(827,1360,p),filmMix(823,690,p),t);
      filmFox(ctx,filmMix(770,1125,p),870,1.12,t,t>42?"surprised":"happy","run");
      filmBird(ctx,filmMix(1010,1408,p),filmMix(616,482,p),.86,t,"fly");
      if(t>49&&t<68){ctx.save();ctx.globalAlpha=filmEase(49,53,t)*(1-filmEase(64,68,t));ctx.fillStyle="#fff6bf";ctx.font="1000 67px ui-rounded,system-ui,sans-serif";ctx.textAlign="center";ctx.fillText("WOOOOSH!",1000,340);ctx.restore();}
    }else if(scene===2){
      filmCreek(ctx,t,0);filmTree(ctx,1480,715,1.55,true,t);
      // Kite catches on a low, reachable willow branch across the brook.
      filmLine(ctx,1314,467,1557,420,"#85522f",13);filmLine(ctx,1335,463,1548,430,"#b77942",5);
      const kx=1464+Math.sin(t*1.4)*5,ky=421+Math.sin(t*2.3)*4;
      filmKite(ctx,kx,ky,.72,t,.55,true);
      filmFox(ctx,filmMix(780,1050,filmEase(86,110,t)),899,1.05,t,t<97?"worried":"focused","reach");
      filmBird(ctx,filmMix(1000,1370,filmEase(88,108,t)),filmMix(575,480,filmEase(88,108,t)),.8,t,"fly");
      filmTurtle(ctx,620,900,1.1,t,t>94?"wave":"walk");
      if(t>92&&t<112){filmString(ctx,1030,818,1450,515,t);}
      // A small orange dragonfly skims the creek between the stepping stones.
      filmButterfly(ctx,690+Math.sin(t*2)*22,580+Math.sin(t*3)*12,.56,t,"#ffae48");
    }else if(scene===3){
      filmBriar(ctx,t);
      filmKite(ctx,1430,424,.74,t,.66,true);
      filmFox(ctx,790,900,1.06,t,t<139?"worried":"focused","reach");
      filmBird(ctx,1260,590,.78,t,"fly");
      filmTurtle(ctx,1030,918,.98,t,"wave");
      // Pip lifts a leafy stem; Ollie eases the string free. No tearing or yanking.
      ctx.strokeStyle="#8e5c39";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(1370,486);ctx.quadraticCurveTo(1330,435,1370,385);ctx.stroke();
      if(t>139){const p=filmEase(142,155,t);filmLine(ctx,1335,440,1310-p*35,390-p*45,"#3ea65b",9);}
      for(let i=0;i<6;i++)filmRibbon(ctx,740+i*52,824,.56,t+i);
      if(t>151){const p=filmEase(151,160,t);filmKite(ctx,filmMix(1430,1230,p),filmMix(424,430,p),.74,t,.3-p*.35,true);}
    }else if(scene===4){
      filmStormShelter(ctx,t);
      filmFox(ctx,790,904,1.05,t,t<180?"worried":"happy","wave");
      filmBird(ctx,1000,834,.86,t,"perch");filmTurtle(ctx,1177,920,.92,t,"wave");
      // Kite is folded into a broad leaf wrap and kept off the wet grass.
      ctx.fillStyle="#3c9a58";ctx.beginPath();ctx.ellipse(1360,890,108,34,-.08,0,Math.PI*2);ctx.fill();
      filmKite(ctx,1360,825,.35,t,.1,false);
      for(let i=0;i<8;i++){const px=1300+i*18,py=927+Math.sin(t*4+i)*3;ctx.fillStyle=["#f34f60","#ff9e43","#ffe35b","#55cf80","#55cdee","#9380f6"][i%6];filmRound(ctx,px,py,22,8,4);ctx.fill();}
      filmPuddle(ctx,640,1025,95,t);filmPuddle(ctx,1110,1033,72,t);
      if(t>193){ctx.save();ctx.globalAlpha=filmEase(193,200,t);ctx.fillStyle="rgba(255,225,111,.28)";ctx.beginPath();ctx.ellipse(1000,810,280,150,0,0,Math.PI*2);ctx.fill();ctx.restore();}
    }else if(scene===5){
      filmMeadow(ctx,t,.02);filmTree(ctx,330,770,.75,false,t);
      filmRainbow(ctx,t,filmEase(222,238,t));
      filmFox(ctx,750,900,1.08,t,"happy","wave");filmBird(ctx,1010,770,.82,t,"perch");filmTurtle(ctx,1185,930,.93,t,"wave");
      // The patched kite has a clearly visible flower medallion and new petal tail bows.
      filmKite(ctx,1330,585,.62,t,-.24,true);
      for(let i=0;i<9;i++)filmFlower(ctx,950+i*39,882+Math.sin(i)*7,.42,["#ff8aa6","#ffdf71","#93dc83","#8d9af5"][i%4],t+i);
      if(t>230){ctx.globalAlpha=filmEase(230,246,t);filmGlow(ctx,1450,510,260,"rgba(255,241,168,.55)");ctx.globalAlpha=1;}
    }else{
      filmMeadow(ctx,t,0);filmRainbow(ctx,t,filmEase(232,259,t));
      // Wide finale staging: all friends hold the same thread and look toward their kite.
      const lift=filmEase(260,280,t),kx=filmMix(1250,1060,lift),ky=filmMix(460,235,lift)+Math.sin(t*3)*8;
      filmKite(ctx,kx,ky,.84,t,-.28+Math.sin(t*2)*.035,true);
      filmString(ctx,kx-6,ky+175,filmMix(762,725,lift),760,t);
      filmFox(ctx,filmMix(760,715,lift),900,1.05,t,"happy","wave");
      filmBird(ctx,filmMix(1050,1015,lift),filmMix(780,722,lift),.8,t,"fly");
      filmTurtle(ctx,filmMix(1240,1208,lift),929,.92,t,"wave");
      filmLine(ctx,762,780,1030,791,"#e7cb8c",2);filmLine(ctx,1030,791,1208,824,"#e7cb8c",2);
      for(let i=0;i<7;i++)filmFlower(ctx,455+i*63,915+Math.sin(i)*10,.55,["#ff8aa6","#ffdf71","#93dc83","#8d9af5"][i%4],t+i);
      for(let i=0;i<5;i++)filmButterfly(ctx,480+i*255,420+Math.sin(t*2+i)*42,.56,t,["#ff94b6","#a992ff","#ffca56","#72dfe7","#fff"][i]);
      if(t>278){const p=filmEase(278,286,t);ctx.save();ctx.globalAlpha=p;ctx.fillStyle="rgba(255,250,227,.9)";ctx.font="900 42px ui-rounded,system-ui,sans-serif";ctx.textAlign="center";ctx.fillText("HURRAY, CLOVERFIELD!",960,168);ctx.restore();}
    }
    ctx.restore();
  }
  const s=sceneFor(t);let nearest=-1;for(let i=0;i<cuts.length;i++)if(Math.abs(t-cuts[i])<1.4){nearest=i;break;}
  if(nearest>=0){const p=filmEase(cuts[nearest]-1.4,cuts[nearest]+1.4,t);paintScene(nearest,1-p);paintScene(nearest+1,p);}else paintScene(s,1);
  // Gentle lens bloom, softened corners, tiny air particles; colours stay fully saturated.
  const grade=ctx.createLinearGradient(0,0,0,1080);grade.addColorStop(0,"rgba(255,255,255,.025)");grade.addColorStop(.6,"rgba(255,249,232,0)");grade.addColorStop(1,"rgba(26,68,55,.13)");ctx.fillStyle=grade;ctx.fillRect(0,0,1920,1080);
  const vignette=ctx.createRadialGradient(960,520,300,960,520,1120);vignette.addColorStop(0,"rgba(0,0,0,0)");vignette.addColorStop(.82,"rgba(18,49,45,.025)");vignette.addColorStop(1,"rgba(18,49,45,.18)");ctx.fillStyle=vignette;ctx.fillRect(0,0,1920,1080);
  if(t>=291){ctx.save();ctx.globalAlpha=filmEase(291,296,t);ctx.fillStyle="rgba(255,250,225,.92)";filmRound(ctx,380,260,1160,330,28);ctx.fill();ctx.strokeStyle="#f2c74b";ctx.lineWidth=5;filmRound(ctx,380,260,1160,330,28);ctx.stroke();ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#227f5e";ctx.font="1000 64px ui-rounded,system-ui,sans-serif";ctx.fillText("PIP AND THE RAINBOW KITE",960,380);ctx.fillStyle="#ef9250";ctx.font="800 24px ui-rounded,system-ui,sans-serif";ctx.fillText("A CLOVERFIELD MEADOW ADVENTURE",960,447);for(let i=0;i<7;i++)filmFlower(ctx,700+i*87,520,.44,["#ff6f8e","#ffa943","#f6dd5c","#6ad778","#55cdee","#8b86f7"][i%6],t+i);ctx.restore();}
  filmCaption(ctx,t,chapter);ctx.restore();
}
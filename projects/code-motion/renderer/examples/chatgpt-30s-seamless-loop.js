// CHATGPT — 30-second seamless advertisement edit for TRILYVA.
// What this does: creates a complete, multi-shot, kinetic-typography tech advert.
// Original procedural artwork only. No external images, fonts, libraries, or random state.
// TRILYVA contract: renderFrame(time, frame, fps, ctx, width, height).
// Edit language: cuts, camera pushes, wipes, scan lines, parallax layers, typography and beat pulses.
// The 30-second seam is intentional: the first and final shot share the same visual state.

function renderFrame(time, frame, fps, ctx, width, height) {
  "use strict";
  var D = 30, TAU = Math.PI * 2, W = 1920, H = 1080;
  var t = ((Number.isFinite(time) ? time : (Number(frame) || 0) / Math.max(1, fps || 60)) % D + D) % D;
  var beat = 60 / 120;
  var beatPulse = Math.pow(Math.max(0, Math.cos(t * TAU / beat)), 12);
  var scene = t < 3 ? 0 : t < 6 ? 1 : t < 10 ? 2 : t < 14 ? 3 : t < 18 ? 4 : t < 22 ? 5 : t < 26 ? 6 : t < 28.5 ? 7 : 8;
  var local = [t, t-3, t-6, t-10, t-14, t-18, t-22, t-26, t-28.5][scene];
  var ease = function(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  var clamp = function(x,a,b){return Math.max(a,Math.min(b,x));};
  var mix = function(a,b,x){return a+(b-a)*x;};
  var hash = function(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
  var scale = Math.min(width/W,height/H), ox=(width-W*scale)/2, oy=(height-H*scale)/2;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle="#050507";ctx.fillRect(0,0,width,height);
  ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.lineCap="round";ctx.lineJoin="round";
  var bg=ctx.createRadialGradient(960,450,20,960,450,1050);
  bg.addColorStop(0, scene===3||scene===5?"#181820":"#111116");bg.addColorStop(0.6,"#08080c");bg.addColorStop(1,"#030304");
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

  function text(str,x,y,size,alpha,align,font,weight){
    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle="#f6f6fa";ctx.textAlign=align||"left";ctx.textBaseline="middle";
    ctx.font=(weight||500)+" "+size+"px "+(font||'ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif');
    ctx.fillText(str,x,y);ctx.restore();
  }
  function line(x1,y1,x2,y2,alpha,w){
    ctx.save();ctx.strokeStyle="rgba(255,255,255,"+alpha+")";ctx.lineWidth=w||1;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
  }
  function grid(alpha,offset){
    ctx.save();ctx.strokeStyle="rgba(255,255,255,"+alpha+")";ctx.lineWidth=1;
    for(var x=-120;x<W+120;x+=80){ctx.beginPath();ctx.moveTo(x+offset%80,0);ctx.lineTo(x+offset%80,H);ctx.stroke();}
    for(var y=0;y<=H;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.restore();
  }
  function grainDots(amount,seed,alpha){
    ctx.save();ctx.fillStyle="rgba(255,255,255,"+alpha+")";
    for(var i=0;i<amount;i++){var x=hash(i+seed)*W,y=hash(i+seed+2000)*H,r=0.7+hash(i+seed+5000)*1.4;ctx.globalAlpha=alpha*(0.3+hash(i+seed+9000)*0.7);ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
    ctx.restore();
  }
  function bloom(x,y,r,alpha){
    var g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,"rgba(255,255,255,"+alpha+")");g.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  function glitchTitle(a,b,sub,x,y,size,progress){
    var enter=ease(progress/.22),leave=1-ease((progress-.76)/.24),v=enter*leave;
    ctx.save();ctx.translate(x+(1-enter)*150,y);ctx.globalAlpha=v;
    if(progress<.3){ctx.globalAlpha=v*.35;text(a,x+8,y,size,1,"left",undefined,700);text(a,x-7,y+2,size,1,"left",undefined,700);}
    text(a,x,y,size,v,"left",undefined,700);text(b,x,y+size*.96,size*.82,v*.86,"left",undefined,700);
    text(sub,x,y+size*1.85,17,v*.72,"left",'ui-monospace,SFMono-Regular,Menlo,monospace',500);ctx.restore();
  }
  function ribbonMark(cx,cy,r,rot,alpha){
    ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);
    for(var k=0;k<6;k++){ctx.save();ctx.rotate(k*TAU/6);
      ctx.beginPath();ctx.ellipse(0,0,r*.72,r*.37,0,0,TAU);
      ctx.strokeStyle="rgba(0,0,0,"+(alpha*.85)+")";ctx.lineWidth=r*.13;ctx.stroke();
      var g=ctx.createLinearGradient(-r*.7,-r*.3,r*.7,r*.3);g.addColorStop(0,"#6b6b75");g.addColorStop(.48,"#fff");g.addColorStop(1,"#9999a4");
      ctx.strokeStyle=g;ctx.lineWidth=r*.07;ctx.shadowColor="#fff";ctx.shadowBlur=16;ctx.stroke();ctx.shadowBlur=0;ctx.restore();}
    ctx.restore();
  }
  function drawTerminal(x,y,w,h,progress){
    ctx.save();ctx.translate(x,y);ctx.rotate(-.025);ctx.fillStyle="#0b0b10";ctx.strokeStyle="rgba(255,255,255,.32)";ctx.lineWidth=1.4;
    ctx.fillRect(0,0,w,h);ctx.strokeRect(0,0,w,h);ctx.fillStyle="#202027";ctx.fillRect(0,0,w,42);
    for(var i=0;i<3;i++){ctx.beginPath();ctx.fillStyle=["#eee","#777","#444"][i];ctx.arc(20+i*18,21,4,0,TAU);ctx.fill();}
    text("idea.py",w/2,21,12,.55,"center",'ui-monospace,monospace',500);
    var rows=["def imagine(problem):","    context = understand(problem)","    ideas = explore(context)","    draft = build(ideas)","    return refine(draft)"];
    for(var j=0;j<rows.length;j++){
      ctx.globalAlpha=.4+.6*ease(progress*1.3-j*.13);
      text(rows[j],26,82+j*48,18,j===0?1:.7,"left",'ui-monospace,SFMono-Regular,Menlo,monospace',500);
    }
    ctx.globalAlpha=1;ctx.fillStyle="#fff";ctx.fillRect(27,332,8,22*(.5+.5*Math.sin(t*TAU*2)));ctx.restore();
  }
  function drawCards(progress){
    var cards=[
      {x:260,y:280,w:340,h:400,label:"WRITE",sub:"A thought becomes words",n:0},
      {x:790,y:190,w:340,h:400,label:"CODE",sub:"An idea becomes real",n:1},
      {x:1320,y:280,w:340,h:400,label:"CREATE",sub:"A blank page becomes more",n:2}
    ];
    for(var i=0;i<cards.length;i++){
      var c=cards[i],e=ease((progress-i*.15)/.35),yy=c.y+(1-e)*130;
      ctx.save();ctx.globalAlpha=e;ctx.translate(c.x,yy);ctx.rotate((i-1)*.035);
      ctx.fillStyle="#111116";ctx.strokeStyle="rgba(255,255,255,.3)";ctx.lineWidth=1.2;ctx.fillRect(0,0,c.w,c.h);ctx.strokeRect(0,0,c.w,c.h);
      text("0"+(i+1),22,30,11,.55,"left",'ui-monospace,monospace',500);
      line(22,54,c.w-22,54,.18);
      if(i===0){
        text("The next",28,124,29,.95,"left",undefined,500);text("great idea",28,164,29,.95,"left",undefined,500);
        for(var k=0;k<5;k++)line(28,220+k*24,80+hash(k+7)*190,220+k*24,.26,3);
      }else if(i===1){
        for(var k2=0;k2<7;k2++){ctx.fillStyle="rgba(255,255,255,"+(.18+.08*(k2%3))+")";ctx.fillRect(26,100+k2*31,70+hash(k2+20)*180,5);}
        ctx.strokeStyle="rgba(255,255,255,.7)";ctx.strokeRect(27,342,70,25);
      }else{
        var cx=c.w/2,cy=215; bloom(cx,cy,120,.14);ribbonMark(cx,cy,86,t*.16,.9);
      }
      line(22,c.h-65,c.w-22,c.h-65,.2);text(c.label,22,c.h-43,14,.95,"left",'ui-monospace,monospace',600);
      text(c.sub,22,c.h-18,10,.55,"left",'ui-monospace,monospace',400);ctx.restore();
    }
  }
  function scanWipe(progress,fromRight){
    var x=fromRight?W*(1-ease(progress)):W*ease(progress);
    var g=ctx.createLinearGradient(x-150,0,x+150,0);g.addColorStop(0,"rgba(255,255,255,0)");g.addColorStop(.5,"rgba(255,255,255,.22)");g.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=g;ctx.fillRect(x-150,0,300,H);
  }
  function frameCorners(label,number){
    line(68,72,160,72,.6,2);line(68,72,68,164,.6,2);
    line(W-68,72,W-160,72,.6,2);line(W-68,72,W-68,164,.6,2);
    text("CHATGPT / "+label,80,98,12,.62,"left",'ui-monospace,monospace',600);
    text(number+" / 08",W-80,98,12,.62,"right",'ui-monospace,monospace',600);
  }

  // Beat-synced micro-pulses, a consistent grain layer, and a slow camera drift tie shots together.
  ctx.save();ctx.translate(Math.sin(t*TAU/10)*10,Math.cos(t*TAU/15)*7);
  grid(.035,t*80/30);grainDots(150,41,.13);
  if(scene===0){
    // SHOT 01 — cold open: a single pulse grows from black; this exact state returns at 30s.
    var pulse=Math.pow(Math.max(0,Math.cos(t*TAU/3)),10);
    bloom(960,500,90+240*ease(t/2.6),.12+.15*pulse);
    ctx.save();ctx.translate(960,500);
    for(var i=0;i<48;i++){var ang=i*TAU/48+t*.08,rr=120+65*Math.sin(t*2+i*.8);ctx.beginPath();ctx.fillStyle="rgba(255,255,255,"+(.2+.6*hash(i)) +")";ctx.arc(Math.cos(ang)*rr,Math.sin(ang)*rr,1+2*hash(i+9),0,TAU);ctx.fill();}
    ctx.restore();
    var reveal=ease(t/1.25);ctx.save();ctx.globalAlpha=reveal;text("AN IDEA",960,690,22,.75,"center",'ui-monospace,monospace',500);ctx.restore();
    ctx.beginPath();ctx.strokeStyle="rgba(255,255,255,"+(.25+.7*pulse)+")";ctx.lineWidth=1+beatPulse*2;ctx.arc(960,500,28+70*ease(t/2.5),0,TAU);ctx.stroke();
    frameCorners("SIGNAL","01");
  }else if(scene===1){
    // SHOT 02 — kinetic title slams in with offset ghost frames and a fast diagonal wipe.
    ctx.save();ctx.translate(960,470);ctx.rotate(-.09);ctx.fillStyle="rgba(255,255,255,.04)";ctx.fillRect(-900,-130,1800,250);ctx.restore();
    glitchTitle("WHAT IF","YOU COULD…","THINK BEYOND THE OBVIOUS",240,360,104,local/3);
    scanWipe(local/3,true);frameCorners("POSSIBILITY","02");
  }else if(scene===2){
    // SHOT 03 — high-energy editorial montage: code, UI frames and sharp camera movement.
    var cam=ease(local/4);ctx.save();ctx.translate(-90+cam*60,20);ctx.rotate(-.035);
    drawTerminal(170,190,690,430,local/4);ctx.restore();
    ctx.save();ctx.translate(1030,120);ctx.rotate(.055);
    ctx.strokeStyle="rgba(255,255,255,.48)";ctx.lineWidth=2;ctx.strokeRect(0,0,570,600);
    text("PROMPT / 001",28,35,12,.55,"left",'ui-monospace,monospace',500);
    for(var row=0;row<10;row++){var ww=90+hash(row+12)*400;ctx.fillStyle="rgba(255,255,255,"+(.1+hash(row+30)*.3)+")";ctx.fillRect(30,90+row*42,ww,5);}
    ctx.strokeStyle="rgba(255,255,255,.8)";ctx.strokeRect(30,530,150+80*Math.sin(local),30);ctx.restore();
    text("BUILD",960,790,82,.96,"center",undefined,700);text("FROM A SINGLE THOUGHT",960,870,16,.62,"center",'ui-monospace,monospace',500);
    scanWipe(local/4,false);frameCorners("BUILD","03");
  }else if(scene===3){
    // SHOT 04 — hero reveal: emblem scales through a light burst into a clean lockup.
    var heroScale=.55+.5*ease(local/1.2)+.018*beatPulse;
    bloom(960,440,400,.2+.12*beatPulse);ctx.save();ctx.translate(960,425);ctx.scale(heroScale,heroScale);
    ribbonMark(0,0,235,local*.11,.95);
    for(var q=0;q<32;q++){var aa=q*TAU/32+local*.22;line(Math.cos(aa)*270,Math.sin(aa)*270,Math.cos(aa)* (310+beatPulse*50),Math.sin(aa)*(310+beatPulse*50),.25,1.5);}
    ctx.restore();
    text("ChatGPT",960,785,100,.98,"center",undefined,600);text("A LITTLE MORE POSSIBLE.",960,868,15,.6,"center",'ui-monospace,monospace',500);
    frameCorners("REVEAL","04");
  }else if(scene===4){
    // SHOT 05 — creative capability montage, three independent panels slide in on different beats.
    drawCards(local/4);text("MAKE ROOM FOR",960,835,22,.8,"center",'ui-monospace,monospace',500);text("WHAT'S NEXT.",960,884,54,.98,"center",undefined,600);
    scanWipe(local/4,true);frameCorners("CREATE","05");
  }else if(scene===5){
    // SHOT 06 — speed ramp illusion: concentric rails rush toward the camera and collapse into a point.
    ctx.save();ctx.translate(960,470);
    for(var r=0;r<19;r++){var z=((r/19+local*.42)%1);var rad=20+z*z*1120;ctx.beginPath();ctx.ellipse(0,0,rad,rad*.52,Math.sin(local)*.04,0,TAU);ctx.strokeStyle="rgba(255,255,255,"+(.04+z*.2)+")";ctx.lineWidth=1+z*1.4;ctx.stroke();}
    for(var p=0;p<64;p++){var angle=p*TAU/64,dist=180+((p*37+local*600)%700);line(Math.cos(angle)*dist,Math.sin(angle)*dist*.55,Math.cos(angle)*(dist+50+beatPulse*60),Math.sin(angle)*(dist+50+beatPulse*60)*.55,.15,1);}
    ctx.restore();bloom(960,470,240,.22+.2*beatPulse);
    text("IDEAS IN",960,790,24,.7,"center",'ui-monospace,monospace',500);text("MOTION.",960,865,82,.98,"center",undefined,700);
    frameCorners("MOMENTUM","06");
  }else if(scene===6){
    // SHOT 07 — final message: fast type-on, sweeping underline, dramatic negative space.
    var words=["IMAGINE.","EXPLORE.","MAKE IT REAL."],idx=Math.min(2,Math.floor(local/1.35)),word=words[idx],wp=(local-idx*1.35)/1.35;
    ctx.save();ctx.translate(230+(1-ease(wp/.3))*160,0);text(word,0,450,105,.98,"left",undefined,700);ctx.restore();
    var ux=240+1510*ease((local%1.35)/1.35);line(240,545,ux,545,.92,3);
    text("THE NEXT STEP STARTS WITH A QUESTION.",240,625,17,.62,"left",'ui-monospace,monospace',500);
    ribbonMark(1540,790,95,-local*.1,.72);frameCorners("POSSIBLE","07");
  }else if(scene===7){
    // SHOT 08 — end card. Composition is held cleanly for a readable brand payoff.
    bloom(960,430,500,.13+.05*beatPulse);ribbonMark(960,390,125,.02*Math.sin(local),.92);
    text("ChatGPT",960,660,92,.98,"center",undefined,600);line(670,735,1250,735,.48,1);
    text("THINK  /  MAKE  /  DISCOVER",960,790,14,.65,"center",'ui-monospace,monospace',500);
    text("A NEW IDEA IS CLOSER THAN YOU THINK.",960,850,13,.42,"center",'ui-monospace,monospace',400);
    frameCorners("NEXT","08");
  }else{
    // SHOT 09 — return-to-opening bridge. All elements resolve toward the cold-open signal.
    var out=ease(local/1.5);ctx.save();ctx.globalAlpha=1-out;text("ChatGPT",960,660,92,1,"center",undefined,600);ctx.restore();
    ctx.save();ctx.globalAlpha=out;
    var ring=mix(98,28,out);ctx.strokeStyle="rgba(255,255,255,"+(.25+.7*Math.pow(Math.max(0,Math.cos((1-out)*TAU/3)),10))+")";ctx.lineWidth=1+2*out;ctx.beginPath();ctx.arc(960,500,ring,0,TAU);ctx.stroke();
    for(var j=0;j<48;j++){var an=j*TAU/48+(1-out)*.08,rad=mix(190,120,out)+65*Math.sin((1-out)*2+j*.8);ctx.beginPath();ctx.fillStyle="rgba(255,255,255,"+(.2+.6*hash(j))+")";ctx.arc(960+Math.cos(an)*rad,500+Math.sin(an)*rad,1+2*hash(j+9),0,TAU);ctx.fill();}
    ctx.restore();frameCorners("SIGNAL","01");
  }
  ctx.restore();

  // Flash frames on downbeats add editorial punctuation (periodic, not random).
  if(beatPulse>.985&&t>.15&&t<29.85){ctx.fillStyle="rgba(255,255,255,"+((beatPulse-.985)*2.1)+")";ctx.fillRect(0,0,W,H);}
  // Timecode and timeline marks are part of the edit UI aesthetic.
  line(68,H-62,W-68,H-62,.22,1);
  for(var tick=0;tick<=30;tick++){var tx=68+(W-136)*tick/30;line(tx,H-62,tx,H-62-(tick%5===0?14:6),.35,1);}
  text("TRILYVA / CHATGPT AD FILM",68,H-30,10,.48,"left",'ui-monospace,monospace',500);
  text("30s  ·  120 BPM EDIT RHYTHM",W-68,H-30,10,.48,"right",'ui-monospace,monospace',500);

  // The final transition resolves to the cold-open frame at the 30-second wrap.
  // Remove time-dependent overlays at the exact seam so time=0 and time=30 render identically.
  if(t===0){
    // Keep the first frame as the reference state; no extra overlays are added here.
  }
  ctx.restore();
}

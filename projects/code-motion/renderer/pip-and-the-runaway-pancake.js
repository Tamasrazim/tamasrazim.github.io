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


/* Lightweight software 3D painter for the hero characters.
   Geometry is real triangle mesh data; TRILYVA's Canvas frame API receives
   shaded, perspective-projected faces, so preview and export stay deterministic. */
var film3DGeometryCache=Object.create(null);
var film3DColorCache=Object.create(null);
var film3DShadeCache=Object.create(null);
function film3DGeometry(segments,rings){
  const key=segments+"x"+rings;
  if(film3DGeometryCache[key])return film3DGeometryCache[key];
  const vertices=[],triangles=[];
  for(let j=0;j<=rings;j++){
    const lat=-Math.PI/2+Math.PI*j/rings,cl=Math.cos(lat),sl=Math.sin(lat);
    for(let i=0;i<=segments;i++){
      const lon=2*Math.PI*i/segments;
      vertices.push([cl*Math.cos(lon),sl,cl*Math.sin(lon)]);
    }
  }
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){
    const a=j*(segments+1)+i,b=(j+1)*(segments+1)+i,c=b+1,d=a+1;
    triangles.push([a,b,c],[a,c,d]);
  }
  film3DGeometryCache[key]={vertices,triangles};
  return film3DGeometryCache[key];
}
function film3DColor(hex){
  if(film3DColorCache[hex])return film3DColorCache[hex];
  const n=parseInt(hex.replace("#",""),16);
  film3DColorCache[hex]=[(n>>16)&255,(n>>8)&255,n&255];
  return film3DColorCache[hex];
}
function film3DShade(hex,intensity){
  const band=Math.max(.40,Math.min(1.2,Math.round(intensity*16)/16));
  const key=hex+":"+band;
  if(film3DShadeCache[key])return film3DShadeCache[key];
  const c=film3DColor(hex);
  film3DShadeCache[key]="rgb("+Math.round(Math.min(255,c[0]*band))+","+Math.round(Math.min(255,c[1]*band))+","+Math.round(Math.min(255,c[2]*band))+")";
  return film3DShadeCache[key];
}
function film3DSphere(parts,x,y,z,rx,ry,rz,color,rotX,rotY,rotZ,segments,rings){
  parts.push({x,y,z,rx,ry,rz,color,rotX:rotX||0,rotY:rotY||0,rotZ:rotZ||0,segments:segments||6,rings:rings||4});
}
function film3DRotate(p,ax,ay,az){
  let x=p[0],y=p[1],z=p[2];
  if(ax){const c=Math.cos(ax),q=Math.sin(ax),ny=y*c-z*q,nz=y*q+z*c;y=ny;z=nz;}
  if(ay){const c=Math.cos(ay),q=Math.sin(ay),nx=x*c+z*q,nz=-x*q+z*c;x=nx;z=nz;}
  if(az){const c=Math.cos(az),q=Math.sin(az),nx=x*c-y*q,ny=x*q+y*c;x=nx;y=ny;}
  return [x,y,z];
}
function film3DDraw(ctx,parts,x,y,scale){
  const faces=[],D=1700,pitch=.18,cp=Math.cos(pitch),sp=Math.sin(pitch);
  const lx=-.43,ly=-.55,lz=.72,ll=Math.hypot(lx,ly,lz),L=[lx/ll,ly/ll,lz/ll];
  // A slightly elevated camera reveals the top planes of heads, shells and wings.
  const view=[0,-sp,cp],hx=L[0]+view[0],hy=L[1]+view[1],hz=L[2]+view[2],hl=Math.hypot(hx,hy,hz),H=[hx/hl,hy/hl,hz/hl];
  for(const part of parts){
    const geo=film3DGeometry(part.segments,part.rings),points=new Array(geo.vertices.length);
    for(let i=0;i<geo.vertices.length;i++){
      const v=geo.vertices[i];
      let p=film3DRotate([v[0]*part.rx,v[1]*part.ry,v[2]*part.rz],part.rotX,part.rotY,part.rotZ);
      p=[p[0]*scale,p[1]*scale,(p[2]+part.z)*scale];
      const perspective=D/(D-p[2]);
      points[i]={x:x+part.x*scale+p[0]*perspective,y:y+part.y*scale+(p[1]*cp+p[2]*sp)*perspective,z:p[2],world:[p[0],p[1],p[2]]};
    }
    const base=film3DColor(part.color);
    for(const tri of geo.triangles){
      const a=points[tri[0]],b=points[tri[1]],c=points[tri[2]];
      const ux=b.world[0]-a.world[0],uy=b.world[1]-a.world[1],uz=b.world[2]-a.world[2];
      const vx=c.world[0]-a.world[0],vy=c.world[1]-a.world[1],vz=c.world[2]-a.world[2];
      let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
      const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
      // The scene camera looks from positive Z; discard hidden back faces.
      if(nz*cp-ny*sp<=.015)continue;
      const diffuse=Math.max(0,nx*L[0]+ny*L[1]+nz*L[2]);
      const spec=Math.pow(Math.max(0,nx*H[0]+ny*H[1]+nz*H[2]),20)*.16;
      const intensity=.43+.6*diffuse+spec;
      faces.push({a,b,c,z:(a.z+b.z+c.z)/3,color:film3DShade(part.color,intensity)});
    }
  }
  // Painter's ordering is stable and deterministic at every requested frame.
  faces.sort((a,b)=>a.z-b.z);
  ctx.save();ctx.lineJoin="round";
  for(const f of faces){
    ctx.fillStyle=f.color;ctx.beginPath();ctx.moveTo(f.a.x,f.a.y);ctx.lineTo(f.b.x,f.b.y);ctx.lineTo(f.c.x,f.c.y);ctx.closePath();ctx.fill();
  }
  ctx.restore();
}
function film3DGroundShadow(ctx,x,y,scale,rx,alpha){
  const g=ctx.createRadialGradient(x,y,2,x,y,rx*scale);
  g.addColorStop(0,"rgba(42,52,35,"+alpha+")");g.addColorStop(.5,"rgba(42,52,35,"+(alpha*.36)+")");g.addColorStop(1,"rgba(42,52,35,0)");
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,rx*scale,12*scale,0,0,Math.PI*2);ctx.fill();
}

function filmVolumeEllipse(ctx,x,y,rx,ry,light,mid,shade,rotation,outline){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(rotation||0);
  const r=Math.max(rx,ry);
  const g=ctx.createRadialGradient(-rx*.34,-ry*.42,Math.max(1,rx*.025),rx*.04,ry*.05,r*1.22);
  g.addColorStop(0,light);g.addColorStop(.36,mid);g.addColorStop(.76,shade);g.addColorStop(1,shade);
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();
  if(outline){ctx.strokeStyle=outline;ctx.lineWidth=Math.max(1.3,r*.035);ctx.stroke();}
  // Broad, soft highlight sells a rounded toy surface without a plastic look.
  const h=ctx.createRadialGradient(-rx*.33,-ry*.4,0,-rx*.33,-ry*.4,rx*.64);
  h.addColorStop(0,"rgba(255,255,255,.24)");h.addColorStop(.5,"rgba(255,255,255,.08)");h.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=h;ctx.beginPath();ctx.ellipse(-rx*.08,-ry*.1,rx*.78,ry*.72,-.18,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function filmTube(ctx,x1,y1,c1x,c1y,c2x,c2y,x2,y2,w,light,mid,shade){
  const path=()=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.bezierCurveTo(c1x,c1y,c2x,c2y,x2,y2);};
  ctx.lineCap="round";ctx.lineJoin="round";
  ctx.strokeStyle=shade;ctx.lineWidth=w+3;path();ctx.stroke();
  const g=ctx.createLinearGradient(Math.min(x1,x2)-w,Math.min(y1,y2)-w,Math.max(x1,x2)+w,Math.max(y1,y2)+w);
  g.addColorStop(0,light);g.addColorStop(.5,mid);g.addColorStop(1,shade);
  ctx.strokeStyle=g;ctx.lineWidth=w;path();ctx.stroke();
  ctx.strokeStyle="rgba(255,255,255,.2)";ctx.lineWidth=Math.max(1,w*.16);
  ctx.beginPath();ctx.moveTo(x1-w*.17,y1-w*.2);ctx.bezierCurveTo(c1x-w*.17,c1y-w*.2,c2x-w*.17,c2y-w*.2,x2-w*.17,y2-w*.2);ctx.stroke();
}

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
  const parts=[],run=pose==="run",wave=pose==="wave",reach=pose==="reach";
  const stride=Math.sin(t*10),bob=run?Math.abs(stride)*-4:Math.sin(t*3.2)*1.5;
  film3DGroundShadow(ctx,x,y+5*s,s,74,.23);
  // Tail, arranged as overlapping tapered plush segments behind the body.
  const tailTilt=Math.sin(t*2.2)*.11+(run?stride*.13:0);
  film3DSphere(parts,-43,-61,-13,19,22,13,"#fff3dc",0,0,tailTilt,6,4);
  film3DSphere(parts,-54,-71,-9,23,25,16,"#f68a43",0,0,tailTilt-.1,8,5);
  film3DSphere(parts,-65,-91,-4,17,20,13,"#fff2da",0,0,tailTilt-.2,6,4);
  film3DSphere(parts,-35,-73,-5,19,25,15,"#e66838",0,0,tailTilt+.08,6,4);
  // Legs and rounded shoes; the alternating stride is keyed to the run cycle.
  for(let i=0;i<2;i++){
    const phase=i?Math.PI:0,angle=run?Math.sin(t*10+phase)*.42:Math.sin(t*2.2+phase)*.04;
    const lx=i?14:-14,dy=run?Math.sin(t*10+phase)*3:0;
    film3DSphere(parts,lx,-25+dy,1,8.8,20,9.5,"#d95f37",0,angle,angle*.18,6,4);
    film3DSphere(parts,lx+2,-5+dy,11,12.5,8.3,10.5,"#f5d6ae",0,angle,angle*.1,6,4);
    film3DSphere(parts,lx+1,-8+dy,12,9,6.5,8,"#e8b789",0,angle,angle*.1,6,4);
  }
  // Round body, pale belly and the teal scarf are all separate depth layers.
  film3DSphere(parts,0,-62,-2,32,42,23,"#ef8540",0,0,run?Math.sin(t*10)*.035:Math.sin(t*1.5)*.006,8,5);
  film3DSphere(parts,1,-61,19,21,29,7,"#ffe9c8",0,0,0,8,5);
  film3DSphere(parts,-1,-64,25,15,22,3,"#fff4df",0,0,0,6,4);
  film3DSphere(parts,0,-91,20,29,7.5,6,"#20b5c4",0,0,0,8,4);
  film3DSphere(parts,21,-77,21,7,17,4,"#31d1d3",0,0,.12+Math.sin(t*6)*.1,6,4);
  film3DSphere(parts,20,-79,25,3,12,1.5,"#a0f5ed",0,0,.12+Math.sin(t*6)*.1,6,4);
  // Arms are pill-like meshes and the paws follow the reaching / waving beats.
  const leftArmX=reach?-31:-29,leftArmY=reach?-97:-70,leftHandX=reach?-43:-39,leftHandY=reach?-117:-60;
  const rightArmX=wave?31:27,rightArmY=wave?-104:-70,rightHandX=wave?40:38,rightHandY=wave?-129:-61;
  film3DSphere(parts,-24,-80,2,9,17,10,"#f18a45",0,0,reach?-.3:-.48,6,4);
  film3DSphere(parts,leftArmX,leftArmY,6,8.5,16,8,"#e9783c",0,0,reach?-.32:-.43,6,4);
  film3DSphere(parts,leftHandX,leftHandY,18,8.5,9,6,"#ffe7c2",0,0,0,6,4);
  film3DSphere(parts,25,-80,2,9,17,10,"#f18a45",0,0,wave?.38:.43,6,4);
  film3DSphere(parts,rightArmX,rightArmY,6,8.5,16,8,"#e9783c",0,0,wave?.25:.43,6,4);
  film3DSphere(parts,rightHandX,rightHandY,18,8.5,9,6,"#ffe7c2",0,0,0,6,4);
  // Large head, rounded ears, mask patches and facial features share one camera-facing model.
  film3DSphere(parts,0,-119,6,40,39,30,"#f58d43",0,0,Math.sin(t*1.4)*.018,8,5);
  film3DSphere(parts,-27,-151,5,12,18,9,"#df6c3b",0,0,-.22,6,4);
  film3DSphere(parts,23,-151,5,12,18,9,"#df6c3b",0,0,.22,6,4);
  film3DSphere(parts,-27,-151,14,7,12,3,"#e97775",0,0,-.2,6,4);
  film3DSphere(parts,23,-151,14,7,12,3,"#e97775",0,0,.2,6,4);
  film3DSphere(parts,-16,-124,28,8.7,11.2,5.5,"#9c5438",0,0,-.08,6,4);
  film3DSphere(parts,10,-124,28,8.7,11.2,5.5,"#9c5438",0,0,.08,6,4);
  film3DSphere(parts,-15,-124,33,4.6,6.1,3.5,"#fffaf0",0,0,0,6,4);
  film3DSphere(parts,11,-124,33,4.6,6.1,3.5,"#fffaf0",0,0,0,6,4);
  film3DSphere(parts,-13.7,-123,36,2.5,4.0,2.2,"#332a38",0,0,0,6,4);
  film3DSphere(parts,12.4,-123,36,2.5,4.0,2.2,"#332a38",0,0,0,6,4);
  film3DSphere(parts,-15,-126,38,1.35,1.8,1.2,"#ffffff",0,0,0,6,4);
  film3DSphere(parts,10.7,-126,38,1.35,1.8,1.2,"#ffffff",0,0,0,6,4);
  film3DSphere(parts,9,-101,31,19,13,8,"#fff0d4",0,0,.04,8,5);
  film3DSphere(parts,24,-103,36,4.8,3.5,3.6,"#7d3a32",0,0,0,6,4);
  film3DSphere(parts,-28,-103,25,7.5,4.7,3.5,"#ee8881",0,0,0,6,4);
  film3DDraw(ctx,parts,x,y+bob,s);
  // Mouth and brows are inked on the mesh surface and timed to the dialogue cues.
  ctx.save();ctx.translate(x,y+bob);ctx.scale(s,s);
  if(mood==="surprised"){ctx.fillStyle="#692f35";ctx.beginPath();ctx.ellipse(12,-91,5.5,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#f58c91";ctx.beginPath();ctx.ellipse(12,-88,2.5,2,0,0,Math.PI*2);ctx.fill();}
  else if(filmTalking("PIP",t)){ctx.fillStyle="#692f35";ctx.beginPath();ctx.ellipse(11,-92,6,4.4+Math.abs(Math.sin(t*17))*2.3,.08,0,Math.PI*2);ctx.fill();ctx.fillStyle="#f58c91";ctx.beginPath();ctx.ellipse(12,-89,3,1.5,.08,0,Math.PI*2);ctx.fill();}
  else{ctx.strokeStyle="#8a433d";ctx.lineWidth=2.8;ctx.beginPath();ctx.moveTo(4,-91);ctx.quadraticCurveTo(12,-84,21,-91);ctx.stroke();}
  if(mood==="worried"||mood==="thinking"){ctx.strokeStyle="#994b36";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-24,-136);ctx.quadraticCurveTo(-17,-141,-10,-135);ctx.moveTo(4,-135);ctx.quadraticCurveTo(12,-141,19,-136);ctx.stroke();}
  else if(mood==="focused"){ctx.strokeStyle="#994b36";ctx.lineWidth=2.8;ctx.beginPath();ctx.moveTo(-24,-135);ctx.lineTo(-11,-132);ctx.moveTo(4,-132);ctx.lineTo(19,-135);ctx.stroke();}
  ctx.restore();
}
function filmBird(ctx,x,y,s,t,pose){
  const flying=pose==="fly",flap=Math.sin(t*12)*.48,bob=Math.sin(t*4+x*.01)*3.1;
  film3DGroundShadow(ctx,x,y+4*s,s,45,.19);
  const parts=[];
  // Tail feathers, split enamel wings and the warm feathered belly.
  for(let i=0;i<3;i++)film3DSphere(parts,-15+i*10,-21,-4,6,15,5,i%2?"#23a4ca":"#4fd0e1",0,0,(i-1)*-.18+(flying?flap*.18:0),6,4);
  film3DSphere(parts,0,-29,-2,30,31,22,"#178fbd",0,0,flying?flap*.025:Math.sin(t*2)*.015,8,5);
  film3DSphere(parts,5,-22,18,18,23,6,"#ffdf97",0,0,0,8,5);
  film3DSphere(parts,-20,-31,9,17,10,7,"#1683b2",0,0,flying?flap*.85:Math.sin(t*2)*.08,6,4);
  film3DSphere(parts,20,-31,3,16,10,7,"#21b6d3",0,0,flying?-flap*.58:Math.sin(t*2)*-.05,6,4);
  film3DSphere(parts,-4,-55,4,23,22,19,"#36c5df",0,0,0,8,5);
  film3DSphere(parts,-13,-69,3,8,9,6,"#4ad6e7",0,0,-.28,6,4);
  film3DSphere(parts,3,-69,3,8,9,6,"#6be5eb",0,0,.2,6,4);
  film3DSphere(parts,5,-58,23,7.4,9.4,5,"#fff9ec",0,0,0,6,4);
  film3DSphere(parts,7,-57,27,3.8,4.8,3.2,"#263a54",0,0,0,6,4);
  film3DSphere(parts,5.9,-60,29,1.2,1.6,1.1,"#ffffff",0,0,0,6,4);
  film3DSphere(parts,25,-46,18,9,5.6,6,"#ffb347",0,0,.13,6,4);
  film3DSphere(parts,31,-46,20,5,3.2,3.4,"#f08a2d",0,0,.08,6,4);
  film3DDraw(ctx,parts,x,y+bob+(flying?Math.abs(flap)*-3:0),s);
  ctx.save();ctx.translate(x,y+bob);ctx.scale(s,s);
  if(filmTalking("OLLIE",t)){ctx.fillStyle="#bf6425";ctx.beginPath();ctx.moveTo(21,-46);ctx.lineTo(36,-44);ctx.lineTo(22,-41);ctx.closePath();ctx.fill();}
  ctx.strokeStyle="rgba(255,244,190,.8)";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(26,-49);ctx.lineTo(34,-46);ctx.stroke();
  ctx.restore();
}
function filmTurtle(ctx,x,y,s,t,pose){
  const walking=pose==="walk",stride=Math.sin(t*4.1);
  film3DGroundShadow(ctx,x,y+5*s,s,70,.2);
  const parts=[];
  // Four planted legs remain in contact with the ground as the shell rocks.
  for(let i=0;i<4;i++){
    const side=i%2,back=i>1,lx=(side?31:-34),ly=back?-8:-3,phase=(side===back)?Math.PI:0;
    const swing=walking?Math.sin(t*4.1+phase)*.16:Math.sin(t*1.7+phase)*.025;
    film3DSphere(parts,lx,ly+(walking?Math.abs(Math.sin(t*4.1+phase))*-2:0),-2,12,10,10,side?"#58b85e":"#6bc866",0,swing,swing,6,4);
    film3DSphere(parts,lx+1,ly+2,8,8,6.5,6,"#9be17b",0,swing,swing,6,4);
  }
  // Broad domed shell with raised scute plates and a golden lip.
  film3DSphere(parts,-5,-30,0,50,35,21,"#c98236",0,0,Math.sin(t*2.1)*.012,8,5);
  film3DSphere(parts,-5,-34,13,43,29,12,"#f4bd51",0,0,Math.sin(t*2.1)*.012,8,5);
  const plates=[[-28,-42,16,12],[-7,-49,17,13],[15,-43,16,12],[-28,-22,15,12],[-7,-23,18,13],[15,-22,15,12]];
  for(let i=0;i<plates.length;i++){
    const p=plates[i],z=21-Math.max(0,Math.abs(p[0]+5)-8)*.22-Math.max(0,Math.abs(p[1]+30)-8)*.1;
    film3DSphere(parts,p[0],p[1],z,p[2],p[3],3.4,i%2?"#f8d26d":"#e4a444",0,0,(i%3-1)*.08,6,4);
  }
  // Green neck and head turn toward the runaway food.
  film3DSphere(parts,37,-36,2,24,21,19,"#55b95d",0,0,.04,8,5);
  film3DSphere(parts,53,-38,12,16,15,10,"#75d76c",0,0,.02,6,4);
  film3DSphere(parts,59,-46,20,5.5,7.2,4.2,"#fff9e7",0,0,0,6,4);
  film3DSphere(parts,61,-45,23,2.7,3.8,2.3,"#243e38",0,0,0,6,4);
  film3DSphere(parts,60,-47,25,1.1,1.4,1,"#ffffff",0,0,0,6,4);
  film3DSphere(parts,69,-31,20,4.1,3,2.8,"#3b874c",0,0,0,6,4);
  if(pose==="wave"){
    film3DSphere(parts,28,-55,13,7.5,14,7,"#60c365",0,0,-.42+Math.sin(t*7)*.18,6,4);
    film3DSphere(parts,20,-64,16,7,7,6,"#8ce078",0,0,0,6,4);
  }
  film3DDraw(ctx,parts,x,y,s);
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  if(filmTalking("TUCK",t)){ctx.fillStyle="#215c37";ctx.beginPath();ctx.ellipse(65,-27,5,3+Math.abs(Math.sin(t*12))*1.7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#efa0a0";ctx.beginPath();ctx.ellipse(65,-25,2.2,1,0,0,Math.PI*2);ctx.fill();}
  else{ctx.strokeStyle="#2e7145";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(58,-28);ctx.quadraticCurveTo(65,-24,71,-29);ctx.stroke();}
  ctx.restore();
}
function filmPancake(ctx,x,y,s,t,rotation,shine){
  const bob=Math.sin(t*5.4)*2.2,turn=rotation||0;
  // The pancake itself is a pair of shaded 3D mesh volumes, not a flat ellipse.
  film3DGroundShadow(ctx,x,y+18*s,s,88,.25);
  const parts=[];
  film3DSphere(parts,0,1,-2,77,65,17,"#b85a27",0,0,turn,8,5);
  film3DSphere(parts,0,-5,13,68,56,10,"#eea94f",0,0,turn,8,5);
  film3DSphere(parts,-1,-8,19,57,46,4,"#f7c970",0,0,turn,8,5);
  film3DDraw(ctx,parts,x,y+bob,s);
  // Surface garnish remains locked to the rotating pancake's local coordinate system.
  ctx.save();ctx.translate(x,y+bob);ctx.rotate(turn);ctx.scale(s,s);
  for(let i=0;i<15;i++){
    const a=i*2.399,r=10+filmHash(i+9)*47,px=Math.cos(a)*r,py=Math.sin(a)*r*.7,rr=2+filmHash(i+21)*2.5;
    ctx.fillStyle=i%3?"rgba(156,76,28,.25)":"rgba(255,249,210,.65)";
    ctx.beginPath();ctx.ellipse(px,py,rr,rr*.72,a,0,Math.PI*2);ctx.fill();
  }
  // A raised syrup path catches two separate warm highlights.
  ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="rgba(123,57,20,.65)";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(18,-40);ctx.bezierCurveTo(4,-27,28,-16,12,-2);ctx.bezierCurveTo(-2,9,19,15,9,27);ctx.stroke();
  const syrup=ctx.createLinearGradient(10,-40,20,27);syrup.addColorStop(0,"#9f471e");syrup.addColorStop(.35,"#c66c2c");syrup.addColorStop(.58,"#f2a34e");syrup.addColorStop(1,"#9b431c");
  ctx.strokeStyle=syrup;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(18,-40);ctx.bezierCurveTo(4,-27,28,-16,12,-2);ctx.bezierCurveTo(-2,9,19,15,9,27);ctx.stroke();
  ctx.strokeStyle="rgba(255,218,143,.76)";ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(15,-34);ctx.bezierCurveTo(9,-27,23,-16,12,-5);ctx.stroke();
  // Butter: bevelled edges, soft top highlight and rounded corners.
  ctx.save();ctx.translate(-17,-19);ctx.rotate(.12+Math.sin(t*1.7)*.04);
  const butter=ctx.createLinearGradient(-14,-15,15,13);butter.addColorStop(0,"#fffbd0");butter.addColorStop(.35,"#ffeb89");butter.addColorStop(.78,"#f7cf43");butter.addColorStop(1,"#dca126");
  ctx.fillStyle=butter;filmRound(ctx,-15,-12,30,25,5);ctx.fill();ctx.strokeStyle="rgba(194,128,33,.55)";ctx.lineWidth=1.5;ctx.stroke();ctx.strokeStyle="rgba(255,255,255,.82)";ctx.lineWidth=2;filmLine(ctx,-8,-7,6,-7,"rgba(255,255,255,.82)",2);ctx.restore();
  // Blueberries have individual volume, a contact shade and tiny reflected glints.
  for(let i=0;i<5;i++){
    const ang=i*1.6+t*.025,px=Math.cos(ang)*47,py=Math.sin(ang)*35;
    ctx.fillStyle="rgba(65,52,48,.2)";ctx.beginPath();ctx.ellipse(px+1,py+3,6.2,3.8,0,0,Math.PI*2);ctx.fill();
    filmVolumeEllipse(ctx,px,py,5.8,5.6,"#adc7ff","#567abb","#253b79",0,"rgba(29,53,109,.45)");
    ctx.fillStyle="rgba(255,255,255,.68)";ctx.beginPath();ctx.arc(px-1.8,py-2,1.5,0,Math.PI*2);ctx.fill();
  }
  if(shine){
    const gloss=ctx.createLinearGradient(-55,-55,6,-9);gloss.addColorStop(0,"rgba(255,255,255,.34)");gloss.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=gloss;ctx.beginPath();ctx.ellipse(-25,-31,30,12,-.48,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,.7)";ctx.lineWidth=3.5;ctx.beginPath();ctx.ellipse(-31,-33,24,10,-.42,Math.PI*1.1,Math.PI*1.78);ctx.stroke();
  }
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
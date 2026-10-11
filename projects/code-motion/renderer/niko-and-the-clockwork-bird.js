// NIKO AND THE CLOCKWORK BIRD — original five-minute 3D-styled cartoon, 16:9.
// Rendered entirely in JavaScript: a deterministic software 3D triangle painter,
// hand-built character meshes, layered sets, camera blocking, motion and timed dialogue.
// Designed for the existing TRILYVA Canvas renderFrame contract. No external assets.

const FILM_DURATION=300;
const FILM_CUES=[
[1,"NARRATOR","In a little workshop beside the town clock, Niko the red panda was building something special."],
[8,"NIKO","One final turn... and you'll sing."],
[16,"AURI","Oh! I can chirp. Is that my whole song?"],
[24,"NARRATOR","Auri was a tiny clockwork bird, made with brass feathers and a bright little heart. But her heart-spring was missing."],
[34,"NIKO","Your spring must have slipped away. We'll find it before the morning bells."],
[43,"NARRATOR","A loose brass coil bounced off the workbench, rolled past the open door, and spun into the street."],
[52,"AURI","There it goes! Follow that little glint!"],
[61,"NARRATOR","The spring danced between flower pots and market carts, turning end over end on the cobblestones."],
[70,"NIKO","Stay close, Auri. The town is waking up, and we must watch the road."],
[80,"AURI","I can see it! It rolled straight toward the clock tower!"],
[88,"NARRATOR","At the town square, the great clock had stopped. The missing spring had slipped through a service hatch."],
[97,"NIKO","The whole clock is waiting on one little spring."],
[107,"AURI","Then let's help it tick again."],
[116,"NARRATOR","Inside, giant brass gears stood silent above a winding staircase. The spring was caught high behind the upper wheel."],
[126,"NIKO","I'll climb the service steps. Can you reach that upper gear?"],
[136,"AURI","Wings ready. Heart... a little nervous."],
[146,"NARRATOR","A gust rushed through the tower window. The loose gear shuddered, and the spring slipped deeper into the mechanism."],
[156,"AURI","I found it! But it's wedged behind the turning wheel!"],
[166,"NIKO","I'll hold the brake. Wait for my signal."],
[176,"NARRATOR","The wheel jolted. Auri's wing caught on a bent pin, and she tumbled onto the safe stone ledge."],
[186,"AURI","My wing is stuck. I can't keep myself steady!"],
[196,"NIKO","Land beside me. We fix the wing first, then finish together."],
[206,"NARRATOR","Niko straightened the hinge with a tiny brass tool and replaced the pin with a spare from his pocket."],
[216,"AURI","The wing is working. And I know how we can free the spring."],
[226,"NIKO","I'll wind your heart. When it clicks, fly between the spokes and lift the spring out."],
[236,"AURI","Ready... ready... now!"],
[246,"NARRATOR","The little bird slipped through the gear spokes. The spring popped free, clicked into her heart, and began to turn."],
[256,"KEEPER","Listen! The clock is moving again! Morning is almost here!"],
[264,"NARRATOR","One gear turned another. The great hands swept forward, and golden dawn poured through the clock face."],
[272,"AURI","Niko, listen. That's my song!"],
[281,"NIKO","And the first bell belongs to you."],
[290,"NARRATOR","Auri sang over the town square as the clock rang out, clear and bright."],
[297,"NARRATOR","From that morning on, the town kept time with a little music, and no one built alone."]
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
  const band=Math.max(.40,Math.min(1.2,Math.round(intensity*48)/48));
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
function film3DDraw(ctx,parts,x,y,scale,rootRotation){
  const faces=[],D=1700,pitch=.18,cp=Math.cos(pitch),sp=Math.sin(pitch);
  const lx=-.43,ly=-.55,lz=.72,ll=Math.hypot(lx,ly,lz),L=[lx/ll,ly/ll,lz/ll];
  // A slightly elevated camera reveals the top planes of heads, shells and wings.
  const view=[0,-sp,cp],hx=L[0]+view[0],hy=L[1]+view[1],hz=L[2]+view[2],hl=Math.hypot(hx,hy,hz),H=[hx/hl,hy/hl,hz/hl];
  const root=rootRotation||null;
  for(const part of parts){
    const geo=film3DGeometry(part.segments,part.rings),points=new Array(geo.vertices.length);
    for(let i=0;i<geo.vertices.length;i++){
      const v=geo.vertices[i];
      const shape=film3DRotate([v[0]*part.rx,v[1]*part.ry,v[2]*part.rz],part.rotX,part.rotY,part.rotZ);
      let p,screenX,screenY;
      if(root){
        // Rotate each vertex AND each part centre so the pancake tumbles as one solid object.
        const q=film3DRotate([part.x+shape[0],part.y+shape[1],part.z+shape[2]],root.rx,root.ry,root.rz);
        p=[q[0]*scale,q[1]*scale,q[2]*scale];
        const perspective=D/(D-p[2]);
        screenX=x+p[0]*perspective;
        screenY=y+(p[1]*cp+p[2]*sp)*perspective;
      }else{
        p=[shape[0]*scale,shape[1]*scale,(shape[2]+part.z)*scale];
        const perspective=D/(D-p[2]);
        screenX=x+part.x*scale+p[0]*perspective;
        screenY=y+part.y*scale+(p[1]*cp+p[2]*sp)*perspective;
      }
      points[i]={x:screenX,y:screenY,z:p[2],world:[p[0],p[1],p[2]]};
    }
    for(const tri of geo.triangles){
      const a=points[tri[0]],b=points[tri[1]],c=points[tri[2]];
      const ux=b.world[0]-a.world[0],uy=b.world[1]-a.world[1],uz=b.world[2]-a.world[2];
      const vx=c.world[0]-a.world[0],vy=c.world[1]-a.world[1],vz=c.world[2]-a.world[2];
      let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
      const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
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


function filmGlow(ctx,x,y,r,color){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,color.replace(/[\d.]+\)$/,"0)"));
 ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
function filmVolumeEllipse(ctx,x,y,rx,ry,light,mid,shade,rotation,outline){
 ctx.save();ctx.translate(x,y);ctx.rotate(rotation||0);const r=Math.max(rx,ry);
 const g=ctx.createRadialGradient(-rx*.34,-ry*.42,Math.max(1,rx*.025),rx*.04,ry*.05,r*1.22);
 g.addColorStop(0,light);g.addColorStop(.36,mid);g.addColorStop(.76,shade);g.addColorStop(1,shade);
 ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();
 if(outline){ctx.strokeStyle=outline;ctx.lineWidth=Math.max(1.3,r*.035);ctx.stroke();}
 const h=ctx.createRadialGradient(-rx*.33,-ry*.4,0,-rx*.33,-ry*.4,rx*.64);
 h.addColorStop(0,"rgba(255,255,255,.27)");h.addColorStop(.5,"rgba(255,255,255,.07)");h.addColorStop(1,"rgba(255,255,255,0)");
 ctx.fillStyle=h;ctx.beginPath();ctx.ellipse(-rx*.08,-ry*.1,rx*.78,ry*.72,-.18,0,Math.PI*2);ctx.fill();ctx.restore();
}
function filmCloud(ctx,x,y,s,tone){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 const g=ctx.createLinearGradient(0,-50,0,35);g.addColorStop(0,"#fff");g.addColorStop(.58,tone||"#f7fbff");g.addColorStop(1,"#d7e9f4");ctx.fillStyle=g;
 ctx.beginPath();ctx.ellipse(0,0,66,26,0,0,Math.PI*2);ctx.ellipse(-35,-11,32,29,-.15,0,Math.PI*2);ctx.ellipse(0,-28,39,41,0,0,Math.PI*2);ctx.ellipse(35,-14,36,31,.12,0,Math.PI*2);ctx.fill();
 ctx.globalAlpha=.48;ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(-4,-43,22,8,-.15,0,Math.PI*2);ctx.fill();ctx.restore();
}
function filmGear(ctx,x,y,r,t,rotation,colors){
 colors=colors||["#714a2e","#ddaa52","#fff0a6","#a16c36"];
 ctx.save();ctx.translate(x,y);ctx.rotate(rotation||0);const teeth=12,outer=r,inner=r*.79;
 const g=ctx.createRadialGradient(-r*.22,-r*.3,r*.03,r*.08,r*.1,r*1.1);g.addColorStop(0,colors[2]);g.addColorStop(.34,colors[1]);g.addColorStop(.72,colors[0]);g.addColorStop(1,colors[3]);
 ctx.fillStyle=g;ctx.beginPath();
 for(let i=0;i<teeth*4;i++){const a=i*Math.PI*2/(teeth*4),rr=(i%4===0||i%4===1)?outer:inner;const px=Math.cos(a)*rr,py=Math.sin(a)*rr;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.fill();
 ctx.strokeStyle="rgba(75,43,22,.65)";ctx.lineWidth=Math.max(1.4,r*.04);ctx.stroke();
 ctx.fillStyle=colors[0];ctx.beginPath();ctx.arc(0,0,r*.54,0,Math.PI*2);ctx.fill();
 for(let i=0;i<6;i++){const a=i*Math.PI/3;filmLine(ctx,Math.cos(a)*r*.18,Math.sin(a)*r*.18,Math.cos(a)*r*.48,Math.sin(a)*r*.48,"rgba(255,224,147,.84)",Math.max(2,r*.045));}
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*.16,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="rgba(255,255,255,.35)";ctx.beginPath();ctx.arc(-r*.21,-r*.22,r*.06,0,Math.PI*2);ctx.fill();ctx.restore();
}
function filmSpring(ctx,x,y,s,t,rotation,compressed){
 // Helical spring is drawn with a perspective coil, shaded wire, end collars and rolling shadow.
 ctx.save();ctx.translate(x,y);ctx.rotate(rotation||0);ctx.scale(s,s);
 ctx.fillStyle="rgba(38,33,28,.2)";ctx.beginPath();ctx.ellipse(0,20,54,10,0,0,Math.PI*2);ctx.fill();
 filmLine(ctx,-52,0,52,0,"rgba(82,61,40,.65)",18);
 filmLine(ctx,-52,-2,52,-2,"rgba(245,207,131,.58)",8);
 const turns=compressed?5:7,span=compressed?54:82,r=compressed?17:19;
 const points=[];for(let i=0;i<=turns*32;i++){const u=i/(turns*32),a=u*turns*Math.PI*2;points.push([-span/2+u*span,Math.sin(a)*r,Math.cos(a)*r]);}
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],hi=.36+.54*Math.max(0,Math.cos((i/32)*2.1));
  ctx.strokeStyle=hi>.75?"#ffeab1":hi>.55?"#dca85d":"#856039";ctx.lineWidth=7;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(a[0],a[1]+a[2]*.22);ctx.lineTo(b[0],b[1]+b[2]*.22);ctx.stroke();
  ctx.strokeStyle="rgba(255,247,210,.48)";ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(a[0],a[1]+a[2]*.22-2);ctx.lineTo(b[0],b[1]+b[2]*.22-2);ctx.stroke();
 }
 filmVolumeEllipse(ctx,-span/2,0,6,16,"#fff0b4","#c88d45","#654329",.1);
 filmVolumeEllipse(ctx,span/2,0,6,16,"#fff0b4","#c88d45","#654329",-.1);ctx.restore();
}
function filmSun(ctx,x,y,r,t){
 filmGlow(ctx,x,y,r*2,"rgba(255,205,87,.21)");ctx.save();ctx.translate(x,y);ctx.rotate(t*.008);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;filmLine(ctx,Math.cos(a)*r*1.12,Math.sin(a)*r*1.12,Math.cos(a)*r*1.32,Math.sin(a)*r*1.32,"rgba(255,198,76,.72)",5);}
 const g=ctx.createRadialGradient(-r*.25,-r*.3,2,0,0,r);g.addColorStop(0,"#fff7bd");g.addColorStop(.58,"#ffda69");g.addColorStop(1,"#fba846");ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.restore();
}
function filmWindow(ctx,x,y,w,h,t,weather){
 const sky=ctx.createLinearGradient(x,y,x+w,y+h);sky.addColorStop(0,weather?"#7e9fb9":"#8adbf5");sky.addColorStop(.6,weather?"#b2c6d4":"#d7f4ff");sky.addColorStop(1,weather?"#d2dce0":"#fef0c1");ctx.fillStyle=sky;ctx.fillRect(x,y,w,h);
 ctx.fillStyle=weather?"#718c9a":"#6cae71";ctx.beginPath();ctx.moveTo(x,y+h*.72);ctx.bezierCurveTo(x+w*.25,y+h*.42,x+w*.42,y+h*.78,x+w*.63,y+h*.56);ctx.bezierCurveTo(x+w*.79,y+h*.37,x+w*.86,y+h*.66,x+w,y+h*.5);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.closePath();ctx.fill();
 for(let i=0;i<5;i++){const fx=x+filmHash(i+9)*w,fy=y+h*(.75+filmHash(i+29)*.18);filmGlow(ctx,fx,fy,13,"rgba(255,229,156,.14)");}
 if(weather){for(let i=0;i<42;i++){const rx=x+(i*37+t*91)%w,ry=y+(i*67+t*151)%h;filmLine(ctx,rx,ry,rx-7,ry+19,"rgba(236,247,255,.44)",1.5);}}
}
function filmWorkshop(ctx,t,storm){
 const wall=ctx.createLinearGradient(0,0,0,1080);wall.addColorStop(0,storm?"#485b67":"#506a69");wall.addColorStop(.48,storm?"#6f7770":"#a1a78e");wall.addColorStop(1,"#dec18a");ctx.fillStyle=wall;ctx.fillRect(0,0,1920,1080);
 // Plank floor has a clear perspective vanishing point behind the workbench.
 ctx.fillStyle="#6f472e";ctx.beginPath();ctx.moveTo(0,690);ctx.lineTo(1920,690);ctx.lineTo(1920,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.fill();
 const floor=ctx.createLinearGradient(0,690,0,1080);floor.addColorStop(0,"#b7834c");floor.addColorStop(.6,"#9b6438");floor.addColorStop(1,"#75472c");ctx.fillStyle=floor;ctx.fillRect(0,690,1920,390);
 for(let i=0;i<11;i++){const y=700+i*i*3.0;filmLine(ctx,0,y,1920,y,"rgba(76,44,25,.24)",2);}
 for(let i=0;i<15;i++){const x=i*139-20;filmLine(ctx,x,698,x-90,1080,"rgba(255,222,168,.12)",2);}
 // Tall window on the left, deep wooden jambs and landscape layers.
 filmWindow(ctx,105,105,485,385,t,storm>.3);
 for(const [x,y,w,h] of [[88,88,519,24],[88,483,519,24],[88,88,24,420],[581,88,24,420]]){const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,"#d4a56b");g.addColorStop(.5,"#75472c");g.addColorStop(1,"#4e3025");ctx.fillStyle=g;filmRound(ctx,x,y,w,h,7);ctx.fill();}
 filmLine(ctx,345,103,345,483,"#6e472c",18);filmLine(ctx,100,294,593,294,"#6e472c",17);
 filmGlow(ctx,348,287,290,storm?"rgba(157,191,219,.16)":"rgba(255,211,117,.25)");
 // Toolboard and silhouettes arranged on the right wall.
 filmRound(ctx,1245,120,535,318,18);ctx.fillStyle="#4e3428";ctx.fill();filmRound(ctx,1261,136,503,286,11);ctx.fillStyle="#a97642";ctx.fill();
 for(let i=0;i<8;i++){const x=1300+i*59;filmLine(ctx,x,172,x,260,"#d9b77b",5);filmRound(ctx,x-11,245,22,65,7);ctx.fillStyle=i%3?"#38474b":"#243a3e";ctx.fill();}
 for(let i=0;i<4;i++){const x=1320+i*105;filmGear(ctx,x,350,38+((i+1)%2)*8,t,i*.23,["#a06c3a","#bb873f","#8d5f36","#d1a35a"]);}
 // Round wall clock: numbered ticks are kept as designed spokes rather than small text.
 filmRound(ctx,780,114,238,238,119);ctx.fillStyle="#553724";ctx.fill();filmRound(ctx,793,127,212,212,106);ctx.fillStyle="#dbbf88";ctx.fill();
 filmRound(ctx,808,142,182,182,91);ctx.fillStyle="#f5e5bd";ctx.fill();
 for(let i=0;i<12;i++){const a=i*Math.PI/6;filmLine(ctx,899+Math.sin(a)*70,233-Math.cos(a)*70,899+Math.sin(a)*82,233-Math.cos(a)*82,"#714c31",5);}
 filmLine(ctx,899,233,866,200,"#68462e",8);filmLine(ctx,899,233,899,176,"#68462e",5);filmVolumeEllipse(ctx,899,233,8,8,"#fff0ba","#a77539","#5f3b25",0);
 // Main workbench and substantial legs.
 const bench=ctx.createLinearGradient(0,665,0,825);bench.addColorStop(0,"#e3b374");bench.addColorStop(.3,"#b77b43");bench.addColorStop(1,"#74432a");
 ctx.fillStyle=bench;filmRound(ctx,220,705,1480,134,26);ctx.fill();ctx.strokeStyle="#603820";ctx.lineWidth=7;ctx.stroke();
 ctx.fillStyle="#68402a";filmRound(ctx,270,808,70,205,15);ctx.fill();filmRound(ctx,1585,808,70,205,15);ctx.fill();
 ctx.fillStyle="#d59b59";filmRound(ctx,257,818,38,180,10);ctx.fill();filmRound(ctx,1600,818,38,180,10);ctx.fill();
 for(let i=0;i<11;i++){const x=285+i*130;filmLine(ctx,x,728,x+78,720+(i%3)*5,"rgba(255,228,163,.22)",3);}
 // A few concrete workshop objects to establish scale and continuity.
 filmRound(ctx,420,650,180,54,8);ctx.fillStyle="#4d3729";ctx.fill();filmRound(ctx,426,645,168,44,7);ctx.fillStyle="#cda46c";ctx.fill();
 for(let i=0;i<5;i++){const x=444+i*29;filmGear(ctx,x,667,13,t*.2,i*.26);}
 filmRound(ctx,1480,630,112,74,12);ctx.fillStyle="#81512f";ctx.fill();filmRound(ctx,1488,635,96,57,8);ctx.fillStyle="#e2b56a";ctx.fill();
 for(let i=0;i<5;i++){const x=1502+i*16;filmVolumeEllipse(ctx,x,657,5,5,"#fff2b9","#d39547","#87542f",0);}
 if(storm>.01){ctx.fillStyle="rgba(42,59,75,"+(.17+storm*.15)+")";ctx.fillRect(0,0,1920,1080);}
}
function filmStreet(ctx,t,storm){
 const sky=ctx.createLinearGradient(0,0,0,780);sky.addColorStop(0,storm?"#647d92":"#64c9f5");sky.addColorStop(.7,storm?"#b1c4c8":"#d8f2ff");sky.addColorStop(1,"#f8df9d");ctx.fillStyle=sky;ctx.fillRect(0,0,1920,1080);
 filmSun(ctx,1640,165,storm?55:78,t);
 filmCloud(ctx,280+Math.sin(t*.09)*18,165,.9,storm?"#b5c2ce":"#faffff");filmCloud(ctx,850,215,.72,storm?"#aebdca":"#f8fdff");
 // Street walls recede toward the clock tower's central vanishing point.
 for(let i=0;i<4;i++){
  const x=i*175-40,h=355+(i%3)*52;ctx.fillStyle=["#d6a46e","#dfb87f","#c5a6a0","#d8c18f"][i%4];ctx.beginPath();ctx.moveTo(x,375);ctx.lineTo(x+155,375);ctx.lineTo(x+188,700);ctx.lineTo(x-30,700);ctx.closePath();ctx.fill();
  filmRound(ctx,x+20,420,45,100,18);ctx.fillStyle="#638d9d";ctx.fill();filmLine(ctx,x+42,425,x+42,518,"#f0d8ad",4);
  filmRound(ctx,x+83,435,47,76,15);ctx.fillStyle="#7e9ba4";ctx.fill();filmLine(ctx,x+106,438,x+106,507,"#e6d4b1",3);
  ctx.fillStyle="#845034";ctx.beginPath();ctx.moveTo(x-16,376);ctx.lineTo(x+64,305-(i%2)*34);ctx.lineTo(x+180,376);ctx.closePath();ctx.fill();
  filmLine(ctx,x+10,376,x+64,328-(i%2)*34,"#d9b173",5);filmLine(ctx,x+64,328-(i%2)*34,x+165,376,"#d9b173",5);
 }
 for(let i=0;i<5;i++){
  const x=1050+i*190,h=230+(i%2)*55;ctx.fillStyle=["#d6a66d","#b1bb9b","#dfbc89","#c9a3a0","#d5c08c"][i];ctx.beginPath();ctx.moveTo(x,465);ctx.lineTo(x+160,465);ctx.lineTo(x+154,710);ctx.lineTo(x-8,710);ctx.closePath();ctx.fill();
  ctx.fillStyle="#83533b";ctx.beginPath();ctx.moveTo(x-20,465);ctx.lineTo(x+78,390-(i%2)*30);ctx.lineTo(x+180,465);ctx.closePath();ctx.fill();
  filmRound(ctx,x+52,530,52,97,18);ctx.fillStyle="#578397";ctx.fill();filmLine(ctx,x+78,535,x+78,622,"#efdbb0",4);
 }
 ctx.fillStyle="#cfad7d";ctx.beginPath();ctx.moveTo(0,680);ctx.lineTo(1920,680);ctx.lineTo(1920,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.fill();
 const road=ctx.createLinearGradient(0,685,0,1080);road.addColorStop(0,"#8b8979");road.addColorStop(.45,"#b9aa91");road.addColorStop(1,"#d2bc98");ctx.fillStyle=road;ctx.fillRect(0,690,1920,390);
 for(let row=0;row<6;row++){const y=715+row*72;for(let i=0;i<15;i++){const x=i*145+(row%2)*66;ctx.fillStyle=(i+row)%2?"rgba(93,80,67,.19)":"rgba(255,245,215,.24)";filmRound(ctx,x,y,128,48,8);ctx.fill();}}
 // The tower remains clearly visible at the street's end.
 filmTowerOutside(ctx,1305,708,.72,t,storm);
 if(storm>.01){ctx.fillStyle="rgba(46,66,85,"+storm*.17+")";ctx.fillRect(0,0,1920,1080);for(let i=0;i<75;i++){const x=(filmHash(i+71)*2000+t*150)%2000,y=(filmHash(i+91)*700+t*170)%760;filmLine(ctx,x,y,x-9,y+25,"rgba(236,247,255,.42)",1.7);}}
}
function filmTowerOutside(ctx,x,base,scale,t,storm){
 ctx.save();ctx.translate(x,base);ctx.scale(scale,scale);
 const stone=ctx.createLinearGradient(-170,0,160,0);stone.addColorStop(0,"#65584e");stone.addColorStop(.28,"#c1a27a");stone.addColorStop(.6,"#e2c494");stone.addColorStop(1,"#6d5a4c");
 ctx.fillStyle=stone;ctx.beginPath();ctx.moveTo(-147,0);ctx.lineTo(-134,-465);ctx.quadraticCurveTo(0,-525,134,-465);ctx.lineTo(150,0);ctx.closePath();ctx.fill();ctx.strokeStyle="#70503a";ctx.lineWidth=8;ctx.stroke();
 for(let i=0;i<8;i++){const y=-48-i*49;filmLine(ctx,-132+(i%2)*14,y,130-(i%2)*14,y,"rgba(101,77,57,.24)",3);}
 // clock face and hands
 filmVolumeEllipse(ctx,0,-390,82,82,"#fff7d5","#e7d4a1","#876a45",0,"#6e4a2f");
 for(let i=0;i<12;i++){const a=i*Math.PI/6;filmLine(ctx,Math.sin(a)*63,-390-Math.cos(a)*63,Math.sin(a)*73,-390-Math.cos(a)*73,"#715136",4);}
 filmLine(ctx,0,-390,-24,-418,"#573a27",6);filmLine(ctx,0,-390,0,-438,"#573a27",4);
 filmRound(ctx,-45,-237,90,135,20);ctx.fillStyle="#563827";ctx.fill();filmRound(ctx,-34,-225,68,112,13);ctx.fillStyle="#b77d4b";ctx.fill();
 for(let i=0;i<3;i++){const x=-45+i*45;filmRound(ctx,x,-172,10,54,5);ctx.fillStyle="#d7b276";ctx.fill();}
 const roof=ctx.createLinearGradient(-170,-530,180,-530);roof.addColorStop(0,"#4f3d38");roof.addColorStop(.5,"#a56f42");roof.addColorStop(1,"#4b3933");ctx.fillStyle=roof;ctx.beginPath();ctx.moveTo(-177,-468);ctx.lineTo(0,-615);ctx.lineTo(177,-468);ctx.closePath();ctx.fill();
 ctx.fillStyle="#d4ae70";ctx.beginPath();ctx.moveTo(-14,-615);ctx.lineTo(0,-652);ctx.lineTo(14,-615);ctx.closePath();ctx.fill();
 filmLine(ctx,-155,-458,155,-458,"#f3d09a",8);
 filmGlow(ctx,0,-390,125,storm?"rgba(129,170,207,.08)":"rgba(255,226,132,.14)");
 // Windows and chimney cap
 filmRound(ctx,-93,-336,26,58,13);ctx.fillStyle="#283c48";ctx.fill();filmRound(ctx,68,-336,26,58,13);ctx.fillStyle="#283c48";ctx.fill();
 if(!storm){for(let i=0;i<5;i++)filmGlow(ctx,-81+i*40,-335,34,"rgba(255,222,135,.12)");}
 ctx.restore();
}
function filmTowerInterior(ctx,t,storm,closeup){
 const bg=ctx.createLinearGradient(0,0,0,1080);bg.addColorStop(0,storm?"#223548":"#433e3b");bg.addColorStop(.56,"#6f5a47");bg.addColorStop(1,"#2d2826");ctx.fillStyle=bg;ctx.fillRect(0,0,1920,1080);
 // Tall beams and recessed masonry make the chamber spatial, with a readable window behind the gears.
 for(let i=0;i<7;i++){const x=i*320-45;filmRound(ctx,x,0,48,1080,10);ctx.fillStyle=i%2?"#5b493d":"#8a6b4e";ctx.fill();}
 filmWindow(ctx,115,94,355,470,t,storm);
 for(let y=140;y<940;y+=120){filmLine(ctx,485,y,1900,y,"rgba(16,18,20,.16)",3);}
 // Stair flight rises into the set; steps sit behind the characters.
 for(let i=0;i<12;i++){
  const x=90+i*91,y=990-i*39;
  ctx.fillStyle="#47342a";ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+92,y-39);ctx.lineTo(x+92,y-18);ctx.lineTo(x,y+20);ctx.closePath();ctx.fill();
  ctx.fillStyle="#b58b5c";ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+92,y-39);ctx.lineTo(x+92,y-24);ctx.lineTo(x,y+15);ctx.closePath();ctx.fill();
  filmLine(ctx,x,y,x+92,y-39,"rgba(255,218,157,.5)",3);
 }
 // Larger gear train with separate center hubs, spokes and contact shadows.
 const a=t*.16;
 filmGear(ctx,1040,570,238,t,a,["#684b35","#c28b4b","#f2d398","#785536"]);
 filmGear(ctx,1415,360,165,t,-a*1.42,["#51473c","#b4a070","#f4ddb0","#514133"]);
 filmGear(ctx,1515,763,125,t,a*1.8,["#554438","#ca9753","#f9dca0","#745033"]);
 filmGear(ctx,755,330,95,t,-a*1.5,["#4e4137","#9f784e","#e9c890","#594330"]);
 for(let i=0;i<5;i++){const x=900+i*160;filmRound(ctx,x,80,18,154,8);ctx.fillStyle="#3a3028";ctx.fill();}
 // A fixed red brake lever is the safe control Niko uses before touching the mechanism.
 filmRound(ctx,600,730,48,200,22);ctx.fillStyle="#433229";ctx.fill();filmRound(ctx,609,739,30,180,15);ctx.fillStyle="#b9523c";ctx.fill();
 ctx.fillStyle=storm?"rgba(18,35,50,.21)":"rgba(12,12,14,.05)";ctx.fillRect(0,0,1920,1080);
 if(storm){for(let i=0;i<55;i++){const x=(filmHash(i+501)*660+t*45)%700,y=(filmHash(i+601)*600+t*120)%630;filmLine(ctx,x+60,y+20,x+47,y+48,"rgba(213,238,252,.42)",1.7);}}
}
function filmDawnVillage(ctx,t){
 const g=ctx.createLinearGradient(0,0,0,1080);g.addColorStop(0,"#527fbb");g.addColorStop(.34,"#f5b48b");g.addColorStop(.63,"#ffe6a6");g.addColorStop(1,"#e6b978");ctx.fillStyle=g;ctx.fillRect(0,0,1920,1080);
 filmGlow(ctx,1460,310,380,"rgba(255,221,139,.25)");filmSun(ctx,1515,295,93,t);
 // distant dark blue hills and layered foreground neighbourhood
 ctx.fillStyle="#607c80";ctx.beginPath();ctx.moveTo(0,620);ctx.quadraticCurveTo(260,390,530,585);ctx.quadraticCurveTo(820,370,1080,590);ctx.quadraticCurveTo(1345,410,1600,580);ctx.quadraticCurveTo(1780,470,1920,560);ctx.lineTo(1920,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.fill();
 for(let i=0;i<8;i++){const x=i*270-45,h=270+(i%3)*70;ctx.fillStyle=["#6b7580","#87766c","#657e7e","#a17b6b"][i%4];ctx.beginPath();ctx.moveTo(x,690);ctx.lineTo(x+18,690-h);ctx.lineTo(x+115,690-h-45);ctx.lineTo(x+218,690-h);ctx.lineTo(x+238,690);ctx.closePath();ctx.fill();filmRound(ctx,x+77,650-h*.55,46,62,15);ctx.fillStyle="#273c4a";ctx.fill();}
 // Clock tower central focal point
 filmTowerOutside(ctx,1190,824,1.18,t,false);
 const road=ctx.createLinearGradient(0,790,0,1080);road.addColorStop(0,"#c7a179");road.addColorStop(1,"#e9c99b");ctx.fillStyle=road;ctx.beginPath();ctx.moveTo(760,790);ctx.lineTo(1430,790);ctx.lineTo(1920,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.fill();
 for(let i=0;i<7;i++){const y=824+i*37;filmLine(ctx,0,y,1920,y,"rgba(98,69,46,.14)",2);}
 for(let i=0;i<10;i++){const x=i*218;filmLine(ctx,x,810,x-170,1080,"rgba(103,75,51,.14)",2);}
 for(let i=0;i<24;i++){const x=filmHash(i+600)*1920,y=720+filmHash(i+700)*300;filmGlow(ctx,x,y,22,"rgba(255,247,194,.15)");}
}
function filmGearWindow(ctx,t){
 const x=1260,y=495;filmGlow(ctx,x,y,260,"rgba(255,219,134,.28)");
 filmRound(ctx,1010,190,510,620,18);ctx.fillStyle="#4b3326";ctx.fill();filmRound(ctx,1035,215,460,570,12);ctx.fillStyle="#b28a56";ctx.fill();
 filmWindow(ctx,1052,232,426,534,t,false);
 for(let x2 of [1042,1262,1484])filmLine(ctx,x2,214,x2,792,"#6a4428",20);filmLine(ctx,1028,490,1502,490,"#6a4428",18);
}
function filmNiko(ctx,x,y,s,t,mood,pose){
 const parts=[],run=pose==="run",climb=pose==="climb",reach=pose==="reach",repair=pose==="repair",wave=pose==="wave";
 const stride=Math.sin(t*9.5),bob=run?Math.abs(stride)*-4:climb?Math.sin(t*5)*-4:Math.sin(t*2.6)*1.2;
 film3DGroundShadow(ctx,x,y+5*s,s,76,.24);
 const tail=Math.sin(t*2.1)*.095+(run?stride*.12:0);
 // A striped red-panda tail keeps the silhouette identifiable in every camera setup.
 film3DSphere(parts,-42,-48,-13,19,20,12,"#f7d9ab",0,0,tail,7,5);
 film3DSphere(parts,-54,-60,-9,23,23,15,"#dc713c",0,0,tail-.08,8,5);
 film3DSphere(parts,-64,-80,-4,18,21,13,"#f7ddad",0,0,tail-.15,7,5);
 film3DSphere(parts,-37,-64,-5,20,25,15,"#cb5c32",0,0,tail+.08,7,5);
 film3DSphere(parts,-59,-68,0,9,10,4,"#c85c32",0,0,tail,6,4);
 // Legs and shoes are animated in opposition instead of sliding together.
 for(let i=0;i<2;i++){const ph=i?Math.PI:0,ang=(run?Math.sin(t*9.5+ph)*.42:climb?Math.sin(t*5+ph)*.28:Math.sin(t*2.1+ph)*.035);
  const lx=i?14:-14,dy=run?Math.sin(t*9.5+ph)*3:climb?Math.sin(t*5+ph)*3:0;
  film3DSphere(parts,lx,-25+dy,1,9,20,9.5,"#b85c36",0,ang,ang*.18,7,5);
  film3DSphere(parts,lx+2,-5+dy,12,13,8.3,10.5,"#4d656a",0,ang,ang*.1,7,5);
  film3DSphere(parts,lx+1,-8+dy,16,9,5,7,"#91a4a3",0,ang,ang*.1,7,5);
 }
 // Main torso and cream belly, with layered teal overalls, straps and brass buttons.
 film3DSphere(parts,0,-62,-2,33,42,23,"#d9773d",0,0,run?Math.sin(t*9.5)*.035:0,8,5);
 film3DSphere(parts,1,-60,19,23,29,7,"#f2d6ae",0,0,0,8,5);
 film3DSphere(parts,0,-63,25,18,25,4,"#1f7478",0,0,0,8,5);
 film3DSphere(parts,0,-79,29,17,13,4,"#247e83",0,0,0,8,5);
 film3DSphere(parts,-13,-90,28,4,20,3.3,"#16545d",0,0,-.08,7,5);
 film3DSphere(parts,13,-90,28,4,20,3.3,"#16545d",0,0,.08,7,5);
 film3DSphere(parts,-13,-81,33,3.4,3.4,2,"#f1c26d",0,0,0,7,5);film3DSphere(parts,13,-81,33,3.4,3.4,2,"#f1c26d",0,0,0,7,5);
 // Brass tool pouch and its handle sit at the character's right hip.
 film3DSphere(parts,25,-41,14,11,11,5,"#a96b35",0,0,.08,7,5);film3DSphere(parts,25,-42,19,7,7,3,"#ddac59",0,0,0,7,5);
 // Arms anticipate and settle between beats; the repaired hinge is visible in the repair pose.
 const lax=reach||repair?-31:-29,lay=reach?-96:repair?-85:-70,lhx=reach?-43:repair?-42:-39,lhy=reach?-117:repair?-103:-60;
 const rax=wave?31:reach?27:repair?34:27,ray=wave?-104:reach?-93:repair?-89:-70,rhx=wave?40:reach?38:repair?43:38,rhy=wave?-129:reach?-112:repair?-106:-61;
 film3DSphere(parts,-24,-80,2,9,17,10,"#e9874d",0,0,reach?-.3:-.48,7,5);
 film3DSphere(parts,lax,lay,6,8.5,16,8,"#d9773d",0,0,reach?-.32:repair?-.2:-.43,7,5);
 film3DSphere(parts,lhx,lhy,18,8.5,9,6,"#f2d6ae",0,0,0,7,5);
 film3DSphere(parts,25,-80,2,9,17,10,"#e9874d",0,0,wave?.38:.43,7,5);
 film3DSphere(parts,rax,ray,6,8.5,16,8,"#d9773d",0,0,wave?.25:repair?.15:.43,7,5);
 film3DSphere(parts,rhx,rhy,18,8.5,9,6,"#f2d6ae",0,0,0,7,5);
 // Oversized head, soft cheek shapes, mask markings, and ears.
 film3DSphere(parts,0,-119,6,40,39,30,"#ed8b49",0,0,Math.sin(t*1.3)*.014,8,5);
 film3DSphere(parts,-27,-151,5,12,18,9,"#cf6337",0,0,-.2,7,5);film3DSphere(parts,23,-151,5,12,18,9,"#cf6337",0,0,.2,7,5);
 film3DSphere(parts,-27,-151,14,7,12,3,"#d77872",0,0,-.2,7,5);film3DSphere(parts,23,-151,14,7,12,3,"#d77872",0,0,.2,7,5);
 film3DSphere(parts,-16,-124,28,8.7,11.2,5.5,"#7d4934",0,0,-.08,7,5);film3DSphere(parts,10,-124,28,8.7,11.2,5.5,"#7d4934",0,0,.08,7,5);
 const blink=Math.sin(t*2.9+1.1)>.996;
 film3DSphere(parts,-15,-124,33,4.6,blink?1.5:6.1,3.5,"#fff7e7",0,0,0,7,5);film3DSphere(parts,11,-124,33,4.6,blink?1.5:6.1,3.5,"#fff7e7",0,0,0,7,5);
 film3DSphere(parts,-13.7,-123,36,2.5,blink?1:4,2.2,"#302831",0,0,0,7,5);film3DSphere(parts,12.4,-123,36,2.5,blink?1:4,2.2,"#302831",0,0,0,7,5);
 film3DSphere(parts,-15,-126,38,1.35,1.8,1.2,"#fff",0,0,0,7,5);film3DSphere(parts,10.7,-126,38,1.35,1.8,1.2,"#fff",0,0,0,7,5);
 film3DSphere(parts,9,-101,31,19,13,8,"#ffebcf",0,0,.04,8,5);film3DSphere(parts,24,-103,36,4.8,3.5,3.6,"#773e32",0,0,0,7,5);
 film3DSphere(parts,-28,-103,25,7.5,4.7,3.5,"#eea18a",0,0,0,7,5);
 film3DDraw(ctx,parts,x,y+bob,s);
 ctx.save();ctx.translate(x,y+bob);ctx.scale(s,s);
 if(mood==="surprised"){ctx.fillStyle="#693837";ctx.beginPath();ctx.ellipse(12,-91,5.5,7,0,0,Math.PI*2);ctx.fill();}
 else if(filmTalking("NIKO",t)){ctx.fillStyle="#693837";ctx.beginPath();ctx.ellipse(11,-92,6,4+Math.abs(Math.sin(t*16))*2.4,.08,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ee9b9b";ctx.beginPath();ctx.ellipse(12,-89,3,1.6,0,0,Math.PI*2);ctx.fill();}
 else{ctx.strokeStyle="#874536";ctx.lineWidth=2.8;ctx.beginPath();ctx.moveTo(4,-91);ctx.quadraticCurveTo(12,-84,21,-91);ctx.stroke();}
 if(mood==="worried"){ctx.strokeStyle="#994b36";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-24,-136);ctx.quadraticCurveTo(-17,-141,-10,-135);ctx.moveTo(4,-135);ctx.quadraticCurveTo(12,-141,19,-136);ctx.stroke();}
 if(mood==="focused"){ctx.strokeStyle="#994b36";ctx.lineWidth=2.8;ctx.beginPath();ctx.moveTo(-24,-135);ctx.lineTo(-11,-132);ctx.moveTo(4,-132);ctx.lineTo(19,-135);ctx.stroke();}
 ctx.restore();
}
function filmAuri(ctx,x,y,s,t,mood,pose){
 const parts=[],fly=pose==="fly",droop=pose==="droop",repair=pose==="repair",flap=Math.sin(t*13)*.52;
 film3DGroundShadow(ctx,x,y+3*s,s,44,.18);
 // Brass body, enamel breast plate and a visible mechanical heart.
 film3DSphere(parts,0,-28,-1,28,30,21,"#d69a42",0,0,fly?Math.sin(t*4)*.05:0,8,5);
 film3DSphere(parts,3,-26,17,18,22,5,"#f4d18a",0,0,0,8,5);
 film3DSphere(parts,0,-55,4,23,22,18,"#b97838",0,0,Math.sin(t*1.8)*.018,8,5);
 film3DSphere(parts,-2,-57,17,17,15,5,"#e9bd68",0,0,0,8,5);
 // Back tail and gear-shaped feather panels.
 for(let i=0;i<3;i++){film3DSphere(parts,-21+i*11,-19,-7,6,15,5,i%2?"#398fc0":"#59c8e4",0,0,(i-1)*-.18+(fly?flap*.12:0),7,5);}
 // Wings are large individual mesh parts with clean mirrored posing.
 const wingAngle=fly?flap*.82:repair?-.2:droop?-.72:Math.sin(t*2)*.055;
 film3DSphere(parts,-25,-32,4,22,10,7,"#267ca9",0,wingAngle,-.08-wingAngle*.6,8,5);
 film3DSphere(parts,22,-32,4,22,10,7,"#319dc4",0,-wingAngle,.08+wingAngle*.6,8,5);
 film3DSphere(parts,-31,-35,8,13,5,4,"#6bd7e9",0,wingAngle,-.22-wingAngle*.6,7,5);
 film3DSphere(parts,28,-35,8,13,5,4,"#81e2ec",0,-wingAngle,.22+wingAngle*.6,7,5);
 // Neck, brows, face and polished glassy eyes.
 film3DSphere(parts,0,-50,13,17,17,7,"#dca755",0,0,0,7,5);
 const blink=Math.sin(t*3.8+.7)>.996;
 film3DSphere(parts,-8,-60,20,5.6,blink?1.2:6.7,3.6,"#fff5df",0,0,0,7,5);film3DSphere(parts,7,-60,20,5.6,blink?1.2:6.7,3.6,"#fff5df",0,0,0,7,5);
 film3DSphere(parts,-7,-60,23,2.8,blink?1:4.3,2,"#26374a",0,0,0,7,5);film3DSphere(parts,8,-60,23,2.8,blink?1:4.3,2,"#26374a",0,0,0,7,5);
 film3DSphere(parts,-8,-62,24,1.1,1.5,1,"#fff",0,0,0,7,5);film3DSphere(parts,7,-62,24,1.1,1.5,1,"#fff",0,0,0,7,5);
 film3DSphere(parts,0,-49,25,7.5,4.6,6,"#3e83a3",0,0,0,7,5);film3DSphere(parts,1,-48,29,3.7,2.2,3,"#f4c66e",0,0,0,7,5);
 // Winding key and tail bolts are part of the bird's design.
 film3DSphere(parts,-2,-22,-17,5,4,3,"#6c4d32",0,0,0,6,4);
 film3DDraw(ctx,parts,x,y+(fly?Math.abs(flap)*-3:Math.sin(t*3.8)*1.4),s);
 ctx.save();ctx.translate(x,y+(fly?Math.abs(flap)*-3:Math.sin(t*3.8)*1.4));ctx.scale(s,s);
 // Open beak, catchlight edge and eye brows track dialogue and emotion.
 if(filmTalking("AURI",t)){ctx.fillStyle="#73482b";ctx.beginPath();ctx.moveTo(5,-49);ctx.lineTo(22,-46);ctx.lineTo(6,-43);ctx.closePath();ctx.fill();}
 else{ctx.fillStyle="#e7a43d";ctx.beginPath();ctx.moveTo(5,-49);ctx.lineTo(22,-46);ctx.lineTo(6,-44);ctx.closePath();ctx.fill();}
 ctx.strokeStyle="#8c592e";ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-13,-69);ctx.quadraticCurveTo(-8,-73,-2,-69);ctx.moveTo(2,-69);ctx.quadraticCurveTo(8,-73,13,-69);ctx.stroke();
 // Repeated rivets are precisely aligned to the breast-plate arc.
 for(let i=0;i<5;i++){const a=-Math.PI*.8+i*Math.PI*.4;const px=Math.cos(a)*17,py=-28+Math.sin(a)*17;filmVolumeEllipse(ctx,px,py,1.8,1.8,"#fff0bb","#ca8b3d","#6e4b2b",0);}
 ctx.restore();
 // Large mechanical heart ring, on the breast at the same registered position in every shot.
 ctx.save();ctx.translate(x,y-29*s);ctx.scale(s,s);
 const core=ctx.createRadialGradient(-5,-4,1,0,0,18);core.addColorStop(0,"#d8ffff");core.addColorStop(.25,"#73dff0");core.addColorStop(.63,"#238dae");core.addColorStop(1,"#123d61");
 ctx.fillStyle=core;ctx.beginPath();ctx.arc(1,0,11,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#e1b55c";ctx.lineWidth=4;ctx.beginPath();ctx.arc(1,0,15,.15,Math.PI*1.88);ctx.stroke();
 for(let i=0;i<8;i++){const a=i*Math.PI/4;filmLine(ctx,Math.cos(a)*16,Math.sin(a)*16,Math.cos(a)*20,Math.sin(a)*20,"#f8d98c",2.5);}
 filmGlow(ctx,1,0,33,"rgba(75,223,246,"+(mood==="powered"?.30:.12)+")");ctx.restore();
}
function filmTalking(speaker,t){
 for(let i=0;i<FILM_CUES.length;i++){
  const cue=FILM_CUES[i];if(cue[1]!==speaker||t<cue[0])continue;
  const next=i+1<FILM_CUES.length?FILM_CUES[i+1][0]:FILM_DURATION;
  const words=cue[2].replace(/[^A-Za-z\s']/g,"").trim().split(/\s+/).length;
  const duration=Math.min(Math.max(.5,next-cue[0]-.35),Math.max(.7,words/2.8));
  if(t<cue[0]+duration)return true;
 }return false;
}
function filmCaption(ctx,t,chapter){
 ctx.save();ctx.globalAlpha=.93;
 const cw=Math.min(440,chapter.length*12+34);ctx.fillStyle="rgba(255,248,229,.91)";filmRound(ctx,58,42,cw,34,15);ctx.fill();
 ctx.font="800 14px ui-monospace,Consolas,monospace";ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillStyle="#5c412c";ctx.fillText(chapter.toUpperCase(),75,59);
 ctx.textAlign="right";ctx.fillStyle="rgba(255,255,255,.86)";ctx.font="600 14px ui-monospace,Consolas,monospace";ctx.fillText("CLOCKTOWN  /  "+String(Math.floor(t/60)).padStart(2,"0")+":"+String(Math.floor(t%60)).padStart(2,"0"),1860,59);ctx.restore();
 let cue=null,next=300;for(let i=0;i<FILM_CUES.length;i++){if(t>=FILM_CUES[i][0]){cue=FILM_CUES[i];next=i+1<FILM_CUES.length?FILM_CUES[i+1][0]:300;}else break;}if(!cue)return;
 ctx.save();ctx.globalAlpha=filmClamp(Math.min((t-cue[0])/.16,(next-t)/.22),0,1);
 const shade=ctx.createLinearGradient(0,844,0,1080);shade.addColorStop(0,"rgba(20,29,32,0)");shade.addColorStop(.34,"rgba(20,29,32,.74)");shade.addColorStop(1,"rgba(14,19,22,.89)");ctx.fillStyle=shade;ctx.fillRect(0,840,1920,240);
 ctx.fillStyle="#f4cf81";ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="800 18px ui-rounded,system-ui,sans-serif";ctx.fillText(cue[1]==="NARRATOR"?"STORYTELLER":cue[1]==="KEEPER"?"CLOCKKEEPER":cue[1]==="NIKO"?"NIKO":"AURI",960,911);
 ctx.fillStyle="#fffaf1";ctx.font="600 27px ui-rounded,system-ui,sans-serif";
 const words=cue[2].split(/\s+/),lines=[];let line="";for(const w of words){const test=line?line+" "+w:w;if(ctx.measureText(test).width>1550&&line){lines.push(line);line=w;}else line=test;}if(line)lines.push(line);
 lines.slice(0,2).forEach((line,i)=>ctx.fillText(line,960,961+i*38));ctx.restore();
}
function filmShopProps(ctx,t){
 // Spring's original resting place and the open door remain consistent in the opening.
 filmGear(ctx,700,655,42,t*.3,.2,["#8c5a2f","#d9a454","#fff0b7","#8c562e"]);
 filmGear(ctx,815,654,30,t*.2,.6,["#70523a","#c3914a","#f9dc9f","#765032"]);
 filmSpring(ctx,1125,678,.8,t,filmEase(31,47,t)*.55,false);
 ctx.fillStyle="#4e3527";filmRound(ctx,1708,525,148,306,8);ctx.fill();ctx.fillStyle="#a66d3f";filmRound(ctx,1723,538,116,274,6);ctx.fill();
 filmLine(ctx,1780,538,1780,811,"#d9a46a",6);filmVolumeEllipse(ctx,1819,679,7,7,"#ffefb8","#bb7d37","#684126",0);
 filmRound(ctx,160,558,175,99,15);ctx.fillStyle="#553e2e";ctx.fill();filmRound(ctx,171,569,153,77,10);ctx.fillStyle="#d8bd8a";ctx.fill();
 filmLine(ctx,192,607,302,607,"#9b6d3a",3);filmLine(ctx,192,620,277,620,"#9b6d3a",3);filmLine(ctx,192,633,291,633,"#9b6d3a",3);
}
function filmStreetProps(ctx,t,storm){
 // Market cart, flower pots, and pavement obstacles are stationary landmarks through the chase.
 filmRound(ctx,280,622,260,113,17);ctx.fillStyle="#6e432b";ctx.fill();filmRound(ctx,292,606,238,98,13);ctx.fillStyle="#d9aa6a";ctx.fill();
 for(let i=0;i<7;i++){filmVolumeEllipse(ctx,320+i*30,626,9,13,i%2?"#f8c1a0":"#fff4d6",i%2?"#da7d5b":"#e2bc74","#80503c",-.1);}
 for(let x of [323,502]){filmVolumeEllipse(ctx,x,741,29,29,"#bba07a","#705039","#493125",0);filmVolumeEllipse(ctx,x,741,13,13,"#e4c78d","#ab7844","#63412b",0);}
 for(let i=0;i<6;i++){const x=620+i*62;filmVolumeEllipse(ctx,x,675,17,22,"#c9e19d","#5a9e53","#2e693c",Math.sin(t+i)*.1);filmGlow(ctx,x-3,664,15,"rgba(255,246,191,.16)");}
 for(let i=0;i<4;i++){const x=152+i*180;filmRound(ctx,x,825,96,116,16);ctx.fillStyle="#8f5a3f";ctx.fill();filmVolumeEllipse(ctx,x+46,829,38,38,"#f9b4b1","#e87973","#9a4a42",0);filmVolumeEllipse(ctx,x+46,808,8,8,"#fff0c0","#e2ae53","#7c4a30",0);}
}
function filmSpringTrail(ctx,t){
 for(let i=0;i<7;i++){const p=1-i/7;const x=filmMix(420,1450,filmEase(54,90,t))-i*22,y=856-Math.sin(t*10-i*.7)*12-i*2;
  ctx.strokeStyle="rgba(255,220,149,"+(p*.24)+")";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,11*p+2,4*p+1,-.25,0,Math.PI*2);ctx.stroke();}
}
function filmSunbeam(ctx,x,y,r,alpha){
 ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;for(let i=0;i<9;i++){const a=-.65+i*.16;ctx.fillStyle=i%2?"rgba(255,230,158,.09)":"rgba(255,246,202,.13)";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.lineTo(Math.cos(a+.07)*r,Math.sin(a+.07)*r);ctx.closePath();ctx.fill();}ctx.restore();
}
function renderFrame(time,frame,fps,ctx,width,height){
 const t=filmClamp(Number.isFinite(time)?time:frame/Math.max(1,fps),0,FILM_DURATION);
 const scale=Math.min(width/1920,height/1080),ox=(width-1920*scale)/2,oy=(height-1080*scale)/2;
 ctx.save();ctx.fillStyle="#263541";ctx.fillRect(0,0,width,height);ctx.translate(ox,oy);ctx.scale(scale,scale);
 const cuts=[54,90,124,174,216,260];
 function sceneFor(v){return v<54?0:v<90?1:v<124?2:v<174?3:v<216?4:v<260?5:6;}
 const labels=["THE LITTLE WORKSHOP","A SPRING ON THE LOOSE","THE TOWN CLOCK","INSIDE THE TOWER","A BENT WING","THE CLOCKWORK HEART","A SONG AT SUNRISE"];
 function paintScene(scene,alpha){
  ctx.save();ctx.globalAlpha*=alpha;
  const travel=scene===1?filmEase(54,90,t):scene===2?filmEase(90,124,t):scene===3?filmEase(124,174,t):scene===5?filmEase(216,260,t):scene===6?filmEase(260,284,t):0;
  const zoom=1.01+.009*Math.sin(t*.21+scene*.7)+(scene===3?filmEase(130,145,t)*(1-filmEase(162,171,t))*.025:0);
  const pan= (scene===1?filmMix(18,-40,travel):scene===2?filmMix(15,-20,travel):scene===3?filmMix(15,-12,travel):scene===5?filmMix(-14,15,travel):scene===6?filmMix(-12,12,travel):0)+Math.sin(t*.26+scene)*2.3;
  ctx.translate(960,540);ctx.scale(zoom,zoom);ctx.translate(-960+pan,-540+Math.sin(t*.23+scene)*1.8);
  if(scene===0){
   filmWorkshop(ctx,t,0);filmShopProps(ctx,t);
   filmNiko(ctx,650,975,1.34,t,t<36?"happy":"worried",t<17?"reach":t<35?"repair":"reach");
   filmAuri(ctx,1005,753,1.06,t,t>20&&t<48?"worried":t>34&&t<54?"powered":"calm",t<16?"perch":t<35?"droop":"perch");
   // A small, unmistakable gap at the heart port motivates the entire story.
   if(t>23&&t<54){ctx.save();ctx.translate(1005,753);ctx.scale(1.06,1.06);ctx.strokeStyle="#6d4c29";ctx.lineWidth=3;ctx.beginPath();ctx.arc(1,-29,15,.15,Math.PI*1.88);ctx.stroke();filmGlow(ctx,1006,724,30,"rgba(71,207,234,.16)");ctx.restore();}
   if(t>31){const p=filmEase(33,45,t);filmSpring(ctx,filmMix(1140,1700,p),filmMix(680,860,p),.63,t,t*3.5,false);}
   for(let i=0;i<15;i++){const x=(i*139+t*4)%1850,y=180+filmHash(i+20)*460;ctx.fillStyle="rgba(255,231,176,"+(.1+filmHash(i+40)*.12)+")";ctx.beginPath();ctx.arc(x,y,1.6,0,Math.PI*2);ctx.fill();}
  }else if(scene===1){
   filmStreet(ctx,t,0);filmStreetProps(ctx,t,false);
   const p=filmEase(54,90,t),sx=filmMix(470,1430,p),sy=846-Math.sin(t*8)*15;
   filmSpringTrail(ctx,t);filmSpring(ctx,sx,sy,.77,t,(t-54)*4.6,false);
   filmNiko(ctx,filmMix(450,1095,filmEase(54,88,t)),974,1.25,t,t<70?"surprised":"focused","run");
   filmAuri(ctx,filmMix(735,1290,filmEase(54,89,t)),filmMix(635,550,filmEase(54,89,t)),.91,t,"calm","fly");
   if(t>69&&t<85){ctx.save();ctx.globalAlpha=filmEase(69,72,t)*(1-filmEase(82,85,t));ctx.font="900 48px ui-rounded,system-ui,sans-serif";ctx.textAlign="center";ctx.fillStyle="#fff3c0";ctx.fillText("CLINK-CLINK!",955,365);ctx.restore();}
  }else if(scene===2){
   const sky=ctx.createLinearGradient(0,0,0,1080);sky.addColorStop(0,"#73c5e9");sky.addColorStop(1,"#f4d39b");ctx.fillStyle=sky;ctx.fillRect(0,0,1920,1080);
   filmCloud(ctx,370,160,.8);filmCloud(ctx,820,204,.7);filmStreetProps(ctx,t,false);
   filmTowerOutside(ctx,1360,1010,1.35,t,false);
   const p=filmEase(90,124,t);filmSpring(ctx,filmMix(1180,1320,p),filmMix(892,882,p),.65,t,t*5,false);
   filmNiko(ctx,filmMix(790,910,p),975,1.22,t,"worried","run");filmAuri(ctx,filmMix(1050,1085,p),690,.88,t,"calm","fly");
   if(t>99&&t<118){ctx.save();ctx.globalAlpha=filmEase(99,102,t)*(1-filmEase(115,118,t));filmRound(ctx,1170,725,210,76,16);ctx.fillStyle="rgba(255,248,225,.9)";ctx.fill();ctx.textAlign="center";ctx.font="800 17px ui-monospace,monospace";ctx.fillStyle="#67472e";ctx.fillText("CLOCK STOPPED",1275,764);ctx.restore();}
  }else if(scene===3){
   filmTowerInterior(ctx,t,0,false);filmGearWindow(ctx,t);
   // Spring is lodged behind the same upper wheel until Auri dislodges it.
   filmGear(ctx,1328,512,68,t,t*.14,["#795638","#d7a354","#ffe4a2","#6c4a2d"]);
   filmSpring(ctx,1365,545,.55,t,Math.sin(t*1.8)*.1,true);
   const p=filmEase(124,174,t);filmNiko(ctx,filmMix(715,810,p),filmMix(969,845,filmEase(128,164,t)),1.2,t,t<165?"focused":"worried","climb");
   filmAuri(ctx,filmMix(1000,1355,filmEase(126,154,t)),filmMix(580,475,filmEase(126,158,t)),.88,t,t>145?"worried":"calm","fly");
   filmLine(ctx,828,910,858,860,"#dcbd86",7);filmLine(ctx,858,860,884,825,"#dcbd86",7);
  }else if(scene===4){
   filmTowerInterior(ctx,t,1,false);filmGearWindow(ctx,t);
   // The spring stays on the ledge; Auri's right wing droops only in this beat.
   filmSpring(ctx,1335,650,.56,t,.12,true);
   filmNiko(ctx,975,958,1.25,t,t<196?"worried":"focused","repair");
   filmAuri(ctx,1115,729,.91,t,t<204?"worried":"calm",t<199?"droop":"repair");
   filmGear(ctx,1370,520,87,t,t*.2,["#674b37","#b8894c","#f1d49a","#6b4b30"]);
   for(let i=0;i<48;i++){const x=(filmHash(i+801)*940+t*(95+filmHash(i+901)*45))%1000+470,y=(filmHash(i+1001)*620+t*(90+filmHash(i+1101)*35))%660;filmLine(ctx,x,y,x-8,y+20,"rgba(213,237,249,.36)",1.7);}
   if(t>194&&t<212){ctx.save();ctx.globalAlpha=filmEase(194,198,t)*(1-filmEase(208,212,t));filmRound(ctx,1250,790,340,54,15);ctx.fillStyle="rgba(255,249,230,.93)";ctx.fill();ctx.textAlign="center";ctx.fillStyle="#60472f";ctx.font="700 17px ui-monospace,monospace";ctx.fillText("HINGE REPAIRED",1420,822);ctx.restore();}
  }else if(scene===5){
   filmTowerInterior(ctx,t,0,true);filmGearWindow(ctx,t);
   const p=filmEase(230,247,t);
   // Gear mesh begins moving only after the spring is re-seated in Auri's heart.
   filmGear(ctx,1340,520,210,t*.05+filmEase(242,258,t)*1.4,0,["#69503c","#c99350","#f2d69c","#65452f"]);
   filmGear(ctx,1525,741,137,t*.05-filmEase(242,258,t)*1.9,0,["#4e443b","#ad8b55","#f5ddb1","#574637"]);
   filmNiko(ctx,690,973,1.25,t,"happy","reach");
   filmAuri(ctx,1045,797,1.02,t,t>241?"powered":"focused",t<236?"repair":"fly");
   filmSpring(ctx,filmMix(1330,1049,p),filmMix(562,764,p),filmMix(.57,.6,p),t,filmMix(.1,0,p),t<247);
   if(t>238){const q=filmEase(238,252,t);filmGlow(ctx,1047,768,150,"rgba(84,225,243,"+(.3*q)+")");}
   if(t>250){const q=filmEase(250,260,t);ctx.save();ctx.globalAlpha=q;filmSunbeam(ctx,1100,360,800,q);ctx.restore();}
  }else{
   filmDawnVillage(ctx,t);filmSunbeam(ctx,1430,410,850,filmEase(260,286,t)*.9);
   filmNiko(ctx,filmMix(735,805,filmEase(260,277,t)),973,1.23,t,"happy",t<282?"wave":"reach");
   filmAuri(ctx,filmMix(1070,1100,filmEase(260,278,t)),770,1.02,t,t>268?"powered":"calm","fly");
   for(let i=0;i<16;i++){const x=(filmHash(i+1200)*1950+t*(25+filmHash(i+1300)*15))%1950,y=180+filmHash(i+1400)*520;ctx.fillStyle="rgba(255,245,194,"+(.18+filmHash(i+1500)*.2)+")";ctx.beginPath();ctx.arc(x,y,1.5+filmHash(i+1600)*1.4,0,Math.PI*2);ctx.fill();}
   if(t>277&&t<295){ctx.save();ctx.globalAlpha=filmEase(277,283,t)*(1-filmEase(291,295,t));filmRound(ctx,605,168,710,72,24);ctx.fillStyle="rgba(255,247,219,.94)";ctx.fill();ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="900 28px ui-rounded,system-ui,sans-serif";ctx.fillStyle="#73502e";ctx.fillText("THE CLOCK SINGS AGAIN",960,205);ctx.restore();}
   // The clock hand and bell hammer move on the payoff, not earlier.
   if(t>263){const q=filmEase(263,276,t);filmLine(ctx,1323,478,1323+Math.sin(q*4)*29,478-Math.cos(q*4)*18,"#f9df9c",10);}
  }
  ctx.restore();
 }
 const scene=sceneFor(t);let near=-1;for(let i=0;i<cuts.length;i++)if(Math.abs(t-cuts[i])<1.3){near=i;break;}
 if(near>=0){const p=filmEase(cuts[near]-1.3,cuts[near]+1.3,t);paintScene(near,1-p);paintScene(near+1,p);}else paintScene(scene,1);
 const grade=ctx.createLinearGradient(0,0,0,1080);grade.addColorStop(0,"rgba(255,255,255,.025)");grade.addColorStop(.6,"rgba(255,247,224,0)");grade.addColorStop(1,"rgba(45,34,28,.10)");ctx.fillStyle=grade;ctx.fillRect(0,0,1920,1080);
 const vignette=ctx.createRadialGradient(960,520,360,960,520,1140);vignette.addColorStop(0,"rgba(0,0,0,0)");vignette.addColorStop(.84,"rgba(28,23,20,.025)");vignette.addColorStop(1,"rgba(28,23,20,.16)");ctx.fillStyle=vignette;ctx.fillRect(0,0,1920,1080);
 if(t>=291){ctx.save();ctx.globalAlpha=filmEase(291,296,t);ctx.fillStyle="rgba(255,246,216,.95)";filmRound(ctx,430,180,1060,210,27);ctx.fill();ctx.strokeStyle="#a9753f";ctx.lineWidth=5;filmRound(ctx,430,180,1060,210,27);ctx.stroke();ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#4f704e";ctx.font="1000 55px ui-rounded,system-ui,sans-serif";ctx.fillText("NIKO AND THE CLOCKWORK BIRD",960,253);ctx.fillStyle="#8e5b37";ctx.font="800 22px ui-rounded,system-ui,sans-serif";ctx.fillText("A CLOCKTOWN ADVENTURE",960,318);ctx.restore();}
 filmCaption(ctx,t,labels[scene]);ctx.restore();
}

(() => {
  const canvas=document.getElementById('world'); if(!canvas)return;
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:false,powerPreference:'low-power'});
  if(!gl){document.body.dataset.webgl='off';return;}
  const vs='#version 300 es\nin vec3 p;in vec4 c;uniform float aspect;uniform vec3 camera;uniform vec2 angle;out vec4 color;void main(){vec3 q=p-camera;float cy=cos(angle.x),sy=sin(angle.x);q=vec3(cy*q.x+sy*q.z,q.y,-sy*q.x+cy*q.z);float cx=cos(angle.y),sx=sin(angle.y);q=vec3(q.x,cx*q.y-sx*q.z,sx*q.y+cx*q.z);float z=max(.1,-q.z);float n=.1,f=110.;gl_Position=vec4(1.7*q.x/aspect,1.7*q.y,((f+n)/(n-f))*z+(2.*f*n)/(n-f),z);color=c;}';
  const fs='#version 300 es\nprecision mediump float;in vec4 color;out vec4 outColor;void main(){outColor=color;}';
  const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  try{
    const program=gl.createProgram(),v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs);gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    const data=[];const tri=(a,b,c,col)=>{for(const x of [a,b,c])data.push(...x,...col);};
    const box=(x,y,z,w,h,d,col)=>{const a=x-w/2,b=x+w/2,c=y-h/2,e=y+h/2,g=z-d/2,k=z+d/2;const faces=[[[a,c,k],[b,c,k],[b,e,k],[a,e,k]],[[b,c,g],[a,c,g],[a,e,g],[b,e,g]],[[a,e,k],[b,e,k],[b,e,g],[a,e,g]],[[a,c,g],[b,c,g],[b,c,k],[a,c,k]],[[b,c,k],[b,c,g],[b,e,g],[b,e,k]],[[a,c,g],[a,c,k],[a,e,k],[a,e,g]]];for(const q of faces){tri(q[0],q[1],q[2],col);tri(q[0],q[2],q[3],col);}};
    const beam=(a,b,t,col)=>{const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,mz=(a[2]+b[2])/2,len=Math.hypot(b[0]-a[0],b[1]-a[1]),ang=Math.atan2(b[1]-a[1],b[0]-a[0]),cs=Math.cos(ang),sn=Math.sin(ang);const pt=(x,y)=>[mx+x*cs-y*sn,my+x*sn+y*cs,mz];const q=[pt(-len/2,-t/2),pt(len/2,-t/2),pt(len/2,t/2),pt(-len/2,t/2)];tri(q[0],q[1],q[2],col);tri(q[0],q[2],q[3],col);};
    const ring=(z,r,col)=>{for(let i=0;i<20;i++){const a=i*Math.PI/10,b=(i+1)*Math.PI/10;beam([Math.cos(a)*r,Math.sin(a)*r,z],[Math.cos(b)*r,Math.sin(b)*r,z],.045,col);}};
    box(0,0,-9,3.8,6.8,1.4,[.22,.23,.24,.92]);box(-2.2,0,-12,.06,8,.06,[.62,.63,.64,.8]);box(2.2,0,-12,.06,8,.06,[.62,.63,.64,.8]);
    for(let i=0;i<8;i++)ring(-15-i*1.65,3.8-i*.12,[.5,.52,.54,.75]);for(let i=0;i<4;i++)ring(-28-i*.7,2.1+i*.65,[.72,.73,.74,.82]);box(0,0,-30,.1,6,.1,[.9,.9,.88,.82]);
    for(let i=0;i<14;i++)ring(-35-i*1.45,3.5+Math.sin(i*1.37)*.42,[.55,.56,.58,.76]);for(let i=0;i<7;i++){ring(-54-i*.54,2.8-i*.23,[.6,.61,.62,.8]);box(0,0,-54-i*.54,.025,3.3-i*.24,.03,[.72,.73,.75,.82]);}
    for(let i=0;i<28;i++){const a=i*2.399963,r=1.2+(i%5)*.62;box(Math.cos(a)*r,Math.sin(a)*r,-61-(i%7)*1.1,.24+(i%3)*.12,.5+(i%4)*.16,.14,[.44,.46,.49,.84]);}
    for(let i=0;i<120;i++)box(((i*37)%97)/16-3,((i*53)%71)/12-2.9,-5-(i*19%730)/10,.022,.022,.022,[.7,.72,.74,.5]);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);gl.useProgram(program);const stride=28;const pos=gl.getAttribLocation(program,'p'),col=gl.getAttribLocation(program,'c');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,stride,0);gl.enableVertexAttribArray(col);gl.vertexAttribPointer(col,4,gl.FLOAT,false,stride,12);
    const aspect=gl.getUniformLocation(program,'aspect'),camera=gl.getUniformLocation(program,'camera'),angle=gl.getUniformLocation(program,'angle'),reduced=matchMedia('(prefers-reduced-motion: reduce)');gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
    const resize=()=>{const d=Math.min(devicePixelRatio||1,innerWidth<760?1:1.35),w=Math.floor(innerWidth*d),h=Math.floor(innerHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}};
    let frame=0,visible=true;const io=new IntersectionObserver(e=>visible=e[0]?.isIntersecting??true);io.observe(document.querySelector('main'));
    const render=()=>{if(document.visibilityState==='visible'&&visible){resize();const max=Math.max(1,document.documentElement.scrollHeight-innerHeight),p=reduced.matches?0:Math.max(0,Math.min(1,scrollY/max));gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform1f(aspect,canvas.width/Math.max(1,canvas.height));gl.uniform3f(camera,Math.sin(p*Math.PI*2)*.36,Math.sin(p*Math.PI*3)*.16,-1-p*69);gl.uniform2f(angle,Math.sin(p*Math.PI*2)*.048,Math.sin(p*Math.PI*3)*.025);gl.drawArrays(gl.TRIANGLES,0,data.length/7);}frame=requestAnimationFrame(render);};
    addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',()=>{});resize();render();
    addEventListener('pagehide',()=>{cancelAnimationFrame(frame);io.disconnect();gl.deleteBuffer(buffer);gl.deleteProgram(program);},{once:true});
  }catch{document.body.dataset.webgl='off';}
})();

/* TRILYVA WebGPU frame backend.
   Runs only in the dedicated render worker. Animation code supplies WGSL;
   the GPUDevice and all WebGPU objects remain private to this module.

   Modes:
   - fragment (default): one fullscreen fragment pass.
   - compute: an 8×8 compute dispatch writes rgba8unorm pixels, then a
     fullscreen pass copies that texture to the worker's output surface.
*/
(function (root) {
  'use strict';

  var BLIT_SHADER = [
    '@group(0) @binding(0) var sourceFrame: texture_2d<f32>;',
    'struct VertexOut { @builtin(position) position: vec4<f32>, };',
    '@vertex fn vsMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOut {',
    '  var positions = array<vec2<f32>, 3>(',
    '    vec2<f32>(-1.0, -1.0),',
    '    vec2<f32>( 3.0, -1.0),',
    '    vec2<f32>(-1.0,  3.0)',
    '  );',
    '  var output: VertexOut;',
    '  output.position = vec4<f32>(positions[vertexIndex], 0.0, 1.0);',
    '  return output;',
    '}',
    '@fragment fn fsMain(@builtin(position) pixel: vec4<f32>) -> @location(0) vec4<f32> {',
    '  return textureLoad(sourceFrame, vec2<i32>(pixel.xy), 0);',
    '}'
  ].join('\n');

  var COMPUTE_TEXTURE_FORMAT = 'rgba8unorm';
  var COMPUTE_WORKGROUP_X = 8;
  var COMPUTE_WORKGROUP_Y = 8;
  var CANVAS2D_SHADER = [
    'struct Cmd { shape: vec4<f32>, geometry: vec4<f32>, color: vec4<f32>, transform: vec4<f32>, offset: vec4<f32>, };',
    'struct Params { resolution: vec2<f32>, scale: f32, count: u32, };',
    '@group(0) @binding(0) var<uniform> params: Params;',
    '@group(0) @binding(1) var<storage, read> commands: array<Cmd>;',
    'struct VOut { @builtin(position) position: vec4<f32>, @location(0) local: vec2<f32>, @location(1) @interpolate(flat) index: u32, };',
    'fn bounds(c: Cmd) -> vec4<f32> {',
    ' let k=u32(c.shape.x+0.5); let lw=c.offset.z; var lo=vec2<f32>(c.shape.y,c.shape.z); var hi=lo;',
    ' if(k==0u||k==1u||k==2u){hi=lo+vec2<f32>(c.shape.w,c.geometry.x);}',
    ' else if(k==3u||k==4u){let r=c.shape.w+select(0.0,lw*0.5,k==4u);lo-=vec2<f32>(r);hi+=vec2<f32>(r);}',
    ' else if(k==5u){let e=vec2<f32>(c.shape.w,c.geometry.x);lo=min(lo,e)-vec2<f32>(lw*0.5);hi=max(hi,e)+vec2<f32>(lw*0.5);}',
    ' else if(k==6u){let b=vec2<f32>(c.shape.w,c.geometry.x);let d=vec2<f32>(c.geometry.y,c.geometry.z);lo=min(lo,min(b,d));hi=max(hi,max(b,d));}',
    ' if(k==2u){lo-=vec2<f32>(lw*0.5);hi+=vec2<f32>(lw*0.5);} return vec4<f32>(lo,hi);',
    '}',
    '@vertex fn vsMain(@builtin(vertex_index) vi:u32,@builtin(instance_index) ii:u32)->VOut{',
    ' let c=commands[ii];let b=bounds(c);let q=array<vec2<f32>,6>(vec2<f32>(0.0,0.0),vec2<f32>(1.0,0.0),vec2<f32>(0.0,1.0),vec2<f32>(0.0,1.0),vec2<f32>(1.0,0.0),vec2<f32>(1.0,1.0));',
    ' let p=mix(b.xy,b.zw,q[vi]);let world=vec2<f32>(c.transform.x*p.x+c.transform.z*p.y+c.offset.x,c.transform.y*p.x+c.transform.w*p.y+c.offset.y);',
    ' let px=world*params.scale;let ndc=vec2<f32>(px.x/params.resolution.x*2.0-1.0,1.0-px.y/params.resolution.y*2.0);',
    ' var o:VOut;o.position=vec4<f32>(ndc,0.0,1.0);o.local=p;o.index=ii;return o;',
    '}',
    'fn inTriangle(p:vec2<f32>,a:vec2<f32>,b:vec2<f32>,c:vec2<f32>)->bool{',
    ' let s1=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);let s2=(c.x-b.x)*(p.y-b.y)-(c.y-b.y)*(p.x-b.x);let s3=(a.x-c.x)*(p.y-c.y)-(a.y-c.y)*(p.x-c.x);',
    ' let n=s1< -0.0001||s2< -0.0001||s3< -0.0001;let q=s1>0.0001||s2>0.0001||s3>0.0001;return !(n&&q);',
    '}',
    '@fragment fn fsMain(i:VOut)->@location(0) vec4<f32>{',
    ' let c=commands[i.index];let k=u32(c.shape.x+0.5);let p=i.local;let x=c.shape.y;let y=c.shape.z;let lw=max(c.offset.z,0.0001);var hit=false;',
    ' if(k==0u||k==1u){hit=p.x>=x&&p.y>=y&&p.x<=x+c.shape.w&&p.y<=y+c.geometry.x;}',
    ' else if(k==2u){let o=p.x>=x-lw*0.5&&p.y>=y-lw*0.5&&p.x<=x+c.shape.w+lw*0.5&&p.y<=y+c.geometry.x+lw*0.5;let n=p.x>x+lw*0.5&&p.y>y+lw*0.5&&p.x<x+c.shape.w-lw*0.5&&p.y<y+c.geometry.x-lw*0.5;hit=o&&!n;}',
    ' else if(k==3u||k==4u){let d=distance(p,vec2<f32>(x,y));hit=select(d<=c.shape.w,abs(d-c.shape.w)<=lw*0.5,k==4u);}',
    ' else if(k==5u){let a=vec2<f32>(x,y);let b=vec2<f32>(c.shape.w,c.geometry.x);let v=b-a;let t=dot(p-a,v)/max(dot(v,v),0.000001);let q=a+clamp(t,0.0,1.0)*v;hit=t>=0.0&&t<=1.0&&distance(p,q)<=lw*0.5;}',
    ' else if(k==6u){hit=inTriangle(p,vec2<f32>(x,y),vec2<f32>(c.shape.w,c.geometry.x),vec2<f32>(c.geometry.y,c.geometry.z));}',
    ' if(!hit){discard;}if(k==1u){return vec4<f32>(0.0);}return c.color;',
    '}'
  ].join('\n');

  function parseCanvasColor(value) {
    if(typeof value!=='string')return null;var s=value.trim().toLowerCase();
    var named={black:[0,0,0,1],white:[1,1,1,1],red:[1,0,0,1],green:[0,.5019608,0,1],blue:[0,0,1,1],yellow:[1,1,0,1],cyan:[0,1,1,1],aqua:[0,1,1,1],magenta:[1,0,1,1],fuchsia:[1,0,1,1],gray:[.5019608,.5019608,.5019608,1],grey:[.5019608,.5019608,.5019608,1],silver:[.7529412,.7529412,.7529412,1],orange:[1,.6470588,0,1],purple:[.5019608,0,.5019608,1],pink:[1,.7529412,.7960784,1],transparent:[0,0,0,0]};
    if(named[s])return named[s].slice();
    if(/^#[0-9a-f]{3,4}$/.test(s)){var h=s.slice(1);return[parseInt(h[0]+h[0],16)/255,parseInt(h[1]+h[1],16)/255,parseInt(h[2]+h[2],16)/255,h.length===4?parseInt(h[3]+h[3],16)/255:1];}
    if(/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(s))return[parseInt(s.slice(1,3),16)/255,parseInt(s.slice(3,5),16)/255,parseInt(s.slice(5,7),16)/255,s.length===9?parseInt(s.slice(7,9),16)/255:1];
    var m=s.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*(?:,\s*([0-9.]+)\s*)?\)$/);
    if(m)return[Math.max(0,Math.min(255,+m[1]))/255,Math.max(0,Math.min(255,+m[2]))/255,Math.max(0,Math.min(255,+m[3]))/255,m[4]===undefined?1:Math.max(0,Math.min(1,+m[4]))];
    return null;
  }

  function createCanvas2DRecorder(width,height) {
    var commands=[],unsupported='',maxCommands=8192;
    var state={fillStyle:'#000000',strokeStyle:'#000000',globalAlpha:1,lineWidth:1,globalCompositeOperation:'source-over',lineCap:'butt'};
    var matrix=[1,0,0,1,0,0],stack=[],path=[],current=null,canvasLike={width:width,height:height};
    function fail(reason){if(!unsupported)unsupported=reason;}
    function finite(){return Array.prototype.every.call(arguments,function(v){return Number.isFinite(Number(v));});}
    function multiply(a,b){return[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
    function emit(kind,x,y,x2,y2,x3,y3){
      if(unsupported)return;if(commands.length>=maxCommands){fail('Canvas2D command limit exceeded ('+maxCommands+').');return;}
      var stroke=kind===2||kind===4||kind===5,rgba=kind===1?[0,0,0,0]:parseCanvasColor(stroke?state.strokeStyle:state.fillStyle);
      if(!rgba){fail('Unsupported Canvas 2D colour/style: '+String(stroke?state.strokeStyle:state.fillStyle));return;}
      var alpha=kind===1?0:rgba[3]*state.globalAlpha,m=matrix,q=new Float32Array(20);
      q[0]=kind;q[1]=x;q[2]=y;q[3]=x2;q[4]=y2;q[5]=x3||0;q[6]=y3||0;q[8]=rgba[0]*alpha;q[9]=rgba[1]*alpha;q[10]=rgba[2]*alpha;q[11]=alpha;
      q[12]=m[0];q[13]=m[1];q[14]=m[2];q[15]=m[3];q[16]=m[4];q[17]=m[5];q[18]=state.lineWidth;commands.push(q);
    }
    function addPoint(x,y){if(!finite(x,y)){fail('Canvas 2D path coordinates must be finite.');return;}if(!current){current={points:[],closed:false};path.push(current);}current.points.push([+x,+y]);}
    function isConvex(p){if(p.length<3)return false;var sign=0;for(var i=0;i<p.length;i++){var a=p[i],b=p[(i+1)%p.length],c=p[(i+2)%p.length],v=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);if(Math.abs(v)<1e-8)continue;var s=v>0?1:-1;if(sign&&sign!==s)return false;sign=s;}return !!sign;}
    var methods={
      fillRect:function(x,y,w,h){if(!finite(x,y,w,h)){fail('fillRect() requires finite coordinates.');return;}x=+x;y=+y;w=+w;h=+h;if(w<0){x+=w;w=-w;}if(h<0){y+=h;h=-h;}if(w&&h)emit(0,x,y,w,h);},
      clearRect:function(x,y,w,h){if(!finite(x,y,w,h)){fail('clearRect() requires finite coordinates.');return;}x=+x;y=+y;w=+w;h=+h;if(w<0){x+=w;w=-w;}if(h<0){y+=h;h=-h;}if(w&&h)emit(1,x,y,w,h);},
      strokeRect:function(x,y,w,h){if(!finite(x,y,w,h)){fail('strokeRect() requires finite coordinates.');return;}x=+x;y=+y;w=+w;h=+h;if(w<0){x+=w;w=-w;}if(h<0){y+=h;h=-h;}if(w&&h)emit(2,x,y,w,h);},
      beginPath:function(){path=[];current=null;},
      closePath:function(){if(current&&current.points.length>1)current.closed=true;},
      moveTo:function(x,y){current={points:[],closed:false};path.push(current);addPoint(x,y);},
      lineTo:addPoint,
      rect:function(x,y,w,h){if(!finite(x,y,w,h)){fail('rect() requires finite coordinates.');return;}var q={points:[[+x,+y],[+x + +w,+y],[+x + +w,+y + +h],[+x,+y + +h]],closed:true};path.push(q);current=q;},
      arc:function(x,y,r,start,end,anti){if(!finite(x,y,r,start,end)||+r<0){fail('arc() received invalid geometry.');return;}x=+x;y=+y;r=+r;start=+start;end=+end;var tau=Math.PI*2,sweep=end-start;if(!anti){if(Math.abs(sweep)>=tau)sweep=tau;else while(sweep<0)sweep+=tau;}else{if(Math.abs(sweep)>=tau)sweep=-tau;else while(sweep>0)sweep-=tau;}var steps=Math.max(2,Math.min(128,Math.ceil(Math.abs(sweep)/(Math.PI/20)))),first=[x+Math.cos(start)*r,y+Math.sin(start)*r];if(!current){current={points:[],closed:false};path.push(current);addPoint(first[0],first[1]);}else{var last=current.points[current.points.length-1];if(!last||Math.abs(last[0]-first[0])>1e-6||Math.abs(last[1]-first[1])>1e-6)addPoint(first[0],first[1]);}for(var i=1;i<=steps;i++){var a=start+sweep*i/steps;addPoint(x+Math.cos(a)*r,y+Math.sin(a)*r);}if(Math.abs(sweep)>=tau-1e-6)current.closed=true;},
      quadraticCurveTo:function(cx,cy,x,y){if(!current||!current.points.length){fail('quadraticCurveTo() requires a current point.');return;}var p=current.points[current.points.length-1];for(var i=1;i<=16;i++){var t=i/16,u=1-t;addPoint(u*u*p[0]+2*u*t*+cx+t*t*+x,u*u*p[1]+2*u*t*+cy+t*t*+y);}},
      bezierCurveTo:function(a,b,c,d,x,y){if(!current||!current.points.length){fail('bezierCurveTo() requires a current point.');return;}var p=current.points[current.points.length-1];for(var i=1;i<=24;i++){var t=i/24,u=1-t;addPoint(u*u*u*p[0]+3*u*u*t*+a+3*u*t*t*+c+t*t*t*+x,u*u*u*p[1]+3*u*u*t*+b+3*u*t*t*+d+t*t*t*+y);}},
      fill:function(rule){if(rule&&rule!=='nonzero'){fail('Only the nonzero fill rule is supported by automatic GPU conversion.');return;}if(path.length>1){fail('Multiple Canvas 2D fill subpaths/holes require native compositing.');return;}path.forEach(function(sub){var p=sub.points;if(!isConvex(p)){fail('Only convex Canvas 2D fill paths are currently GPU accelerated.');return;}for(var i=1;i<p.length-1;i++)emit(6,p[0][0],p[0][1],p[i][0],p[i][1],p[i+1][0],p[i+1][1]);});},
      stroke:function(){path.forEach(function(sub){var p=sub.points;for(var i=1;i<p.length;i++)emit(5,p[i-1][0],p[i-1][1],p[i][0],p[i][1]);if(sub.closed&&p.length>2)emit(5,p[p.length-1][0],p[p.length-1][1],p[0][0],p[0][1]);});},
      save:function(){stack.push({state:Object.assign({},state),matrix:matrix.slice()});},
      restore:function(){var s=stack.pop();if(s){state=s.state;matrix=s.matrix;}},
      translate:function(x,y){if(!finite(x,y)){fail('translate() requires finite values.');return;}matrix=multiply(matrix,[1,0,0,1,+x,+y]);},
      rotate:function(a){if(!finite(a)){fail('rotate() requires a finite angle.');return;}var c=Math.cos(+a),s=Math.sin(+a);matrix=multiply(matrix,[c,s,-s,c,0,0]);},
      scale:function(x,y){if(!finite(x,y)){fail('scale() requires finite values.');return;}matrix=multiply(matrix,[+x,0,0,+y,0,0]);},
      transform:function(a,b,c,d,e,f){if(!finite(a,b,c,d,e,f)){fail('transform() requires six finite values.');return;}matrix=multiply(matrix,[+a,+b,+c,+d,+e,+f]);},
      setTransform:function(a,b,c,d,e,f){if(a&&typeof a==='object'){fail('DOMMatrix setTransform() is not supported yet.');return;}if(!finite(a,b,c,d,e,f)){fail('setTransform() requires six finite values.');return;}matrix=[+a,+b,+c,+d,+e,+f];},
      resetTransform:function(){matrix=[1,0,0,1,0,0];}
    };
    var proxy=new Proxy({},{
      get:function(_,p){if(p==='canvas')return canvasLike;if(Object.prototype.hasOwnProperty.call(methods,p))return methods[p];if(Object.prototype.hasOwnProperty.call(state,p))return state[p];if(p==='filter')return 'none';fail('Canvas 2D API "'+String(p)+'" is not supported by automatic GPU conversion.');return undefined;},
      set:function(_,p,v){if(p==='fillStyle'||p==='strokeStyle'){if(!parseCanvasColor(v)){fail('Canvas style "'+String(v)+'" needs a gradient, pattern, or unsupported colour.');return true;}state[p]=v;return true;}if(p==='globalAlpha'){var a=+v;if(Number.isFinite(a)&&a>=0&&a<=1)state.globalAlpha=a;return true;}if(p==='lineWidth'){var w=+v;if(Number.isFinite(w)&&w>0)state.lineWidth=w;return true;}if(p==='globalCompositeOperation'){if(v!=='source-over')fail('Composite mode "'+String(v)+'" requires the native Canvas compositor.');state.globalCompositeOperation=v;return true;}if(p==='lineCap'){if(v!=='butt')fail('Only the default butt line cap is supported.');state.lineCap=v;return true;}if(p==='filter'){if(v!=='none')fail('Canvas filters require the native compositor.');return true;}fail('Canvas 2D property "'+String(p)+'" is not supported by automatic GPU conversion.');return true;}
    });
    return {context:proxy,finish:function(){var data=new Float32Array(commands.length*20);for(var i=0;i<commands.length;i++)data.set(commands[i],i*20);return{supported:!unsupported,reason:unsupported||null,commands:data,count:commands.length};},get supported(){return !unsupported;},get reason(){return unsupported;}};
  }

  function createRenderer() {
    var adapter = null;
    var device = null;
    var canvas = null;
    var context = null;
    var format = null;
    var pipeline = null;
    var computePipeline = null;
    var blitPipeline = null;
    var shaderText = '';
    var shaderMode = '';
    var uniformBuffer = null;
    var bindGroup = null;
    var computeTexture = null;
    var computeBindGroup = null;
    var blitBindGroup = null;
    var width = 0;
    var height = 0;
    var computeWidth = 0;
    var computeHeight = 0;
    var ready = false;
    var lost = null;
    var adapterLabel = 'WebGPU adapter';
    var activeLabel = '';
    var activeMode = 'fragment';
    var canvas2DPipeline=null,canvas2DClearPipeline=null,canvas2DUniformBuffer=null;
    var canvas2DCommandBuffer=null,canvas2DCommandCapacity=0,canvas2DBindGroup=null;

    function gpuError(message) {
      var error = new Error(message);
      error.name = 'WebGPUBackendError';
      return error;
    }

    function clearComputeTarget() {
      if (computeTexture) {
        try { computeTexture.destroy(); } catch (_) {}
      }
      computeTexture = null;
      computeBindGroup = null;
      blitBindGroup = null;
      computeWidth = 0;
      computeHeight = 0;
    }

    async function ensureDevice() {
      if (device && !lost) return device;
      if (!root.navigator || !root.navigator.gpu) {
        throw gpuError('WebGPU is not exposed in this rendering worker. The Canvas 2D fallback remains available.');
      }

      adapter = await root.navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) {
        throw gpuError('The browser did not provide a high-performance WebGPU adapter.');
      }

      var info = null;
      try {
        info = adapter.info || (adapter.requestAdapterInfo ? await adapter.requestAdapterInfo() : null);
      } catch (_) {}
      if (info) {
        adapterLabel = [info.vendor, info.architecture, info.device].filter(Boolean).join(' · ') || adapterLabel;
      }

      device = await adapter.requestDevice();
      lost = null;
      device.lost.then(function (reason) {
        lost = reason && reason.message ? reason.message : 'The WebGPU device was lost.';
        ready = false;
        pipeline = null;
        computePipeline = null;
        blitPipeline = null;
        bindGroup = null;
        computeBindGroup = null;
        blitBindGroup = null;
        uniformBuffer = null;
        computeTexture = null;
        context = null;
        canvas = null;
        width = 0;
        height = 0;
        computeWidth = 0;
        computeHeight = 0;
        canvas2DPipeline=null;canvas2DClearPipeline=null;canvas2DUniformBuffer=null;canvas2DCommandBuffer=null;canvas2DCommandCapacity=0;canvas2DBindGroup=null;
        device = null;
      }).catch(function () {});

      format = root.navigator.gpu.getPreferredCanvasFormat();
      return device;
    }

    async function createPipeline(module, descriptor) {
      return descriptor.createRenderPipelineAsync
        ? descriptor.createRenderPipelineAsync(module)
        : descriptor.createRenderPipeline(module);
    }

    async function buildPipeline(descriptor) {
      var d = await ensureDevice();
      var source = descriptor.wgsl;
      var mode = descriptor.mode === 'compute' ? 'compute' : 'fragment';

      if (typeof source !== 'string' || !source.trim()) {
        throw gpuError('The GPU renderer did not receive a WGSL shader string.');
      }

      var alreadyBuilt = source === shaderText && mode === shaderMode && uniformBuffer &&
        (mode === 'compute' ? !!(computePipeline && blitPipeline) : !!pipeline);
      if (alreadyBuilt) return;

      var module = d.createShaderModule({ code: source });
      if (module.getCompilationInfo) {
        var compilation = await module.getCompilationInfo();
        var errors = (compilation.messages || []).filter(function (message) {
          return message.type === 'error';
        });
        if (errors.length) {
          throw gpuError('WGSL compilation failed: ' + errors.slice(0, 5).map(function (message) {
            return (message.lineNum ? 'line ' + message.lineNum + ': ' : '') + message.message;
          }).join(' | '));
        }
      }

      var nextPipeline = null;
      var nextComputePipeline = null;
      var nextBlitPipeline = null;

      if (mode === 'compute') {
        var computeDescriptor = {
          label: 'TRILYVA WGSL compute frame pipeline',
          layout: 'auto',
          compute: {
            module: module,
            entryPoint: String(descriptor.computeEntryPoint || 'computeMain')
          }
        };
        nextComputePipeline = d.createComputePipelineAsync
          ? await d.createComputePipelineAsync(computeDescriptor)
          : d.createComputePipeline(computeDescriptor);

        var blitModule = d.createShaderModule({ code: BLIT_SHADER });
        var blitDescriptor = {
          label: 'TRILYVA compute output blit pipeline',
          layout: 'auto',
          vertex: { module: blitModule, entryPoint: 'vsMain' },
          fragment: {
            module: blitModule,
            entryPoint: 'fsMain',
            targets: [{ format: format }]
          },
          primitive: { topology: 'triangle-list' }
        };
        nextBlitPipeline = d.createRenderPipelineAsync
          ? await d.createRenderPipelineAsync(blitDescriptor)
          : d.createRenderPipeline(blitDescriptor);
      } else {
        var renderDescriptor = {
          label: 'TRILYVA WGSL frame pipeline',
          layout: 'auto',
          vertex: {
            module: module,
            entryPoint: String(descriptor.vertexEntryPoint || 'vsMain')
          },
          fragment: {
            module: module,
            entryPoint: String(descriptor.fragmentEntryPoint || 'fsMain'),
            targets: [{ format: format }]
          },
          primitive: { topology: 'triangle-list' }
        };
        nextPipeline = d.createRenderPipelineAsync
          ? await d.createRenderPipelineAsync(renderDescriptor)
          : d.createRenderPipeline(renderDescriptor);
      }

      var nextUniform = d.createBuffer({
        label: 'TRILYVA frame uniforms',
        size: 48,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });

      if (uniformBuffer) {
        try { uniformBuffer.destroy(); } catch (_) {}
      }
      clearComputeTarget();

      shaderText = source;
      shaderMode = mode;
      pipeline = nextPipeline;
      computePipeline = nextComputePipeline;
      blitPipeline = nextBlitPipeline;
      uniformBuffer = nextUniform;
      bindGroup = mode === 'fragment'
        ? d.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
          })
        : null;
      activeMode = mode;
      ready = true;
    }

    function ensureComputeTarget(d, w, h) {
      if (computeTexture && computeWidth === w && computeHeight === h &&
          computeBindGroup && blitBindGroup) return;

      clearComputeTarget();
      computeTexture = d.createTexture({
        label: 'TRILYVA compute frame output',
        size: [w, h, 1],
        format: COMPUTE_TEXTURE_FORMAT,
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
      });
      computeWidth = w;
      computeHeight = h;

      var view = computeTexture.createView();
      computeBindGroup = d.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: view }
        ]
      });
      blitBindGroup = d.createBindGroup({
        layout: blitPipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: view }]
      });
    }

    async function buildCanvas2D(d) {
      if(canvas2DPipeline&&canvas2DClearPipeline&&canvas2DUniformBuffer)return;
      var module=d.createShaderModule({label:'TRILYVA automatic Canvas 2D WGSL',code:CANVAS2D_SHADER});
      if(module.getCompilationInfo){var info=await module.getCompilationInfo();var errors=(info.messages||[]).filter(function(m){return m.type==='error';});if(errors.length)throw gpuError('Automatic Canvas 2D WGSL failed: '+errors.slice(0,5).map(function(m){return(m.lineNum?'line '+m.lineNum+': ':'')+m.message;}).join(' | '));}
      var vertex={module:module,entryPoint:'vsMain'},base={layout:'auto',vertex:vertex,primitive:{topology:'triangle-list'}};
      var blend={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
      var normal=Object.assign({},base,{label:'TRILYVA Canvas 2D source-over',fragment:{module:module,entryPoint:'fsMain',targets:[{format:format,blend:blend}]}});
      var clear=Object.assign({},base,{label:'TRILYVA Canvas 2D clear',fragment:{module:module,entryPoint:'fsMain',targets:[{format:format}]}});
      var pair=await Promise.all([d.createRenderPipelineAsync?d.createRenderPipelineAsync(normal):Promise.resolve(d.createRenderPipeline(normal)),d.createRenderPipelineAsync?d.createRenderPipelineAsync(clear):Promise.resolve(d.createRenderPipeline(clear))]);
      canvas2DUniformBuffer=d.createBuffer({label:'TRILYVA Canvas 2D parameters',size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      canvas2DPipeline=pair[0];canvas2DClearPipeline=pair[1];
    }
    async function renderCanvas2DNow(commands,count,w,h,scale) {
      w=Math.floor(Number(w));h=Math.floor(Number(h));scale=Number(scale);
      if(!(w>0)||!(h>0)||!(scale>0)||!Number.isFinite(scale))throw gpuError('Canvas 2D GPU target dimensions/scale are invalid.');
      if(!(commands instanceof Float32Array))commands=new Float32Array(commands||[]);
      count=Math.max(0,Math.floor(Number(count)||0));
      if(commands.length!==count*20||count>8192)throw gpuError('Canvas 2D GPU command buffer is invalid or exceeds 8192 commands.');
      var d=await ensureDevice(),max=Number(d.limits.maxTextureDimension2D)||8192;
      if(w>max||h>max)throw gpuError('Canvas 2D GPU target exceeds the adapter texture dimension limit ('+max+').');
      await buildCanvas2D(d);
      var changed=!canvas||canvas.width!==w||canvas.height!==h||width!==w||height!==h;
      if(!canvas){canvas=new OffscreenCanvas(w,h);context=canvas.getContext('webgpu');if(!context)throw gpuError('WebGPU OffscreenCanvas context unavailable for Canvas 2D conversion.');changed=true;}
      if(changed){canvas.width=w;canvas.height=h;context.configure({device:d,format:format,alphaMode:'premultiplied'});width=w;height=h;}
      var bytes=Math.max(80,commands.byteLength),maxStore=Number(d.limits.maxStorageBufferBindingSize)||134217728,maxBuffer=Number(d.limits.maxBufferSize)||maxStore;
      if(bytes>Math.min(maxStore,maxBuffer))throw gpuError('Canvas 2D GPU command storage exceeds device limits.');
      if(!canvas2DCommandBuffer||canvas2DCommandCapacity<bytes){if(canvas2DCommandBuffer)canvas2DCommandBuffer.destroy();canvas2DCommandBuffer=d.createBuffer({label:'TRILYVA Canvas 2D commands',size:bytes,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});canvas2DCommandCapacity=bytes;}
      var data=new ArrayBuffer(16),v=new DataView(data);v.setFloat32(0,w,true);v.setFloat32(4,h,true);v.setFloat32(8,scale,true);v.setUint32(12,count,true);
      d.queue.writeBuffer(canvas2DUniformBuffer,0,data);
      if(commands.byteLength)d.queue.writeBuffer(canvas2DCommandBuffer,0,commands);else d.queue.writeBuffer(canvas2DCommandBuffer,0,new Float32Array(20));
      canvas2DBindGroup=d.createBindGroup({layout:canvas2DPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:canvas2DUniformBuffer}},{binding:1,resource:{buffer:canvas2DCommandBuffer,offset:0,size:bytes}}]});
      var encoder=d.createCommandEncoder({label:'TRILYVA Canvas 2D frame'}),pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
      pass.setBindGroup(0,canvas2DBindGroup);var last=null;
      for(var i=0;i<count;i++){var pipe=Math.round(commands[i*20])===1?canvas2DClearPipeline:canvas2DPipeline;if(pipe!==last){pass.setPipeline(pipe);last=pipe;}pass.draw(6,1,0,i);}
      pass.end();d.queue.submit([encoder.finish()]);if(d.queue.onSubmittedWorkDone)await d.queue.onSubmittedWorkDone();
      ready=true;activeMode='canvas2d-auto';return canvas.transferToImageBitmap();
    }
    function renderCanvas2D(commands,count,w,h,scale){
      var task=renderQueue.then(function(){return renderCanvas2DNow(commands,count,w,h,scale);});
      renderQueue=task.then(function(){return undefined;},function(){return undefined;});return task;
    }

    async function prepare(descriptor) {
      if (!descriptor || typeof descriptor.wgsl !== 'string') {
        throw gpuError('GPU source must be an object with a WGSL string in its wgsl property.');
      }
      await buildPipeline(descriptor);
      activeLabel = String(descriptor.label || 'Custom WGSL animation');
      return {
        active: true,
        backend: 'WebGPU',
        mode: activeMode,
        canvas2DAuto: !!(device&&canvas2DPipeline&&canvas2DClearPipeline),
        modes: ['fragment', 'compute'],
        adapter: adapterLabel,
        format: format,
        label: activeLabel
      };
    }

    function updateUniforms(d, frame, w, h) {
      var uniforms = new Float32Array([
        w, h,
        Number(frame.time) || 0,
        Number(frame.frame) || 0,
        Number(frame.fps) || 60,
        Number(frame.duration) || 1,
        Number(frame.frameCount) || 1,
        Number(frame.seed) || 0,
        Number(frame.loopDuration) || Number(frame.duration) || 1,
        frame.loop ? 1 : 0,
        Number(frame.speed) || 1,
        frame.reverse ? 1 : 0
      ]);
      d.queue.writeBuffer(uniformBuffer, 0, uniforms);
    }

    async function renderNow(descriptor, frame, outputWidth, outputHeight, transferBitmap) {
      var w = Math.floor(Number(outputWidth));
      var h = Math.floor(Number(outputHeight));
      if (!(w > 0) || !(h > 0)) {
        throw gpuError('WebGPU output dimensions must be positive integers.');
      }

      await prepare(descriptor);
      var d = await ensureDevice();
      var max = d.limits.maxTextureDimension2D || 8192;
      if (w > max || h > max) {
        throw gpuError('Requested GPU frame ' + w + '×' + h +
          ' exceeds this adapter texture limit of ' + max +
          ' pixels per edge. No resize was applied.');
      }

      if (!canvas) {
        canvas = new OffscreenCanvas(w, h);
        context = canvas.getContext('webgpu');
        if (!context) {
          throw gpuError('OffscreenCanvas could not create a WebGPU context in the render worker.');
        }
      }
      if (canvas.width !== w || canvas.height !== h || width !== w || height !== h) {
        canvas.width = w;
        canvas.height = h;
        context.configure({
          device: d,
          format: format,
          alphaMode: 'premultiplied'
        });
        width = w;
        height = h;
      }

      updateUniforms(d, frame, w, h);
      var encoder = d.createCommandEncoder({ label: 'TRILYVA frame ' + frame.frame });

      if (activeMode === 'compute') {
        ensureComputeTarget(d, w, h);
        var computePass = encoder.beginComputePass({ label: 'TRILYVA compute dispatch' });
        computePass.setPipeline(computePipeline);
        computePass.setBindGroup(0, computeBindGroup);
        computePass.dispatchWorkgroups(
          Math.ceil(w / COMPUTE_WORKGROUP_X),
          Math.ceil(h / COMPUTE_WORKGROUP_Y),
          1
        );
        computePass.end();

        var blitPass = encoder.beginRenderPass({
          colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store'
          }]
        });
        blitPass.setPipeline(blitPipeline);
        blitPass.setBindGroup(0, blitBindGroup);
        blitPass.draw(3, 1, 0, 0);
        blitPass.end();
      } else {
        var renderPass = encoder.beginRenderPass({
          colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store'
          }]
        });
        renderPass.setPipeline(pipeline);
        renderPass.setBindGroup(0, bindGroup);
        renderPass.draw(3, 1, 0, 0);
        renderPass.end();
      }

      d.queue.submit([encoder.finish()]);
      if (d.queue.onSubmittedWorkDone) await d.queue.onSubmittedWorkDone();
      return transferBitmap === false ? canvas : canvas.transferToImageBitmap();
    }

    var renderQueue = Promise.resolve();

    function enqueueRender(descriptor, frame, outputWidth, outputHeight, transferBitmap) {
      var task = renderQueue.then(function () {
        return renderNow(descriptor, frame, outputWidth, outputHeight, transferBitmap);
      });
      renderQueue = task.then(function () { return undefined; }, function () { return undefined; });
      return task;
    }

    function render(descriptor, frame, outputWidth, outputHeight) {
      return enqueueRender(descriptor, frame, outputWidth, outputHeight, true);
    }

    function renderCanvas(descriptor, frame, outputWidth, outputHeight) {
      return enqueueRender(descriptor, frame, outputWidth, outputHeight, false);
    }

    function status() {
      return {
        active: !!(ready && device && !lost),
        backend: 'WebGPU',
        mode: activeMode,
        adapter: adapterLabel,
        label: activeLabel,
        error: lost || null
      };
    }

    function dispose() {
      ready = false;
      if (uniformBuffer) { try { uniformBuffer.destroy(); } catch (_) {} }
      if(canvas2DUniformBuffer){try{canvas2DUniformBuffer.destroy();}catch(_){}}if(canvas2DCommandBuffer){try{canvas2DCommandBuffer.destroy();}catch(_){}}
      clearComputeTarget();
      if (device) { try { device.destroy(); } catch (_) {} }
      uniformBuffer = null;canvas2DUniformBuffer=null;canvas2DCommandBuffer=null;canvas2DCommandCapacity=0;canvas2DBindGroup=null;canvas2DPipeline=null;canvas2DClearPipeline=null;
      bindGroup = null;
      pipeline = null;
      computePipeline = null;
      blitPipeline = null;
      device = null;
      adapter = null;
      canvas = null;
      context = null;
      width = 0;
      height = 0;
      shaderText = '';
      shaderMode = '';
      activeLabel = '';
      activeMode = 'fragment';
    }

    return {
      prepare: prepare,
      render: render,
      renderCanvas: renderCanvas,
      renderCanvas2D: renderCanvas2D,
      status: status,
      dispose: dispose
    };
  }

  root.TRILYVAWebGPU = {
    createRenderer: createRenderer,
    createCanvas2DRecorder: createCanvas2DRecorder,
    version: '1.2.0',
    modes: ['fragment', 'compute']
  };
})(self);

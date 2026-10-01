/* CODE→EPS v2 Vector Scene Bridge
 * Converts drawing operations into editable scene objects.
 */
(function(global){
'use strict';

function createBridge(engine){
 const Scene=engine.Scene||engine.VectorScene;
 const scene=new Scene(3840,2160);
 let current=null;
 const stack=[];
 const state={fill:'#000000',stroke:null,width:1,opacity:1,matrix:[1,0,0,1,0,0]};

 function add(type,data){
  scene.add(Object.assign({type:type,t:type,matrix:state.matrix.slice()},data));
 }

 return {
  scene,
  beginPath(){current=[]},
  moveTo(x,y){current.push(['M',x,y])},
  lineTo(x,y){current.push(['L',x,y])},
  bezierCurveTo(a,b,c,d,e,f){current.push(['C',a,b,c,d,e,f])},
  closePath(){current.push(['Z'])},
  fill(){add('path',{commands:current.slice(),fill:state.fill,stroke:null,width:0,opacity:state.opacity})},
  stroke(){add('path',{commands:current.slice(),fill:null,stroke:state.stroke,width:state.width,opacity:state.opacity})},
  setFill(c){state.fill=c},
  setStroke(c){state.stroke=c},
  setLineWidth(v){state.width=v},
  setOpacity(v){state.opacity=v},
  save(){stack.push(JSON.parse(JSON.stringify(state)))},
  restore(){Object.assign(state,stack.pop()||state)},
  finish(){return scene}
 };
}

global.CODE_EPS_SCENE_BRIDGE=createBridge;
})(typeof window!=='undefined'?window:this);

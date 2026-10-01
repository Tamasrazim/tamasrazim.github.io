/* CODE→EPS v2
 * Scene Graph -> EPS Serializer -> Validator
 * Tamasrazim
 */
(function(global){'use strict';

const EPS={};

function safeNumber(v){const n=Number(v);return Number.isFinite(n)?Number(n.toFixed(3)):0;}
function safeText(v){return String(v??'').replace(/[^\x20-\x7E]/g,'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
function rgb(c){if(Array.isArray(c))return c.map(safeNumber).join(' ');let h=String(c||'#000').replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');return [0,2,4].map(i=>safeNumber(parseInt(h.slice(i,i+2),16)/255)).join(' ');}

class SceneGraph{
 constructor(width=3840,height=2160){this.width=width;this.height=height;this.children=[];}
 add(o){this.children.push(o);return o;}
}
class Transform{
 constructor(){this.a=1;this.b=0;this.c=0;this.d=1;this.e=0;this.f=0;}
}
class Group{
 constructor(){this.type='group';this.children=[];this.transform=new Transform();}
 add(o){this.children.push(o);return o;}
}
class Path{
 constructor(){this.type='path';this.commands=[];this.fill=null;this.stroke=null;this.strokeWidth=1;this.opacity=1;this.transform=new Transform();}
}
class TextObject{
 constructor(text,x,y,size=12,font='Helvetica'){this.type='text';this.text=text;this.x=x;this.y=y;this.size=size;this.font=font;this.transform=new Transform();}
}

function emitTransform(t){return `${safeNumber(t.a)} ${safeNumber(t.b)} ${safeNumber(t.c)} ${safeNumber(t.d)} ${safeNumber(t.e)} ${safeNumber(t.f)} concat\n`;}

class Serializer{
 static write(scene){
 let out=[];
 out.push('%!PS-Adobe-3.0 EPSF-3.0');
 out.push('%%Creator: Tamasrazim CODE-EPS');
 out.push('%%Title: CODE-EPS Vector Artwork');
 out.push(`%%BoundingBox: 0 0 ${Math.round(scene.width)} ${Math.round(scene.height)}`);
 out.push(`%%HiResBoundingBox: 0 0 ${scene.width}.0 ${scene.height}.0`);
 out.push('%%LanguageLevel: 3');
 out.push('%%Pages: 1');
 out.push('%%EndComments');
 scene.children.forEach(o=>out.push(this.object(o)));
 out.push('%%EOF');
 return out.join('\n').replace(/[^\x09\x0A\x0D\x20-\x7E]/g,'');
 }
 static object(o){
 if(o.type==='group')return o.children.map(this.object).join('\n');
 if(o.type==='text')return `(${safeText(o.text)}) show`;
 if(o.type!=='path')return '';
 let s='gsave\n';
 for(const c of o.commands){
  if(c[0]==='M')s+=`${safeNumber(c[1])} ${safeNumber(c[2])} moveto\n`;
  if(c[0]==='L')s+=`${safeNumber(c[1])} ${safeNumber(c[2])} lineto\n`;
  if(c[0]==='C')s+=`${c.slice(1).map(safeNumber).join(' ')} curveto\n`;
  if(c[0]==='Z')s+='closepath\n';
 }
 if(o.fill)s+=`${rgb(o.fill)} setrgbcolor\nfill\n`;
 if(o.stroke)s+=`${rgb(o.stroke)} setrgbcolor\n${safeNumber(o.strokeWidth)} setlinewidth\nstroke\n`;
 return s+'grestore';
 }
}

function validate(e){
 if(typeof e!=='string')return false;
 if(!e.startsWith('%!PS-Adobe-3.0 EPSF-3.0'))return false;
 if(!e.includes('%%BoundingBox'))return false;
 if(!e.includes('%%EOF'))return false;
 if(/NaN|Infinity/.test(e))return false;
 if(/[^\x00-\x7F]/.test(e))return false;
 return true;
}

EPS.SceneGraph=SceneGraph;
EPS.Group=Group;
EPS.Path=Path;
EPS.Text=TextObject;
EPS.Serializer=Serializer;
EPS.serialize=Serializer.write;
EPS.validate=validate;

global.CODE_EPS_V2=EPS;
})(typeof window!=='undefined'?window:this);

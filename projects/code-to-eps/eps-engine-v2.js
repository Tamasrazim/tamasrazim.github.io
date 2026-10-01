/* CODE→EPS v2 EPS Engine
 * Production-safe PostScript serializer foundation.
 * No direct Canvas -> PostScript conversion.
 */

(function(global){
'use strict';

class VectorScene {
  constructor(width,height){
    this.width=width;
    this.height=height;
    this.objects=[];
  }
  add(object){
    this.objects.push(object);
    return object;
  }
}

function safeNumber(value){
  const n=Number(value);
  return Number.isFinite(n)?Number(n.toFixed(3)):0;
}

function psString(value){
  return String(value)
    .replace(/\\/g,'\\\\')
    .replace(/\(/g,'\\(')
    .replace(/\)/g,'\\)')
    .replace(/[^\x20-\x7E\r\n\t]/g,'');
}

function rgb(value){
  if(Array.isArray(value)) return value.map(v=>safeNumber(v)).join(' ');
  return '0 0 0';
}

class EPSWriter {
  constructor(width,height,title='Artwork'){
    this.width=width;
    this.height=height;
    this.title=title;
    this.lines=[];
  }

  header(){
    this.lines.push('%!PS-Adobe-3.0 EPSF-3.0');
    this.lines.push('%%Creator: Tamasrazim CODE-EPS');
    this.lines.push('%%Title: '+psString(this.title));
    this.lines.push('%%BoundingBox: 0 0 '+this.width+' '+this.height);
    this.lines.push('%%HiResBoundingBox: 0 0 '+this.width+' '+this.height);
    this.lines.push('%%LanguageLevel: 3');
    this.lines.push('%%Pages: 1');
    this.lines.push('%%EndComments');
  }

  path(commands,style={}){
    this.lines.push('gsave');
    if(style.fill){
      this.lines.push(rgb(style.fill)+' setrgbcolor');
    }
    for(const command of commands){
      const c=command[0];
      if(c==='M') this.lines.push(safeNumber(command[1])+' '+safeNumber(command[2])+' moveto');
      if(c==='L') this.lines.push(safeNumber(command[1])+' '+safeNumber(command[2])+' lineto');
      if(c==='C') this.lines.push(command.slice(1).map(safeNumber).join(' ')+' curveto');
      if(c==='Z') this.lines.push('closepath');
    }
    if(style.stroke) this.lines.push('stroke');
    else this.lines.push('fill');
    this.lines.push('grestore');
  }

  finish(){
    this.lines.push('showpage');
    this.lines.push('%%EOF');
    return this.lines.join('\n');
  }
}

function validateEPS(eps){
  if(!eps.startsWith('%!PS-Adobe-3.0 EPSF')) throw new Error('Invalid EPS header');
  if(!eps.includes('%%BoundingBox')) throw new Error('Missing BoundingBox');
  if(!eps.includes('%%EOF')) throw new Error('Missing EOF');
  if(/NaN|Infinity/.test(eps)) throw new Error('Invalid numeric value');
  if(/[^\x00-\x7F]/.test(eps)) throw new Error('Non ASCII data');
  return true;
}

global.CODE_EPS_V2={
  VectorScene,
  EPSWriter,
  validateEPS,
  safeNumber,
  psString
};

})(typeof window!=='undefined'?window:this);

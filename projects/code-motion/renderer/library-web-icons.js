/* TRILYVA Web Icons library module */
function iconCode(id) {
  const f = {
    search: 'ctx.beginPath();ctx.arc(9,9,5,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(13,13);ctx.lineTo(18,18);ctx.stroke();',
    home: 'ctx.beginPath();ctx.moveTo(2,9);ctx.lineTo(10,2);ctx.lineTo(18,9);ctx.lineTo(16,9);ctx.lineTo(16,17);ctx.lineTo(4,17);ctx.lineTo(4,9);ctx.closePath();ctx.stroke();',
    menu: 'ctx.beginPath();ctx.moveTo(3,6);ctx.lineTo(17,6);ctx.moveTo(3,10);ctx.lineTo(17,10);ctx.moveTo(3,14);ctx.lineTo(17,14);ctx.stroke();',
    close: 'ctx.beginPath();ctx.moveTo(4,4);ctx.lineTo(16,16);ctx.moveTo(16,4);ctx.lineTo(4,16);ctx.stroke();',
    plus: 'ctx.beginPath();ctx.moveTo(10,3);ctx.lineTo(10,17);ctx.moveTo(3,10);ctx.lineTo(17,10);ctx.stroke();',
    minus: 'ctx.beginPath();ctx.moveTo(3,10);ctx.lineTo(17,10);ctx.stroke();',
    check: 'ctx.beginPath();ctx.moveTo(3,10);ctx.lineTo(8,15);ctx.lineTo(17,5);ctx.stroke();',
    "arrow-right": 'ctx.beginPath();ctx.moveTo(2,10);ctx.lineTo(18,10);ctx.moveTo(12,4);ctx.lineTo(18,10);ctx.lineTo(12,16);ctx.stroke();',
    "arrow-left": 'ctx.beginPath();ctx.moveTo(18,10);ctx.lineTo(2,10);ctx.moveTo(8,4);ctx.lineTo(2,10);ctx.lineTo(8,16);ctx.stroke();',
    download: 'ctx.beginPath();ctx.moveTo(10,2);ctx.lineTo(10,13);ctx.moveTo(5,9);ctx.lineTo(10,14);ctx.lineTo(15,9);ctx.moveTo(3,17);ctx.lineTo(17,17);ctx.stroke();',
    upload: 'ctx.beginPath();ctx.moveTo(10,18);ctx.lineTo(10,7);ctx.moveTo(5,11);ctx.lineTo(10,6);ctx.lineTo(15,11);ctx.moveTo(3,3);ctx.lineTo(17,3);ctx.stroke();',
    link: 'ctx.beginPath();ctx.roundRect(2,7,8,6,3);ctx.roundRect(10,7,8,6,3);ctx.moveTo(8,10);ctx.lineTo(12,10);ctx.stroke();',
    copy: 'ctx.strokeRect(6,6,9,9);ctx.strokeRect(9,3,8,8);',
    edit: 'ctx.beginPath();ctx.moveTo(4,15);ctx.lineTo(4,18);ctx.lineTo(7,17);ctx.lineTo(17,7);ctx.lineTo(14,4);ctx.closePath();ctx.stroke();',
    trash: 'ctx.strokeRect(6,6,8,11);ctx.beginPath();ctx.moveTo(4,6);ctx.lineTo(16,6);ctx.moveTo(8,3);ctx.lineTo(12,3);ctx.stroke();',
    settings: 'ctx.beginPath();ctx.arc(10,10,3,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(10,2);ctx.lineTo(10,5);ctx.moveTo(10,15);ctx.lineTo(10,18);ctx.moveTo(2,10);ctx.lineTo(5,10);ctx.moveTo(15,10);ctx.lineTo(18,10);ctx.stroke();',
    info: 'ctx.beginPath();ctx.arc(10,10,7,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(10,9);ctx.lineTo(10,14);ctx.moveTo(10,6);ctx.lineTo(10,6.1);ctx.stroke();',
    warning: 'ctx.beginPath();ctx.moveTo(10,2);ctx.lineTo(18,17);ctx.lineTo(2,17);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(10,7);ctx.lineTo(10,12);ctx.stroke();',
    user: 'ctx.beginPath();ctx.arc(10,6,3,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(10,18,7,Math.PI,0);ctx.stroke();'
  };
  const body = f[id] || f.info;
  return [
    'function renderFrame(time, frame, fps, ctx, width, height, motion){',
    'ctx.clearRect(0,0,width,height);',
    'ctx.save();ctx.translate(width/2,height/2);ctx.scale(Math.min(width,height)/40,Math.min(width,height)/40);',
    'ctx.strokeStyle="#ffffff";ctx.lineWidth=1.35;ctx.lineCap="round";ctx.lineJoin="round";',
    body,
    'ctx.restore();',
    '}'
  ].join('\n');
}

const defs = [
  ["search","Search"],["home","Home"],["menu","Menu"],["close","Close"],["plus","Plus"],["minus","Minus"],
  ["check","Check"],["arrow-right","Arrow right"],["arrow-left","Arrow left"],["download","Download"],
  ["upload","Upload"],["link","Link"],["copy","Copy"],["edit","Edit"],["trash","Delete"],["settings","Settings"],
  ["info","Info"],["warning","Warning"],["user","User"]
];


window.TRILYVA_LIBRARY.register({id:"web-icons",title:"WEB ICONS",description:"Clean UI and web interface vector primitives.",async load(){return defs.map(([id,title])=>({id:"web-"+id,title,category:"web icon",code:iconCode(id)}));}});

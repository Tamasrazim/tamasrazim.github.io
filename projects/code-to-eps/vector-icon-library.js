(()=>{'use strict';
const STYLES=[
{slug:'monoline',name:'Monoline',sw:76},
{slug:'rounded',name:'Rounded',sw:104},
{slug:'solid',name:'Solid',sw:0},
{slug:'duotone',name:'Duo Tone',sw:88},
{slug:'soft-geo',name:'Soft Geometric',sw:64}
];
const D=[
['ui','UI Essentials',['navigation','search','menu','close','settings','filter','upload','download','refresh','notification'],['arrow','search','menu','close','gear','filter','upload','download','refresh','bell']],
['business','Business & Management',['briefcase','team','presentation','growth','target','calendar','meeting','document','checklist','office'],['briefcase','people','presentation','chart','target','calendar','people','document','check','building']],
['finance','Finance & Banking',['wallet','payment card','coin','bank','cash','chart','receipt','safe','currency','calculator'],['wallet','card','coin','bank','cash','chart','receipt','safe','coin','calculator']],
['commerce','Ecommerce & Retail',['cart','store','shopping bag','price tag','barcode','package','delivery','wishlist','discount','scanner'],['cart','store','bag','tag','barcode','box','truck','heart','tag','scan']],
['communication','Communication & Social',['message','mail','phone','chat','share','link','contacts','comment','broadcast','megaphone'],['message','mail','phone','chat','share','link','people','comment','broadcast','megaphone']],
['technology','Technology & Devices',['laptop','monitor','smartphone','tablet','keyboard','mouse','server','database','processor chip','usb device'],['laptop','monitor','phone','tablet','keyboard','mouse','server','database','chip','usb']],
['security','Cybersecurity & Privacy',['lock','shield','security key','fingerprint','password','privacy','firewall','security bug','secure tunnel','alert'],['lock','shield','key','fingerprint','password','eye','firewall','bug','tunnel','alert']],
['health','Healthcare & Medical',['medical cross','stethoscope','heartbeat','hospital','ambulance','syringe','thermometer','medical record','first aid','care'],['medical','stethoscope','heartbeat','hospital','ambulance','syringe','thermometer','record','medical','heart']],
['education','Education & Learning',['book','graduation','pencil','ruler','school','teacher','idea','lesson','backpack','certificate'],['book','graduation','pencil','ruler','school','person','bulb','book','bag','certificate']],
['travel','Travel & Tourism',['airplane','passport','hotel','map','compass','camera','suitcase','ticket','luggage','destination'],['plane','passport','hotel','map','compass','camera','suitcase','ticket','suitcase','pin']],
['transport','Transportation & Mobility',['car','bus','train','truck','bicycle','scooter','traffic light','parking','fuel','charging'],['car','bus','train','truck','bike','scooter','traffic','parking','fuel','charging']],
['home','Home & Lifestyle',['house','sofa','bed','lamp','cleaning','home key','door','kitchen','laundry','house plant'],['house','sofa','bed','lamp','broom','key','door','kitchen','laundry','plant']],
['food','Food & Drink',['coffee','tea','burger','pizza','bakery','cake','dining','bottle','groceries','chef'],['cup','cup','burger','pizza','bread','cake','fork','bottle','bag','chef']],
['nature','Nature & Environment',['leaf','tree','mountain','sun','cloud','rain','wind','water','recycling','sprout'],['leaf','tree','mountain','sun','cloud','rain','wind','drop','recycle','sprout']],
['animals','Animals & Pets',['paw','dog','cat','bird','fish','butterfly','bee','rabbit','horse','wildlife'],['paw','dog','cat','bird','fish','butterfly','bee','rabbit','horse','leaf']],
['sports','Sports & Fitness',['sports ball','football','basketball','tennis','medal','trophy','fitness','running','cycling','swimming'],['ball','football','basketball','tennis','medal','trophy','fitness','running','bike','swim']],
['industry','Industry & Tools',['factory','wrench','hammer','gear','drill','saw','safety helmet','storage box','conveyor','robot arm'],['factory','wrench','hammer','gear','drill','saw','helmet','box','conveyor','robot']],
['science','Science & Research',['flask','atom','microscope','telescope','dna','molecule','magnet','mathematics','laboratory','experiment'],['flask','atom','microscope','telescope','dna','molecule','magnet','math','lab','experiment']],
['celebration','Celebration & Events',['gift','balloon','party','birthday','wedding','heart','star','confetti','music','firework'],['gift','balloon','party','cake','rings','heart','star','confetti','music','firework']],
['creative','Creative & Media',['palette','brush','pencil','camera','video','audio','microphone','headphones','gamepad','creative magic'],['palette','brush','pencil','camera','video','wave','mic','headphones','game','magic']]
];
const F=[];
for(let di=0;di<D.length;di++)for(let si=0;si<STYLES.length;si++){
 const s=STYLES[si],d=D[di];
 F.push({id:'family-'+String(di*5+si+1).padStart(3,'0'),domain:d[1],domainSlug:d[0],style:s.slug,styleName:s.name,concepts:d[2],kinds:d[3]});
}
const h=s=>{let x=2166136261>>>0;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return x>>>0};
const clean=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const pal=n=>{const p=[['#111','#365cff'],['#141414','#00a884'],['#111','#ff7a00'],['#161616','#985cff'],['#111','#e34e69'],['#101010','#008fc4'],['#171717','#d4a400'],['#111','#18a56a']][n%8];return{ink:p[0],accent:p[1],soft:'#777'}};
const META=[];
for(const f of F)for(let c=0;c<10;c++)for(let v=0;v<10;v++){
 const concept=f.concepts[c],seed=h(f.id+'|'+concept+'|'+v),style=f.styleName;
 const title=(style+' '+concept+' Icon '+String(v+1).padStart(2,'0')).slice(0,68);
 const description=('Original editable '+style.toLowerCase()+' vector icon for '+concept.toLowerCase()+', from a consistent '+f.domain.toLowerCase()+' icon system with transparent negative space, scalable geometry and stock-ready paths for web, interface, marketing and print design workflows.').slice(0,196);
 const keywords=[concept.toLowerCase(),f.domain.toLowerCase(),'icon','vector','svg','eps','illustration','symbol','pictogram',style.toLowerCase(),'editable','transparent','isolated','glyph','interface','ui','graphic','design','minimal','modern','clean','scalable','digital','web','app','presentation','marketing','print','template','asset','creative','visual','communication','flat','simple','professional','stock','commercial','element','infographic','vector art','icon design','graphic element','user interface','outline','compound path'];
 META.push({id:'icon-'+f.id+'-'+String(c+1).padStart(2,'0')+'-'+String(v+1).padStart(2,'0'),familyId:f.id,familyIndex:+f.id.slice(-3),domain:f.domain,domainSlug:f.domainSlug,style:f.style,styleName:style,concept,conceptKey: f.kinds[c],conceptIndex:c,variant:v,seed,title,description,keywords:[...new Set(keywords)].slice(0,50),filename:{eps:'icon-'+f.domainSlug+'-'+f.style+'-'+clean(concept)+'-'+String(v+1).padStart(2,'0')+'.eps',svg:'icon-'+f.domainSlug+'-'+f.style+'-'+clean(concept)+'-'+String(v+1).padStart(2,'0')+'.svg',jpg:'icon-'+f.domainSlug+'-'+f.style+'-'+clean(concept)+'-'+String(v+1).padStart(2,'0')+'.jpg'}});
}
const poly=(v,p)=>v.path(q=>{q.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)q.lineTo(p[i][0],p[i][1]);q.closePath()});
function draw(v,k,cx,cy,s,style,variant){
 const P=pal((variant+Math.floor(cx/100))%8), ink=P.ink, ac=P.accent, soft=P.soft, S=STYLES.find(x=>x.slug===style), sw=S.sw;
 const outline=(fn)=>{v.fill(null).stroke(ink).width(sw||70);fn()};
 const filled=(fn)=>{v.fill(ac).stroke(style==='solid'?ac:ink).width(sw||55);fn()};
 const both=(fn)=>{v.fill(style==='monoline'||style==='rounded'?null:ac).stroke(ink).width(sw||70);fn()};
 const r=s*.16,x=cx,y=cy,q=s*.12;
 switch(k){
  case'arrow':outline(()=>{v.line(x-s*.28,y,x+s*.28,y);poly(v,[[x+s*.08,y-s*.18],[x+s*.30,y],[x+s*.08,y+s*.18]])});break;
  case'search':outline(()=>{v.circle(x-s*.07,y-s*.06,s*.22);v.line(x+s*.10,y+s*.11,x+s*.30,y+s*.31)});break;
  case'menu':outline(()=>{-[-.18,0,.18].forEach(a=>v.line(x-s*.28,y+s*a,x+s*.28,y+s*a))});break;
  case'close':outline(()=>{v.line(x-s*.22,y-s*.22,x+s*.22,y+s*.22);v.line(x+s*.22,y-s*.22,x-s*.22,y+s*.22)});break;
  case'gear':both(()=>{v.circle(x,y,s*.22);for(let i=0;i<8;i++){const t=i*Math.PI/4;v.rect(x+Math.cos(t)*s*.29-s*.05,y+Math.sin(t)*s*.29-s*.05,s*.10,s*.10,s*.02)}});break;
  case'filter':outline(()=>{v.line(x-s*.28,y-s*.24,x+s*.28,y-s*.24);v.line(x-s*.19,y,x+s*.19,y);v.line(x-s*.08,y+s*.24,x+s*.08,y+s*.24);v.line(x-s*.28,y-s*.24,x-s*.08,y+s*.24)});break;
  case'upload':outline(()=>{v.rect(x-s*.26,y+s*.08,s*.52,s*.20,r);v.line(x,y+s*.08,x,y-s*.28);v.line(x-s*.12,y-s*.16,x,y-s*.28);v.line(x+s*.12,y-s*.16,x,y-s*.28)});break;
  case'download':outline(()=>{v.rect(x-s*.26,y-s*.28,s*.52,s*.20,r);v.line(x,y-s*.08,x,y+s*.28);v.line(x-s*.12,y+s*.16,x,y+s*.28);v.line(x+s*.12,y+s*.16,x,y+s*.28)});break;
  case'refresh':outline(()=>{v.circle(x,y,s*.26);v.line(x+s*.14,y-s*.22,x+s*.30,y-s*.18);v.line(x+s*.30,y-s*.18,x+s*.16,y-s*.03)});break;
  case'bell':both(()=>{v.ellipse(x,y,s*.20,s*.24);v.line(x-s*.24,y+s*.22,x+s*.24,y+s*.22);v.circle(x,y+s*.31,s*.04)});break;
  case'briefcase':both(()=>{v.rect(x-s*.28,y-s*.10,s*.56,s*.34,r);v.line(x-s*.11,y-s*.18,x+s*.11,y-s*.18);v.line(x-s*.11,y-s*.18,x-s*.11,y-s*.10);v.line(x+s*.11,y-s*.18,x+s*.11,y-s*.10)});break;
  case'people':both(()=>{v.circle(x-s*.11,y-s*.12,s*.10);v.circle(x+s*.15,y-s*.08,s*.08);v.ellipse(x-s*.10,y+s*.13,s*.18,s*.13);v.ellipse(x+s*.15,y+s*.15,s*.14,s*.10)});break;
  case'chart':outline(()=>{v.line(x-s*.29,y+s*.24,x+s*.30,y+s*.24);for(let i=0;i<4;i++){const bh=s*(.13+i*.045);v.rect(x-s*.23+i*s*.15,y+s*.24-bh,s*.07,bh,s*.015)}});break;
  case'target':outline(()=>{v.circle(x,y,s*.27);v.circle(x,y,s*.16);v.circle(x,y,s*.05)});break;
  case'calendar':both(()=>{v.rect(x-s*.27,y-s*.22,s*.54,s*.46,r);v.line(x-s*.27,y-s*.04,x+s*.27,y-s*.04);v.line(x-s*.14,y-s*.30,x-s*.14,y-s*.12);v.line(x+s*.14,y-s*.30,x+s*.14,y-s*.12)});break;
  case'document':outline(()=>{v.rect(x-s*.22,y-s*.30,s*.44,s*.60,r);for(let i=0;i<3;i++)v.line(x-s*.13,y-s*.06+i*s*.12,x+s*.13,y-s*.06+i*s*.12)});break;
  case'building':both(()=>{v.rect(x-s*.25,y-s*.30,s*.50,s*.58,r);for(let yy=-.15;yy<=.18;yy+=.16){v.rect(x-s*.15,y+yy*s,s*.06,s*.06);v.rect(x+s*.03,y+yy*s,s*.06,s*.06)}});break;
  case'wallet':both(()=>{v.rect(x-s*.29,y-s*.15,s*.58,s*.34,r);v.line(x+s*.03,y,x+s*.27,y);v.circle(x+s*.13,y,s*.02)});break;
  case'card':both(()=>{v.rect(x-s*.30,y-s*.18,s*.60,s*.36,r);v.rect(x-s*.22,y-s*.10,s*.14,s*.08,s*.01);v.line(x-s*.20,y+s*.08,x+s*.20,y+s*.08)});break;
  case'coin':both(()=>{v.circle(x,y,s*.27);v.circle(x,y,s*.16);v.line(x-s*.05,y-s*.10,x+s*.05,y+s*.10);v.line(x+s*.05,y-s*.10,x-s*.05,y+s*.10)});break;
  case'bank':both(()=>{v.rect(x-s*.28,y-s*.15,s*.56,s*.32,r);poly(v,[[x-s*.30,y-s*.16],[x,y-s*.31],[x+s*.30,y-s*.16]]);for(let i=-1;i<=1;i++)v.rect(x+i*s*.12-s*.03,y-s*.10,s*.06,s*.20)});break;
  case'cart':both(()=>{v.line(x-s*.28,y-s*.16,x-s*.18,y-s*.16);v.line(x-s*.18,y-s*.16,x-s*.08,y+s*.11);v.line(x-s*.08,y+s*.11,x+s*.25,y+s*.11);v.circle(x-s*.02,y+s*.21,s*.045);v.circle(x+s*.20,y+s*.21,s*.045)});break;
  case'store':both(()=>{v.rect(x-s*.28,y-s*.08,s*.56,s*.38,r);v.line(x-s*.28,y-s*.08,x+s*.28,y-s*.08);v.rect(x-s*.06,y+s*.05,s*.12,s*.21)});break;
  case'bag':both(()=>{v.rect(x-s*.23,y-s*.12,s*.46,s*.38,r);v.ellipse(x,y-s*.18,s*.12,s*.10)});break;
  case'tag':both(()=>{v.rect(x-s*.20,y-s*.15,s*.38,s*.30,r);v.circle(x-s*.10,y-s*.04,s*.025)});break;
  case'box':outline(()=>{v.rect(x-s*.24,y-s*.18,s*.48,s*.36,r);poly(v,[[x-s*.24,y-s*.01],[x,y+s*.13],[x+s*.24,y-s*.01]]);v.line(x,y-s*.18,x,y+s*.13)});break;
  case'truck':both(()=>{v.rect(x-s*.28,y-s*.14,s*.38,s*.28,r);v.rect(x+s*.10,y-s*.07,s*.18,s*.21,r);v.circle(x-s*.18,y+s*.18,s*.06);v.circle(x+s*.20,y+s*.18,s*.06)});break;
  case'message':both(()=>{v.rect(x-s*.29,y-s*.18,s*.58,s*.34,r);v.circle(x-s*.12,y,s*.02);v.circle(x,y,s*.02);v.circle(x+s*.12,y,s*.02)});break;
  case'mail':outline(()=>{v.rect(x-s*.30,y-s*.20,s*.60,s*.40,r);v.line(x-s*.28,y-s*.17,x,y+s*.06);v.line(x,y+s*.06,x+s*.28,y-s*.17)});break;
  case'phone':outline(()=>{v.rect(x-s*.18,y-s*.30,s*.36,s*.60,r);v.circle(x,y+s*.23,s*.02)});break;
  case'chat':outline(()=>{v.ellipse(x,y-s*.02,s*.27,s*.18);v.line(x-s*.10,y+s*.13,x-s*.16,y+s*.25);v.circle(x-s*.10,y-s*.02,s*.02);v.circle(x,y-s*.02,s*.02);v.circle(x+s*.10,y-s*.02,s*.02)});break;
  case'share':outline(()=>{v.circle(x-s*.19,y,s*.06);v.circle(x+s*.20,y-s*.15,s*.06);v.circle(x+s*.20,y+s*.15,s*.06);v.line(x-s*.14,y-s*.02,x+s*.15,y-s*.12);v.line(x-s*.14,y+s*.02,x+s*.15,y+s*.12)});break;
  case'link':outline(()=>{v.ellipse(x-s*.11,y,s*.19,s*.10);v.ellipse(x+s*.11,y,s*.19,s*.10);v.line(x-s*.02,y,x+s*.02,y)});break;
  case'laptop':both(()=>{v.rect(x-s*.28,y-s*.22,s*.56,s*.36,r);v.line(x-s*.34,y+s*.20,x+s*.34,y+s*.20);v.line(x-s*.18,y+s*.24,x+s*.18,y+s*.24)});break;
  case'monitor':both(()=>{v.rect(x-s*.30,y-s*.24,s*.60,s*.40,r);v.line(x,y+s*.16,x,y+s*.28);v.line(x-s*.14,y+s*.28,x+s*.14,y+s*.28)});break;
  case'phone':outline(()=>{v.rect(x-s*.18,y-s*.30,s*.36,s*.60,r);v.circle(x,y+s*.23,s*.02)});break;
  case'database':both(()=>{v.ellipse(x,y-s*.18,s*.25,s*.09);v.line(x-s*.25,y-s*.18,x-s*.25,y+s*.18);v.line(x+s*.25,y-s*.18,x+s*.25,y+s*.18);v.ellipse(x,y+s*.18,s*.25,s*.09)});break;
  case'chip':both(()=>{v.rect(x-s*.18,y-s*.18,s*.36,s*.36,r);for(let i=-1;i<=1;i++){v.line(x+i*s*.12,y-s*.30,x+i*s*.12,y-s*.18);v.line(x+i*s*.12,y+s*.18,x+i*s*.12,y+s*.30);v.line(x-s*.30,y+i*s*.12,x-s*.18,y+i*s*.12);v.line(x+s*.18,y+i*s*.12,x+s*.30,y+i*s*.12)}});break;
  case'lock':both(()=>{v.rect(x-s*.24,y-s*.02,s*.48,s*.34,r);v.ellipse(x,y-s*.15,s*.15,s*.16);v.circle(x,y+s*.10,s*.025)});break;
  case'shield':both(()=>{poly(v,[[x,y-s*.30],[x+s*.25,y-s*.18],[x+s*.17,y+s*.15],[x,y+s*.28],[x-s*.17,y+s*.15],[x-s*.25,y-s*.18]]);v.line(x-s*.09,y,x-s*.02,y+s*.07);v.line(x-s*.02,y+s*.07,x+s*.12,y-s*.09)});break;
  case'key':outline(()=>{v.circle(x-s*.16,y-s*.04,s*.10);v.line(x-s*.08,y,x+s*.26,y+s*.20);v.line(x+s*.10,y+s*.10,x+s*.18,y+s*.02)});break;
  case'eye':outline(()=>{v.ellipse(x,y,s*.28,s*.17);v.circle(x,y,s*.06)});break;
  case'medical':both(()=>{v.rect(x-s*.25,y-s*.07,s*.50,s*.14,r);v.rect(x-s*.07,y-s*.25,s*.14,s*.50,r)});break;
  case'heartbeat':outline(()=>{v.line(x-s*.29,y,x-s*.16,y);v.line(x-s*.16,y,x-s*.08,y-s*.12);v.line(x-s*.08,y-s*.12,x+s*.02,y+s*.14);v.line(x+s*.02,y+s*.14,x+s*.10,y);v.line(x+s*.10,y,x+s*.29,y)});break;
  case'heart':filled(()=>poly(v,[[x,y+s*.27],[x-s*.34,y],[x-s*.18,y-s*.24],[x,y-s*.10],[x+s*.18,y-s*.24],[x+s*.34,y],[x,y+s*.27]]));break;
  case'plane':outline(()=>{v.line(x-s*.30,y+s*.08,x+s*.30,y-s*.10);v.line(x-s*.03,y,x-s*.06,y-s*.27);v.line(x-s*.03,y,x+s*.20,y+s*.17)});break;
  case'map':outline(()=>{v.rect(x-s*.29,y-s*.20,s*.58,s*.40,r);v.line(x-s*.09,y-s*.20,x-s*.09,y+s*.20);v.line(x+s*.10,y-s*.20,x+s*.10,y+s*.20)});break;
  case'compass':both(()=>{v.circle(x,y,s*.27);poly(v,[[x,y-s*.18],[x+s*.10,y+s*.18],[x-s*.10,y+s*.08]])});break;
  case'camera':both(()=>{v.rect(x-s*.29,y-s*.16,s*.58,s*.34,r);v.rect(x-s*.10,y-s*.22,s*.20,s*.06,r);v.circle(x,y+s*.01,s*.10)});break;
  case'car':both(()=>{v.rect(x-s*.27,y-s*.08,s*.54,s*.24,r);poly(v,[[x-s*.18,y-s*.08],[x-s*.07,y-s*.22],[x+s*.13,y-s*.22],[x+s*.23,y-s*.08]]);v.circle(x-s*.17,y+s*.14,s*.06);v.circle(x+s*.17,y+s*.14,s*.06)});break;
  case'bus':both(()=>{v.rect(x-s*.29,y-s*.21,s*.58,s*.43,r);v.line(x-s*.22,y-s*.02,x+s*.22,y-s*.02);v.circle(x-s*.17,y+s*.17,s*.045);v.circle(x+s*.17,y+s*.17,s*.045)});break;
  case'train':both(()=>{v.rect(x-s*.27,y-s*.21,s*.54,s*.42,r);v.rect(x-s*.18,y-s*.14,s*.11,s*.08);v.rect(x+s*.07,y-s*.14,s*.11,s*.08);v.circle(x-s*.15,y+s*.16,s*.04);v.circle(x+s*.15,y+s*.16,s*.04)});break;
  case'bike':outline(()=>{v.circle(x-s*.18,y+s*.14,s*.09);v.circle(x+s*.20,y+s*.14,s*.09);v.line(x-s*.18,y+s*.14,x-s*.03,y-s*.05);v.line(x-s*.03,y-s*.05,x+s*.07,y+s*.14);v.line(x+s*.07,y+s*.14,x+s*.20,y+s*.14);v.line(x-s*.03,y-s*.05,x-s*.13,y-s*.17);v.line(x-s*.13,y-s*.17,x-s*.02,y-s*.17)});break;
  case'house':both(()=>{poly(v,[[x-s*.30,y],[x,y-s*.28],[x+s*.30,y]]);v.rect(x-s*.24,y,s*.48,s*.28,r);v.rect(x-s*.06,y+s*.08,s*.12,s*.20)});break;
  case'sofa':both(()=>{v.rect(x-s*.28,y-s*.06,s*.56,s*.26,r);v.rect(x-s*.24,y-s*.21,s*.18,s*.18,r);v.rect(x+s*.06,y-s*.21,s*.18,s*.18,r)});break;
  case'leaf':both(()=>{v.ellipse(x,y,s*.20,s*.30);v.line(x-s*.02,y+s*.28,x+s*.10,y-s*.20)});break;
  case'tree':both(()=>{v.circle(x,y-s*.15,s*.20);v.circle(x-s*.15,y-s*.04,s*.14);v.circle(x+s*.15,y-s*.04,s*.14);v.rect(x-s*.07,y+s*.09,s*.14,s*.22)});break;
  case'mountain':both(()=>poly(v,[[x-s*.31,y+s*.22],[x-s*.08,y-s*.20],[x+s*.02,y-s*.04],[x+s*.11,y-s*.22],[x+s*.31,y+s*.22]]));break;
  case'sun':both(()=>{v.circle(x,y,s*.15);for(let i=0;i<8;i++){const t=i*Math.PI/4;v.line(x+Math.cos(t)*s*.22,y+Math.sin(t)*s*.22,x+Math.cos(t)*s*.30,y+Math.sin(t)*s*.30)}});break;
  case'cloud':both(()=>{v.circle(x-s*.12,y,s*.12);v.circle(x+s*.04,y-s*.06,s*.16);v.circle(x+s*.18,y+s*.02,s*.10);v.rect(x-s*.20,y,s*.44,s*.14,s*.07)});break;
  case'rain':outline(()=>{v.circle(x-s*.12,y-s*.08,s*.11);v.circle(x+s*.03,y-s*.13,s*.14);v.circle(x+s*.17,y-s*.06,s*.09);v.line(x-s*.14,y+s*.08,x-s*.18,y+s*.22);v.line(x,y+s*.08,x-s*.04,y+s*.22);v.line(x+s*.14,y+s*.08,x+s*.10,y+s*.22)});break;
  case'wind':outline(()=>{v.line(x-s*.28,y-s*.10,x+s*.20,y-s*.10);v.line(x-s*.20,y,x+s*.28,y);v.line(x-s*.28,y+s*.10,x+s*.14,y+s*.10)});break;
  case'drop':both(()=>{poly(v,[[x,y-s*.29],[x-s*.14,y],[x,y+s*.22],[x+s*.14,y]]);v.circle(x,y+s*.05,s*.05)});break;
  case'recycle':outline(()=>{for(let i=0;i<3;i++){const t=i*Math.PI*2/3;v.line(x+Math.cos(t)*s*.10,y+Math.sin(t)*s*.10,x+Math.cos(t+.8)*s*.27,y+Math.sin(t+.8)*s*.27)}});break;
  case'sprout':both(()=>{v.line(x,y+s*.27,x,y-s*.08);v.ellipse(x-s*.10,y-s*.12,s*.10,s*.15);v.ellipse(x+s*.10,y-s*.03,s*.10,s*.15)});break;
  case'paw':both(()=>{v.ellipse(x,y+s*.09,s*.15,s*.12);[[-.17,-.10],[-.06,-.18],[.06,-.18],[.17,-.08]].forEach(p=>v.circle(x+p[0]*s,y+p[1]*s,s*.05))});break;
  case'dog':both(()=>{v.circle(x,y,s*.18);poly(v,[[x-s*.13,y-s*.10],[x-s*.28,y-s*.23],[x-s*.08,y-s*.18]]);poly(v,[[x+s*.13,y-s*.10],[x+s*.28,y-s*.22],[x+s*.18,y-s*.01]]);v.circle(x-s*.06,y,s*.018);v.circle(x+s*.06,y,s*.018)});break;
  case'cat':both(()=>{v.circle(x,y+s*.01,s*.18);poly(v,[[x-s*.16,y-s*.08],[x-s*.18,y-s*.26],[x-s*.03,y-s*.17]]);poly(v,[[x+s*.16,y-s*.08],[x+s*.18,y-s*.26],[x+s*.03,y-s*.17]]);v.circle(x-s*.06,y,s*.018);v.circle(x+s*.06,y,s*.018)});break;
  case'bird':outline(()=>{v.ellipse(x,y,s*.21,s*.13);poly(v,[[x-s*.06,y],[x-s*.25,y-s*.12],[x-s*.12,y+s*.08]]);v.line(x+s*.20,y,x+s*.30,y-s*.02)});break;
  case'fish':both(()=>{v.ellipse(x,y,s*.22,s*.13);poly(v,[[x-s*.20,y],[x-s*.34,y-s*.13],[x-s*.34,y+s*.13]]);v.circle(x+s*.10,y-s*.03,s*.02)});break;
  case'butterfly':both(()=>{v.ellipse(x-s*.11,y-s*.04,s*.12,s*.17);v.ellipse(x+s*.11,y-s*.04,s*.12,s*.17);v.line(x,y-s*.14,x,y+s*.18)});break;
  case'ball':outline(()=>{v.circle(x,y,s*.27);v.line(x-s*.27,y,x+s*.27,y);v.line(x,y-s*.27,x,y+s*.27)});break;
  case'medal':both(()=>{v.circle(x,y+s*.03,s*.19);v.line(x-s*.10,y-s*.10,x-s*.14,y-s*.28);v.line(x+s*.10,y-s*.10,x+s*.14,y-s*.28)});break;
  case'trophy':both(()=>{v.rect(x-s*.22,y-s*.18,s*.44,s*.25,r);v.rect(x-s*.06,y+s*.07,s*.12,s*.16);v.line(x-s*.14,y+s*.23,x+s*.14,y+s*.23)});break;
  case'fitness':outline(()=>{v.line(x-s*.28,y,x+s*.28,y);v.rect(x-s*.18,y-s*.09,s*.07,s*.18,r);v.rect(x+s*.11,y-s*.09,s*.07,s*.18,r)});break;
  case'running':outline(()=>{v.circle(x+s*.08,y-s*.22,s*.06);v.line(x+s*.03,y-s*.16,x-s*.08,y-s*.01);v.line(x-s*.08,y-s*.01,x+s*.07,y+s*.03);v.line(x-s*.02,y+s*.02,x-s*.20,y+s*.19);v.line(x+s*.07,y+s*.03,x+s*.22,y+s*.16)});break;
  case'factory':both(()=>{v.rect(x-s*.30,y-s*.04,s*.60,s*.34,r);poly(v,[[x-s*.27,y-s*.04],[x-s*.27,y-s*.22],[x-s*.10,y-s*.12],[x,y-s*.23],[x+s*.11,y-s*.12],[x+s*.27,y-s*.23],[x+s*.27,y-s*.04]]);});break;
  case'wrench':outline(()=>{v.line(x-s*.18,y-s*.18,x+s*.18,y+s*.18);v.circle(x+s*.22,y+s*.22,s*.08);v.circle(x-s*.20,y-s*.20,s*.09)});break;
  case'hammer':outline(()=>{v.rect(x-s*.19,y-s*.28,s*.38,s*.11,r);v.line(x,y-s*.16,x,y+s*.26)});break;
  case'gear':both(()=>{v.circle(x,y,s*.20);for(let i=0;i<8;i++){const t=i*Math.PI/4;v.rect(x+Math.cos(t)*s*.27-s*.045,y+Math.sin(t)*s*.27-s*.045,s*.09,s*.09,s*.01)}});break;
  case'helmet':both(()=>{v.ellipse(x,y-s*.02,s*.29,s*.20);v.line(x-s*.29,y+s*.11,x+s*.29,y+s*.11);v.line(x-s*.06,y-s*.20,x-s*.06,y+s*.11)});break;
  case'robot':both(()=>{v.rect(x-s*.21,y-s*.24,s*.42,s*.34,r);v.circle(x-s*.07,y-s*.08,s*.025);v.circle(x+s*.07,y-s*.08,s*.025);v.line(x-s*.08,y+s*.06,x+s*.08,y+s*.06);v.line(x,y-s*.24,x,y-s*.33);v.circle(x,y-s*.36,s*.03)});break;
  case'flask':both(()=>{v.line(x-s*.08,y-s*.28,x-s*.08,y-s*.07);v.line(x+s*.08,y-s*.28,x+s*.08,y-s*.07);poly(v,[[x-s*.08,y-s*.07],[x-s*.22,y+s*.20],[x+s*.22,y+s*.20],[x+s*.08,y-s*.07]]);v.line(x-s*.09,y-s*.28,x+s*.09,y-s*.28)});break;
  case'atom':outline(()=>{v.ellipse(x,y,s*.27,s*.10);v.rotate(60).ellipse(x,y,s*.27,s*.10);v.rotate(-120).ellipse(x,y,s*.27,s*.10);v.circle(x,y,s*.05)});break;
  case'microscope':both(()=>{v.rect(x-s*.24,y+s*.18,s*.48,s*.08,r);v.rect(x-s*.13,y-s*.25,s*.09,s*.42,r);v.line(x-s*.08,y-s*.24,x+s*.11,y-s*.24);v.line(x+s*.11,y-s*.24,x+s*.20,y-s*.10)});break;
  case'dna':outline(()=>{v.path(p=>{p.moveTo(x-s*.14,y-s*.28);p.bezierCurveTo(x+s*.25,y-s*.17,x-s*.25,y+s*.16,x+s*.14,y+s*.28)});v.path(p=>{p.moveTo(x+s*.14,y-s*.28);p.bezierCurveTo(x-s*.25,y-s*.17,x+s*.25,y+s*.16,x-s*.14,y+s*.28)});for(let yy=-.18;yy<=.18;yy+=.12)v.line(x-s*.08,y+yy*s,x+s*.08,y+yy*s)});break;
  case'gift':both(()=>{v.rect(x-s*.26,y-s*.10,s*.52,s*.34,r);v.line(x,y-s*.10,x,y+s*.24);v.line(x-s*.26,y,x+s*.26,y)});break;
  case'balloon':both(()=>{v.ellipse(x,y-s*.05,s*.17,s*.22);v.line(x,y+s*.17,x,y+s*.31)});break;
  case'party':both(()=>{v.path(p=>{p.moveTo(x-s*.28,y-s*.18);p.lineTo(x+s*.28,y-s*.18);p.lineTo(x+s*.18,y+s*.17);p.lineTo(x-s*.18,y+s*.17);p.closePath()});for(let i=0;i<4;i++)v.circle(x+(-.15+i*.10)*s,y+s*(i%2?-.02:.07),s*.018)});break;
  case'cake':both(()=>{v.rect(x-s*.25,y-s*.05,s*.50,s*.25,r);v.rect(x-s*.19,y-s*.20,s*.38,s*.12,r);v.line(x-s*.18,y+s*.20,x+s*.18,y+s*.20);v.circle(x,y-s*.27,s*.03)});break;
  case'rings':outline(()=>{v.circle(x-s*.10,y,s*.12);v.circle(x+s*.10,y,s*.12);v.line(x-s*.18,y-s*.12,x+s*.18,y+s*.12)});break;
  case'star':filled(()=>{const p=[];for(let i=0;i<10;i++){const t=-Math.PI/2+i*Math.PI/5,rr=i%2?s*.11:s*.28;p.push([x+Math.cos(t)*rr,y+Math.sin(t)*rr])}poly(v,p)});break;
  case'confetti':outline(()=>{for(let i=0;i<6;i++){const t=(h(String(variant+i))%628)/100,rr=s*(.10+(i%3)*.07);v.rect(x+Math.cos(t)*rr,y+Math.sin(t)*rr,s*.04,s*.09,s*.01)}});break;
  case'music':outline(()=>{v.line(x+s*.08,y-s*.25,x+s*.08,y+s*.10);v.line(x+s*.08,y-s*.25,x+s*.24,y-s*.29);v.circle(x-s*.02,y+s*.14,s*.08);v.circle(x+s*.17,y+s*.09,s*.08)});break;
  case'firework':outline(()=>{v.circle(x,y,s*.05);for(let i=0;i<10;i++){const t=i*Math.PI/5;v.line(x+Math.cos(t)*s*.10,y+Math.sin(t)*s*.10,x+Math.cos(t)*s*.29,y+Math.sin(t)*s*.29)}});break;
  case'palette':both(()=>{v.circle(x,y,s*.27);v.circle(x+s*.13,y-s*.10,s*.035);v.circle(x+s*.08,y+s*.06,s*.035);v.circle(x-s*.09,y-s*.06,s*.035)});break;
  case'brush':outline(()=>{v.line(x-s*.20,y+s*.21,x+s*.14,y-s*.12);v.rect(x+s*.05,y-s*.24,s*.18,s*.11,r)});break;
  case'video':both(()=>{v.rect(x-s*.29,y-s*.18,s*.42,s*.36,r);poly(v,[[x+s*.13,y-s*.10],[x+s*.30,y-s*.20],[x+s*.30,y+s*.20],[x+s*.13,y+s*.10]])});break;
  case'wave':outline(()=>{v.path(p=>{p.moveTo(x-s*.28,y);p.bezierCurveTo(x-s*.12,y-s*.14,x,y+s*.14,x+s*.14,y)});v.path(p=>{p.moveTo(x-s*.16,y+s*.13);p.bezierCurveTo(x-s*.01,y,x+s*.10,y+s*.25,x+s*.24,y+s*.13)})});break;
  case'mic':both(()=>{v.ellipse(x,y-s*.08,s*.10,s*.15);v.line(x-s*.18,y,x-s*.18,y+s*.08);v.line(x+s*.18,y,x+s*.18,y+s*.08);v.line(x,y+s*.08,x,y+s*.24);v.line(x-s*.10,y+s*.24,x+s*.10,y+s*.24)});break;
  case'headphones':outline(()=>{v.circle(x,y,s*.25);v.rect(x-s*.30,y+s*.08,s*.10,s*.16,r);v.rect(x+s*.20,y+s*.08,s*.10,s*.16,r);v.circle(x,y,s*.18)});break;
  case'game':both(()=>{v.ellipse(x,y+s*.05,s*.29,s*.15);v.line(x-s*.14,y+s*.03,x+s*.04,y+s*.03);v.line(x-s*.05,y-s*.06,x-s*.05,y+s*.12);v.circle(x+s*.16,y-s*.02,s*.023);v.circle(x+s*.23,y+s*.04,s*.023)});break;
  case'magic':filled(()=>{v.circle(x,y,s*.15);v.line(x+s*.14,y-s*.18,x+s*.28,y-s*.32);v.line(x+s*.21,y-s*.32,x+s*.33,y-s*.20)});break;
  case'certificate':both(()=>{v.rect(x-s*.23,y-s*.26,s*.46,s*.50,r);v.circle(x,y-s*.03,s*.10);v.line(x-s*.08,y+s*.12,x-s*.04,y+s*.25);v.line(x+s*.08,y+s*.12,x+s*.04,y+s*.25)});break;
  case'chef':both(()=>{v.ellipse(x,y-s*.15,s*.24,s*.13);v.circle(x-s*.12,y-s*.27,s*.09);v.circle(x,y-s*.30,s*.10);v.circle(x+s*.12,y-s*.27,s*.09);v.rect(x-s*.18,y-s*.11,s*.36,s*.32,r)});break;
  case'key':outline(()=>{v.circle(x-s*.16,y-s*.04,s*.10);v.line(x-s*.08,y,x+s*.26,y+s*.20)});break;
  case'door':both(()=>{v.rect(x-s*.22,y-s*.30,s*.44,s*.60,r);v.circle(x+s*.10,y,s*.02)});break;
  case'kitchen':both(()=>{v.rect(x-s*.27,y-s*.10,s*.54,s*.30,r);v.rect(x-s*.08,y-s*.28,s*.16,s*.10,r);v.circle(x+s*.10,y+s*.03,s*.05)});break;
  case'laundry':both(()=>{v.rect(x-s*.25,y-s*.28,s*.50,s*.56,r);v.circle(x,y,s*.13);v.rect(x-s*.12,y-s*.20,s*.24,s*.05,r)});break;
  case'plant':both(()=>{v.rect(x-s*.13,y+s*.02,s*.26,s*.22,r);v.line(x,y+s*.02,x,y-s*.15);v.ellipse(x-s*.09,y-s*.17,s*.08,s*.13);v.ellipse(x+s*.09,y-s*.10,s*.08,s*.13)});break;
  case'cup':both(()=>{v.rect(x-s*.18,y-s*.16,s*.36,s*.30,r);v.ellipse(x+s*.21,y-s*.02,s*.09,s*.10)});break;
  case'burger':filled(()=>{v.ellipse(x,y-s*.14,s*.26,s*.09);v.rect(x-s*.25,y-s*.04,s*.50,s*.10,r);v.rect(x-s*.23,y+s*.08,s*.46,s*.08,r);v.ellipse(x,y+s*.17,s*.26,s*.06)});break;
  case'pizza':filled(()=>{poly(v,[[x-s*.28,y+s*.21],[x,y-s*.28],[x+s*.28,y+s*.21]]);v.circle(x-s*.04,y+s*.01,s*.025);v.circle(x+s*.10,y+s*.06,s*.025)});break;
  case'bread':filled(()=>{v.ellipse(x,y,s*.28,s*.19);v.line(x-s*.12,y-s*.02,x-s*.08,y-s*.10);v.line(x,y-s*.01,x+s*.04,y-s*.10);v.line(x+s*.12,y-s*.01,x+s*.16,y-s*.08)});break;
  case'fork':outline(()=>{v.line(x,y-s*.26,x,y+s*.25);for(let i=-1;i<=1;i++)v.line(x+i*s*.08,y-s*.26,x+i*s*.08,y-s*.08)});break;
  case'bottle':both(()=>{v.rect(x-s*.14,y-s*.18,s*.28,s*.39,r);v.rect(x-s*.08,y-s*.28,s*.16,s*.10)});break;
  case'lab':both(()=>{v.rect(x-s*.26,y-s*.20,s*.52,s*.38,r);v.rect(x-s*.18,y-s*.28,s*.12,s*.08,r);v.rect(x+s*.06,y-s*.28,s*.12,s*.08,r);v.line(x-s*.18,y-s*.04,x+s*.18,y-s*.04)});break;
  case'experiment':outline(()=>{v.ellipse(x,y+s*.10,s*.20,s*.07);v.line(x-s*.06,y-s*.24,x-s*.06,y-s*.03);v.line(x+s*.06,y-s*.24,x+s*.06,y-s*.03);poly(v,[[x-s*.06,y-s*.03],[x-s*.18,y+s*.16],[x+s*.18,y+s*.16],[x+s*.06,y-s*.03]])});break;
  default:outline(()=>v.circle(x,y,s*.23))
 }
 const n=variant%5;v.stroke(soft).width(Math.max(30,(sw||60)*.45)).fill(null);
 if(n===0)v.circle(x+s*.30,y-s*.30,s*.024);
 if(n===1)v.line(x-s*.34,y+s*.34,x-s*.25,y+s*.34);
 if(n===2)v.line(x+s*.25,y+s*.34,x+s*.34,y+s*.25);
 if(n===3)v.rect(x-s*.34,y-s*.34,s*.08,s*.04,s*.01);
 if(n===4)v.circle(x,y+s*.34,s*.018);
}
function render(v,W,H,item){
 const s=Math.min(W,H)*.58,cx=W/2,cy=H/2,style=item.style,seed=h(String(item.seed));
 v.save();v.rotate(((seed%7)-3)*.55);draw(v,item.kind||item.conceptKey,cx,cy,s,style,item.variant);v.restore();
}
const items=META.map((m,i)=>Object.assign({index:i,kind:F[m.familyIndex-1].kinds[m.conceptIndex]},m));
const families=F.map((f,i)=>Object.assign({index:i+1},f));
const api={total:items.length,perFamily:100,perDomain:500,domains:D.map((x,i)=>({index:i+1,slug:x[0],name:x[1]})),families,items,itemById:id=>items.find(x=>x.id===id)||null,itemsForFamily:id=>items.filter(x=>x.familyId===id),render,codeFor:item=>{const i=typeof item==='number'?items[item]:item;return 'function renderFrame(time,frame,fps,v,width,height){TAMAS_ICON_LIBRARY.render(v,width,height,TAMAS_ICON_LIBRARY.itemById(\''+i.id+'\'));}\nrenderFrame(0,0,60,v,W,H);'},filenameFor:(item,k='eps')=>item.filename[k],metadataFor:item=>item};
window.TAMAS_ICON_LIBRARY=Object.freeze(api);
})();
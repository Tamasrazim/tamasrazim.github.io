/* TRILYVA Voice Studio — first-party offline speech synthesis.
 * No network requests, remote APIs, CDN assets, or third-party runtime.
 * Exports timestamped synthetic dialogue and procedural atmosphere as PCM WAV.
 */
(function () {
'use strict';
var SR=22050, FILM=300, TAU=Math.PI*2, audio=null, lastBlob=null, lastSrt='', busy=false;
var VOICES={
  NARRATOR:{label:'Narrator',f0:118,formant:.97,bright:.96,gain:.78,pan:0,rate:1.02},
  NIKO:{label:'Niko the red panda',f0:190,formant:1.10,bright:1.12,gain:.90,pan:-.10,rate:1.05},
  AURI:{label:'Auri the clockwork bird',f0:242,formant:1.23,bright:1.24,gain:.82,pan:.14,rate:1.12},
  KEEPER:{label:'The clockkeeper',f0:128,formant:.96,bright:.91,gain:.86,pan:.08,rate:.95}
};
var DEFAULT_SCRIPT=[
'00:01 | NARRATOR | In a little workshop beside the town clock, Niko the red panda was building something special.',
'00:08 | NIKO | One final turn... and you will sing.',
'00:16 | AURI | Oh! I can chirp. Is that my whole song?',
'00:24 | NARRATOR | Auri was a tiny clockwork bird, made with brass feathers and a bright little heart. But her heart-spring was missing.',
'00:34 | NIKO | Your spring must have slipped away. We will find it before the morning bells.',
'00:43 | NARRATOR | A loose brass coil bounced off the workbench, rolled past the open door, and spun into the street.',
'00:52 | AURI | There it goes! Follow that little glint!',
'01:01 | NARRATOR | The spring danced between flower pots and market carts, turning end over end on the cobblestones.',
'01:10 | NIKO | Stay close, Auri. The town is waking up, and we must watch the road.',
'01:20 | AURI | I can see it! It rolled straight toward the clock tower!',
'01:28 | NARRATOR | At the town square, the great clock had stopped. The missing spring had slipped through a service hatch.',
'01:37 | NIKO | The whole clock is waiting on one little spring.',
'01:47 | AURI | Then let us help it tick again.',
'01:56 | NARRATOR | Inside, giant brass gears stood silent above a winding staircase. The spring was caught high behind the upper wheel.',
'02:06 | NIKO | I will climb the service steps. Can you reach that upper gear?',
'02:16 | AURI | Wings ready. Heart... a little nervous.',
'02:26 | NARRATOR | A gust rushed through the tower window. The loose gear shuddered, and the spring slipped deeper into the mechanism.',
'02:36 | AURI | I found it! But it is wedged behind the turning wheel!',
'02:46 | NIKO | I will hold the brake. Wait for my signal.',
'02:56 | NARRATOR | The wheel jolted. Auri’s wing caught on a bent pin, and she tumbled onto the safe stone ledge.',
'03:06 | AURI | My wing is stuck. I cannot keep myself steady!',
'03:16 | NIKO | Land beside me. We fix the wing first, then finish together.',
'03:26 | NARRATOR | Niko straightened the hinge with a tiny brass tool and replaced the pin with a spare from his pocket.',
'03:36 | AURI | The wing is working. And I know how we can free the spring.',
'03:46 | NIKO | I will wind your heart. When it clicks, fly between the spokes and lift the spring out.',
'03:56 | AURI | Ready... ready... now!',
'04:06 | NARRATOR | The little bird slipped through the gear spokes. The spring popped free, clicked into her heart, and began to turn.',
'04:16 | KEEPER | Listen! The clock is moving again! Morning is almost here!',
'04:24 | NARRATOR | One gear turned another. The great hands swept forward, and golden dawn poured through the clock face.',
'04:32 | AURI | Niko, listen. That is my song!',
'04:41 | NIKO | And the first bell belongs to you.',
'04:50 | NARRATOR | Auri sang over the town square as the clock rang out, clear and bright.',
'04:57 | NARRATOR | From that morning on, the town kept time with a little music, and no one built alone.'
].join('\n');
var VOWELS={
 AA:[730,1090,2440],AE:[660,1720,2410],AH:[600,1170,2450],AO:[570,840,2410],
 EH:[530,1840,2480],ER:[490,1350,1690],IH:[390,1990,2550],IY:[270,2290,3010],
 UH:[440,1020,2240],UW:[300,870,2240],EY:[470,1900,2500],AY:[550,1700,2450],
 OW:[480,900,2400],AW:[600,1000,2300],OY:[500,1200,2450]
};
var DICT={
 a:['AH'],an:['AH','N'],and:['AE','N','D'],the:['DH','AH'],to:['T','UW'],of:['AH','V'],in:['IH','N'],
 is:['IH','Z'],it:['IH','T'],was:['W','AH','Z'],were:['W','ER'],we:['W','IY'],you:['Y','UW'],
 your:['Y','AO','R'],they:['DH','EY'],their:['DH','EH','R'],there:['DH','EH','R'],them:['DH','EH','M'],
 this:['DH','IH','S'],that:['DH','AE','T'],then:['DH','EH','N'],than:['DH','AE','N'],
 with:['W','IH','TH'],will:['W','IH','L'],would:['W','UH','D'],could:['K','UH','D'],
 should:['SH','UH','D'],not:['N','AA','T'],one:['W','AH','N'],our:['AW','ER'],out:['AW','T'],
 home:['HH','OW','M'],light:['L','AY','T'],lights:['L','AY','T','S'],little:['L','IH','T','AH','L'],
 lighthouse:['L','AY','T','HH','AW','S'],nori:['N','AO','R','IY'],fox:['F','AA','K','S'],
 sea:['S','IY'],village:['V','IH','L','IH','JH'],every:['EH','V','R','IY'],evening:['IY','V','N','IH','NG'],
 tower:['T','AW','ER'],sure:['SH','UH','R'],make:['M','EY','K'],bright:['B','R','AY','T'],
 bring:['B','R','IH','NG'],everyone:['EH','V','R','IY','W','AH','N'],miles:['M','AY','L','Z'],
 small:['S','M','AO','L'],old:['OW','L','D'],together:['T','AH','G','EH','DH','ER'],
 night:['N','AY','T'],wind:['W','IH','N','D'],changed:['CH','EY','N','JH','D'],clouds:['K','L','AW','D','Z'],
 moon:['M','UW','N'],thunder:['TH','AH','N','D','ER'],rolled:['R','OW','L','D'],rain:['R','EY','N'],
 struck:['S','T','R','AH','K'],suddenly:['S','AH','D','AH','N','L','IY'],went:['W','EH','N','T'],
 dark:['D','AA','R','K'],far:['F','AA','R'],beyond:['B','IH','Y','AA','N','D'],rocks:['R','AA','K','S'],
 boat:['B','OW','T'],lost:['L','AO','S','T'],way:['W','EY'],captain:['K','AE','P','T','AH','N'],
 searched:['S','ER','CH','T'],black:['B','L','AE','K'],water:['W','AO','T','ER'],familiar:['F','AH','M','IH','L','Y','ER'],
 golden:['G','OW','L','D','AH','N'],beam:['B','IY','M'],again:['AH','G','EH','N'],please:['P','L','IY','Z'],
 tonight:['T','AH','N','AY','T'],cannot:['K','AE','N','AA','T'],see:['S','IY'],find:['F','AY','N','D'],
 shore:['SH','AO','R'],harbor:['HH','AA','R','B','ER'],rabbit:['R','AE','B','IH','T'],sailors:['S','EY','L','ER','Z'],
 frightened:['F','R','AY','T','AH','N','D'],lantern:['L','AE','N','T','ER','N'],empty:['EH','M','P','T','IY'],
 glass:['G','L','AE','S'],jar:['JH','AA','R'],warm:['W','AO','R','M'],scarf:['S','K','AA','R','F'],
 hurried:['HH','ER','IY','D'],pier:['P','IH','R'],shook:['SH','UH','K'],wave:['W','EY','V'],waves:['W','EY','V','Z'],
 trees:['T','R','IY','Z'],tiny:['T','AY','N','IY'],stars:['S','T','AA','R','Z'],fireflies:['F','AY','ER','F','L','AY','Z'],
 hiding:['HH','AY','D','IH','NG'],help:['HH','EH','L','P'],someone:['S','AH','M','W','AH','N'],
 waiting:['W','EY','T','IH','NG'],field:['F','IY','L','D'],path:['P','AE','TH'],forward:['F','AO','R','W','ER','D'],
 crossed:['K','R','AO','S','T'],broken:['B','R','OW','K','AH','N'],bridge:['B','R','IH','JH'],deep:['D','IY','P'],
 ravine:['R','AH','V','IY','N'],breath:['B','R','EH','TH'],stepped:['S','T','EH','P','T'],plank:['P','L','AE','NG','K'],
 cave:['K','EY','V'],opened:['OW','P','AH','N','D'],beneath:['B','IH','N','IY','TH'],cliff:['K','L','IH','F'],
 center:['S','EH','N','T','ER'],ancient:['EY','N','CH','AH','N','T'],mirror:['M','IH','R','ER'],cold:['K','OW','L','D'],
 silent:['S','AY','L','AH','N','T'],maybe:['M','EY','B','IY'],catch:['K','AE','CH'],lightning:['L','AY','T','N','IH','NG'],
 show:['SH','OW'],where:['W','EH','R'],shine:['SH','AY','N'],circles:['S','ER','K','AH','L','Z'],
 reflections:['R','IH','F','L','EH','K','SH','AH','N','Z'],thousand:['TH','AW','Z','AH','N','D'],points:['P','OY','N','T','S'],
 big:['B','IH','G'],difference:['D','IH','F','ER','AH','N','S'],only:['OW','N','L','IY'],spiral:['S','P','AY','R','AH','L'],
 gathered:['G','AE','DH','ER','D'],glow:['G','L','OW'],sent:['S','EH','N','T'],back:['B','AE','K'],remember:['R','IH','M','EH','M','B','ER'],
 swept:['S','W','EH','P','T'],ahead:['AH','HH','EH','D'],land:['L','AE','N','D'],windows:['W','IH','N','D','OW','Z'],
 slipped:['S','L','IH','P','T'],calm:['K','AA','M'],storm:['S','T','AO','R','M'],away:['AH','W','EY'],dawn:['D','AO','N'],
 made:['M','EY','D'],knew:['N','UW'],never:['N','EH','V','ER'],alone:['AH','L','OW','N'],friend:['F','R','EH','N','D'],
 perfect:['P','ER','F','IH','K','T'],another:['AH','N','AH','DH','ER'],awfully:['AO','F','AH','L','IY'],
 fast:['F','AE','S','T'],something:['S','AH','M','TH','IH','NG'],feel:['F','IY','L'],right:['R','AY','T'],
 flash:['F','L','AE','SH'],horizon:['HH','ER','AY','Z','AH','N'],high:['HH','AY'],smell:['S','M','EH','L'],
 supper:['S','AH','P','ER'],already:['AO','L','R','EH','D','IY'],lamp:['L','AE','M','P'],get:['G','EH','T'],
 working:['W','ER','K','IH','NG'],packed:['P','AE','K','T'],tugged:['T','AH','G','D'],paw:['P','AO'],
 closer:['K','L','OW','S','ER'],soon:['S','UW','N'],air:['EH','R'],other:['AH','DH','ER'],side:['S','AY','D'],
 turned:['T','ER','N','D'],began:['B','IH','G','AE','N'],color:['K','AH','L','ER'],first:['F','ER','S','T'],
 pale:['P','EY','L'],trembled:['T','R','EH','M','B','AH','L','D'],fingers:['F','IH','NG','ER','Z']
};
Object.assign(DICT,{
  niko:['N','IY','K','OW'],auri:['AO','R','IY'],clockwork:['K','L','AA','K','W','ER','K'],
  clocktower:['K','L','AA','K','T','AW','ER'],clockkeeper:['K','L','AA','K','K','IY','P','ER'],
  redpanda:['R','EH','D','P','AE','N','D','AH'],panda:['P','AE','N','D','AH'],clockworkbird:['K','L','AA','K','W','ER','K','B','ER','D'],
  workshop:['W','ER','K','SH','AA','P'],building:['B','IH','L','D','IH','NG'],special:['S','P','EH','SH','AH','L'],
  sing:['S','IH','NG'],chirp:['CH','ER','P'],brass:['B','R','AE','S'],feathers:['F','EH','DH','ER','Z'],
  heart:['HH','AA','R','T'],spring:['S','P','R','IH','NG'],missing:['M','IH','S','IH','NG'],
  bells:['B','EH','L','Z'],loose:['L','UW','S'],coil:['K','OY','L'],bounced:['B','AW','N','S','T'],
  rolled:['R','OW','L','D'],street:['S','T','R','IY','T'],glint:['G','L','IH','N','T'],
  danced:['D','AE','N','S','T'],flower:['F','L','AW','ER'],pots:['P','AA','T','S'],market:['M','AA','R','K','IH','T'],
  carts:['K','AA','R','T','S'],turning:['T','ER','N','IH','NG'],cobblestones:['K','AA','B','AH','L','S','T','OW','N','Z'],
  town:['T','AW','N'],waking:['W','EY','K','IH','NG'],road:['R','OW','D'],tower:['T','AW','ER'],
  slipped:['S','L','IH','P','T'],service:['S','ER','V','IH','S'],hatch:['HH','AE','CH'],
  waiting:['W','EY','T','IH','NG'],tick:['T','IH','K'],again:['AH','G','EH','N'],
  inside:['IH','N','S','AY','D'],giant:['JH','AY','AH','N','T'],gears:['G','IH','R','Z'],
  silent:['S','AY','L','AH','N','T'],winding:['W','AY','N','D','IH','NG'],staircase:['S','T','EH','R','K','EY','S'],
  caught:['K','AO','T'],upper:['AH','P','ER'],wheel:['W','IY','L'],climb:['K','L','AY','M'],
  steps:['S','T','EH','P','S'],reach:['R','IY','CH'],wings:['W','IH','NG','Z'],nervous:['N','ER','V','AH','S'],
  gust:['G','AH','S','T'],rushed:['R','AH','SH','T'],window:['W','IH','N','D','OW'],shuddered:['SH','AH','D','ER','D'],
  deeper:['D','IY','P','ER'],mechanism:['M','EH','K','AH','N','IH','Z','AH','M'],found:['F','AW','N','D'],
  wedged:['W','EH','JH','D'],brake:['B','R','EY','K'],signal:['S','IH','G','N','AH','L'],jolted:['JH','OW','L','T','IH','D'],
  bent:['B','EH','N','T'],pin:['P','IH','N'],tumbled:['T','AH','M','B','AH','L','D'],ledge:['L','EH','JH'],
  stuck:['S','T','AH','K'],steady:['S','T','EH','D','IY'],land:['L','AE','N','D'],fix:['F','IH','K','S'],
  together:['T','AH','G','EH','DH','ER'],straightened:['S','T','R','EY','T','AH','N','D'],hinge:['HH','IH','N','JH'],
  replaced:['R','IH','P','L','EY','S','T'],spare:['S','P','EH','R'],pocket:['P','AA','K','IH','T'],working:['W','ER','K','IH','NG'],
  free:['F','R','IY'],wind:['W','AY','N','D'],clicks:['K','L','IH','K','S'],fly:['F','L','AY'],between:['B','IH','T','W','IY','N'],
  spokes:['S','P','OW','K','S'],lift:['L','IH','F','T'],popped:['P','AA','P','T'],clicked:['K','L','IH','K','T'],
  began:['B','IH','G','AE','N'],moving:['M','UW','V','IH','NG'],morning:['M','AO','R','N','IH','NG'],almost:['AO','L','M','OW','S','T'],
  another:['AH','N','AH','DH','ER'],hands:['HH','AE','N','D','Z'],swept:['S','W','EH','P','T'],forward:['F','AO','R','W','ER','D'],
  golden:['G','OW','L','D','AH','N'],dawn:['D','AO','N'],poured:['P','AO','R','D'],listen:['L','IH','S','AH','N'],
  song:['S','AO','NG'],belongs:['B','IH','L','AO','NG','Z'],clear:['K','L','IH','R'],bright:['B','R','AY','T'],
  alone:['AH','L','OW','N'],music:['M','Y','UW','Z','IH','K']
});
var escapeHtml=function(s){return String(s).replace(/[&<>"]/g,function(ch){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]);});};
function seconds(v){var p=String(v).trim().split(':');if(p.length===2)return Math.max(0,(+p[0]||0)*60+(+p[1]||0));if(p.length===3)return Math.max(0,(+p[0]||0)*3600+(+p[1]||0)*60+(+p[2]||0));var n=Number(v);return Number.isFinite(n)?Math.max(0,n):NaN;}
function clock(t){t=Math.max(0,t||0);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');}
function parseScript(raw){
  var rows=[],errors=[];
  String(raw).split(/\r?\n/).forEach(function(line,i){
    var s=line.trim();if(!s||s.charAt(0)==='#')return;
    var p=s.split('|');if(p.length<3){errors.push('Line '+(i+1)+': use MM:SS | SPEAKER | dialogue.');return;}
    var start=seconds(p.shift()),speaker=String(p.shift()).trim().toUpperCase(),text=p.join('|').trim();
    if(!Number.isFinite(start)||start>=FILM){errors.push('Line '+(i+1)+': time must be between 00:00 and 04:59.');return;}
    if(!VOICES[speaker]){errors.push('Line '+(i+1)+': unknown speaker. Use NARRATOR, NIKO, AURI, or KEEPER.');return;}
    if(!text){errors.push('Line '+(i+1)+': dialogue is empty.');return;}
    rows.push({start:start,speaker:speaker,text:text,sourceLine:i+1});
  });
  rows.sort(function(a,b){return a.start-b.start||a.sourceLine-b.sourceLine;});
  for(var i=1;i<rows.length;i++)if(rows[i].start-rows[i-1].start<1.5)errors.push('Cue lines '+rows[i-1].sourceLine+' and '+rows[i].sourceLine+' start less than 1.5 seconds apart.');
  return{rows:rows,errors:errors};
}
function g2p(word){
  var w=word.toLowerCase().replace(/[^a-z']/g,'');if(!w)return[];
  if(DICT[w])return DICT[w].slice();
  var out=[],i=0,silentE=w.length>2&&/e$/.test(w)&&!/(le|ee|ye)$/.test(w),longAt=silentE?w.length-3:-1;
  var ds=[['tion',['SH','AH','N']],['sion',['ZH','AH','N']],['tch',['CH']],['igh',['AY']],['eigh',['EY']],['sh',['SH']],['ch',['CH']],['ph',['F']],['ng',['NG']],['qu',['K','W']],['ck',['K']],['wh',['W']],['ee',['IY']],['ea',['IY']],['oo',['UW']],['oa',['OW']],['ai',['EY']],['ay',['EY']],['oi',['OY']],['oy',['OY']],['ou',['AW']],['ow',['AW']],['er',['ER']],['ir',['ER']],['ur',['ER']],['ar',['AA','R']],['or',['AO','R']],['ie',['AY']],['ue',['UW']],['kn',['N']],['wr',['R']]];
  while(i<w.length){
    var rest=w.slice(i),hit=false;
    for(var d=0;d<ds.length;d++)if(rest.indexOf(ds[d][0])===0){out=out.concat(ds[d][1]);i+=ds[d][0].length;hit=true;break;}
    if(hit)continue;
    var ch=w[i];
    if(ch==='t'&&rest.indexOf('th')===0){out.push(/^(the|this|that|these|those|they|them|their|there|then|than|though|together|another)/.test(w)?'DH':'TH');i+=2;continue;}
    if(ch==='e'&&i===w.length-1&&silentE){i++;continue;}
    if('aeiouy'.indexOf(ch)>=0){
      var vp=ch==='a'?(i===longAt?'EY':'AE'):ch==='e'?'EH':ch==='i'?(i===longAt?'AY':'IH'):ch==='o'?(i===longAt?'OW':'AA'):ch==='u'?(i===longAt?'UW':'AH'):(i===0||i===w.length-1?'IY':'IH');
      out.push(vp);i++;continue;
    }
    var cm={b:'B',c:(/[eiy]/.test(w[i+1]||'')?'S':'K'),d:'D',f:'F',g:(/[eiy]/.test(w[i+1]||'')?'JH':'G'),h:'HH',j:'JH',k:'K',l:'L',m:'M',n:'N',p:'P',q:'K',r:'R',s:'S',t:'T',v:'V',w:'W',z:'Z'};
    if(ch==='x')out.push('K','S');else if(ch==='y')out.push(i===0?'Y':'IY');else if(cm[ch])out.push(cm[ch]);
    i++;
  }
  return out.length?out:['AH'];
}
function tokenize(text){
  var bits=String(text).match(/[A-Za-z']+|[.,!?;:—-]/g)||[],u=[];
  bits.forEach(function(bit){
    if(/^[A-Za-z']+$/.test(bit)){
      var ps=g2p(bit),first=ps.findIndex(function(p){return!!VOWELS[p];});
      ps.forEach(function(p,i){u.push({p:p,stressed:!!VOWELS[p]&&i===first});});
      u.push({p:'BOUNDARY'});
    }else if(/[,;:]/.test(bit))u.push({p:'PAUSE',duration:.105});
    else if(/[.!?]/.test(bit))u.push({p:'PAUSE',duration:bit==='!'?.25:.21,terminal:bit});
    else u.push({p:'PAUSE',duration:.06});
  });
  if(u.length&&u[u.length-1].p==='BOUNDARY')u.pop();
  u.push({p:'PAUSE',duration:.12,terminal:'.'});return u;
}
function baseDur(p){
  if(VOWELS[p])return .091;
  if(['M','N','NG','L','R','W','Y'].indexOf(p)>=0)return .062;
  if(['S','Z','SH','ZH','F','V','TH','DH','HH','CH','JH'].indexOf(p)>=0)return .058;
  if(['P','B','T','D','K','G'].indexOf(p)>=0)return .042;return .04;
}
function profile(p,scale){
  if(VOWELS[p]){var v=VOWELS[p];return{f1:v[0]*scale,f2:v[1]*scale,f3:v[2]*scale,voiced:true,kind:'vowel'};}
  var table={B:[500,1100,2200],P:[450,1100,2300],D:[600,1500,2600],T:[520,1500,2800],G:[650,1300,2500],K:[500,1300,2600],V:[450,1500,2600],F:[400,2000,4200],DH:[500,1700,2700],TH:[400,2200,4500],Z:[400,1900,4000],S:[350,2200,5000],ZH:[450,1800,3200],SH:[400,2000,4200],HH:[550,1500,2800],M:[300,1000,2200],N:[350,1500,2500],NG:[350,1700,2600],L:[450,1300,2800],R:[400,1200,1700],W:[350,900,2200],Y:[300,2100,2900],CH:[450,1900,4000],JH:[500,1750,3300]};
  var a=table[p]||[500,1500,2700],voiced=['B','D','G','V','DH','Z','ZH','M','N','NG','L','R','W','Y','JH'].indexOf(p)>=0;
  return{f1:a[0]*scale,f2:a[1]*scale,f3:a[2]*scale,voiced:voiced,kind:['P','B','T','D','K','G'].indexOf(p)>=0?'stop':(['S','SH','F','TH','HH','CH','Z','ZH','V','DH','JH'].indexOf(p)>=0?'fricative':'sonorant')};
}
function gauss(x,c,s){var d=(x-c)/s;return Math.exp(-.5*d*d);}
function synth(text,speaker,opts,seed){
  opts=opts||{};var voice=VOICES[speaker]||VOICES.NARRATOR,rate=Math.max(.62,Math.min(1.72,(opts.rate||1)*voice.rate)),pitch=Math.max(.65,Math.min(1.8,opts.pitch||1)),warm=Math.max(.5,Math.min(1.6,opts.warmth||1)),units=tokenize(text),dur=0;
  units.forEach(function(u){if(u.p==='PAUSE')dur+=u.duration;else if(u.p==='BOUNDARY')dur+=.038/rate;else dur+=baseDur(u.p)*(u.stressed?1.18:1)/rate;});
  var out=new Float32Array(Math.ceil(dur*SR)+1),cur=0,phase=0,rng=(seed>>>0)||1;
  function random(){rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296;}
  units.forEach(function(u,unitIndex){
    if(u.p==='PAUSE'){cur+=Math.round(u.duration*SR);return;}
    if(u.p==='BOUNDARY'){cur+=Math.round(.038*SR/rate);return;}
    var p=u.p,pr=profile(p,voice.formant*Math.sqrt(warm)),sec=baseDur(p)*(u.stressed?1.18:1)/rate,count=Math.max(1,Math.round(sec*SR)),start=cur,end=Math.min(out.length,start+count),attack=Math.max(1,Math.round(SR*(pr.kind==='stop'?.002:.006))),release=Math.max(1,Math.round(SR*(pr.kind==='stop'?.004:.009))),vowel=pr.kind==='vowel',fbase=voice.f0*pitch,weights=[],norm=0;
    if(pr.voiced){var harmonics=Math.min(48,Math.floor((SR*.46)/fbase));for(var h=1;h<=harmonics;h++){var f=h*fbase,w=(.62*gauss(f,pr.f1,Math.max(80,pr.f1*.15))+.48*gauss(f,pr.f2,Math.max(115,pr.f2*.10))+.27*gauss(f,pr.f3,Math.max(170,pr.f3*.08)))/Math.pow(h,.68);weights.push(w);norm+=Math.abs(w);}norm=norm||1;}
    var prevNoise=0;
    for(var n=start;n<end;n++){
      var local=n-start,env=Math.max(0,Math.min(1,local/attack,(end-n)/release)),sample=0;
      if(pr.kind==='stop')env*=local<SR*.016?.15:.8;
      if(pr.voiced){
        var progress=local/count,f0=fbase*(1+.035*Math.sin(progress*Math.PI)+.018*Math.sin(unitIndex*1.73));
        phase+=TAU*f0/SR;
        for(var k=0;k<weights.length;k++)sample+=Math.sin(phase*(k+1))*weights[k];
        sample=sample/norm;if(!vowel)sample*=.58;if(p==='R')sample+=Math.sin(phase*1.5)*.045;sample*=.23*voice.bright;
      }
      if(pr.kind==='fricative'||pr.kind==='stop'){
        var white=random()*2-1,noise=white-prevNoise*.35;prevNoise=white;
        var ng=(p==='S'||p==='SH'||p==='F'||p==='TH')?.13:.075;if(pr.kind==='stop')ng=local<SR*.016?.10:.025;
        sample+=noise*ng;
      }
      if(pr.voiced)sample+=Math.sin(phase)*(vowel?.034:.014);
      out[n]=sample*env;
    }
    cur+=count;
  });
  var fade=Math.min(Math.round(SR*.012),out.length>>1);
  for(var j=0;j<fade;j++){var f=j/Math.max(1,fade);out[j]*=f;out[out.length-1-j]*=f;}
  return{samples:out,duration:out.length/SR};
}
function wav(left,right){
  var n=left.length,buf=new ArrayBuffer(44+n*4),v=new DataView(buf);
  function str(o,s){for(var i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));}
  str(0,'RIFF');v.setUint32(4,36+n*4,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,SR,true);v.setUint32(28,SR*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*4,true);
  var o=44;for(var i=0;i<n;i++){var l=Math.max(-1,Math.min(1,left[i])),r=Math.max(-1,Math.min(1,right[i]));v.setInt16(o,l<0?l*32768:l*32767,true);o+=2;v.setInt16(o,r<0?r*32768:r*32767,true);o+=2;}
  return new Blob([buf],{type:'audio/wav'});
}
function srtTime(sec){var ms=Math.round(sec*1000),h=Math.floor(ms/3600000);ms%=3600000;var m=Math.floor(ms/60000);ms%=60000;var s=Math.floor(ms/1000);ms%=1000;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+','+String(ms).padStart(3,'0');}
function makeSrt(rows){return rows.map(function(r,i){return(i+1)+'\n'+srtTime(r.start)+' --> '+srtTime(Math.min(FILM,Math.max(r.start+.2,r.end)))+'\n['+VOICES[r.speaker].label+'] '+r.text+'\n';}).join('\n');}
function download(blob,name){var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},60000);}
function css(){
 var s=document.createElement('style');s.id='trilyvaVoiceStudioCss';s.textContent=`
#trilyvaVoiceStudioBtn{border:1px solid #45454d;padding:7px 10px!important;color:#f5f5f5!important;white-space:nowrap}
@media(max-width:560px){.hdr-acts #trilyvaVoiceStudioBtn{display:block!important;flex:0 0 auto;padding:0 9px!important;font-size:9px!important;letter-spacing:0}}
.tvs-overlay{position:fixed;inset:0;z-index:12000;background:rgba(0,0,0,.84);backdrop-filter:blur(12px);display:none;align-items:center;justify-content:center;padding:20px}
.tvs-overlay.open{display:flex}.tvs-window{width:min(1180px,100%);height:min(850px,calc(100vh - 40px));background:#09090b;border:1px solid #34343b;box-shadow:0 25px 100px #000;display:flex;flex-direction:column;color:#eee;overflow:hidden;font:13px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}
.tvs-head{height:62px;flex:0 0 62px;display:flex;align-items:center;gap:16px;padding:0 20px;border-bottom:1px solid #29292e}.tvs-head strong{font:600 14px/1.2 ui-sans-serif,system-ui;letter-spacing:.13em}.tvs-head small{color:#85858e;font-size:10px;letter-spacing:.12em}.tvs-spacer{flex:1}.tvs-x{border:1px solid #38383f;width:33px;height:33px;color:#eee;font-size:20px}
.tvs-subhead{padding:10px 20px;border-bottom:1px solid #242429;color:#9999a2;font-size:10px;letter-spacing:.11em;display:flex;gap:18px;flex-wrap:wrap}.tvs-grid{display:grid;grid-template-columns:250px minmax(0,1fr);min-height:0;flex:1}.tvs-sidebar{padding:17px;border-right:1px solid #29292e;overflow:auto}.tvs-content{padding:17px;display:flex;flex-direction:column;gap:12px;min-width:0;min-height:0}
.tvs-label{display:block;color:#96969f;font-size:10px;letter-spacing:.1em;margin:0 0 7px;text-transform:uppercase}.tvs-control{margin-bottom:16px}.tvs-control select,.tvs-script,.tvs-previewtext{width:100%;background:#111114;border:1px solid #34343b;color:#f1f1f4;padding:10px;border-radius:0;outline:none}.tvs-control select:focus,.tvs-script:focus,.tvs-previewtext:focus{border-color:#a7a7b0}.tvs-range{display:flex;align-items:center;gap:10px;color:#bdbdc4;font-size:11px}.tvs-range input[type=range]{min-width:0;width:100%;accent-color:#ddd}.tvs-range input[type=checkbox]{accent-color:#ddd}.tvs-number{min-width:37px;text-align:right;color:#fff}
.tvs-script{font-size:12px;line-height:1.6;resize:vertical;flex:1;min-height:210px;tab-size:2}.tvs-previewtext{font-size:12px;line-height:1.5;resize:vertical;min-height:68px}.tvs-note{color:#8b8b95;font-size:11px;line-height:1.65}.tvs-divider{height:1px;background:#25252b;margin:13px 0}.tvs-buttons{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.tvs-btn{background:#141417;color:#f4f4f5;border:1px solid #424249;padding:10px 13px;font:600 10px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;text-decoration:none}.tvs-btn:hover:not(:disabled){background:#f4f4f5;color:#09090b}.tvs-btn.primary{background:#f3f3f4;color:#09090b;border-color:#f3f3f4}.tvs-btn:disabled{opacity:.4;cursor:not-allowed}.tvs-status{padding:11px 12px;background:#101013;border:1px solid #29292f;min-height:43px;color:#babac2;font-size:11px;overflow-wrap:anywhere}.tvs-bar{height:3px;background:#24242a;overflow:hidden}.tvs-bar i{display:block;height:100%;width:0;background:#eee;transition:width .12s linear}.tvs-kpi{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.tvs-kpi div{border:1px solid #29292e;padding:9px 10px;min-width:0}.tvs-kpi b{display:block;font-size:13px;color:#f1f1f4;font-weight:500}.tvs-kpi span{display:block;font-size:9px;color:#85858d;letter-spacing:.1em;margin-top:3px}.tvs-foot{padding:12px 20px;border-top:1px solid #29292e;display:flex;align-items:center;gap:10px;flex-wrap:wrap}.tvs-foot .tvs-note{flex:1;min-width:180px}.tvs-green{color:#d7e7d6}.tvs-warn{color:#f0d19d}.tvs-error{color:#f3a5a5}
@media(max-width:760px){.tvs-overlay{padding:0}.tvs-window{height:100dvh;width:100%;border:0}.tvs-grid{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}.tvs-sidebar{border-right:0;border-bottom:1px solid #29292e;padding:12px 15px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-height:190px;overflow:auto}.tvs-control{margin:0}.tvs-content{padding:12px;overflow:auto}.tvs-script{min-height:260px}.tvs-kpi{grid-template-columns:repeat(3,minmax(0,1fr))}.tvs-subhead{padding:8px 12px;gap:8px}}
`;
 document.head.appendChild(s);
}
function init(){
 var nav=document.querySelector('.hdr-acts');if(!nav||document.getElementById('trilyvaVoiceStudioBtn'))return;css();
 var btn=document.createElement('button');btn.id='trilyvaVoiceStudioBtn';btn.type='button';btn.textContent='Voice Studio';btn.title='Open fully local voice and audio generation';btn.addEventListener('click',open);
 var lib=nav.querySelector('[data-act="library"]');if(lib)lib.insertAdjacentElement('afterend',btn);else nav.appendChild(btn);
 var o=document.createElement('div');o.id='trilyvaVoiceStudio';o.className='tvs-overlay';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','TRILYVA Voice Studio');
 o.innerHTML=`
<section class="tvs-window"><header class="tvs-head"><div><strong>TRILYVA / VOICE STUDIO</strong><br><small>LOCAL SPEECH SYNTHESIS · NO CLOUD · NO EXTERNAL RUNTIME</small></div><div class="tvs-spacer"></div><button class="tvs-x" id="tvsClose" aria-label="Close">×</button></header>
<div class="tvs-subhead"><span>ENGINE <b>FORMANT-01</b></span><span>OUTPUT <b>PCM WAV · 16-BIT</b></span><span>FILM <b>05:00</b></span><span>NETWORK <b>NOT USED</b></span></div>
<div class="tvs-grid"><aside class="tvs-sidebar">
<div class="tvs-control"><label class="tvs-label" for="tvsSpeaker">Preview character</label><select id="tvsSpeaker"><option value="NARRATOR">Narrator — warm storyteller</option><option value="NIKO">Niko the red panda — warm and curious</option><option value="AURI">Auri the clockwork bird — bright and quick</option><option value="KEEPER">The clockkeeper — calm and steady</option></select></div>
<div class="tvs-control"><label class="tvs-label" for="tvsRate">Speech rate</label><div class="tvs-range"><input id="tvsRate" type="range" min=".75" max="1.5" value="1" step=".05"><span class="tvs-number" id="tvsRateValue">1.00×</span></div></div>
<div class="tvs-control"><label class="tvs-label" for="tvsPitch">Pitch</label><div class="tvs-range"><input id="tvsPitch" type="range" min=".75" max="1.45" value="1" step=".05"><span class="tvs-number" id="tvsPitchValue">1.00×</span></div></div>
<div class="tvs-control"><label class="tvs-label" for="tvsWarmth">Vocal warmth</label><div class="tvs-range"><input id="tvsWarmth" type="range" min=".75" max="1.3" value="1" step=".05"><span class="tvs-number" id="tvsWarmthValue">1.00×</span></div></div>
<div class="tvs-control"><label class="tvs-label" for="tvsAmbience">Original score + atmosphere</label><div class="tvs-range"><input id="tvsAmbience" type="checkbox" checked><span>Procedural score, sea, storm, chimes</span></div></div>
<div class="tvs-divider"></div><p class="tvs-note">FORMANT-01 is an original, dependency-free speech synthesizer. It exports locally and needs no account, but its voices sound synthetic rather than like neural human performances.</p>
</aside>
<main class="tvs-content"><div class="tvs-kpi"><div><b id="tvsLineCount">35</b><span>DIALOGUE CUES</span></div><div><b>300 s</b><span>TIMELINE LENGTH</span></div><div><b>22.05 kHz</b><span>LOCAL AUDIO</span></div></div>
<div><label class="tvs-label" for="tvsScript">Film dialogue script · MM:SS | SPEAKER | text</label><textarea id="tvsScript" class="tvs-script" spellcheck="false"></textarea><p class="tvs-note">Edit dialogue, speaker, or timecode. Speakers: NARRATOR, NIKO, AURI, KEEPER. A cue can be placed anywhere from 00:00 to 04:59.</p></div>
<div><label class="tvs-label" for="tvsPreviewText">Voice audition</label><textarea id="tvsPreviewText" class="tvs-previewtext" spellcheck="false">We can do this together. One light can guide everyone home.</textarea><div class="tvs-buttons" style="margin-top:8px"><button class="tvs-btn" id="tvsPreview">Preview voice</button><button class="tvs-btn" id="tvsStop">Stop preview</button><button class="tvs-btn" id="tvsDefault">Restore film script</button><button class="tvs-btn" id="tvsSave">Export script JSON</button><button class="tvs-btn" id="tvsImportBtn">Import script JSON</button><input id="tvsImport" type="file" accept=".json,application/json" hidden></div></div>
<div class="tvs-status" id="tvsStatus" role="status" aria-live="polite">Ready. Dialogue stays on this device.</div><div class="tvs-bar"><i id="tvsProgress"></i></div>
<div class="tvs-buttons"><button class="tvs-btn primary" id="tvsBuild">Build full 05:00 WAV</button><button class="tvs-btn" id="tvsSrt" disabled>Export subtitles SRT</button><a class="tvs-btn" id="tvsDownload" hidden download="niko-and-the-clockwork-bird-voice-track.wav">Download WAV</a></div></main></div>
<footer class="tvs-foot"><span class="tvs-note">The output is a synchronized 05:00 WAV with synthetic voices and optional original procedural soundscape. No network requests are made.</span><button class="tvs-btn" id="tvsCloseBottom">Close</button></footer></section>`;
 document.body.appendChild(o);o.querySelector('#tvsScript').value=DEFAULT_SCRIPT;
 o.querySelector('#tvsClose').addEventListener('click',close);o.querySelector('#tvsCloseBottom').addEventListener('click',close);
 o.addEventListener('mousedown',function(e){if(e.target===o)close();});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&o.classList.contains('open'))close();});
 [['tvsRate','tvsRateValue'],['tvsPitch','tvsPitchValue'],['tvsWarmth','tvsWarmthValue']].forEach(function(pair){o.querySelector('#'+pair[0]).addEventListener('input',function(){o.querySelector('#'+pair[1]).textContent=Number(this.value).toFixed(2)+'×';});});
 o.querySelector('#tvsScript').addEventListener('input',countCues);
 o.querySelector('#tvsPreview').addEventListener('click',preview);
 o.querySelector('#tvsStop').addEventListener('click',stopAudio);
 o.querySelector('#tvsBuild').addEventListener('click',build);
 o.querySelector('#tvsSrt').addEventListener('click',function(){if(lastSrt)download(new Blob([lastSrt],{type:'text/plain;charset=utf-8'}),'niko-and-the-clockwork-bird.en.srt');});
 o.querySelector('#tvsDefault').addEventListener('click',function(){if(busy)return;o.querySelector('#tvsScript').value=DEFAULT_SCRIPT;countCues();});
 o.querySelector('#tvsSave').addEventListener('click',function(){var raw=o.querySelector('#tvsScript').value,p=parseScript(raw);download(new Blob([JSON.stringify({format:'TRILYVA_DIALOGUE_1',durationSeconds:FILM,script:raw,parsedLines:p.rows.length},null,2)],{type:'application/json'}),'niko-and-the-clockwork-bird-dialogue.json');setStatus(p.errors.length?p.errors.join(' '):'Dialogue JSON exported: '+p.rows.length+' cues.',p.errors.length?'warn':'green');});
 o.querySelector('#tvsImportBtn').addEventListener('click',function(){o.querySelector('#tvsImport').click();});
 o.querySelector('#tvsImport').addEventListener('change',function(){var f=this.files&&this.files[0];if(!f)return;var reader=new FileReader();reader.onload=function(){try{var d=JSON.parse(String(reader.result)),src=typeof d==='string'?d:d.script;if(typeof src!=='string')throw new Error('JSON file has no script field.');o.querySelector('#tvsScript').value=src;countCues();setStatus('Local dialogue script imported.','green');}catch(e){setStatus('Import failed: '+e.message,'error');}};reader.readAsText(f);this.value='';});
 countCues();
}
function setStatus(msg,kind){var n=document.getElementById('tvsStatus');if(!n)return;n.className='tvs-status'+(kind==='green'?' tvs-green':kind==='warn'?' tvs-warn':kind==='error'?' tvs-error':'');n.textContent=msg;}
function countCues(){var o=document.getElementById('trilyvaVoiceStudio');if(!o)return;var p=parseScript(o.querySelector('#tvsScript').value);o.querySelector('#tvsLineCount').textContent=String(p.rows.length);setStatus(p.errors.length?p.errors.slice(0,4).join(' '):p.rows.length+' dialogue cues validated. Timeline length: 05:00.',p.errors.length?'warn':'green');}
function open(){var o=document.getElementById('trilyvaVoiceStudio');if(o){o.classList.add('open');document.body.style.overflow='hidden';o.querySelector('#tvsClose').focus();}}
function close(){var o=document.getElementById('trilyvaVoiceStudio');if(!o||busy)return;o.classList.remove('open');document.body.style.overflow='';}
function opts(){var o=document.getElementById('trilyvaVoiceStudio');return{rate:+o.querySelector('#tvsRate').value,pitch:+o.querySelector('#tvsPitch').value,warmth:+o.querySelector('#tvsWarmth').value};}
function stopAudio(){if(audio){audio.pause();try{URL.revokeObjectURL(audio.src);}catch(e){}audio=null;}}
function preview(){
 var o=document.getElementById('trilyvaVoiceStudio'),text=o.querySelector('#tvsPreviewText').value.trim(),who=o.querySelector('#tvsSpeaker').value;if(!text){setStatus('Type a short line to preview.','warn');return;}
 stopAudio();setStatus('Synthesizing local voice audition…');setTimeout(function(){try{
  var r=synth(text,who,opts(),847291),l=new Float32Array(r.samples.length),rr=new Float32Array(r.samples.length),p=VOICES[who].pan,pl=Math.sqrt((1-p)/2),pr=Math.sqrt((1+p)/2);
  for(var i=0;i<r.samples.length;i++){l[i]=r.samples[i]*pl;rr[i]=r.samples[i]*pr;}
  var b=wav(l,rr),url=URL.createObjectURL(b);audio=new Audio(url);audio.onended=function(){try{URL.revokeObjectURL(url);}catch(e){}audio=null;setStatus('Audition complete.','green');};audio.onerror=function(){audio=null;setStatus('Browser could not play the generated audition.','error');};
  audio.play().then(function(){setStatus('Playing locally synthesized '+VOICES[who].label+' voice.','green');}).catch(function(e){setStatus('Playback blocked: '+e.message,'error');});
 }catch(e){setStatus('Voice synthesis failed: '+e.message,'error');}},0);
}
async function addSoundscapeAsync(left,right,report){
 var total=left.length,rng=0x52a6d19b,low=0,mid=0,chunk=SR*2,notes=[146.83,164.81,196,220,246.94,293.66,329.63,392],thunder=[62.3,87.6,139.2],chimes=[230.7,237.1,267.4,275,292.2];
 function rand(){rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296;}
 function smooth(a,b,x){var u=Math.max(0,Math.min(1,(x-a)/(b-a)));return u*u*(3-2*u);}
 for(var base=0;base<total;base+=chunk){var stop=Math.min(total,base+chunk);
  for(var i=base;i<stop;i++){
   var t=i/SR,storm=smooth(49,72,t)*(1-smooth(145,164,t)),rain=storm*.85+smooth(176,180,t)*(1-smooth(194,201,t))*.12,cave=smooth(199,205,t)*(1-smooth(245,251,t)),w=rand()*2-1;
   low=low*.989+w*.011;mid=mid*.91+w*.09;
   var noise=low*(.018+storm*.052)+mid*(.006+storm*.027)+(rand()*2-1)*rain*.012;
   var root=notes[Math.floor(t/12)%8],env=.65+.35*Math.sin(t*.23);
   var music=Math.sin(TAU*root*t)*.006*env+Math.sin(TAU*root*1.5*t+.3)*.0032*env+Math.sin(TAU*root*2*t+.8)*.0018*env+Math.sin(TAU*root*2.5*t+1.2)*.0012*env;
   var elapsed=t-Math.floor(t/1.25)*1.25,motif=notes[(Math.floor(t/1.25)*3+1)%notes.length]*2;
   music+=Math.sin(TAU*motif*elapsed)*Math.exp(-elapsed*2.4)*.008*(.35+.65*(1-storm));
   var rumb=0;for(var j=0;j<thunder.length;j++){var td=t-thunder[j];if(td>=0&&td<2.8)rumb+=(rand()*2-1)*Math.exp(-td*2.1)*.085;}
   var ch=0;for(var k=0;k<chimes.length;k++){var cd=t-chimes[k];if(cd>=0&&cd<2.2){var cf=notes[(k*2+3)%notes.length]*4;ch+=Math.sin(TAU*cf*cd)*Math.exp(-cd*2.3)*.026+Math.sin(TAU*cf*2.76*cd)*Math.exp(-cd*3.5)*.009;}}
   var v=noise+music+cave*(rand()*2-1)*.009+rumb+ch,side=Math.sin(TAU*(.07+storm*.1)*t)*.18;
   left[i]+=v*(.94-side);right[i]+=v*(.94+side);
  }
  report(stop/total,'Generating original procedural score and effects · '+clock(stop/SR)+' / 05:00');
  await new Promise(function(resolve){setTimeout(resolve,0);});
 }
}
function build(){
 if(busy)return;var o=document.getElementById('trilyvaVoiceStudio'),parsed=parseScript(o.querySelector('#tvsScript').value);
 if(parsed.errors.length){setStatus('Fix the script first: '+parsed.errors.slice(0,4).join(' '),'error');return;}
 if(!parsed.rows.length){setStatus('The script is empty.','error');return;}
 stopAudio();busy=true;var btn=o.querySelector('#tvsBuild'),bar=o.querySelector('#tvsProgress'),srt=o.querySelector('#tvsSrt'),dl=o.querySelector('#tvsDownload');
 btn.disabled=true;srt.disabled=true;dl.hidden=true;bar.style.width='0%';
 // 05:00 / stereo / PCM16 ends as a ~26 MB WAV, without temporary video files.
 var total=SR*FILM,left=new Float32Array(total),right=new Float32Array(total),op=opts(),compiled=[];
 (async function(){
 try{
  setStatus('Preparing '+parsed.rows.length+' timestamped dialogue cues…');
  for(var i=0;i<parsed.rows.length;i++){
   var row=parsed.rows[i],next=i+1<parsed.rows.length?parsed.rows[i+1].start:FILM,maxDur=Math.max(.8,next-row.start-.32),voiceOpts={rate:op.rate,pitch:op.pitch,warmth:op.warmth};
   var r=synth(row.text,row.speaker,voiceOpts,0x6512+i*977),fit=1;
   if(r.duration>maxDur){fit=Math.min(1.72,r.duration/maxDur);r=synth(row.text,row.speaker,{rate:op.rate*fit,pitch:op.pitch,warmth:op.warmth},0x6512+i*977);}
   var start=Math.round(row.start*SR),v=VOICES[row.speaker],pl=Math.sqrt((1-v.pan)/2)*v.gain,pr=Math.sqrt((1+v.pan)/2)*v.gain,end=Math.min(total,start+r.samples.length);
   for(var j=0,at=start;at<end;j++,at++){left[at]+=r.samples[j]*pl;right[at]+=r.samples[j]*pr;}
   compiled.push({start:row.start,end:Math.min(FILM,row.start+r.duration),duration:r.duration,speaker:row.speaker,text:row.text,sourceLine:row.sourceLine,rateFactor:fit});
   bar.style.width=Math.round((i+1)/parsed.rows.length*28)+'%';setStatus('Synthesizing dialogue '+(i+1)+'/'+parsed.rows.length+' · '+v.label+' · '+clock(row.start));await new Promise(function(resolve){setTimeout(resolve,0);});
  }
  if(o.querySelector('#tvsAmbience').checked)await addSoundscapeAsync(left,right,function(f,msg){bar.style.width=(28+Math.round(f*58))+'%';setStatus(msg);});
  setStatus('Writing stereo PCM samples to WAV…');bar.style.width='92%';await new Promise(function(resolve){setTimeout(resolve,0);});
  var blob=wav(left,right);lastBlob=blob;lastSrt=makeSrt(compiled);try{window.dispatchEvent(new CustomEvent('trilyva:voice-track-ready',{detail:{blob:blob,durationSeconds:FILM,sampleRate:SR}}));}catch(_){}
  if(dl.dataset.url)try{URL.revokeObjectURL(dl.dataset.url);}catch(e){}
  var url=URL.createObjectURL(blob);dl.dataset.url=url;dl.href=url;dl.download='niko-and-the-clockwork-bird-voice-track.wav';dl.hidden=false;srt.disabled=false;bar.style.width='100%';
  setStatus('READY · 05:00 WAV · '+(blob.size/1048576).toFixed(1)+' MB · '+compiled.length+' cues · '+(o.querySelector('#tvsAmbience').checked?'original score and atmosphere included':'dialogue only')+'.','green');
 }catch(e){console.error('TRILYVA Voice Studio',e);setStatus('Render failed: '+String(e&&e.message||e),'error');}
 finally{busy=false;btn.disabled=false;}
 })();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
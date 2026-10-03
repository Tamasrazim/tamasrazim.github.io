/* TRILYVA Living Emojis library module */
var LIVING_EMOJI_VERSION="Living Glyphs 310";
var LIVING_GROUPS={
face:"happy|laugh|love|cool|shock|sleep|wink|cry|sad|angry|mad|confused|thinking|nerd|money|clown|masked|dizzy|sick|hot|cold|party|pleading|smirk|neutral|worried|embarrassed|relieved|grimace|scream|exploding|kiss|zipper|salute|shush|halo|devil|robot|alien|melting".split("|"),
people:"thumbsup|thumbsdown|clap|pray|wave|ok|peace|rock|fist|pointup|pointright|muscle|handshake|highfive|writing|phonehand|selfie|crown|superhero|astronaut|chef|doctor|firefighter|police|runner|dancer|musician|painter|builder|student|singer|scientist|detective|farmer|pilot|sailor|mechanic|photographer|gamer|skater".split("|"),
animals:"cat|dog|fox|panda|lion|tiger|bear|koala|rabbit|mouse|hamster|cow|pig|frog|monkey|chicken|penguin|bird|eagle|owl|snake|turtle|lizard|whale|dolphin|octopus|crab|shrimp|butterfly|bee|ladybug|spider|unicorn|dragon|dinosaur|fish|shark|seal|horse|deer|elephant".split("|"),
food:"apple|banana|orange|strawberry|watermelon|grapes|cherry|lemon|avocado|tomato|carrot|corn|potato|mushroom|bread|cheese|burger|fries|pizza|hotdog|taco|sushi|ramen|rice|curry|cake|donut|cookie|chocolate|icecream|lollipop|popcorn|coffee|tea|juice|boba|pretzel|croissant|cupcake|candy".split("|"),
objects:"phone|laptop|camera|headphones|speaker|gamepad|keyboard|mouse|watch|alarm|lightbulb|battery|lock|key|rocket|airplane|car|bus|train|bicycle|ship|house|office|hospital|school|shop|gift|balloon|umbrella|book|pencil|globe|map|compass|suitcase|soccer|basketball|football|tennis|trophy".split("|"),
nature:"sun|moon|rainbow|cloud|lightning|tornado|snowflake|droplet|wave|mountain|volcano|tree|palm|cactus|leaf|flower|rose|sunflower|clover|mushroom2|star|sparkles|fire|earth|heart|brokenheart|blueheart|blackheart|whiteheart|purpleheart|orangeheart|greenheart|yellowheart|infinity|recycle|warning|noentry|check|cross|question|exclamation|plus|minus|equals".split("|")
};
var LIVING_FLAG_DATA="bd,Bangladesh,circle,#006a4e,#f42a41|jp,Japan,circle,#fff,#bc002d|cn,China,star,#de2910,#ffde00|kr,South Korea,circle,#fff,#111|in,India,tricolor,#ff9933,#138808|pk,Pakistan,crescent,#01411c,#fff|us,United States,us,#b22234,#3c3b6e|ca,Canada,canada,#fff,#d80621|gb,United Kingdom,uk,#012169,#c8102e|fr,France,vertical,#0055a4,#ef4135|de,Germany,horizontal,#000,#dd0000|it,Italy,vertical,#009246,#ce2b37|es,Spain,horizontal,#aa151b,#f1bf00|pt,Portugal,vertical,#046a38,#da291c|nl,Netherlands,horizontal,#ae1c28,#fff|be,Belgium,vertical,#000,#fae042|ch,Switzerland,cross,#d52b1e,#fff|se,Sweden,nordic,#006aa7,#fecc00|no,Norway,nordic,#ba0c2f,#fff|dk,Denmark,nordic,#c8102e,#fff|fi,Finland,nordic,#fff,#003580|is,Iceland,nordic,#02529c,#dc1e35|ie,Ireland,vertical,#169b62,#ff883e|gr,Greece,stripe,#0d5eaf,#fff|br,Brazil,circle,#009c3b,#ffdf00|mx,Mexico,vertical,#006847,#ce1126|ar,Argentina,horizontal,#75aadb,#fff|cl,Chile,chile,#0039a6,#d52b1e|co,Colombia,horizontal,#fcd116,#003893|tr,Türkiye,crescent,#e30a17,#fff|sa,Saudi Arabia,saudi,#006c35,#fff|ae,United Arab Emirates,uae,#00732f,#ff0000|il,Israel,star,#fff,#0038b8|au,Australia,star,#00008b,#fff|nz,New Zealand,uk,#00247d,#cc142b|za,South Africa,south,#007749,#ffb81c|ng,Nigeria,vertical,#008751,#fff|ke,Kenya,horizontal,#000,#bb0000|eg,Egypt,horizontal,#ce1126,#fcd116|ma,Morocco,star,#c1272d,#006233|tn,Tunisia,crescent,#e70013,#fff|th,Thailand,thai,#a51931,#2d2a4a|vn,Vietnam,star,#da251d,#ffea00|id,Indonesia,horizontal,#ce1126,#fff|my,Malaysia,us,#010066,#ffcc00|sg,Singapore,crescent,#ed2939,#fff|ph,Philippines,philippines,#0038a8,#ce1126|ua,Ukraine,horizontal,#0057b7,#ffd700|pl,Poland,horizontal,#fff,#dc143c|at,Austria,horizontal,#ed2939,#fff|cz,Czechia,triangle,#11457e,#d7141a|ro,Romania,vertical,#002b7f,#fcd116|hu,Hungary,horizontal,#ce2939,#477050|ru,Russia,horizontal,#fff,#0039a6|al,Albania,eagle,#e41e20,#000|hr,Croatia,horizontal,#ff0000,#171796|sk,Slovakia,horizontal,#fff,#0b4ea2|si,Slovenia,horizontal,#fff,#005ba4|bg,Bulgaria,horizontal,#fff,#00966e|rs,Serbia,horizontal,#c6363c,#0c4076|kz,Kazakhstan,sun,#00afca,#fecd00|mn,Mongolia,vertical,#c4272f,#0066b3|np,Nepal,nepal,#dc143c,#003893|uy,Uruguay,sun,#fff,#001489|cr,Costa Rica,stripe,#fff,#002b7f|jm,Jamaica,cross,#009b3a,#fed100".split("|");

function livingTitle(s){return s.split(/[-_]/).map(function(x){return x?x.charAt(0).toUpperCase()+x.slice(1):x}).join(" ")}
function livingPalette(i){return [
 ["#eef1f5","#ffd65f","#e38d27","#ff5f86"],
 ["#edf1f6","#6fd4ff","#327db9","#6e63ff"],
 ["#f3ecef","#ff86ad","#cd4d78","#ffcf55"],
 ["#eaf2ec","#9de16e","#59a94a","#26b99b"],
 ["#eeeaf6","#c3adff","#8468ca","#ff91b3"]
 ][i%5]}
var LIVING_SPECS=(function(){
 var out=[],i=0;
 Object.keys(LIVING_GROUPS).forEach(function(cat){LIVING_GROUPS[cat].forEach(function(v){var p=livingPalette(i++);out.push({id:cat+"-"+v,title:livingTitle(v),cat:cat,v:v,bg:p[0],pri:p[1],deep:p[2],acc:p[3]});});});
 LIVING_FLAG_DATA.forEach(function(row){var p=row.split(","),co=livingPalette(i++);out.push({id:"flag-"+p[0],title:p[1]+" Flag",cat:"flag",v:p[0],flag:{kind:p[2],colors:p.slice(3)},bg:co[0],pri:co[1],deep:co[2],acc:co[3]});});
 return out;
})();
if(!LIVING_SPECS.length)throw new Error("Living Emoji library is empty");

var LIVING_SOURCE=String.raw`// LIVING GLYPHS — cohesive animated sticker language
const SPEC=__SPEC__,BG=__BG__,PRIMARY=__PRI__,DEEP=__DEEP__,ACCENT=__ACC__,INK="#171922",WHITE="#ffffff";
function rr(c,x,y,w,h,r,fill,stroke,lw){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw||8;c.stroke();}}
function circ(c,x,y,r,fill,stroke,lw){c.beginPath();c.arc(x,y,r,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw||8;c.stroke();}}
function line(c,x1,y1,x2,y2,color,lw){c.strokeStyle=color;c.lineWidth=lw||8;c.lineCap="round";c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function poly(c,pts,fill,stroke,lw){c.beginPath();pts.forEach(function(p,i){i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]);});c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw||8;c.stroke();}}
function eye(c,x,y,s,closed){if(closed){line(c,x-18*s,y,x+18*s,y,INK,10*s);return;}circ(c,x,y,22*s,INK);circ(c,x-7*s,y-8*s,7*s,WHITE);}
function mouth(c,v){c.strokeStyle=INK;c.fillStyle=INK;c.lineCap="round";if(v==="happy"||v==="laugh"||v==="love"||v==="party"){c.beginPath();c.arc(0,34,34,0,Math.PI);c.stroke();}else if(v==="sad"||v==="cry"||v==="worried"){c.beginPath();c.arc(0,64,28,Math.PI,TAU);c.stroke();}else if(v==="angry"||v==="mad"){line(c,-36,58,0,48,INK,12);line(c,0,48,36,58,INK,12);}else{line(c,-22,46,22,46,INK,10);}}
function drawFace(c,v){
  circ(c,0,0,178,PRIMARY,INK,11);
  var closed=v==="sleep"||v==="relieved",love=v==="love"||v==="pleading",cool=v==="cool"||v==="nerd";
  if(cool){rr(c,-126,-72,92,62,18,INK);rr(c,34,-72,92,62,18,INK);line(c,-34,-42,34,-42,INK,10);}
  else if(love){circ(c,-72,-22,25,"#ff4d79");circ(c,72,-22,25,"#ff4d79");}
  else {eye(c,-70,-20,1,closed);eye(c,70,-20,1,closed);}
  if(v==="wink") {eye(c,-70,-20,1,true);eye(c,70,-20,1,false);}
  if(v==="angry"||v==="mad"||v==="scream"){line(c,-108,-74,-48,-56,INK,13);line(c,48,-56,108,-74,INK,13);}
  if(v==="thinking"){line(c,-104,-50,-54,-70,INK,11);}
  if(v==="embarrassed"){circ(c,-96,36,20,"#ff8d97");circ(c,96,36,20,"#ff8d97");}
  if(v==="hot"){line(c,-110,-80,-80,-110,ACCENT,9);line(c,-6,-100,2,-132,ACCENT,9);line(c,90,-82,118,-110,ACCENT,9);}
  if(v==="cold"){circ(c,-100,40,10,"#7bd8ff");circ(c,100,40,10,"#7bd8ff");}
  if(v==="dizzy"){circ(c,-70,-18,22,DEEP);circ(c,70,-18,22,DEEP);line(c,-90,-40,-48,0,WHITE,7);line(c,48,-40,90,0,WHITE,7);}
  if(v==="sick"){circ(c,-88,42,10,"#8be25f");circ(c,88,42,10,"#8be25f");}
  if(v==="money"){circ(c,-70,-24,28,"#58d67f");circ(c,70,-24,28,"#58d67f");}
  mouth(c,v);
  if(v==="zipper") line(c,-72,52,72,52,INK,18);
  if(v==="masked") rr(c,-96,14,192,48,20,INK);
  if(v==="shush") line(c,0,10,0,84,INK,12);
  if(v==="salute"){line(c,54,-10,100,-78,INK,12);line(c,86,-52,118,-20,INK,12);}
  if(v==="halo") {c.strokeStyle="#ffe57a";c.lineWidth=12;c.beginPath();c.ellipse(0,-188,88,24,0,0,TAU);c.stroke();}
  if(v==="devil"){poly(c,[[-80,-140],[-38,-210],[-5,-145]],ACCENT,INK,9);poly(c,[[80,-140],[38,-210],[5,-145]],ACCENT,INK,9);}
  if(v==="robot"){rr(c,-128,-94,256,184,44,DEEP,INK,11);rr(c,-78,-48,58,52,14,WHITE);rr(c,20,-48,58,52,14,WHITE);line(c,-42,80,42,80,INK,9);}
  if(v==="alien"){circ(c,0,0,178,"#72dcb2",INK,11);eye(c,-66,-12,1.25);eye(c,66,-12,1.25);circ(c,0,54,12,ACCENT);}
}
function drawHand(c,v){
  c.fillStyle=PRIMARY;c.strokeStyle=INK;c.lineWidth=10;
  if(v==="peace"){line(c,-24,60,-30,-94,INK,36);line(c,24,60,46,-104,INK,30);rr(c,-70,30,140,112,38,PRIMARY,INK,10);}
  else if(v==="thumbsup"||v==="thumbsdown"||v==="ok"){rr(c,-86,-20,172,150,56,PRIMARY,INK,10);rr(c,-20,-124,70,110,34,PRIMARY,INK,10);if(v==="thumbsdown")c.translate(0,0);}
  else if(v==="pointup"||v==="pointright"){rr(c,-92,-10,184,144,52,PRIMARY,INK,10);line(c,0,24,v==="pointup"?0:132,v==="pointup"?-138:24,PRIMARY,38);}
  else if(v==="rock"){rr(c,-90,-10,180,146,58,PRIMARY,INK,10);for(var i=0;i<2;i++)line(c,-48+i*96,-4,-48+i*96,-86,PRIMARY,36);}
  else if(v==="fist"||v==="muscle"){rr(c,-84,-48,168,168,48,PRIMARY,INK,10);for(var j=0;j<4;j++)line(c,-54+j*36,-24,-54+j*36,-76,DEEP,22);}
  else if(v==="clap"||v==="highfive"||v==="handshake"){rr(c,-150,-30,118,155,40,PRIMARY,INK,10);rr(c,32,-30,118,155,40,PRIMARY,INK,10);}
  else {rr(c,-92,-30,184,154,54,PRIMARY,INK,10);line(c,-54,-8,54,-8,DEEP,12);}
}
function drawPeople(c,v){
  circ(c,0,-86,62,PRIMARY,INK,10);
  rr(c,-88,-8,176,168,50,DEEP,INK,10);
  if(/chef|doctor|firefighter|police|astronaut|pilot|sailor|farmer/.test(v)) rr(c,-82,-32,164,54,26,ACCENT,INK,9);
  if(v==="chef"){circ(c,0,-44,44,WHITE);circ(c,-34,-46,20,WHITE);circ(c,34,-46,20,WHITE);}
  if(v==="doctor"){line(c,-14,-14,-14,50,WHITE,16);line(c,-46,18,18,18,WHITE,16);}
  if(v==="astronaut"){circ(c,0,-70,62,"#d7e7ff",INK,10);rr(c,-48,-94,96,60,20,"rgba(38,50,76,.75)");}
  if(v==="firefighter"){circ(c,-48,-4,10,"#ff784c");circ(c,48,-4,10,"#ff784c");}
  if(v==="police"){line(c,-48,-100,48,-100,ACCENT,14);}
  if(v==="musician"){line(c,66,-20,66,82,INK,9);circ(c,72,86,28,PRIMARY,INK,7);}
  if(v==="painter"){circ(c,-48,-52,18,"#ff527d");circ(c,0,-72,18,"#6fc9ff");circ(c,48,-52,18,"#7be07d");}
  if(v==="student"){line(c,-62,62,62,62,ACCENT,10);}
  if(v==="runner"){line(c,-26,20,40,-16,PRIMARY,18);line(c,28,2,74,54,PRIMARY,18);line(c,-22,20,-70,72,PRIMARY,18);}
  if(v==="dancer"){line(c,-18,16,-68,-34,PRIMARY,18);line(c,18,16,68,-34,PRIMARY,18);line(c,-22,72,-64,124,PRIMARY,18);line(c,22,72,64,124,PRIMARY,18);}
}
function animalBase(c,kind){
  var fill=PRIMARY;
  circ(c,0,24,166,fill,INK,11);
  if(kind==="cat"||kind==="fox"){poly(c,[[-112,-78],[-178,-174],[-48,-126]],fill,INK,11);poly(c,[[112,-78],[178,-174],[48,-126]],fill,INK,11);}
  else if(kind==="rabbit"){rr(c,-112,-212,66,150,30,fill,INK,11);rr(c,46,-212,66,150,30,fill,INK,11);}
  else if(kind==="koala"){circ(c,-154,10,58,fill,INK,10);circ(c,154,10,58,fill,INK,10);}
  else if(kind==="bear"||kind==="panda"){circ(c,-142,10,48,fill,INK,10);circ(c,142,10,48,fill,INK,10);}
  else if(kind==="lion"){poly(c,[[-104,-106],[-158,-168],[-34,-146]],ACCENT,INK,9);poly(c,[[104,-106],[158,-168],[34,-146]],ACCENT,INK,9);}
  else if(kind==="elephant"){line(c,112,40,188,104,PRIMARY,46);}
  else if(kind==="deer"){line(c,-86,-126,-140,-196,ACCENT,10);line(c,86,-126,140,-196,ACCENT,10);}
  else if(kind==="fish"||kind==="shark"){poly(c,[[-156,24],[-236,-24],[-236,72]],DEEP,INK,9);}
  else if(kind==="dolphin"||kind==="whale"){poly(c,[[126,-20],[198,-74],[170,8]],ACCENT,INK,8);}
  else if(kind==="octopus"){for(var i=0;i<8;i++){var a=-Math.PI/2+i*Math.PI/4;line(c,Math.cos(a)*94,Math.sin(a)*94,Math.cos(a)*180,Math.sin(a)*180,PRIMARY,28);}}
  else if(kind==="bird"||kind==="eagle"||kind==="owl"){poly(c,[[-42,-42],[-174,-102],[-116,10]],ACCENT,INK,8);poly(c,[[42,-42],[174,-102],[116,10]],ACCENT,INK,8);}
  else if(kind==="butterfly"){circ(c,-96,18,76,PRIMARY,INK,9);circ(c,96,18,76,ACCENT,INK,9);line(c,0,-12,0,108,INK,18);}
  else if(kind==="bee"){line(c,-90,-90,-118,-150,INK,9);line(c,90,-90,118,-150,INK,9);}
  eye(c,-58,18,.85);eye(c,58,18,.85);
  if(kind==="cat"){poly(c,[[-18,70],[0,94],[18,70]],ACCENT,INK,7);}
  else if(kind==="snake"){line(c,-58,74,0,98,ACCENT,9);line(c,0,98,58,74,ACCENT,9);}
  else if(kind==="monkey"){circ(c,0,58,26,ACCENT,INK,6);}
  else {circ(c,0,64,20,ACCENT);}
}
function drawAnimals(c,v){animalBase(c,v);if(v==="fox"){circ(c,-66,20,20,WHITE);circ(c,66,20,20,WHITE);}if(v==="panda"){circ(c,-62,-2,34,"#20222a");circ(c,62,-2,34,"#20222a");}if(v==="pig"){rr(c,-76,48,152,70,32,"#f9a9b7",INK,8);circ(c,-28,74,9,INK);circ(c,28,74,9,INK);}if(v==="frog"){circ(c,-78,-88,48,PRIMARY,INK,9);circ(c,78,-88,48,PRIMARY,INK,9);}}
function drawFood(c,v){
  if(v==="pizza"||v==="taco"){poly(c,[[-176,-74],[176,-74],[0,160]],PRIMARY,INK,11);circ(c,-48,-16,13,ACCENT);circ(c,44,2,13,DEEP);circ(c,0,46,13,"#ffcc52");}
  else if(v==="burger"){rr(c,-178,-88,356,64,32,PRIMARY,INK,9);rr(c,-166,-24,332,58,20,ACCENT,INK,8);rr(c,-154,34,308,70,28,DEEP,INK,9);}
  else if(v==="fries"){rr(c,-112,-66,224,194,28,ACCENT,INK,9);for(var i=0;i<7;i++)rr(c,-96+i*32,-152-(i%2)*22,22,116,9,PRIMARY,INK,6);}
  else if(v==="donut"){circ(c,0,0,150,PRIMARY,INK,10);circ(c,0,0,62,BG,INK,8);for(var d=0;d<7;d++){var a=d*TAU/7;circ(c,Math.cos(a)*86,Math.sin(a)*86,8,ACCENT);}}
  else if(v==="icecream"){poly(c,[[-96,-16],[96,-16],[0,164]],DEEP,INK,9);circ(c,0,-70,88,PRIMARY,INK,9);circ(c,-48,-102,56,ACCENT,INK,8);circ(c,48,-102,56,PRIMARY,INK,8);}
  else if(v==="coffee"||v==="tea"){rr(c,-116,-98,232,168,48,PRIMARY,INK,10);c.strokeStyle=INK;c.lineWidth=18;c.beginPath();c.arc(122,-18,55,-Math.PI/2,Math.PI/2);c.stroke();line(c,-34,-128,0,-162,WHITE,8);line(c,14,-126,44,-158,WHITE,8);}
  else if(v==="cake"||v==="cupcake"){rr(c,-154,-72,308,104,28,PRIMARY,INK,9);rr(c,-122,-148,244,76,28,ACCENT,INK,9);for(var k=0;k<3;k++)circ(c,-58+k*58,-174,17,DEEP);}
  else if(v==="apple"||v==="orange"||v==="lemon"){circ(c,0,22,128,PRIMARY,INK,10);line(c,22,-104,38,-144,DEEP,10);if(v==="apple"){circ(c,64,-126,38,"#61c86a",INK,7);}}
  else {circ(c,0,30,142,PRIMARY,INK,10);}
}
function drawObjects(c,v){
  if(v==="phone"){rr(c,-116,-190,232,380,44,DEEP,INK,11);rr(c,-94,-138,188,266,28,PRIMARY,INK,8);circ(c,0,148,12,WHITE);}
  else if(v==="laptop"){rr(c,-174,-120,348,224,28,DEEP,INK,10);rr(c,-146,-94,292,170,18,PRIMARY);poly(c,[[-210,112],[210,112],[160,168],[-160,168]],ACCENT,INK,9);}
  else if(v==="camera"){rr(c,-174,-116,348,232,44,PRIMARY,INK,10);circ(c,0,0,88,DEEP,INK,9);circ(c,0,0,54,ACCENT);rr(c,-104,-164,74,50,14,DEEP,INK,8);}
  else if(v==="headphones"){c.strokeStyle=PRIMARY;c.lineWidth=48;c.beginPath();c.arc(0,26,150,Math.PI,0);c.stroke();rr(c,-184,0,58,116,22,DEEP,INK,8);rr(c,126,0,58,116,22,DEEP,INK,8);}
  else if(v==="gamepad"){rr(c,-176,-72,352,144,64,PRIMARY,INK,10);line(c,-96,0,-42,0,INK,14);line(c,-69,-27,-69,27,INK,14);circ(c,84,-20,11,ACCENT);circ(c,118,16,11,DEEP);}
  else if(v==="rocket"||v==="airplane"){poly(c,[[0,-210],[78,-90],[50,116],[0,166],[-50,116],[-78,-90]],PRIMARY,INK,10);poly(c,[[-64,38],[-152,114],[-46,114]],ACCENT,INK,8);poly(c,[[64,38],[152,114],[46,114]],ACCENT,INK,8);circ(c,0,-42,22,WHITE);}
  else if(v==="car"||v==="bus"||v==="train"){rr(c,-190,-72,380,170,54,PRIMARY,INK,10);rr(c,-136,-40,86,68,18,DEEP);rr(c,-44,-40,86,68,18,DEEP);rr(c,48,-40,86,68,18,DEEP);circ(c,-116,112,32,INK);circ(c,116,112,32,INK);}
  else if(v==="bicycle"){circ(c,-96,86,56,null,INK,10);circ(c,96,86,56,null,INK,10);line(c,-96,86,0,-4,INK,10);line(c,0,-4,96,86,INK,10);line(c,0,-4,0,86,INK,10);}
  else if(v==="gift"){rr(c,-150,-10,300,170,36,PRIMARY,INK,10);line(c,0,-10,0,160,ACCENT,20);line(c,-150,42,150,42,ACCENT,20);line(c,-30,-34,30,-34,ACCENT,20);}
  else if(v==="book"||v==="map"){rr(c,-154,-120,308,240,24,PRIMARY,INK,10);line(c,0,-112,0,112,INK,8);line(c,-104,-54,-20,-54,DEEP,8);line(c,28,-54,108,-54,DEEP,8);}
  else if(v==="lightbulb"){circ(c,0,-16,106,PRIMARY,INK,10);rr(c,-50,70,100,72,24,DEEP,INK,9);line(c,-34,116,34,116,WHITE,8);}
  else if(v==="key"){circ(c,-92,-34,54,null,PRIMARY,14);line(c,-46,-4,140,118,PRIMARY,34);line(c,88,78,124,42,PRIMARY,22);line(c,116,106,148,74,PRIMARY,22);}
  else if(v==="trophy"){rr(c,-84,-128,168,190,28,PRIMARY,INK,10);c.strokeStyle=PRIMARY;c.lineWidth=34;c.beginPath();c.arc(-94,-30,62,-Math.PI/2,Math.PI/2);c.stroke();c.beginPath();c.arc(94,-30,62,Math.PI/2,Math.PI*1.5);c.stroke();line(c,0,62,0,132,DEEP,18);rr(c,-74,132,148,34,12,ACCENT,INK,7);}
  else {rr(c,-144,-126,288,252,48,PRIMARY,INK,10);}
}
function drawNature(c,v){
  if(v==="sun"){circ(c,0,0,112,PRIMARY,INK,10);for(var i=0;i<12;i++){var a=i*TAU/12;line(c,Math.cos(a)*136,Math.sin(a)*136,Math.cos(a)*182,Math.sin(a)*182,ACCENT,13);}}
  else if(v==="moon"){circ(c,-10,0,126,PRIMARY,INK,10);circ(c,44,-34,116,BG,null,0);}
  else if(v==="rainbow"){for(var r=0;r<5;r++){c.strokeStyle=[PRIMARY,ACCENT,DEEP,"#ff6a8a","#62d6ff"][r];c.lineWidth=28;c.beginPath();c.arc(0,110,170-r*30,Math.PI,0);c.stroke();}}
  else if(v==="cloud"){circ(c,-70,30,64,PRIMARY,INK,9);circ(c,0,-8,88,PRIMARY,INK,9);circ(c,78,28,60,PRIMARY,INK,9);rr(c,-140,26,280,90,32,PRIMARY,null,0);}
  else if(v==="lightning"){poly(c,[[40,-190],[-74,-12],[0,-12],[-44,190],[92,-44],[18,-44]],PRIMARY,INK,10);}
  else if(v==="snowflake"){for(var j=0;j<6;j++){var q=j*TAU/6;line(c,Math.cos(q)*22,Math.sin(q)*22,Math.cos(q)*168,Math.sin(q)*168,PRIMARY,16);line(c,Math.cos(q)*106,Math.sin(q)*106,Math.cos(q+0.5)*146,Math.sin(q+0.5)*146,ACCENT,9);}}
  else if(v==="fire"){var flame=[[-110,120],[-132,40],[-72,70],[-86,-20],[-28,34],[-12,-160],[42,-56],[82,-114],[76,-18],[136,58],[108,120]];poly(c,flame,PRIMARY,INK,10);poly(c,[[-46,100],[-62,54],[-18,62],[0,-42],[34,30],[54,86],[30,116]],ACCENT,null,0);}
  else if(v==="star"){poly(c,(function(){var a=[];for(var i=0;i<10;i++){var q=-Math.PI/2+i*Math.PI/5,rrr=i%2?72:156;a.push([Math.cos(q)*rrr,Math.sin(q)*rrr]);}return a;})(),PRIMARY,INK,10);}
  else if(v==="sparkles"){poly(c,[[0,-182],[28,-32],[172,0],[28,32],[0,182],[-28,32],[-172,0],[-28,-32]],PRIMARY,INK,9);circ(c,-118,-118,18,ACCENT);circ(c,120,112,20,DEEP);}
  else if(v==="earth"){circ(c,0,0,154,DEEP,INK,10);poly(c,[[-102,-26],[-48,-92],[-2,-62],[-22,-8],[42,10],[62,68],[10,92],[-44,54]],PRIMARY,null,0);}
  else if(v==="mountain"||v==="volcano"){poly(c,[[-186,126],[-44,-132],[20,-42],[74,-164],[190,126]],DEEP,INK,10);poly(c,[[-44,-132],[20,-42],[74,-164]],PRIMARY,null,0);}
  else if(/heart/.test(v)){var hc=v==="brokenheart"?"#ff667f":PRIMARY;poly(c,[[0,170],[-168,46],[-188,-42],[-134,-112],[-62,-104],[0,-38],[62,-104],[134,-112],[188,-42],[168,46]],hc,INK,10);if(v==="brokenheart")line(c,-18,-82,18,24,WHITE,9);}
  else if(v==="flower"||v==="rose"||v==="sunflower"){for(var k=0;k<8;k++){var z=k*TAU/8;c.save();c.rotate(z);c.fillStyle=PRIMARY;c.beginPath();c.ellipse(0,-88,46,88,0,0,TAU);c.fill();c.restore();}circ(c,0,0,56,ACCENT,INK,8);line(c,0,58,0,164,DEEP,14);}
  else if(v==="check"||v==="cross"||v==="plus"||v==="minus"||v==="equals"){rr(c,-150,-150,300,300,72,DEEP,INK,10);if(v==="check"){line(c,-86,6,-24,66,WHITE,22);line(c,-24,66,92,-76,WHITE,22);}else if(v==="cross"){line(c,-72,-72,72,72,WHITE,22);line(c,72,-72,-72,72,WHITE,22);}else if(v==="plus"){line(c,-78,0,78,0,WHITE,22);line(c,0,-78,0,78,WHITE,22);}else if(v==="minus"){line(c,-78,0,78,0,WHITE,22);}else{line(c,-78,-34,78,-34,WHITE,18);line(c,-78,34,78,34,WHITE,18);}}
  else if(v==="warning"){poly(c,[[0,-172],[170,142],[-170,142]],PRIMARY,INK,10);line(c,0,-92,0,52,INK,22);circ(c,0,102,13,INK);}
  else if(v==="question"||v==="exclamation"){circ(c,0,0,150,DEEP,INK,10);c.fillStyle=WHITE;c.font="bold 190px ui-sans-serif";c.textAlign="center";c.textBaseline="middle";c.fillText(v==="question"?"?":"!",0,4);}
  else {circ(c,0,0,142,PRIMARY,INK,10);}
}
function drawFlag(c,f){
  var W=460,H=290;c.save();c.translate(-W/2,-H/2);
  if(f.kind==="horizontal"){f.colors.forEach(function(x,i){c.fillStyle=x;c.fillRect(0,i*H/f.colors.length,W,H/f.colors.length);});}
  else if(f.kind==="vertical"){f.colors.forEach(function(x,i){c.fillStyle=x;c.fillRect(i*W/f.colors.length,0,W/f.colors.length,H);});}
  else if(f.kind==="nordic"){c.fillStyle=f.colors[0];c.fillRect(0,0,W,H);c.fillStyle=f.colors[1];c.fillRect(0,H*.40,W,H*.20);c.fillRect(W*.40,0,W*.20,H);}
  else if(f.kind==="cross"){c.fillStyle=f.colors[0];c.fillRect(0,0,W,H);c.fillStyle=f.colors[1];c.fillRect(0,H*.40,W,H*.20);c.fillRect(W*.40,0,W*.20,H);}
  else if(f.kind==="star"){c.fillStyle=f.colors[0];c.fillRect(0,0,W,H);c.fillStyle=f.colors[1];var a=[];for(var i=0;i<10;i++){var q=-Math.PI/2+i*Math.PI/5,r=i%2?28:70;a.push([W/2+Math.cos(q)*r,H/2+Math.sin(q)*r]);}poly(c,a,f.colors[1],null,0);}
  else if(f.kind==="crescent"){c.fillStyle=f.colors[0];c.fillRect(0,0,W,H);circ(c,W*.45,H*.5,H*.25,f.colors[1]);circ(c,W*.55,H*.42,H*.20,f.colors[0]);}
  else if(f.kind==="circle"){c.fillStyle=f.colors[0];c.fillRect(0,0,W,H);circ(c,W/2,H/2,H*.24,f.colors[1]);}
  else if(f.kind==="us"){c.fillStyle=f.colors[0];c.fillRect(0,0,W,H);for(var s=0;s<7;s++){c.fillStyle=s%2?f.colors[1]:f.colors[0];c.fillRect(0,s*H/7.2,W,H/14.4);}c.fillStyle=f.colors[2];c.fillRect(0,0,W*.46,H*.54);}
  else if(f.kind==="uk"){c.fillStyle=f.colors[0];c.fillRect(0,0,W,H);c.strokeStyle="#fff";c.lineWidth=74;c.beginPath();c.moveTo(0,H/2);c.lineTo(W,H/2);c.moveTo(W/2,0);c.lineTo(W/2,H);c.stroke();c.strokeStyle=f.colors[1];c.lineWidth=34;c.beginPath();c.moveTo(0,H/2);c.lineTo(W,H/2);c.moveTo(W/2,0);c.lineTo(W/2,H);c.stroke();}
  else if(f.kind==="canada"){c.fillStyle=f.colors[0];c.fillRect(0,0,W,H);c.fillStyle=f.colors[1];c.fillRect(W*.22,0,W*.56,H);}
  else{c.fillStyle=f.colors[0];c.fillRect(0,0,W,H);c.fillStyle=f.colors[1];circ(c,W/2,H/2,66,f.colors[1]);}
  c.strokeStyle="rgba(20,22,30,.82)";c.lineWidth=11;c.strokeRect(0,0,W,H);c.restore();
}
function renderFrame(time,frame,fps,ctx,width,height){
  var p=motion.loopProgress,t=p*TAU,bob=Math.sin(t*2)*5,spin=t*.08;
  ctx.fillStyle=BG;ctx.fillRect(0,0,width,height);
  ctx.save();ctx.translate(width*.5,height*.53+bob);ctx.rotate(Math.sin(t)*.018);
  if(SPEC.cat==="flag"){
    ctx.save();ctx.rotate(Math.sin(t)*.018);ctx.fillStyle="rgba(15,18,26,.18)";ctx.beginPath();ctx.ellipse(0,190,180,28,0,0,TAU);ctx.fill();drawFlag(ctx,SPEC.flag);ctx.restore();
  }else{
    ctx.fillStyle="rgba(15,18,26,.18)";ctx.beginPath();ctx.ellipse(0,236,178,27,0,0,TAU);ctx.fill();
    var g=ctx.createLinearGradient(-200,-220,220,240);g.addColorStop(0,"#ffffff");g.addColorStop(.12,PRIMARY);g.addColorStop(.72,PRIMARY);g.addColorStop(1,DEEP);
    rr(ctx,-230,-218,460,436,132,g,"rgba(20,22,30,.8)",11);
    ctx.globalAlpha=.32;ctx.fillStyle=WHITE;ctx.beginPath();ctx.ellipse(-90,-132,94,30,-.52,0,TAU);ctx.fill();ctx.globalAlpha=1;
    if(SPEC.cat==="face")drawFace(ctx,SPEC.v);
    else if(SPEC.cat==="people")drawPeople(ctx,SPEC.v);
    else if(SPEC.cat==="animals")drawAnimals(ctx,SPEC.v);
    else if(SPEC.cat==="food")drawFood(ctx,SPEC.v);
    else if(SPEC.cat==="objects")drawObjects(ctx,SPEC.v);
    else drawNature(ctx,SPEC.v);
  }
  ctx.restore();
  ctx.save();ctx.globalAlpha=.16;ctx.strokeStyle=ACCENT;ctx.lineWidth=3;
  var orbit=260+Math.sin(t)*10;ctx.beginPath();ctx.arc(width*.5,height*.53,orbit,.15+t,.8+t);ctx.stroke();ctx.restore();
}
`;
function buildLivingSamples(){return LIVING_SPECS.map(function(s){var source=LIVING_SOURCE.replace("__SPEC__",JSON.stringify({cat:s.cat,v:s.v,flag:s.flag||null})).replace("__BG__",JSON.stringify(s.bg)).replace("__PRI__",JSON.stringify(s.pri)).replace("__DEEP__",JSON.stringify(s.deep)).replace("__ACC__",JSON.stringify(s.acc));return {title:"Living Emoji — "+s.title,desc:s.title+" · "+s.cat+" · "+LIVING_EMOJI_VERSION+" · 6-second seamless loop",code:source};});}
window.TRILYVA_LEGACY_LIBRARY_BRIDGE={living:buildLivingSamples};
window.TRILYVA_LIBRARY.register({id:"living-emojis",title:"LIVING EMOJIS",description:"TRILYVA Living Glyphs collection.",async load(){return buildLivingSamples();}});

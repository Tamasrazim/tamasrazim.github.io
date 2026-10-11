/* THE LAST STAR TRAIN — an original ten-minute fantasy cartoon for TRILYVA.
   4K UHD output target (3840×2160), 60 fps, deterministic vector frame rendering.
   Every frame is derived from time; scrubbing and export produce the same pose. */

const STARTRAIN_DURATION = 600;
const STARTRAIN_FPS = 60;
const STARTRAIN_SIZE = { width: 1920, height: 1080 };
const STARTRAIN_CHAPTERS = [
 {time:0,title:"NIMBUS TERMINAL",note:"Eira joins the Starfall Express for its first night route."},
 {time:46,title:"THE BLACKOUT STORM",note:"A storm extinguishes the skyway signals and scatters the route stars."},
 {time:96,title:"MOSSWATER BOARDWALK",note:"The crew rescues a stranded marsh keeper and learns to follow the reeds."},
 {time:150,title:"THE WHISPERWOOD MAZE",note:"A living forest rearranges itself; the crew reads the trail from above."},
 {time:206,title:"MIRROR-ICE VIADUCT",note:"The Express crosses a crystalline rail bridge with a dragon guiding the front."},
 {time:263,title:"SKY MARKET EXPRESS",note:"A crowded aerial station turns the journey into a fast, playful chase."},
 {time:320,title:"THE ENGINE ROOM",note:"A damaged star-drive must be repaired using three different kinds of energy."},
 {time:372,title:"WINDMILL CANYON",note:"The crew sails with the canyon wind to charge the silent engine."},
 {time:447,title:"THE ORRERY OBSERVATORY",note:"An overhead star map reveals the true route to the missing signal."},
 {time:490,title:"THE STORM TUNNEL",note:"A close, perspective-heavy run tests every signal the team has learned."},
 {time:526,title:"MOONFALL GAP",note:"The rails end above a gulf; the crew builds a temporary path of light."},
 {time:572,title:"FIRST-LIGHT HARBOR",note:"The Starfall Express returns as the whole harbor becomes a living constellation."}
];

const STARTRAIN_CUES = [
 [2,"NARRATOR","Every night, the Starfall Express carried little star-lanterns from Nimbus Terminal to the towns floating above the clouds."],
 [8,"EIRA","First night as signal keeper. I know every lamp on the route!"],
 [15,"PIP","And I know every dark corner. My lantern is ready."],
 [23,"NARRATOR","Eira was a young fox with a pocket full of signal flags. Pip, a lantern-moth, could see tiny lights even through thick cloud."],
 [34,"NIX","All aboard! I'm the smallest dragon ever trusted with the biggest night train."],
 [40,"EIRA","Then let's get everyone home before dawn."],
 [48,"NARRATOR","A storm rolled over the high skyway. One by one, the signal stars blinked out, and the track ahead vanished into cloud."],
 [57,"NIX","My compass is spinning! I can't tell which rail leads home."],
 [65,"EIRA","We won't guess. We'll find the route signals and light them again."],
 [77,"PIP","The storm pushed a glow down toward Mosswater. I can see it between the reeds."],
 [87,"NIX","Hold tight. We'll take the lower service rail."],
 [98,"NARRATOR","The lower line crossed Mosswater Marsh on a long wooden boardwalk. A little stone-shelled marsh keeper was stranded beyond a broken section."],
 [106,"EIRA","Stay on the planks, Pip. I'll secure this loose bridge from the safe side."],
 [116,"PIP","The reeds are flashing in a pattern. Three short lights, then one long."],
 [128,"NARRATOR","Together they lowered a spare rail plank into place. The marsh keeper tapped a rhythm against its shell, matching the signals."],
 [138,"PEBBLE","Follow the rhythm, not the reflection. Water copies every light, but the reeds point to the real track."],
 [146,"EIRA","A pattern we can trust. That's our first route clue."],
 [151,"NARRATOR","The rail climbed into Whisperwood, where enormous leaves turned like signboards and every path looked the same from the ground."],
 [162,"EIRA","That arch wasn't there a second ago! The forest is moving the exits."],
 [171,"PIP","I'll fly above the canopy. From up there, the glowing roots make a map."],
 [181,"NARRATOR","From above, the crew saw that the roots formed an arrow. The forest was not blocking the way; it was showing them a safer line."],
 [192,"EIRA","The route bends left, then doubles back. We follow the whole pattern."],
 [201,"OWL","Look at the shadows, little signal keeper. The tallest branch points toward the ice bridge."],
 [208,"NARRATOR","Beyond the trees, the Mirror-Ice Viaduct stretched between two snowy cliffs. Its rails shone like silver ribbons above the mist."],
 [218,"EIRA","No ground beside the track. Nix, can you guide the engine from the air?"],
 [228,"NIX","Stay behind my blue wing. I'll call each turn before we reach it."],
 [239,"PIP","The ice is reflecting the old lights. I'll mark the real rails with my lantern."],
 [251,"NARRATOR","The train crossed the viaduct one careful signal at a time, its wheels sparkling against the frost."],
 [264,"NARRATOR","At the Sky Market, rails looped above stalls, bridges and balloon docks. Every platform had a different height, and every bell sounded like the next stop."],
 [275,"EIRA","Platform seven! No, the sign just spun around!"],
 [284,"NIX","The Express is too long for that turn. We need the upper switch!"],
 [294,"PIP","I'll light the switch while you take the wide curve."],
 [305,"NARRATOR","The crew threaded the train between ribbons and hanging kites, then dropped onto the repair platform with only a puff of cloud behind them."],
 [316,"EIRA","We made it. Now let's find out why the compass is still sleeping."],
 [322,"NARRATOR","Inside the Engine Room, copper gears turned around a dark star-drive. The train had power, but the route compass had lost its pulse."],
 [334,"NIX","The wheel is stuck. I can push, but it needs a signal to turn."],
 [344,"EIRA","The marsh gave us rhythm. The wood gave us direction. The ice gave us a clean reflection."],
 [354,"PIP","Three clues, three pulses. I'll flash them in order."],
 [366,"NIX","There! The compass moved. The engine needs one strong gust to hold the signal."],
 [374,"NARRATOR","Windmill Canyon opened ahead in a sweeping ribbon of rock. Giant windmills turned above the railway, but the storm had stalled their sails."],
 [384,"EIRA","The sails are pointing away from the wind. We need to turn them together."],
 [395,"NIX","I'll fly to the upper lever. Eira, take the trackside wheel!"],
 [405,"EIRA","Pip, count the gusts. We only need one clean push."],
 [416,"NARRATOR","The windmills caught a wide current. A blue-green stream of air rushed along the rails and flowed into the Starfall engine."],
 [428,"NIX","I can feel the compass settling. We're nearly back on course."],
 [437,"EIRA","Then we finish the map at the observatory."],
 [448,"NARRATOR","The Orrery Observatory had a ceiling like a night sky and a circular floor painted with constellations. From above, the route became a pattern instead of a maze."],
 [458,"PIP","The marsh rhythm, the forest arrow, the ice reflection... they match three stars here."],
 [470,"NARRATOR","Eira rotated the brass star map until its glowing tracks aligned. A hidden line appeared, leading through the old storm tunnel."],
 [481,"EIRA","We don't need the brightest signal. We need the right one."],
 [491,"NARRATOR","The Storm Tunnel narrowed around the rails. From the engine window, each lamp arrived as a tiny point and grew into a clear signal just before the turn."],
 [500,"NIX","Left marker, then right! Hold the centre line!"],
 [510,"PIP","Three short flashes, one long. I have it!"],
 [520,"EIRA","The tunnel's opening ahead. Don't slow now!"],
 [528,"NARRATOR","The rails ended at Moonfall Gap, a deep space between two floating cliffs. The far signal was visible, but there was no bridge to reach it."],
 [539,"EIRA","We can join the rails with light. Everyone hold a steady point!"],
 [548,"NIX","I'll carry the first glow across. Pip, keep the far end bright."],
 [556,"NARRATOR","Signals travelled from the train to the dragon, from the dragon to the moth, and from the moth to the far cliff. A temporary track drew itself across the gap."],
 [566,"PIP","The route is connected! The last harbor lamp is answering!"],
 [574,"NARRATOR","At First-Light Harbor, the Starfall Express rolled in beneath a sky turning apricot and gold. The lanterns were safe, and every platform had found its place."],
 [583,"NIX","I thought being the pilot meant knowing every turn. You showed me how to read the signs together."],
 [590,"EIRA","Tomorrow, we'll paint the route so no one has to find it alone."],
 [596,"NARRATOR","As the first sun rose, the whole harbor blinked like a constellation, and the Starfall Express sounded its little welcome whistle."]
];

const STARTRAIN_SCENES = [0,46,96,150,206,263,320,372,447,490,526,572,600];

function skyClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function skyMix(a, b, p) { return a + (b - a) * skyClamp(p, 0, 1); }
function skyEase(a, b, t) { const p = skyClamp((t - a) / Math.max(0.0001, b - a), 0, 1); return p * p * (3 - 2 * p); }
function skyHash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); }
function skyWave(t, speed, phase) { return Math.sin(t * speed + phase); }
function skyGradient(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
  return g;
}
function skyRadial(ctx, x, y, r0, r1, inner, outer) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  g.addColorStop(0, inner); g.addColorStop(1, outer); return g;
}
function skyPath(ctx, points, fill, stroke, lineWidth) {
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
  }
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth || 2; ctx.stroke(); }
}
function skyEllipse(ctx, x, y, rx, ry, fill, stroke, lw, rot) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
}
function skyRound(ctx, x, y, w, h, r, fill, stroke, lw) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
}
function skyGlow(ctx, x, y, r, tint, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, tint.replace(/[\d.]+\)$/, (alpha == null ? 0.35 : alpha) + ")"));
  g.addColorStop(0.42, tint.replace(/[\d.]+\)$/, ((alpha == null ? 0.35 : alpha) * 0.38) + ")"));
  g.addColorStop(1, tint.replace(/[\d.]+\)$/, "0)"));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function skyCloud(ctx, x, y, s, tone, t, phase) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 0.22 + phase) * 7); ctx.scale(s, s);
  ctx.fillStyle = skyGradient(ctx, 0, -42, 0, 44, [[0, "#ffffff"], [0.55, tone || "#eef5ff"], [1, "#cedceb"]]);
  ctx.beginPath(); ctx.ellipse(0, 10, 96, 29, 0, 0, Math.PI * 2);
  ctx.ellipse(-48, 1, 42, 31, -0.16, 0, Math.PI * 2);
  ctx.ellipse(-5, -24, 47, 47, 0, 0, Math.PI * 2);
  ctx.ellipse(43, -12, 42, 35, 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.28; skyEllipse(ctx, -7, -42, 28, 7, "#ffffff", null, 0, -0.1);
  ctx.restore();
}
function skyStar(ctx, x, y, r, color, twinkle) {
  const a = 0.55 + 0.45 * twinkle;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.26, y - r * 0.24);
  ctx.lineTo(x + r, y); ctx.lineTo(x + r * 0.26, y + r * 0.24);
  ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.26, y + r * 0.24);
  ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.26, y - r * 0.24); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function skyBackground(ctx, t, theme) {
  const palettes = {
    meadow: [["#65c9ed","#bcefff","#ffe4b7"],["#76d3f4","#d8f5ff","#fff4c9"]],
    brook: [["#4faad8","#c8f0ef","#ffdfbd"],["#71c6e4","#d7f8ed","#fff0c4"]],
    wood: [["#172b52","#4f6480","#b6a5a7"],["#24395e","#7385a1","#ddbdc4"]],
    ridge: [["#4976b9","#d0dff2","#ffd0a6"],["#5d8cc8","#e2eaff","#ffe4c5"]],
    market: [["#5c99df","#d7f2ff","#ffd9a6"],["#79b7e8","#e9f9ff","#ffebbe"]],
    cloud: [["#6678a8","#b8c9e6","#eddbed"],["#9baed1","#dfe6fb","#f9e7ef"]],
    dusk: [["#292e65","#6262a2","#d49bb5"],["#1c2854","#596eaa","#f1bdc1"]],
    night: [["#121f48","#344d81","#9d99c3"],["#1d2c5a","#556c9d","#e1c4ce"]]
  };
  const pair = palettes[theme] || palettes.meadow;
  const f = skyEase(0, 600, t);
  const p = pair[0].map((c, i) => [c, pair[1][i]]);
  const mixColor = function (a, b, q) {
    const A = a.match(/[0-9a-f]{2}/gi).map(v => parseInt(v, 16));
    const B = b.match(/[0-9a-f]{2}/gi).map(v => parseInt(v, 16));
    return "rgb(" + A.map((v, i) => Math.round(skyMix(v, B[i], q))).join(",") + ")";
  };
  // p is indexed by vertical color stop: [variant A, variant B].
  // Blend matching sky stops; each pair contains exactly two color strings.
  const top = mixColor(p[0][0], p[0][1], f * 0.22);
  const mid = mixColor(p[1][0], p[1][1], f * 0.22);
  const low = mixColor(p[2][0], p[2][1], f * 0.22);
  ctx.fillStyle = skyGradient(ctx, 0, 0, 0, 1080, [[0, top], [0.53, mid], [1, low]]);
  ctx.fillRect(0, 0, 1920, 1080);
  const sunX = theme === "wood" || theme === "night" || theme === "dusk" ? 1515 : 1560;
  const sunY = theme === "wood" || theme === "night" || theme === "dusk" ? 190 : 155;
  if (theme === "night" || theme === "dusk" || theme === "wood") {
    skyGlow(ctx, sunX, sunY, 148, "rgba(202,215,255,0.38)", 0.28);
    skyEllipse(ctx, sunX, sunY, 56, 56, skyGradient(ctx, sunX - 38, sunY - 40, sunX + 38, sunY + 50, [[0,"#fff7ed"],[1,"#cbd8f8"]]), null);
    for (let i = 0; i < 72; i++) {
      const sx = skyHash(i + 22) * 1920, sy = skyHash(i + 121) * 620;
      skyStar(ctx, sx, sy, 2 + skyHash(i + 921) * 3, "rgba(255,250,221,0.9)", 0.5 + 0.5 * Math.sin(t * 1.4 + i));
    }
  } else {
    skyGlow(ctx, sunX, sunY, 190, "rgba(255,221,143,0.5)", 0.32);
    skyEllipse(ctx, sunX, sunY, 66, 66, skyGradient(ctx, sunX - 42, sunY - 54, sunX + 45, sunY + 56, [[0,"#fff9c6"],[0.6,"#ffd86f"],[1,"#ffab73"]]), null);
    ctx.strokeStyle = "rgba(255,235,176,0.72)"; ctx.lineWidth = 5; ctx.lineCap = "round";
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + t * 0.015;
      ctx.beginPath(); ctx.moveTo(sunX + Math.cos(a) * 84, sunY + Math.sin(a) * 84);
      ctx.lineTo(sunX + Math.cos(a) * 102, sunY + Math.sin(a) * 102); ctx.stroke();
    }
  }
  for (let i = 0; i < 7; i++) {
    const x = ((i * 317 + t * (5 + i % 3)) % 2310) - 170;
    skyCloud(ctx, x, 150 + (i % 3) * 110, 0.62 + (i % 4) * 0.11, theme === "wood" ? "#c7d0df" : "#f2f8ff", t, i * 2.8);
  }
}
function skyGround(ctx, t, tone1, tone2) {
  ctx.fillStyle = skyGradient(ctx, 0, 620, 0, 1080, [[0, tone1], [0.42, tone2], [1, "#203d54"]]);
  ctx.beginPath(); ctx.moveTo(0, 676);
  ctx.bezierCurveTo(270, 588, 470, 660, 720, 664);
  ctx.bezierCurveTo(975, 585, 1190, 642, 1440, 632);
  ctx.bezierCurveTo(1660, 595, 1810, 625, 1920, 657);
  ctx.lineTo(1920, 1080); ctx.lineTo(0, 1080); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(248,255,224,0.07)";
  for (let i = 0; i < 38; i++) {
    const x = skyHash(i + 72) * 1920, y = 700 + skyHash(i + 901) * 360;
    ctx.beginPath(); ctx.ellipse(x, y, 18 + (i % 4) * 6, 2 + (i % 3), 0, 0, Math.PI * 2); ctx.fill();
  }
}
function skyFlower(ctx, x, y, s, petal, t, i) {
  const sway = Math.sin(t * 1.25 + i) * 0.08;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = "#438b65"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-4, -28, sway * 80, -64); ctx.stroke();
  ctx.fillStyle = "#68bc7b"; ctx.beginPath(); ctx.ellipse(-11, -26, 13, 6, -0.5, 0, Math.PI * 2); ctx.ellipse(11, -42, 13, 6, 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.translate(sway * 80, -66); ctx.rotate(sway);
  for (let k = 0; k < 7; k++) {
    ctx.save(); ctx.rotate(k * Math.PI * 2 / 7); ctx.fillStyle = petal;
    ctx.beginPath(); ctx.ellipse(0, -14, 8, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  skyEllipse(ctx, 0, 0, 9, 9, skyGradient(ctx, -4, -5, 5, 5, [[0,"#fff9cb"],[1,"#f4a94d"]]), null);
  ctx.restore();
}
function skyLantern(ctx, x, y, s, hue, t, phase) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 1.6 + phase) * 5); ctx.scale(s, s);
  const g = ctx.createLinearGradient(-21, -28, 19, 28);
  g.addColorStop(0, "#fff6c6"); g.addColorStop(0.55, hue); g.addColorStop(1, "#d18d85");
  skyGlow(ctx, 0, 0, 76, "rgba(255,219,134,0.36)", 0.24);
  ctx.strokeStyle = "rgba(255,246,205,0.75)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -31); ctx.lineTo(0, -42); ctx.stroke();
  skyRound(ctx, -18, -29, 36, 52, 12, g, "rgba(255,252,225,0.8)", 1.7);
  ctx.strokeStyle = "rgba(255,255,241,0.48)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-8, -23); ctx.quadraticCurveTo(-14, -4, -7, 13); ctx.stroke();
  ctx.restore();
}
function skyHouse(ctx, x, y, s, t, lit, color) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const wall = color || "#e9c6a0";
  skyPath(ctx, [[-69,0],[-65,-85],[-2,-105],[65,-82],[70,0]], wall, "#956c64", 2.5);
  skyPath(ctx, [[-84,-76],[0,-143],[83,-76],[65,-69],[0,-124],[-67,-66]], "#915b70", "#65455f", 3);
  skyRound(ctx, -18, -42, 36, 42, 8, "#72516d", "#583d59", 2);
  skyRound(ctx, -50, -65, 22, 28, 5, lit ? "#ffe6a0" : "#5e728e", "#986b76", 2);
  skyRound(ctx, 27, -65, 22, 28, 5, lit ? "#ffe6a0" : "#5e728e", "#986b76", 2);
  if (lit) {
    skyGlow(ctx, -39, -53, 46, "rgba(255,218,128,0.35)", 0.2);
    skyGlow(ctx, 38, -53, 46, "rgba(255,218,128,0.35)", 0.2);
  }
  ctx.restore();
}
function skyTree(ctx, x, groundY, s, t, awake, focus) {
  ctx.save(); ctx.translate(x, groundY); ctx.scale(s, s);
  const glow = awake ? skyEase(526, 562, t) : 0;
  const bark = skyGradient(ctx, -95, -30, 120, 20, [[0,"#684f69"],[0.28,"#9b6b70"],[0.58,"#c18a79"],[1,"#684c67"]]);
  ctx.fillStyle = bark; ctx.beginPath(); ctx.moveTo(-86,0); ctx.bezierCurveTo(-65,-100,-102,-210,-40,-380);
  ctx.bezierCurveTo(-5,-467,56,-498,86,-430); ctx.bezierCurveTo(48,-306,89,-170,122,0);
  ctx.lineTo(61,0); ctx.bezierCurveTo(46,-108,6,-185,17,-280); ctx.bezierCurveTo(-25,-192,-18,-90,-27,0); ctx.closePath(); ctx.fill();
  // Raised bark ribbons make the trunk read as a carved illustrated shape.
  ctx.strokeStyle = "rgba(255,218,174,0.26)"; ctx.lineWidth = 11; ctx.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(-48 + i * 18, -25); ctx.bezierCurveTo(-20 + i * 8, -118, -47 + i * 15, -218, 4 + i * 8, -334 - i * 13); ctx.stroke();
  }
  // Each leaf stores x, y, radii, a shaded edge color, and a lighter highlight.
  // Keep both gradient colors explicit; CanvasGradient rejects an undefined stop.
  const leaves = [
    [-138,-421,145,106,"#458a82","#8fcbb0"],[-32,-510,148,122,"#67aa88","#a4d7aa"],[93,-473,151,114,"#79b891","#b9e1ac"],
    [174,-393,117,91,"#4c9684","#91cda8"],[-165,-342,116,88,"#71ae8c","#b2dbaa"],[7,-395,173,124,"#8bc59a","#c6e8ae"],
    [68,-573,102,83,"#9cd19f","#d4edb8"],[-84,-570,107,83,"#77bd91","#b7e3ad"],[197,-475,83,68,"#5b9d85","#9cd2a9"]
  ];
  for (let i = 0; i < leaves.length; i++) {
    const q = leaves[i], drift = Math.sin(t * 0.7 + i * 1.7) * 4;
    skyEllipse(ctx, q[0] + drift, q[1], q[2], q[3], skyGradient(ctx, q[0]-q[2], q[1]-q[3], q[0]+q[2], q[1]+q[3], [[0,q[5]],[1,q[4]]]), "rgba(42,100,84,0.38)", 3, Math.sin(t*0.24+i)*0.025);
  }
  // Lantern-fruit buds remain visible when the tree is dim.
  for (let i = 0; i < 19; i++) {
    const a = i * 2.399, rx = 76 + skyHash(i + 4) * 165, ry = 337 + skyHash(i + 34) * 215;
    const px = Math.cos(a) * rx + 4, py = -ry;
    const phase = skyHash(i + 102) * 4;
    const lit = awake ? skyEase(520, 570, t) : (0.18 + 0.08 * Math.sin(t * 2 + phase));
    skyGlow(ctx, px, py, 48, "rgba(255,225,145,0.35)", lit * 0.45);
    skyEllipse(ctx, px, py, 8, 13, "rgba(255,239,175," + (0.22 + lit * 0.78) + ")", null);
  }
  // The empty bell hook is an intentional story detail.
  ctx.strokeStyle = "#f2c87e"; ctx.lineWidth = 9; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(23, -394); ctx.lineTo(44, -374); ctx.lineTo(57, -391); ctx.stroke();
  if (!focus) {
    skyGlow(ctx, 38, -370, 90, "rgba(255,220,130,0.48)", 0.5 * glow);
    if (glow > 0.1) {
      const rays = ctx.createRadialGradient(35, -370, 10, 35, -370, 290);
      rays.addColorStop(0, "rgba(255,239,170," + (glow * 0.38) + ")"); rays.addColorStop(1, "rgba(255,235,155,0)");
      ctx.fillStyle = rays; ctx.fillRect(-280, -650, 650, 700);
    }
  }
  ctx.restore();
}
function skyVines(ctx, y, t, active) {
  for (let i = 0; i < 8; i++) {
    const x = i * 278 - 110 + Math.sin(t * 0.35 + i) * 12;
    ctx.strokeStyle = active ? "#6dbd9b" : "#53778c"; ctx.lineWidth = 10 - (i % 3);
    ctx.beginPath(); ctx.moveTo(x, y - 160); ctx.bezierCurveTo(x + 40, y - 95, x - 34, y - 40, x + 24, y + 35); ctx.stroke();
    if (active) {
      skyEllipse(ctx, x + 20, y - 12, 8, 18, "#a3dca0", null, 0, 0.5);
      skyEllipse(ctx, x + 6, y - 57, 8, 17, "#78c69c", null, 0, -0.5);
    }
  }
}
function skyVillage(ctx, t, lit, farOnly) {
  const colors = ["#eec9a4","#d9c7e9","#f5d8ad","#c5dbd5","#e7b9b5","#d7d6ef"];
  for (let i = 0; i < 10; i++) {
    const x = 35 + i * 201 + Math.sin(i * 1.7) * 23;
    const y = 735 + (i % 3) * 30;
    skyHouse(ctx, x, y, 0.7 + (i % 4) * 0.07, t, lit, colors[i % colors.length]);
    if (!farOnly && i % 2 === 0) skyLantern(ctx, x + 90, y - 145, 0.55, "#f7bca0", t, i);
  }
  if (!farOnly) {
    for (let i = 0; i < 28; i++) {
      skyFlower(ctx, i * 73 + (i % 2) * 12, 1025 + Math.sin(i) * 13, 0.48 + (i % 4) * 0.12,
        ["#f8b6c9","#f9dd83","#b5c6ff","#fff0cf"][i % 4], t, i);
    }
  }
}
function skyBrook(ctx, t) {
  skyGround(ctx, t, "#a2dcae", "#65b87d");
  // Two banks frame the water so the stepping stones stay legible.
  ctx.fillStyle = "#478e94"; ctx.beginPath(); ctx.moveTo(0,830);
  ctx.bezierCurveTo(250,750,370,884,620,825); ctx.bezierCurveTo(910,750,1000,905,1260,827);
  ctx.bezierCurveTo(1480,770,1670,841,1920,800); ctx.lineTo(1920,1080); ctx.lineTo(0,1080); ctx.closePath(); ctx.fill();
  ctx.fillStyle = skyGradient(ctx,0,818,0,1080,[[0,"#7fdae0"],[0.4,"#43a7bc"],[1,"#267991"]]);
  ctx.beginPath(); ctx.moveTo(0,850); ctx.bezierCurveTo(270,780,400,905,645,850); ctx.bezierCurveTo(900,775,1065,920,1290,848);
  ctx.bezierCurveTo(1535,782,1710,863,1920,820); ctx.lineTo(1920,1080); ctx.lineTo(0,1080); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 28; i++) {
    const x = ((i * 93 + t * (32 + i % 5 * 7)) % 2050) - 80, y = 868 + (i % 7) * 26 + Math.sin(t + i) * 3;
    ctx.strokeStyle = "rgba(214,255,250,0.5)"; ctx.lineWidth = 2 + (i % 3);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 28, y - 3, x + 55, y); ctx.stroke();
  }
  for (let i = 0; i < 14; i++) {
    const x = i * 157 + 32;
    skyEllipse(ctx, x, 823 + Math.sin(i) * 18, 53, 21, ["#d5d1ba","#b7c8b9","#d9ddcc"][i % 3], "#7ca8a6", 2, Math.sin(i) * .08);
  }
  // The old plank bridge sits in the rear plane.
  ctx.strokeStyle = "#886c71"; ctx.lineWidth = 17; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(468, 743); ctx.quadraticCurveTo(940, 800, 1400, 736); ctx.stroke();
  ctx.strokeStyle = "#d0a884"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(474, 746); ctx.quadraticCurveTo(940, 802, 1395, 739); ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const x = 545 + i * 111, y = 755 + Math.sin(i / 7 * Math.PI) * 40;
    ctx.strokeStyle = "#9a7072"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 9, y + 31); ctx.stroke();
  }
  for (let i = 0; i < 20; i++) skyFlower(ctx, i * 101, 1035 + Math.sin(i) * 8, 0.54, i % 2 ? "#f5d7a0" : "#eeb5c8", t, i);
  // A few soft reeds animate beside the water.
  for (let i = 0; i < 18; i++) {
    const x = i * 113 + 14, sw = Math.sin(t * 1.3 + i) * 10;
    ctx.strokeStyle = "#458a68"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, 924); ctx.quadraticCurveTo(x + sw, 870, x + sw * 1.3, 838 - i % 4 * 9); ctx.stroke();
  }
}
function skyForest(ctx, t) {
  skyGround(ctx, t, "#435d74", "#203e57");
  for (let i = 0; i < 13; i++) {
    const x = i * 169 - 15, h = 355 + skyHash(i + 18) * 210, w = 41 + (i % 4) * 10;
    const bark = skyGradient(ctx, x - w, 0, x + w, 0, [[0,"#283e52"],[0.5,"#4b536b"],[1,"#263b54"]]);
    ctx.fillStyle = bark; ctx.beginPath(); ctx.moveTo(x - w, 1080); ctx.lineTo(x - w * 0.54, 1080 - h);
    ctx.quadraticCurveTo(x, 1080 - h - 65, x + w * 0.46, 1080 - h); ctx.lineTo(x + w, 1080); ctx.closePath(); ctx.fill();
    for (let j = 0; j < 5; j++) {
      const lx = x - 65 + j * 31, ly = 1080 - h + 54 + (j % 3) * 25;
      skyEllipse(ctx, lx, ly, 64, 42, ["#314c69","#45647b","#3d5b70"][j % 3], null, 0, skyWave(t,0.3,j)*.03);
    }
  }
  for (let i = 0; i < 23; i++) {
    const x = skyHash(i + 80) * 1920, y = 200 + skyHash(i + 90) * 560;
    skyGlow(ctx, x, y, 38, "rgba(178,226,255,0.4)", 0.2 + 0.15 * Math.sin(t * 1.5 + i));
    skyEllipse(ctx, x, y, 3 + skyHash(i + 120) * 4, 4 + skyHash(i + 130) * 7, "rgba(207,242,255,0.82)", null);
  }
}
function skyCrystalRidge(ctx, t) {
  ctx.fillStyle = skyGradient(ctx, 0, 0, 0, 1080, [[0,"#6ba4d8"],[0.48,"#d6e8fb"],[1,"#efcbbd"]]); ctx.fillRect(0,0,1920,1080);
  for (let i = 0; i < 5; i++) skyCloud(ctx, i * 420 - 80 + Math.sin(t * .2 + i) * 18, 305 + i % 3 * 90, 1.05, "#edf6ff", t, i * 2);
  skyPath(ctx, [[0,785],[160,530],[305,689],[478,354],[638,690],[809,430],[980,697],[1170,370],[1310,687],[1475,455],[1620,690],[1760,492],[1920,680],[1920,1080],[0,1080]], "#8299c8", "#6179ac", 4);
  skyPath(ctx, [[0,895],[220,730],[380,840],[594,581],[778,850],[1020,610],[1170,844],[1380,590],[1575,847],[1750,680],[1920,815],[1920,1080],[0,1080]], "#a7b8dc", "#7a95c7", 3);
  for (let i = 0; i < 17; i++) {
    const x = 35 + i * 117, y = 840 + Math.sin(i) * 20, h = 45 + skyHash(i + 700) * 100;
    skyPath(ctx, [[x-h*.25,y],[x,y-h],[x+h*.42,y],[x+h*.22,y+45],[x-h*.22,y+45]], 
      ["#83d8e6","#b4c9ff","#b4efdf","#a5b6f0"][i%4], "rgba(255,255,255,0.68)", 2);
    skyGlow(ctx, x, y - h * .45, h * .75, "rgba(178,237,255,0.34)", 0.17);
  }
  // A faint floating stair establishes the route upwards.
  for (let i = 0; i < 8; i++) {
    const x = 200 + i * 175, y = 900 - i * 56;
    skyEllipse(ctx, x, y, 89 - i * 4, 16, "#d9e3ef", "#9fb2ce", 2);
  }
}
function skyFloatingIsland(ctx, x, y, s, t, grass) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * .7 + x) * 5); ctx.scale(s, s);
  ctx.fillStyle = "#aa9aca"; ctx.beginPath(); ctx.moveTo(-130,0); ctx.quadraticCurveTo(-95,35,-60,69);
  ctx.lineTo(-18,124); ctx.lineTo(15,89); ctx.lineTo(73,55); ctx.lineTo(128,0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = grass || "#86c5a2"; ctx.beginPath(); ctx.ellipse(0,-4,135,26,0,0,Math.PI*2); ctx.fill();
  for (let i = 0; i < 7; i++) {
    const px = -88 + i * 29, py = -12 + Math.sin(i * 3) * 4;
    skyEllipse(ctx, px, py, 8, 14, i % 2 ? "#d6f6be" : "#7cbf9e", null, 0, .25);
  }
  ctx.restore();
}
function skyMarket(ctx, t) {
  skyBackground(ctx, t, "market");
  for (let i = 0; i < 7; i++) skyFloatingIsland(ctx, i * 350 - 85 + Math.sin(t*.18+i)*15, 660 + (i % 3) * 95, 0.72 + (i % 3) * .12, t, ["#a0d4b3","#ead39c","#9bc8df"][i%3]);
  for (let i = 0; i < 9; i++) {
    const x = (i * 243 + t * (10 + (i % 4) * 2)) % 2130 - 100;
    const y = 380 + (i % 3) * 80 + Math.sin(t * .6 + i) * 18;
    ctx.strokeStyle = "#856e9c"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x, y - 65); ctx.lineTo(x, y + 5); ctx.stroke();
    skyPath(ctx, [[x,y-60],[x+67,y-43],[x,y-20]], ["#ffd5a9","#c5d3ff","#fac5d3"][i%3], "#fff0d4", 2);
    skyGlow(ctx, x+16, y+15, 55, "rgba(255,215,156,0.28)", 0.18);
  }
  for (let i = 0; i < 6; i++) {
    const x = 200 + i * 310, y = 540 + (i % 2) * 110;
    skyRound(ctx, x-58, y-75, 116, 84, 8, ["#e7c2a7","#d7d4f2","#c4e5d9"][i%3], "#7b759e", 2);
    skyPath(ctx, [[x-67,y-75],[x,y-127],[x+67,y-75]], "#9b7d9f", "#706b93", 2);
    skyRound(ctx, x-25,y-47,50,31,7,"#ffedb6","#d6a47e",2);
  }
}
function skyCloudHome(ctx, t, lights) {
  skyBackground(ctx,t,"cloud");
  for (let i = 0; i < 13; i++) {
    const x = i * 165 - 30;
    skyCloud(ctx, x, 784 + (i % 3) * 48, 1.05 + (i % 3) * .15, "#e4e5f5", t, i * 1.9);
  }
  // Layered cloud shelves keep distant architecture behind the foreground performers.
  skyPath(ctx, [[0,802],[260,733],[430,771],[636,704],[840,751],[1030,701],[1223,755],[1460,703],[1650,754],[1920,703],[1920,1080],[0,1080]], "#7b88b7", "#646e9e", 3);
  for (let i = 0; i < 5; i++) {
    const x = 140 + i * 370, y = 810 + (i % 2) * 24;
    const homeLit = !!lights && t >= 416 && (i === 2 || t >= 438);
    skyHouse(ctx, x, y, 0.77, t, homeLit, ["#bfc9e8","#d8c7e8","#bcd8df"][i%3]);
    if (homeLit) skyLantern(ctx,x+88,y-148,.5,"#f7c98f",t,i+20);
  }
  if (!lights) {
    for (let i = 0; i < 8; i++) {
      const x = 110 + i * 240;
      ctx.strokeStyle = "rgba(176,192,230,0.25)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, 710); ctx.quadraticCurveTo(x+17,690,x+32,715); ctx.stroke();
    }
  }
}
function skySkiff(ctx, x, y, s, t, tilt) {
  ctx.save(); ctx.translate(x,y); ctx.rotate(tilt || Math.sin(t*.65)*.035); ctx.scale(s,s);
  // Balloon canopy and stitched sail.
  skyGlow(ctx, 4,-124,115,"rgba(255,214,165,0.3)",0.16);
  ctx.fillStyle = skyGradient(ctx,-65,-205,67,-100,[[0,"#ffedbe"],[.5,"#f2aeb8"],[1,"#8c8bc8"]]);
  ctx.beginPath(); ctx.moveTo(-63,-107); ctx.bezierCurveTo(-102,-173,-70,-222,0,-228);
  ctx.bezierCurveTo(80,-223,99,-164,62,-107); ctx.quadraticCurveTo(4,-84,-63,-107); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.65)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-50,-151); ctx.quadraticCurveTo(0,-133,50,-151); ctx.moveTo(-28,-211); ctx.quadraticCurveTo(-7,-169,0,-114); ctx.stroke();
  ctx.strokeStyle = "#9f7d89"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-40,-111); ctx.lineTo(-23,-49); ctx.moveTo(40,-111); ctx.lineTo(21,-49); ctx.stroke();
  ctx.fillStyle = skyGradient(ctx,-110,-80,110,25,[[0,"#936c94"],[.45,"#c49bae"],[1,"#745f95"]]);
  ctx.beginPath(); ctx.moveTo(-110,-36); ctx.quadraticCurveTo(-76,-67,-39,-61); ctx.lineTo(57,-61);
  ctx.quadraticCurveTo(99,-56,112,-28); ctx.lineTo(81,1); ctx.lineTo(-74,1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#624d80"; ctx.lineWidth = 4; ctx.stroke();
  skyRound(ctx,-59,-49,116,24,9,"#e9c7a7","#956c80",3);
  for (let i=0;i<6;i++) {
    ctx.strokeStyle="#f5dfba"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-48+i*18,-42); ctx.lineTo(-43+i*18,-31); ctx.stroke();
  }
  ctx.restore();
}
function skyVoicePulse(role, t) {
  let cueIndex = -1;
  for (let i = 0; i < STARTRAIN_CUES.length; i++) {
    if (STARTRAIN_CUES[i][0] <= t) cueIndex = i;
    else break;
  }
  if (cueIndex < 0 || STARTRAIN_CUES[cueIndex][1] !== role) return 0;
  const cue = STARTRAIN_CUES[cueIndex];
  const next = STARTRAIN_CUES[cueIndex + 1];
  const duration = Math.min(4.7, (next ? next[0] : STARTRAIN_DURATION) - cue[0]);
  const age = t - cue[0];
  if (age < 0 || age > duration || duration <= 0.1) return 0;
  const inFade = skyEase(0, 0.12, age);
  const outFade = 1 - skyEase(duration - 0.22, duration, age);
  // This is animated mouth timing for the written dialogue cues, not audio.
  return inFade * outFade * (0.18 + 0.82 * Math.abs(Math.sin(age * 11.3 + 0.2)));
}

function skyFox(ctx, x, y, s, t, mood, action) {
  mood = mood || "happy"; action = action || "idle";
  const walk = action === "walk" || action === "run" || action === "climb";
  const stride = walk ? Math.sin(t * (action === "run" ? 9.4 : 5.6)) : Math.sin(t * 2.1) * .12;
  const bounce = walk ? Math.abs(Math.sin(t * 5.6)) * (action === "run" ? 9 : 4) : Math.sin(t * 2.4) * 2.6;
  const blink = Math.sin(t * 0.73 + 1.2) > .985;
  const talk = skyVoicePulse("EIRA", t);
  const headTilt = (action === "reach" ? -0.075 : mood === "worried" ? 0.055 : mood === "sad" ? -0.07 : action === "ring" ? -0.035 : 0) + Math.sin(t * 1.35) * 0.018;
  const glanceX = action === "reach" ? 2.4 : mood === "worried" ? Math.sin(t * 1.7) * 1.3 : action === "ring" ? 1.2 : Math.sin(t * 0.9) * 0.7;
  const stretch = action === "run" ? 1 + Math.abs(Math.sin(t * 9.4)) * 0.018 : 1 + Math.sin(t * 2.4) * 0.006;
  ctx.save(); ctx.translate(x,y+bounce); ctx.scale(s * stretch, s / stretch);
  // A separate soft shadow anchors the little character to the ground.
  skyEllipse(ctx,0,1,74,13,"rgba(30,52,65,0.22)",null);
  // Tail is drawn first and keeps the same cream tip in every shot.
  ctx.save(); ctx.rotate(Math.sin(t*2.1)*.09);
  ctx.fillStyle=skyGradient(ctx,-116,-160,-10,-35,[[0,"#8c4e54"],[.55,"#d77866"],[1,"#f2ac87"]]);
  ctx.beginPath(); ctx.moveTo(-23,-76); ctx.bezierCurveTo(-85,-75,-121,-116,-109,-165);
  ctx.bezierCurveTo(-88,-199,-37,-175,-34,-143); ctx.bezierCurveTo(-33,-119,-11,-108,-3,-89); ctx.closePath(); ctx.fill();
  skyPath(ctx,[[-101,-159],[-84,-177],[-62,-161],[-45,-134],[-65,-132],[-88,-144]],"#fff0d7",null,0);
  ctx.restore();
  // Legs and torso: the leg swing is a shared rig, not unrelated per-scene shapes.
  skyRound(ctx,-34,-61+stride*2,26,59,12,"#bd6b5f","#8d4d55",2);
  skyRound(ctx,8,-61-stride*2,26,59,12,"#bd6b5f","#8d4d55",2);
  skyEllipse(ctx,-20,-6,19,9,"#f7d3b6",null); skyEllipse(ctx,22,-6,19,9,"#f7d3b6",null);
  skyEllipse(ctx,0,-78,47,65,skyGradient(ctx,-46,-134,45,-20,[[0,"#f2a07b"],[.48,"#d77865"],[1,"#a85e5d"]]),"#914c55",2.5);
  skyEllipse(ctx,3,-73,27,43,"#f8d7bd",null);
  // Arms reach differently on the rescue and the bell-ringing shots.
  ctx.strokeStyle="#b9675d"; ctx.lineWidth=19; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(-32,-103); ctx.quadraticCurveTo(-55,-86,-46+(action==="reach"?-12:0),-63+Math.sin(t*4)*3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(31,-103); ctx.quadraticCurveTo(49,-88,47+(action==="ring"?14:0),-71+Math.sin(t*4+1)*3); ctx.stroke();
  skyEllipse(ctx,-46,-62,12,11,"#f7d8b9",null); skyEllipse(ctx,47+(action==="ring"?14:0),-71,12,11,"#f7d8b9",null);
  // Head and ear silhouette: a tiny head turn makes close-ups feel performed.
  ctx.save(); ctx.translate(0,-145); ctx.rotate(headTilt); ctx.translate(0,145);
  skyPath(ctx,[[-47,-142],[-63,-208],[-20,-177],[0,-180],[26,-179],[61,-211],[54,-141]],"#b9625e","#874650",3);
  skyPath(ctx,[[-52,-177],[-54,-197],[-34,-182]],"#f6c0a6",null,0);
  skyPath(ctx,[[34,-181],[55,-198],[49,-174]],"#f6c0a6",null,0);
  skyEllipse(ctx,0,-145,61,57,skyGradient(ctx,-48,-198,47,-91,[[0,"#f2a07e"],[.48,"#db7966"],[1,"#b9625e"]]),"#874650",2.8);
  // Cheeks and muzzle remain consistent at every angle.
  skyEllipse(ctx,-39,-129,18,12,"#efa18d",null); skyEllipse(ctx,39,-129,18,12,"#efa18d",null);
  skyEllipse(ctx,0,-121,33,22,"#ffe7d2",null);
  skyEllipse(ctx,0,-133,6.5,4.8,"#684653",null);
  const eyeH = blink ? 2 : (mood === "sad" ? 16 : 19);
  skyEllipse(ctx,-22 + glanceX,-151,8,eyeH,"#4a3c4b",null);
  skyEllipse(ctx,22 + glanceX,-151,8,eyeH,"#4a3c4b",null);
  if (!blink) {
    skyEllipse(ctx,-24 + glanceX,-158,2.9,4.2,"#ffffff",null); skyEllipse(ctx,20 + glanceX,-158,2.9,4.2,"#ffffff",null);
  }
  ctx.strokeStyle="#874650"; ctx.lineWidth=3.4; ctx.lineCap="round";
  ctx.beginPath();
  if (mood==="worried"||mood==="sad") { ctx.moveTo(-31,-172);ctx.quadraticCurveTo(-23,-178,-15,-171);ctx.moveTo(15,-171);ctx.quadraticCurveTo(23,-178,31,-172); }
  else { ctx.moveTo(-31,-174);ctx.quadraticCurveTo(-22,-168,-15,-173);ctx.moveTo(15,-173);ctx.quadraticCurveTo(22,-168,31,-174); }
  ctx.stroke();
  ctx.strokeStyle="#9b5660"; ctx.lineWidth=3;
  ctx.beginPath();
  if (mood==="sad") ctx.quadraticCurveTo(0,-101,16,-108);
  else if (mood==="worried") { ctx.moveTo(-8,-110);ctx.quadraticCurveTo(0,-105,8,-110); }
  else { ctx.moveTo(-15,-112);ctx.quadraticCurveTo(0,-100,15,-112); }
  ctx.stroke();
  if (talk > 0.24) {
    skyEllipse(ctx,0,-108,5.2 + talk * 3.2,2.8 + talk * 5.4,"#704654",null);
    skyEllipse(ctx,0,-104,3.2,1.7 + talk * 1.4,"#f0a4a0",null);
  }
  ctx.restore();
  // Teal scarf and the little satchel are signature props.
  skyRound(ctx,-32,-99,65,17,8,"#60bdb7","#3b868b",2);
  ctx.save(); ctx.translate(22,-89); ctx.rotate(-.17 + Math.sin(t*3)*.04);
  skyPath(ctx,[[0,0],[39,12],[53,47],[29,39],[5,19]],"#4ba8a9","#367f8a",2); ctx.restore();
  skyRound(ctx,36,-83,32,39,7,"#d7a56f","#8e6a6b",2);
  skyRound(ctx,41,-76,21,7,3,"#f8d9a0",null);
  if (action==="ring") {
    ctx.save(); ctx.translate(47,-120); ctx.rotate(Math.sin(t*5)*.08);
    ctx.strokeStyle="#c78e51";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-42);ctx.stroke();
    skyEllipse(ctx,0,-53,23,25,skyGradient(ctx,-20,-76,20,-28,[[0,"#fff4bb"],[.62,"#e8ba66"],[1,"#ad7950"]]),"#8a5c53",2.5);
    ctx.restore();
  }
  ctx.restore();
}
function skyMoth(ctx, x, y, s, t, glow) {
  const talk = skyVoicePulse("PIP", t);
  ctx.save(); ctx.translate(x,y+Math.sin(t*2.7)*9); ctx.scale(s,s);
  const flap=Math.sin(t*8)*.16;
  skyGlow(ctx,0,0,110,"rgba(255,226,154,0.48)",glow==null?.28:glow);
  ctx.save();ctx.rotate(-.28+flap);
  skyEllipse(ctx,-43,-24,35,49,skyGradient(ctx,-72,-65,-22,18,[[0,"#eaf8f6"],[.55,"#b8e8e0"],[1,"#80c8c9"]]),"rgba(255,255,255,0.8)",2);
  skyEllipse(ctx,-52,22,25,34,"rgba(249,231,185,0.85)","rgba(255,255,255,0.65)",1.5);
  ctx.restore();
  ctx.save();ctx.rotate(.28-flap);
  skyEllipse(ctx,43,-24,35,49,skyGradient(ctx,22,-65,72,18,[[0,"#fff0c1"],[.55,"#f4d8b0"],[1,"#d8b7d6"]]),"rgba(255,255,255,0.8)",2);
  skyEllipse(ctx,52,22,25,34,"rgba(243,213,187,0.85)","rgba(255,255,255,0.65)",1.5);
  ctx.restore();
  ctx.strokeStyle="#6a8e91";ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-10,-25);ctx.quadraticCurveTo(-26,-59,-34,-57);ctx.moveTo(10,-25);ctx.quadraticCurveTo(26,-59,34,-57);ctx.stroke();
  skyEllipse(ctx,-34,-59,6,8,"#f4dc9b",null);skyEllipse(ctx,34,-59,6,8,"#f4dc9b",null);
  skyEllipse(ctx,0,-1,26,40,skyGradient(ctx,-17,-38,20,31,[[0,"#bde9cb"],[.55,"#76c2b5"],[1,"#548d9e"]]),"#4d8290",2);
  skyEllipse(ctx,-10,-8,5,8,"#243d55",null);skyEllipse(ctx,10,-8,5,8,"#243d55",null);
  skyEllipse(ctx,-12,-12,2.2,3,"#fff",null);skyEllipse(ctx,8,-12,2.2,3,"#fff",null);
  ctx.strokeStyle="#4e8291";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-5,9);ctx.quadraticCurveTo(0,13,5,9);ctx.stroke();
  if (talk > 0.24) skyEllipse(ctx,0,11,2.5 + talk * 2.2,1.8 + talk * 2.6,"#3d6478",null);
  skyRound(ctx,-11,20,22,22,7,"#f3c96d","#9f825c",2);
  skyGlow(ctx,0,31,27,"rgba(255,231,139,0.5)",0.32);
  for(let i=0;i<5;i++){
    const a=t*1.5+i*1.2,r=50+i*9;
    skyStar(ctx,Math.cos(a)*r,Math.sin(a*1.1)*r*.62,2.7+(i%2), "#fff3c6",.5+.5*Math.sin(t*3+i));
  }
  ctx.restore();
}
function skyDragon(ctx, x, y, s, t, mood, flying) {
  const talk = skyVoicePulse("NIX", t);
  ctx.save();ctx.translate(x,y+Math.sin(t*2.8)*5);ctx.scale(s,s);
  ctx.rotate(Math.sin(t * 1.65) * (flying ? 0.026 : 0.012));
  const wing=Math.sin(t*8.5)*.22;
  // Tail and wings are behind the body, always attached at the same shoulder.
  ctx.strokeStyle="#6977bd";ctx.lineWidth=20;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(-8,-36);ctx.bezierCurveTo(-51,-4,-66,10,-95,-6);ctx.stroke();
  skyEllipse(ctx,-98,-8,10,9,"#efb5aa",null);
  ctx.save();ctx.translate(-30,-74);ctx.rotate(-.22+wing);
  skyPath(ctx,[[0,0],[-42,-43],[-67,-57],[-57,-20],[-81,-24],[-50,14],[-9,24]],"#7f8ed0","#505e9c",3);ctx.restore();
  ctx.save();ctx.translate(21,-75);ctx.rotate(.16-wing);
  skyPath(ctx,[[0,0],[45,-43],[71,-47],[56,-15],[84,-4],[48,21],[10,22]],"#99a8eb","#505e9c",3);ctx.restore();
  skyEllipse(ctx,0,-49,38,57,skyGradient(ctx,-30,-99,36,6,[[0,"#93a5e8"],[.52,"#6e7fc5"],[1,"#4a5b9b"]]),"#49558f",3);
  skyEllipse(ctx,6,-39,23,34,"#d7d7ef",null);
  // Round head and soft muzzle keep the dragon friendly rather than fierce.
  skyPath(ctx,[[-28,-92],[-42,-134],[-9,-119],[16,-122],[45,-139],[37,-91]],"#7888cf","#4e5d9d",3);
  skyEllipse(ctx,1,-105,47,40,skyGradient(ctx,-37,-143,40,-68,[[0,"#a4b0eb"],[.6,"#7e8ed1"],[1,"#6372b7"]]),"#4e5d9d",3);
  skyPath(ctx,[[-25,-130],[-31,-157],[-10,-137]],"#f2b0ad","#94647f",2);
  skyPath(ctx,[[15,-135],[34,-154],[34,-127]],"#f2b0ad","#94647f",2);
  ctx.strokeStyle = mood === "worried" ? "#4d5b98" : "#53609a";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  if (mood === "worried") { ctx.moveTo(-25,-124); ctx.lineTo(-11,-128); ctx.moveTo(9,-128); ctx.lineTo(25,-124); }
  else if (mood === "sad") { ctx.moveTo(-25,-126); ctx.lineTo(-11,-122); ctx.moveTo(9,-122); ctx.lineTo(25,-126); }
  else { ctx.moveTo(-25,-127); ctx.lineTo(-11,-125); ctx.moveTo(9,-125); ctx.lineTo(25,-127); }
  ctx.stroke();
  skyEllipse(ctx,-15,-112,7,10,"#25374f",null);skyEllipse(ctx,17,-112,7,10,"#25374f",null);
  skyEllipse(ctx,-17,-116,2.5,3.5,"#fff",null);skyEllipse(ctx,15,-116,2.5,3.5,"#fff",null);
  skyEllipse(ctx,0,-91,20,13,"#dce0f5",null);
  skyEllipse(ctx,0,-99,4,3,"#4f5684",null);
  ctx.strokeStyle="#485791";ctx.lineWidth=2.6;ctx.beginPath();
  if(mood==="sad"){ctx.moveTo(-7,-84);ctx.quadraticCurveTo(0,-89,7,-84);}
  else if(mood==="worried"){ctx.moveTo(-8,-86);ctx.quadraticCurveTo(0,-83,8,-86);}
  else{ctx.moveTo(-8,-86);ctx.quadraticCurveTo(0,-78,8,-86);}ctx.stroke();
  if (talk > 0.24) {
    skyEllipse(ctx,0,-82,4.2 + talk * 2.4,1.8 + talk * 4.4,"#505081",null);
    skyEllipse(ctx,0,-79,2.5,1.5 + talk,"#e9a6b3",null);
  }
  // Coral scarf, stitched bell strap and small cloud badge.
  skyRound(ctx,-28,-68,56,14,7,"#efa1a5","#a35f83",2);
  skyPath(ctx,[[16,-62],[45,-54],[43,-28],[21,-37]],"#ed9c9f","#a35f83",2);
  skyRound(ctx,24,-49,27,20,5,"#d7b67b","#8d76a0",2);
  skyEllipse(ctx,37,-39,4,4,"#fff1c3",null);
  if(flying){ctx.strokeStyle="rgba(255,250,230,0.55)";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-80,18);ctx.quadraticCurveTo(-106,8,-119,24);ctx.stroke();}
  ctx.restore();
}
function skyPebble(ctx, x, y, s, t, smile) {
  const talk = skyVoicePulse("PEBBLE", t);
  ctx.save();ctx.translate(x,y+Math.sin(t*2)*3);ctx.scale(s,s);
  skyEllipse(ctx,0,0,45,31,skyGradient(ctx,-37,-27,41,34,[[0,"#c9d1cb"],[.6,"#98a7ab"],[1,"#6d8290"]]),"#627989",3);
  for(let i=0;i<7;i++)skyEllipse(ctx,Math.cos(i*2.4)*29,-8+Math.sin(i*2.4)*16,4,3,"#e9e6d2",null);
  skyEllipse(ctx,-13,-4,4,6,"#2b4559",null);skyEllipse(ctx,13,-4,4,6,"#2b4559",null);
  ctx.strokeStyle="#4b6470";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-8,8);ctx.quadraticCurveTo(0,smile?15:4,8,8);ctx.stroke();
  if (talk > 0.24) skyEllipse(ctx,0,9,3.4 + talk * 2,2 + talk * 2.5,"#536974",null);
  ctx.restore();
}
function skyOwl(ctx, x, y, s, t) {
  const talk = skyVoicePulse("OWL", t);
  ctx.save();ctx.translate(x,y+Math.sin(t*1.4)*3);ctx.scale(s,s);
  skyPath(ctx,[[-52,-25],[-62,-65],[-30,-52],[-12,-63],[20,-58],[43,-71],[49,-25]],"#90759c","#5f597e",3);
  skyEllipse(ctx,0,-28,48,55,skyGradient(ctx,-35,-78,34,20,[[0,"#c5a8bc"],[.6,"#957da7"],[1,"#74688f"]]),"#625a82",3);
  skyEllipse(ctx,-17,-39,15,17,"#fff1cb",null);skyEllipse(ctx,17,-39,15,17,"#fff1cb",null);
  skyEllipse(ctx,-17,-39,6,7,"#29354d",null);skyEllipse(ctx,17,-39,6,7,"#29354d",null);
  skyPath(ctx,[[-6,-24],[6,-24],[0,-13]],"#ecb56f",null,0);
  if (talk > 0.24) skyEllipse(ctx,0,-18,3.5 + talk * 2.0,1.4 + talk * 2.8,"#70536f",null);
  ctx.strokeStyle="#7b638e";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-27,12);ctx.lineTo(-37,23);ctx.moveTo(28,12);ctx.lineTo(37,22);ctx.stroke();
  ctx.restore();
}
function skyCaption(ctx,t){
 let cue=STARTRAIN_CUES[0];for(let i=0;i<STARTRAIN_CUES.length;i++){if(STARTRAIN_CUES[i][0]<=t)cue=STARTRAIN_CUES[i];else break;}
 const next=STARTRAIN_CUES.find(c=>c[0]>cue[0]),fadeIn=skyEase(cue[0],cue[0]+.28,t),fadeOut=next?1-skyEase(next[0]-.25,next[0],t):1,alpha=fadeIn*fadeOut;
 if(alpha<=.005)return;ctx.save();ctx.globalAlpha=alpha;
 // Reserved upper safe area keeps dialogue away from faces, feet, tracks and props.
 ctx.fillStyle="rgba(13,24,45,.80)";skyRound(ctx,42,30,1060,108,16,ctx.fillStyle,"rgba(224,237,244,.32)",1.5);
 ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillStyle="#f6d9a0";ctx.font="800 16px ui-monospace,monospace";ctx.fillText(cue[1],66,54);
 ctx.fillStyle="#fff9ee";ctx.font="600 25px ui-rounded,system-ui,sans-serif";const words=cue[2].split(/\s+/),lines=[];let line="";
 for(let i=0;i<words.length;i++){const test=line?line+" "+words[i]:words[i];if(ctx.measureText(test).width>1005&&line){lines.push(line);line=words[i];}else line=test;}if(line)lines.push(line);lines.slice(0,2).forEach((str,i)=>ctx.fillText(str,66,79+i*29));ctx.restore();
}
function skyParticles(ctx, t, amount, area, hue) {
  for (let i = 0; i < amount; i++) {
    const x = (skyHash(i + 401) * area.w + t * (4 + skyHash(i + 501) * 14) * (i % 2 ? 1 : -1) + area.w) % area.w + area.x;
    const y = (skyHash(i + 601) * area.h + Math.sin(t * (0.42 + skyHash(i + 701)) + i) * 20);
    const a = 0.16 + 0.34 * (0.5 + 0.5 * Math.sin(t * 2 + i));
    ctx.fillStyle = hue.replace("ALPHA", a.toFixed(3));
    skyEllipse(ctx, x, y, 1.3 + skyHash(i + 801) * 2.4, 1.3 + skyHash(i + 901) * 2.4, ctx.fillStyle, null);
  }
}
function skyBell(ctx, x, y, s, t, glow) {
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*2.3)*.035);ctx.scale(s,s);
  skyGlow(ctx,0,0,113,"rgba(255,218,126,0.5)",glow==null?.32:glow);
  ctx.strokeStyle="#7b5c6a";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,-83);ctx.lineTo(0,-67);ctx.stroke();
  skyEllipse(ctx,0,-84,15,12,"#d0ad7c","#795b6a",2);
  ctx.fillStyle=skyGradient(ctx,-53,-57,54,48,[[0,"#fff0a8"],[0.25,"#f7d16e"],[0.6,"#d79d50"],[1,"#966c58"]]);
  ctx.beginPath();ctx.moveTo(-18,-67);ctx.quadraticCurveTo(-33,-58,-38,-18);ctx.lineTo(-51,21);
  ctx.quadraticCurveTo(-56,34,-42,36);ctx.quadraticCurveTo(0,47,42,36);ctx.quadraticCurveTo(56,34,51,21);
  ctx.lineTo(38,-18);ctx.quadraticCurveTo(33,-58,18,-67);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#fff0ba";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-23,-48);ctx.quadraticCurveTo(-33,-14,-35,13);ctx.stroke();
  skyEllipse(ctx,0,40,9,10,"#a66e4a","#77544f",2);
  skyPath(ctx,[[-13,-11],[0,-26],[13,-11],[0,4]],"#fff0b1",null,0);
  ctx.restore();
}
function skyRingNotes(ctx, x, y, t, power) {
  ctx.save();ctx.translate(x,y);
  for(let i=0;i<3;i++){
    const r=40+skyEase(0,1,(t%3)/3)*220+i*62;
    ctx.globalAlpha=(1-((t+i*.27)%1))*power*.45;
    ctx.strokeStyle=["#8de1dd","#e0c3ff","#ffe59a"][i];ctx.lineWidth=4-i*.8;
    ctx.beginPath();ctx.ellipse(0,0,r,r*.42,-.1+i*.1,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();
}
function skyFilmGrade(ctx,t){
  const g=ctx.createLinearGradient(0,0,0,1080);
  g.addColorStop(0,"rgba(255,255,255,0.035)");g.addColorStop(.55,"rgba(255,255,255,0)");
  g.addColorStop(1,"rgba(16,20,38,0.11)");ctx.fillStyle=g;ctx.fillRect(0,0,1920,1080);
  const v=ctx.createRadialGradient(960,520,330,960,520,1220);
  v.addColorStop(0,"rgba(5,8,24,0)");v.addColorStop(.82,"rgba(8,12,30,0.025)");v.addColorStop(1,"rgba(9,13,32,0.24)");
  ctx.fillStyle=v;ctx.fillRect(0,0,1920,1080);
  // Restrained cinematic mattes frame the picture without changing the 16:9 composition.
  const bars=0.5+0.5*Math.sin(Math.PI*skyEase(0,10,t));
  ctx.fillStyle="rgba(8,11,24,"+(0.10+0.05*bars)+")";ctx.fillRect(0,0,1920,25);ctx.fillRect(0,1055,1920,25);
}


/* ──────────────────────────────────────────────────────────────────────────
   CINEMATIC DIRECTOR
   The film is edited as a sequence of shots, not one static composition per
   chapter. Each key is: [story time, focus X, focus Y, lens zoom, move seconds].
   Zero-length moves are hard cuts; longer moves are motivated camera moves.
   The camera is deterministic, so frame export and timeline scrubbing agree.
   ────────────────────────────────────────────────────────────────────────── */
const STARTRAIN_SHOT_CUTS = (() => {
 const segments=[
 {start:0,shots:[[0,960,540,1,0],[4,650,625,1.2,.55],[8,430,760,1.34,.22],[13,600,590,1.28,.35],[18,1170,560,1.12,.65],[23,520,680,1.3,.25],[29,930,810,1.18,.5],[35,1210,620,1.23,.25],[40,810,680,1.12,.5],[44,960,540,1,.3]]},
 {start:46,shots:[[0,960,540,1,0],[4,1500,560,1.45,.25],[9,780,820,1.25,.2],[14,430,820,1.35,.2],[19,1300,550,1.25,.25],[24,1500,390,1.35,.25],[29,890,670,1.24,.35],[34,430,800,1.26,.2],[39,1160,640,1.25,.35],[44,960,540,1,.4]]},
 {start:96,shots:[[0,960,540,1,0],[5,380,780,1.24,.25],[10,870,800,1.35,.2],[15,1300,490,1.15,.3],[20,920,780,1.32,.2],[25,580,770,1.22,.2],[30,1390,560,1.25,.25],[35,900,800,1.28,.2],[41,570,700,1.24,.25],[47,960,540,1,.35]]},
 {start:150,shots:[[0,960,540,1,0],[5,430,780,1.2,.25],[10,980,770,1.32,.2],[15,1450,580,1.2,.25],[20,680,660,1.3,.2],[25,1020,700,1.32,.25],[30,1270,520,1.2,.2],[35,790,810,1.25,.2],[41,1240,650,1.24,.25],[47,960,540,1,.35]]},
 {start:206,shots:[[0,960,540,1,0],[5,960,420,1.18,.3],[10,450,780,1.22,.2],[15,1430,570,1.24,.25],[20,960,780,1.28,.2],[25,1120,460,1.3,.2],[30,540,760,1.24,.2],[35,1390,620,1.18,.3],[41,940,640,1.24,.2],[47,960,540,1,.35]]},
 {start:263,shots:[[0,960,540,1,0],[5,1450,540,1.2,.3],[10,500,780,1.24,.2],[15,1160,730,1.22,.2],[20,1510,470,1.25,.2],[25,830,790,1.25,.2],[30,1360,610,1.2,.3],[35,580,710,1.24,.2],[41,1120,750,1.24,.2],[47,960,540,1,.35]]},
 {start:320,shots:[[0,960,540,1,0],[5,1320,520,1.25,.2],[10,430,820,1.24,.2],[15,1010,620,1.3,.2],[20,1500,600,1.22,.2],[25,840,790,1.28,.2],[30,1050,480,1.25,.25],[35,520,810,1.2,.2],[41,1320,720,1.25,.2],[47,960,540,1,.4]]},
 {start:372,shots:[[0,960,540,1,0],[7,380,780,1.18,.3],[14,1450,560,1.2,.2],[21,860,790,1.25,.2],[28,1250,480,1.22,.2],[35,530,710,1.2,.2],[42,1130,700,1.24,.2],[49,1480,440,1.2,.2],[57,790,730,1.23,.2],[66,960,540,1,.4]]},
 {start:447,shots:[[0,960,540,1,0],[5,1370,440,1.3,.2],[10,500,780,1.22,.2],[15,960,640,1.2,.2],[20,1380,700,1.25,.2],[25,780,620,1.2,.2],[31,1210,520,1.24,.2],[37,960,780,1.2,.2],[42,960,540,1,.3]]},
 {start:490,shots:[[0,960,540,1,0],[5,960,470,1.2,.2],[10,490,810,1.24,.2],[15,1440,600,1.2,.2],[20,960,650,1.28,.2],[25,1400,470,1.2,.2],[30,700,780,1.22,.2],[34,960,540,1,.3]]},
 {start:526,shots:[[0,960,540,1,0],[5,550,780,1.22,.2],[10,1360,650,1.2,.2],[15,960,500,1.2,.2],[20,670,820,1.25,.2],[25,1250,570,1.22,.2],[30,960,500,1.24,.2],[35,570,720,1.2,.2],[40,1320,600,1.22,.2],[45,960,540,1,.3]]},
 {start:572,shots:[[0,960,540,1,0],[4,430,770,1.2,.2],[8,1340,620,1.2,.2],[12,960,500,1.16,.25],[16,700,760,1.15,.2],[20,1220,700,1.16,.2],[24,960,540,1,.35],[27,960,540,1,.3]]}
 ];
 return segments.flatMap(segment=>segment.shots.map(shot=>[segment.start+shot[0],shot[1],shot[2],shot[3],shot[4]]));
})();

function skyDirectorCamera(t) {
  let index = 0;
  for (let i = 1; i < STARTRAIN_SHOT_CUTS.length; i++) {
    if (STARTRAIN_SHOT_CUTS[i][0] <= t) index = i;
    else break;
  }
  const current = STARTRAIN_SHOT_CUTS[index];
  const previous = STARTRAIN_SHOT_CUTS[Math.max(0, index - 1)];
  const moveDuration = current[4] || 0;
  const p = index > 0 && moveDuration > 0
    ? skyEase(current[0], current[0] + moveDuration, t)
    : 1;
  const zoom = skyMix(previous[3], current[3], p);
  const rawX = skyMix(previous[1], current[1], p);
  const rawY = skyMix(previous[2], current[2], p);
  // Never expose the unpainted canvas beyond a scene edge during close-ups.
  // The focal subject can sit toward a third; the framing still stays covered.
  const halfViewW = 960 / zoom;
  const halfViewH = 540 / zoom;
  return {
    x: skyClamp(rawX, halfViewW, 1920 - halfViewW),
    y: skyClamp(rawY, halfViewH, 1080 - halfViewH),
    zoom,
    shot: index,
    shotTime: current[0]
  };
}

function skyDirectorShake(t) {
  let power = 0;
  const beats = [
    [106,112,0.9,2.4], [118,124,0.9,2.1],
    [222,258,0.85,2.6], [277,316,0.86,4.0],
    [320,326,0.8,5.0], [548,570,0.8,2.2]
  ];
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    const edge = skyEase(b[0], b[0] + 0.8, t) * (1 - skyEase(b[1] - 1.0, b[1], t));
    power = Math.max(power, edge * b[3] * (0.65 + 0.35 * Math.sin(t * b[2] * 12)));
  }
  return power;
}

/* The following effects belong to the action in each sequence. They are tied
   to story time rather than random particles, so they remain coherent when
   the viewer scrubs or exports a single frame. */
function skyCineLine(ctx, x1, y1, cx, cy, x2, y2, color, width, alpha) {
  ctx.save();
  ctx.globalAlpha = skyClamp(alpha, 0, 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.stroke();
  ctx.restore();
}
function skyCineEllipse(ctx, x, y, rx, ry, color, width, alpha, rotation) {
  ctx.save();
  ctx.globalAlpha = skyClamp(alpha, 0, 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rotation || 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
function starSky(ctx,t,top,middle,low){ctx.fillStyle=skyGradient(ctx,0,0,0,1080,[[0,top],[.56,middle],[1,low]]);ctx.fillRect(0,0,1920,1080);}
function starGround(ctx,y,topColor,sideColor){ctx.fillStyle=topColor;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(380,y-23,700,y+16,1010,y);ctx.bezierCurveTo(1350,y-18,1620,y+14,1920,y-5);ctx.lineTo(1920,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.fill();ctx.fillStyle=sideColor;ctx.beginPath();ctx.moveTo(0,y+31);ctx.lineTo(1920,y+18);ctx.lineTo(1920,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.fill();}
function starTrack(ctx,y,t,perspective,color){
 color=color||"#6d7187";ctx.save();ctx.lineCap="round";
 if(perspective){ctx.strokeStyle="#4e536b";ctx.lineWidth=24;ctx.beginPath();ctx.moveTo(930,455);ctx.lineTo(840,1080);ctx.moveTo(990,455);ctx.lineTo(1080,1080);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(930,455);ctx.lineTo(840,1080);ctx.moveTo(990,455);ctx.lineTo(1080,1080);ctx.stroke();for(let i=0;i<23;i++){const p=i/22,yy=470+p*p*610,half=30+p*90;ctx.strokeStyle="#806d74";ctx.lineWidth=3+p*8;ctx.beginPath();ctx.moveTo(960-half,yy);ctx.lineTo(960+half,yy);ctx.stroke();}}
 else{ctx.strokeStyle="#434a65";ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(0,y-8);ctx.lineTo(1920,y-8);ctx.moveTo(0,y+12);ctx.lineTo(1920,y+12);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,y-8);ctx.lineTo(1920,y-8);ctx.moveTo(0,y+12);ctx.lineTo(1920,y+12);ctx.stroke();for(let i=0;i<36;i++){const x=((i*87+t*18)%2020)-50;ctx.strokeStyle="#ad8e83";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x,y-18);ctx.lineTo(x,y+20);ctx.stroke();}}
 ctx.restore();
}
function starTrackSlope(ctx,x0,y0,x1,y1,color){
 color=color||"#d9d8d0";const dx=x1-x0,dy=y1-y0,slope=dy/dx;const yAt=x=>y0+slope*(x-x0);
 ctx.save();ctx.lineCap="round";ctx.strokeStyle="#414a62";ctx.lineWidth=18;
 for(const offset of [-8,12]){ctx.beginPath();ctx.moveTo(x0,y0+offset);ctx.lineTo(x1,y1+offset);ctx.stroke();}
 ctx.strokeStyle=color;ctx.lineWidth=5;
 for(const offset of [-8,12]){ctx.beginPath();ctx.moveTo(x0,y0+offset);ctx.lineTo(x1,y1+offset);ctx.stroke();}
 for(let x=x0+20;x<x1;x+=68){const y=yAt(x);ctx.strokeStyle="#ad8e83";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x-slope*3,y-18);ctx.lineTo(x+slope*3,y+18);ctx.stroke();}
 ctx.restore();
}
function starTrain(ctx,x,y,s,t,tilt,glow){
 ctx.save();ctx.translate(x,y+Math.sin(t*2.1)*1.8);ctx.rotate(tilt||0);ctx.scale(s,s);skyEllipse(ctx,0,8,151,12,"rgba(15,29,48,0.23)",null,0);
 for(let i=0;i<3;i++){const wx=-72+i*69;skyEllipse(ctx,wx,-11,19,19,"#28334f","#d4b38c",3);ctx.save();ctx.translate(wx,-11);ctx.rotate(t*4.4+i*.5);ctx.strokeStyle="#d8c7a4";ctx.lineWidth=3;for(let k=0;k<4;k++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,13);ctx.stroke();}ctx.restore();skyEllipse(ctx,wx,-11,5,5,"#f2ddb0",null,0);}
 skyRound(ctx,-120,-96,238,71,17,"#314c70","#1d2c4a",4);skyPath(ctx,[[-120,-78],[-145,-61],[-143,-29],[-115,-27]],"#243952","#18283f",3);
 skyRound(ctx,-91,-137,95,55,11,skyGradient(ctx,-90,-138,0,-80,[[0,"#8de0da"],[.45,"#3e97ad"],[1,"#254869"]]),"#223b5e",4);skyRound(ctx,-81,-127,25,28,5,"#fff0b1","#d9c7a0",2);skyRound(ctx,-45,-127,25,28,5,"#d2f7f1","#77b8c5",2);
 skyPath(ctx,[[69,-107],[110,-102],[130,-80],[129,-44],[92,-29],[71,-48]],"#41698a","#223b5e",4);skyEllipse(ctx,107,-74,16,14,glow===false?"#90a2b8":"#fff0a2",null,0);skyGlow(ctx,109,-74,glow===false?20:42,"rgba(255,231,153,0.52)",glow===false?.12:.45);
 skyRound(ctx,9,-91,53,34,7,"#243e60","#172a45",3);skyRound(ctx,19,-84,33,16,4,"#8ccee1","#355776",2);for(let i=0;i<3;i++)skyEllipse(ctx,-110+i*9,-148-i*10,6+i*2,5+i*2,"rgba(228,244,255,0.5)",null,0);if(glow!==false)skyGlow(ctx,-105,-109,34,"rgba(137,229,223,0.28)",.35);ctx.restore();
}
function starTrainFront(ctx,x,y,s,t){
 ctx.save();ctx.translate(x,y+Math.sin(t*2)*1.2);ctx.scale(s,s);
 skyEllipse(ctx,0,8,112,14,"rgba(7,15,29,.36)",null,0);
 // Wheels sit astride the two perspective rails, not behind the floor.
 for(const wx of [-73,73]){skyEllipse(ctx,wx,-12,22,22,"#252e44","#d9c9a6",4);skyEllipse(ctx,wx,-12,6,6,"#f1dfbd",null,0);}
 skyRound(ctx,-96,-116,192,106,28,"#304a6b","#172842",5);
 skyPath(ctx,[[-82,-112],[-68,-164],[68,-164],[82,-112]],"#4e7091","#172842",4);
 skyRound(ctx,-44,-155,88,42,12,"#7cb4c7","#e6d1a8",4);
 skyEllipse(ctx,0,-73,61,60,"#d19e69","#f0d6a4",5,0);
 skyEllipse(ctx,0,-73,47,46,skyGradient(ctx,-32,-109,32,-32,[[0,"#527997"],[.54,"#254b6a"],[1,"#132d4a"]]),"#f7e4b8",4,0);
 skyGlow(ctx,0,-74,72,"rgba(255,226,142,.62)",.65);skyEllipse(ctx,0,-74,22,22,"#fff1b0","#fff9d9",4,0);
 ctx.strokeStyle="#fff9d5";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-13,-88);ctx.lineTo(-3,-79);ctx.lineTo(-12,-65);ctx.moveTo(12,-88);ctx.lineTo(3,-79);ctx.lineTo(12,-65);ctx.stroke();
 skyRound(ctx,-77,-34,154,24,7,"#c4af91","#564b59",3);
 for(let i=0;i<3;i++)skyGlow(ctx,-80-i*12,-143-i*11,14,"rgba(225,246,255,.34)",.25);
 ctx.restore();
}
function starSignal(ctx,x,groundY,s,t,on,color){
 s=s||1;color=color||"#ffe4a1";ctx.save();ctx.translate(x,groundY);ctx.scale(s,s);ctx.strokeStyle="#4e5873";ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-222);ctx.stroke();ctx.strokeStyle="#bbc8d7";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-8,-215);ctx.stroke();skyRound(ctx,-34,-242,68,49,12,"#27344f","#b1bed2",4);skyEllipse(ctx,0,-218,17,17,on?color:"#293149",on?"#fff3cb":"#6a7186",3);skyGlow(ctx,0,-218,on?95:28,on?"rgba(255,228,156,0.55)":"rgba(141,155,196,0.15)",on?.55:.16);ctx.strokeStyle="#e0ca9c";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-27,-257);ctx.lineTo(-9,-276);ctx.lineTo(10,-257);ctx.stroke();ctx.restore();
}
function starPlankWalk(ctx,x,y,w,depth,t){
 ctx.save();ctx.fillStyle="#72575e";ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y+5);ctx.lineTo(x+w+depth,y+depth*.72);ctx.lineTo(x+depth,y+depth*.72-8);ctx.closePath();ctx.fill();ctx.fillStyle="#c29b79";ctx.beginPath();ctx.moveTo(x,y-18);ctx.lineTo(x+w,y-13);ctx.lineTo(x+w+depth,y+depth*.72-13);ctx.lineTo(x+depth,y+depth*.72-26);ctx.closePath();ctx.fill();const count=Math.max(2,Math.floor(w/48));ctx.strokeStyle="rgba(95,65,67,0.58)";ctx.lineWidth=2;for(let i=1;i<count;i++){const px=x+i*w/count;ctx.beginPath();ctx.moveTo(px,y-18);ctx.lineTo(px+depth*.1,y+depth*.72-24);ctx.stroke();}ctx.strokeStyle="#6b777d";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y-54);ctx.lineTo(x+w,y-49);ctx.moveTo(x+depth,y+depth*.72-61);ctx.lineTo(x+w+depth,y+depth*.72-56);ctx.stroke();for(let i=0;i<Math.floor(w/100);i++){const px=x+i*100+30;ctx.strokeStyle="#7a6c7c";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(px,y-16);ctx.lineTo(px,y-54);ctx.stroke();}ctx.restore();
}
function starWindLines(ctx,t,xStart,yStart,count,span,alpha,color){ctx.save();ctx.strokeStyle=color||"#d4f4ff";ctx.lineCap="round";for(let i=0;i<count;i++){const y=yStart+i*span/count+Math.sin(t*2+i)*8,x=xStart+((i*119+t*(50+i%4*11))%760);ctx.globalAlpha=alpha*(.65+.35*Math.sin(t*3+i));ctx.lineWidth=1.5+(i%3);ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+22,y-9,x+52+i%4*14,y+1);ctx.stroke();}ctx.restore();}
function starDrawNimbusTerminal(ctx,t){
 starSky(ctx,t,"#62a9e2","#c7e9f7","#f8d9b9");for(let i=0;i<5;i++){const x=150+i*390;skyCloud(ctx,x,200+(i%3)*92,.7+(i%2)*.22,"#f7fcff",t,i*2);skyCloud(ctx,x+160,355+(i%2)*66,.5,"#e5f2ff",t,i+4);}
 ctx.fillStyle="#3b5677";ctx.beginPath();ctx.moveTo(130,825);ctx.lineTo(130,425);ctx.quadraticCurveTo(130,300,265,300);ctx.quadraticCurveTo(400,300,400,425);ctx.lineTo(400,825);ctx.closePath();ctx.fill();ctx.fillStyle="#d3e4e8";ctx.beginPath();ctx.moveTo(160,820);ctx.lineTo(160,434);ctx.quadraticCurveTo(160,337,265,337);ctx.quadraticCurveTo(370,337,370,434);ctx.lineTo(370,820);ctx.closePath();ctx.fill();skyRound(ctx,188,480,154,112,14,"#233d61","#e7d0a6",4);ctx.textAlign="center";ctx.fillStyle="#f7e5b7";ctx.font="800 20px ui-monospace,monospace";ctx.fillText("NIMBUS",265,525);ctx.fillText("TERMINAL",265,554);
 ctx.fillStyle="#8395a8";ctx.fillRect(0,817,1920,263);ctx.fillStyle="#b7c2ca";ctx.fillRect(0,817,1920,16);for(let i=0;i<28;i++){ctx.strokeStyle=i%2?"#627a91":"#d3d3cb";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(i*73,836);ctx.lineTo(i*73-24,1060);ctx.stroke();}
 starTrack(ctx,805,t,false,"#c2d7db");starTrain(ctx,820,809,.82,t,.005,true);skyFox(ctx,475,814,1,t,"happy",t<34?"walk":"reach");skyMoth(ctx,552,638,.62,t,.46);skyDragon(ctx,1244,810,.87,t,"happy",false);starSignal(ctx,1537,817,.83,t,true,"#ffe5a4");
 
}
function starDrawBlackout(ctx,t){
 starSky(ctx,t,"#172342","#53617d","#b0a4b4");for(let i=0;i<5;i++){const px=i*430-80;skyPath(ctx,[[px,720],[px+70,520],[px+165,610],[px+260,380],[px+390,715],[px+460,760],[px,760]],["#30445f","#435775","#35425f"][i%3],"#6b7892",2);}for(let i=0;i<9;i++){const x=((i*257+t*15)%2300)-170,y=140+(i%4)*112;skyCloud(ctx,x,y,.82,"#aabbd3",t,i*3);}
 starGround(ctx,847,"#586b7f","#344359");starTrack(ctx,835,t,false,"#9daac1");starTrain(ctx,710,839,.78,t,0,false);skyFox(ctx,430,844,1,t,"worried","idle");skyMoth(ctx,527,663,.65,t,.23);skyDragon(ctx,1215,550,.98,t,"worried",true);starSignal(ctx,1530,846,.92,t,false);ctx.strokeStyle="rgba(225,235,251,.46)";ctx.lineWidth=3;for(let i=0;i<5;i++){const x=1000+i*29;ctx.beginPath();ctx.moveTo(x,260+Math.sin(t*2+i)*6);ctx.lineTo(x-62,332+Math.sin(t*2+i)*11);ctx.stroke();}if(t>53)starWindLines(ctx,t,900,240,14,250,.22,"#dbe7ff");
}
function starDrawMarsh(ctx,t){
 starSky(ctx,t,"#477eab","#9ac9cf","#f0dab0");for(let i=0;i<9;i++){const x=i*250-50;skyPath(ctx,[[x,770],[x+35,635+(i%3)*22],[x+115,690],[x+170,618],[x+235,770]],["#466d69","#5a8074","#718b73"][i%3],null,0);}
 ctx.fillStyle=skyGradient(ctx,0,708,0,1080,[[0,"#83c9c9"],[.55,"#3c9caa"],[1,"#256b8a"]]);ctx.fillRect(0,708,1920,372);for(let i=0;i<34;i++){const x=((i*101+t*(12+i%4*4))%2060)-60,y=740+(i%7)*43+Math.sin(t*1.2+i)*4;ctx.strokeStyle="rgba(199,249,239,.56)";ctx.lineWidth=2+(i%3);ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+25,y-4,x+48,y);ctx.stroke();}
 for(let i=0;i<14;i++){const x=i*143+35,top=640+(i%5)*30;ctx.strokeStyle="#4b8768";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x,855);ctx.quadraticCurveTo(x+Math.sin(t+i)*13,740,x+Math.sin(t+i)*19,top);ctx.stroke();skyPath(ctx,[[x,top+18],[x-18,top-12],[x+4,top-37],[x+14,top-5]],"#c7d67e",null,0);}
 // The timber deck is drawn over the reeds and water so it occludes them correctly.
 starPlankWalk(ctx,90,855,1640,115,t);starTrack(ctx,825,t,false,"#d7c6ad");starTrain(ctx,360,829,.61,t,0,true);
 skyFox(ctx,880,836,.98,t,t<122?"worried":"determined",t<108?"walk":t<130?"reach":"idle");skyMoth(ctx,955,678,.58,t,.45);skyPebble(ctx,1385,819,.72,t,t>128);skyDragon(ctx,1635,586,.7,t,"happy",true);
 for(let i=0;i<9;i++){const x=260+i*170,y=1000+(i%3)*18;skyEllipse(ctx,x,y,32+((t*20+i*27)%60),6,"rgba(213,250,242,.24)",null,0);}
}
function starDrawWoodMaze(ctx,t){
 starSky(ctx,t,"#263a59","#526f83","#96b1b0");for(let i=0;i<13;i++){const x=i*170-35,h=330+(i%4)*80,w=36+(i%3)*15;ctx.fillStyle=skyGradient(ctx,x-w,0,x+w,0,[[0,"#182e43"],[.5,"#53645f"],[1,"#223a4a"]]);ctx.beginPath();ctx.moveTo(x-w,1080);ctx.lineTo(x-w*.45,1080-h);ctx.quadraticCurveTo(x,1080-h-70,x+w*.5,1080-h);ctx.lineTo(x+w,1080);ctx.closePath();ctx.fill();skyPath(ctx,[[x-112,1080-h+80],[x-78,1080-h-5],[x-20,1080-h+24],[x+28,1080-h-26],[x+94,1080-h+89]],["#365f67","#3e716d","#527d72"][i%3],null,0);}
 ctx.fillStyle="#4d515f";ctx.beginPath();ctx.moveTo(0,1080);ctx.lineTo(0,940);ctx.bezierCurveTo(310,865,420,925,615,874);ctx.bezierCurveTo(795,821,835,900,1040,875);ctx.bezierCurveTo(1290,842,1500,903,1920,828);ctx.lineTo(1920,1080);ctx.closePath();ctx.fill();ctx.strokeStyle="#a6a18a";ctx.lineWidth=20;ctx.beginPath();ctx.moveTo(0,936);ctx.bezierCurveTo(310,861,420,921,615,870);ctx.bezierCurveTo(795,817,835,896,1040,871);ctx.bezierCurveTo(1290,838,1500,899,1920,824);ctx.stroke();ctx.strokeStyle="#c8b38c";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,922);ctx.bezierCurveTo(310,847,420,907,615,856);ctx.bezierCurveTo(795,803,835,882,1040,857);ctx.bezierCurveTo(1290,824,1500,885,1920,810);ctx.stroke();
 starTrain(ctx,365,886,.48,t,0,false);skyFox(ctx,930,870,1,t,"worried",t<189?"idle":"walk");skyMoth(ctx,1035,686,.63,t,.47);skyOwl(ctx,1390,707,.85,t);for(let i=0;i<7;i++){const x=570+i*86,y=839+Math.sin(i*.8)*20;skyGlow(ctx,x,y,38,"rgba(180,241,199,.3)",.28);skyStar(ctx,x,y,4,"#e4ffc9",.75);}starWindLines(ctx,t,100,410,11,240,.17,"#d1e5c9");
}
function starDrawIceViaduct(ctx,t){
 starSky(ctx,t,"#507eb4","#c7e0ee","#f7e1d4");for(let i=0;i<6;i++){const x=i*360-80;skyPath(ctx,[[x,790],[x+95,570],[x+180,640],[x+250,390+(i%2)*80],[x+350,790]],["#829fb9","#a3bacb","#738ead"][i%3],"rgba(245,251,255,.68)",3);skyPath(ctx,[[x+180,640],[x+250,390+(i%2)*80],[x+286,660]],"rgba(223,248,255,.55)",null,0);}
 ctx.fillStyle="#dcebf0";ctx.fillRect(0,805,1920,275);ctx.fillStyle="#839eb7";ctx.fillRect(0,890,1920,190);for(let i=0;i<32;i++){const x=i*63;ctx.strokeStyle="#c4d9e5";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,895);ctx.lineTo(x+18,1055);ctx.stroke();}
 starTrack(ctx,793,t,false,"#e5f8ff");starTrain(ctx,970,797,.7,t,Math.sin(t*.45)*.012,true);skyFox(ctx,440,802,.82,t,"determined",t<220?"walk":"reach");skyMoth(ctx,515,655,.55,t,.48);skyDragon(ctx,1290,478,.92,t,t<232?"worried":"happy",true);starSignal(ctx,1530,798,.63,t,true,"#c9edff");starWindLines(ctx,t,1020,320,17,210,.28,"#f0fbff");if(t>226&&t<258){const p=skyEase(226,258,t);for(let i=0;i<14;i++){const x=690+i*40,y=880+(i%3)*10;skyGlow(ctx,x,y,14,"rgba(204,246,255,.55)",p*.48);skyStar(ctx,x,y,2.5,"#fff",p*.8);}}
}
function starDrawSkyMarket(ctx,t){
 starSky(ctx,t,"#64a6dc","#d1f0f5","#ffe2bc");
 for(let i=0;i<7;i++){const x=i*310-50,y=450+(i%3)*78,scale=.72+(i%4)*.08;skyFloatingIsland(ctx,x+120,y,scale,t,["#7fb7a2","#a2cfc0","#74aaad"][i%3]);skyHouse(ctx,x+120,y-25,.42,t,true,["#efc9a8","#c6d8e8","#e6c1d7"][i%3]);}
 // The rail follows the single raised platform; no second walkway overlays the track.
 ctx.fillStyle="#617e9a";ctx.beginPath();ctx.moveTo(0,812);ctx.lineTo(1920,765);ctx.lineTo(1920,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.fill();
 ctx.fillStyle="#b9d2d8";ctx.beginPath();ctx.moveTo(0,800);ctx.lineTo(1920,753);ctx.lineTo(1920,789);ctx.lineTo(0,837);ctx.closePath();ctx.fill();
 starTrackSlope(ctx,0,800,1920,753,"#d9d8d0");
 const trainX=1150,trackY=800+(753-800)*(trainX/1920);
 starTrain(ctx,trainX,trackY+4,.67,t,Math.atan2(-47,1920),true);
 for(let i=0;i<9;i++){const x=110+i*207,y=667+(i%3)*42;ctx.strokeStyle="#806b89";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+108);ctx.stroke();skyPath(ctx,[[x,y+2],[x+48,y+17],[x,y+36]],["#f1c1c7","#bfe1ef","#f3dda2"][i%3],"#fdf0d1",2);}
 skyFox(ctx,550,795,.86,t,t<302?"determined":"happy",t<306?"run":"reach");
 skyMoth(ctx,646,630,.56,t,.5);skyDragon(ctx,1540,565,.84,t,"worried",true);starWindLines(ctx,t,1100,360,12,245,.17,"#fff2d6");
 if(t>302&&t<318){const a=1-skyEase(312,318,t);for(let i=0;i<6;i++)skyCineLine(ctx,1000+i*28,550,970+i*31,500,935+i*33,"#fff3d4",2,a*.6);}
}
function starDrawEngineRoom(ctx,t){
 starSky(ctx,t,"#16253e","#263c59","#4c5f75");for(let i=0;i<9;i++){const x=i*245-35;ctx.fillStyle=i%2?"#293e59":"#31465e";ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+65,0);ctx.lineTo(x+130,775);ctx.lineTo(x+35,775);ctx.closePath();ctx.fill();ctx.strokeStyle="#77889a";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+35,40);ctx.lineTo(x+88,755);ctx.stroke();for(let j=0;j<5;j++)skyEllipse(ctx,x+54,120+j*125,4,4,"#e4c994",null,0);}
 for(let g=0;g<5;g++){const x=250+g*345,y=390+(g%2)*80,r=100+(g%3)*20;ctx.save();ctx.translate(x,y);ctx.rotate(t*(g%2?.18:-.14));ctx.strokeStyle="#ad9c89";ctx.lineWidth=17;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.strokeStyle="#5d8e9a";ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,0,r-18,0,Math.PI*2);ctx.stroke();for(let k=0;k<12;k++){ctx.rotate(Math.PI/6);ctx.fillStyle="#cfb895";ctx.fillRect(r-9,-9,24,18);}skyEllipse(ctx,0,0,19,19,"#f0d4a4","#7f7d83",4,0);ctx.restore();}
 ctx.fillStyle="#687c8d";ctx.fillRect(0,735,1920,345);ctx.fillStyle="#9faeb8";ctx.fillRect(0,754,1920,56);starTrack(ctx,723,t,false,"#d2c5a6");starTrain(ctx,1010,727,.73,t,0,false);skyFox(ctx,440,732,.89,t,"determined",t<355?"reach":"idle");skyMoth(ctx,523,589,.56,t,.42);skyDragon(ctx,1510,735,.81,t,t<366?"worried":"happy",false);skyRound(ctx,795,500,260,180,18,"#1c314a","#bdc6cb",5);skyRound(ctx,824,524,202,130,12,"#253b50","#83cbd4",3);for(let i=0;i<3;i++){const pulse=.5+.5*Math.sin(t*3+i);skyGlow(ctx,870+i*55,584,14,"rgba(133,232,218,.55)",pulse*.7);skyEllipse(ctx,870+i*55,584,7,7,["#8fe7db","#ffd995","#b9d9ff"][i],null,0);}starWindLines(ctx,t,760,325,7,60,.23,"#bceff0");if(t>338&&t<368){const p=skyEase(342,350,t);skyCineLine(ctx,876,588,955,540,1015,588,"#fff0b6",5,p*.75);skyCineLine(ctx,875,602,950,650,1015,600,"#9ce7e3",3,p*.65);}
}
function starDrawWindmillCanyon(ctx,t){
 starSky(ctx,t,"#5d96c6","#d6e6e9","#f5d6b8");for(let i=0;i<8;i++){const x=i*275-40,base=785-(i%3)*40;skyPath(ctx,[[x,base],[x+80,base-250-(i%2)*80],[x+140,base-135],[x+215,base-330],[x+275,base]],["#536d83","#708c9a","#8e9eaa"][i%3],"#b3c6ca",3);}
 ctx.fillStyle="#7f8f91";ctx.fillRect(0,800,1920,280);ctx.fillStyle="#c4b59a";ctx.fillRect(0,824,1920,57);starTrack(ctx,788,t,false,"#e5d3b8");for(let i=0;i<4;i++){const x=240+i*465,base=817,hubY=360+(i%2)*75,rot=t*.22+i*.85;ctx.strokeStyle="#685b61";ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(x,base);ctx.lineTo(x,hubY);ctx.stroke();ctx.save();ctx.translate(x,hubY);ctx.rotate(rot);for(let k=0;k<4;k++){ctx.rotate(Math.PI/2);ctx.fillStyle="#e1d3b9";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(13,-18);ctx.lineTo(26,-178);ctx.lineTo(-14,-165);ctx.closePath();ctx.fill();ctx.strokeStyle="#8c9da0";ctx.lineWidth=3;ctx.stroke();}skyEllipse(ctx,0,0,20,20,"#ffe2a2","#786c73",3,0);ctx.restore();}
 starTrain(ctx,825,792,.7,t,Math.sin(t*.7)*.016,true);skyFox(ctx,435,797,.86,t,"determined",t<410?"reach":"walk");skyMoth(ctx,516,650,.55,t,.46);skyDragon(ctx,1300,486,.91,t,"happy",true);starWindLines(ctx,t,540,300,22,165,.4,"#d4f6ff");if(t>407&&t<439){const p=skyEase(409,420,t);for(let i=0;i<13;i++){const x=730+i*39,y=845+Math.sin(i*.8+t)*13;skyCineLine(ctx,x-80,y-30,x-20,y-8,x+32,y,"#b0f6ed",3,p*.52);skyGlow(ctx,x,y,19,"rgba(151,246,221,.35)",p*.5);}}
}
function starDrawObservatory(ctx,t){
 starSky(ctx,t,"#111b3d","#293d68","#5f688d");for(let i=0;i<145;i++)skyStar(ctx,skyHash(i+522)*1920,skyHash(i+177)*715,1.2+skyHash(i+829)*2.2,"#e5eaff",.4+.6*Math.sin(t+i)*.5);
 ctx.fillStyle="#2b3b60";ctx.beginPath();ctx.moveTo(220,780);ctx.lineTo(220,420);ctx.quadraticCurveTo(960,-160,1700,420);ctx.lineTo(1700,780);ctx.closePath();ctx.fill();ctx.strokeStyle="#9caed4";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(220,780);ctx.lineTo(220,420);ctx.quadraticCurveTo(960,-160,1700,420);ctx.lineTo(1700,780);ctx.stroke();ctx.strokeStyle="rgba(190,211,255,.45)";ctx.lineWidth=3;for(let i=0;i<9;i++){ctx.beginPath();ctx.moveTo(280+i*165,420);ctx.lineTo(280+i*165,775);ctx.stroke();}
 ctx.fillStyle="#7888a1";ctx.beginPath();ctx.moveTo(130,745);ctx.lineTo(1790,745);ctx.lineTo(1920,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.fill();ctx.fillStyle="#344d71";ctx.beginPath();ctx.ellipse(960,846,650,190,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#c4d2dd";ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(960,846,650,190,0,0,Math.PI*2);ctx.stroke();ctx.save();ctx.translate(960,846);ctx.rotate(t*.03);for(let r=0;r<4;r++){ctx.strokeStyle=["#f1d7a6","#b7dff2","#d6c4f5","#9ee7da"][r];ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,130+r*120,48+r*37,0,0,Math.PI*2);ctx.stroke();}for(let i=0;i<16;i++){const a=i*Math.PI/8,x=Math.cos(a)*515,y=Math.sin(a)*145;skyStar(ctx,x,y,4,"#fff0bb",.9);}ctx.restore();
 ctx.save();ctx.translate(1420,645);ctx.rotate(-.36);skyRound(ctx,-21,-114,42,225,12,"#bcab90","#49516e",4);skyRound(ctx,-33,-143,66,45,12,"#7b9bb7","#d7e0e8",3);skyEllipse(ctx,0,-143,24,16,"#bde5f0","#f2e8d0",3,0);ctx.restore();
 starTrain(ctx,295,942,.43,t,0,false);skyFox(ctx,690,806,.87,t,"determined",t<480?"reach":"idle");skyMoth(ctx,775,661,.5,t,.45);skyOwl(ctx,1530,752,.72,t);skyDragon(ctx,1150,624,.67,t,"happy",true);
}
function starDrawStormTunnel(ctx,t){
 starSky(ctx,t,"#0d1830","#1b2d49","#37455c");const vx=960,vy=395;for(let i=0;i<12;i++){const k=i/11,x=160+k*1600,topY=vy-165*(1-Math.abs(.5-k)*2),bottomY=730+Math.abs(.5-k)*180;ctx.strokeStyle=i%2?"#344a66":"#65748a";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(vx,vy-60);ctx.quadraticCurveTo(x,vy+60,x,bottomY);ctx.stroke();ctx.strokeStyle="rgba(147,181,207,.38)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(vx,vy-60);ctx.lineTo(x,bottomY);ctx.stroke();ctx.fillStyle="#3d4c62";ctx.beginPath();ctx.moveTo(x-26,bottomY);ctx.lineTo(x-18,topY);ctx.lineTo(x+18,topY);ctx.lineTo(x+26,bottomY);ctx.closePath();ctx.fill();}
 ctx.fillStyle="#263851";ctx.fillRect(0,710,1920,370);ctx.fillStyle="#7e8b98";ctx.beginPath();ctx.moveTo(1380,760);ctx.lineTo(1920,770);ctx.lineTo(1920,1080);ctx.lineTo(1490,1080);ctx.closePath();ctx.fill();ctx.strokeStyle="#d2c3a7";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(1390,778);ctx.lineTo(1920,787);ctx.stroke();starTrack(ctx,930,t,true,"#a3c4dc");starTrainFront(ctx,960,816,.96,t);skyFox(ctx,1640,765,.84,t,"worried","idle");skyMoth(ctx,1705,681,.5,t,.58);skyDragon(ctx,1180,570,.68,t,"determined",true);for(let i=0;i<17;i++){const x=960+Math.cos(i*2.399+t*.15)*(45+(t*14+i*33)%650),y=475+Math.sin(i*2.399+t*.15)*(23+(t*8+i*19)%210);skyStar(ctx,x,y,2,"#d5e9ff",.48);}starWindLines(ctx,t,1010,450,20,24,.28,"#b9e2ff");
}
function starDrawMoonfallGap(ctx,t){
 starSky(ctx,t,"#24305f","#6b75a2","#e1c5c0");for(let i=0;i<6;i++){const x=i*350-100;skyPath(ctx,[[x,790],[x+120,560],[x+230,690],[x+310,480],[x+380,800]],["#3b526e","#566988","#6e7e9a"][i%3],"rgba(214,222,246,.52)",3);}
 ctx.fillStyle="#5d6e83";ctx.beginPath();ctx.moveTo(0,780);ctx.lineTo(740,800);ctx.lineTo(870,860);ctx.lineTo(870,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.fill();ctx.fillStyle="#9aa5a8";ctx.beginPath();ctx.moveTo(0,760);ctx.lineTo(740,780);ctx.lineTo(870,840);ctx.lineTo(0,820);ctx.closePath();ctx.fill();
 ctx.fillStyle="#43516d";ctx.beginPath();ctx.moveTo(1210,820);ctx.lineTo(1330,760);ctx.lineTo(1920,730);ctx.lineTo(1920,1080);ctx.lineTo(1210,1080);ctx.closePath();ctx.fill();ctx.fillStyle="#a0aeb3";ctx.beginPath();ctx.moveTo(1210,800);ctx.lineTo(1330,740);ctx.lineTo(1920,710);ctx.lineTo(1920,790);ctx.lineTo(1320,820);ctx.closePath();ctx.fill();
 // Rails terminate on the cliff tops, with a clear gap between their ends.
 ctx.strokeStyle="#3d455d";ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(0,748);ctx.lineTo(740,768);ctx.lineTo(840,814);ctx.moveTo(1230,778);ctx.lineTo(1330,728);ctx.lineTo(1920,698);ctx.stroke();ctx.strokeStyle="#d6c4aa";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,748);ctx.lineTo(740,768);ctx.lineTo(840,814);ctx.moveTo(1230,778);ctx.lineTo(1330,728);ctx.lineTo(1920,698);ctx.stroke();for(let i=0;i<16;i++){const x=i*49,y=748+x*20/740;ctx.strokeStyle="#beaa94";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y-18);ctx.lineTo(x,y+20);ctx.stroke();}for(let x=1245;x<1910;x+=52){const surfaceY=x<1330?790-(x-1230)*.5:740-(x-1330)*30/590,trackY=surfaceY-12;ctx.strokeStyle="#beaa94";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,trackY-18);ctx.lineTo(x,trackY+20);ctx.stroke();}
 starTrain(ctx,575,767,.62,t,0,false);skyFox(ctx,275,764,.83,t,"determined","reach");skyMoth(ctx,357,612,.5,t,.52);skyDragon(ctx,1100,530,.82,t,"determined",true);starSignal(ctx,1530,733,.58,t,true,"#e2f4ff");if(t>548){const p=skyEase(548,566,t);ctx.save();ctx.globalAlpha=p;ctx.lineCap="round";ctx.strokeStyle="rgba(124,218,228,.28)";ctx.lineWidth=38;ctx.beginPath();ctx.moveTo(840,814);ctx.bezierCurveTo(960,800,1110,790,1230,778);ctx.stroke();const g=ctx.createLinearGradient(840,814,1230,778);g.addColorStop(0,"#fff0ac");g.addColorStop(.55,"#9ce4e6");g.addColorStop(1,"#d1c4ff");ctx.strokeStyle=g;ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(840,814);ctx.bezierCurveTo(960,800,1110,790,1230,778);ctx.stroke();for(let i=0;i<13;i++){const p2=i/12,x=840+p2*390,y=814-p2*36+Math.sin(p2*Math.PI)*8;skyGlow(ctx,x,y,25,"rgba(255,235,169,.48)",p*.5);skyStar(ctx,x,y,3.5,"#fff3bf",p);}ctx.restore();}
}
function starDrawFirstLightHarbor(ctx,t){
 starSky(ctx,t,"#e39b92","#f4d5b3","#a8d4d0");skyGlow(ctx,1470,195,210,"rgba(255,228,161,.46)",.35);skyEllipse(ctx,1470,195,71,71,skyGradient(ctx,1435,155,1510,235,[[0,"#fff6c6"],[1,"#ffbf86"]]),null,0);for(let i=0;i<7;i++)skyCloud(ctx,i*330-50,260+(i%3)*70,.5+(i%3)*.1,"#fff0e1",t,i);
 for(let i=0;i<8;i++)skyHouse(ctx,i*250+30,520+(i%3)*38,.56+(i%3)*.04,t,true,["#f0c6ae","#d4d9ef","#c1e4de"][i%3]);ctx.fillStyle="#728e9b";ctx.fillRect(0,807,1920,273);ctx.fillStyle="#c3c3bb";ctx.fillRect(0,807,1920,18);for(let i=0;i<28;i++){ctx.strokeStyle="#8ca2a8";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(i*74,828);ctx.lineTo(i*74-28,1060);ctx.stroke();}starTrack(ctx,942,t,false,"#f3e1c1");starTrack(ctx,795,t,false,"#f3e1c1");starTrain(ctx,920,799,.83,t,.004,true);skyFox(ctx,450,804,.94,t,"happy","idle");skyMoth(ctx,536,638,.58,t,.47);skyDragon(ctx,1310,799,.83,t,"happy",false);starSignal(ctx,1550,807,.73,t,true,"#fff0b1");for(let i=0;i<24;i++)skyLantern(ctx,80+i*75,500+Math.sin(i*1.7)*62,.34+(i%3)*.04,["#ffe1a1","#bfeaf1","#e6c5f2"][i%3],t,i+95);
 if(t>588){ctx.save();ctx.globalAlpha=skyEase(588,593,t);skyRound(ctx,535,292,850,175,26,"rgba(18,34,61,.76)","rgba(255,241,203,.72)",2);ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#fff1cb";ctx.font="900 47px ui-rounded,system-ui,sans-serif";ctx.fillText("THE LAST STAR TRAIN",960,359);ctx.fillStyle="#cdeaf0";ctx.font="700 18px ui-monospace,monospace";ctx.fillText("THE ROUTE IS OURS TO SHARE",960,411);ctx.restore();}
}
function starDrawSceneAction(ctx,t){
 if(t>=48&&t<96){const p=skyEase(50,57,t)*(1-skyEase(84,93,t));ctx.save();ctx.globalAlpha=p*.6;ctx.strokeStyle="#d7e7ff";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(1450,120);ctx.lineTo(1350,235);ctx.lineTo(1395,305);ctx.lineTo(1270,416);ctx.stroke();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(1450,120);ctx.lineTo(1350,235);ctx.lineTo(1395,305);ctx.lineTo(1270,416);ctx.stroke();ctx.restore();}
 if(t>=103&&t<142){const p=skyEase(110,120,t);for(let i=0;i<7;i++)skyCineEllipse(ctx,780+i*145,984+i%3*13,22+p*48,5,"#c7fff0",2,p*.34,0);}
 if(t>=168&&t<205){const p=skyEase(172,188,t)*(1-skyEase(197,205,t));for(let i=0;i<12;i++){const x=500+i*83,y=823+Math.sin(t*.8+i)*28;skyGlow(ctx,x,y,17,"rgba(187,246,195,.34)",p*.48);skyStar(ctx,x,y,2.8,"#edffd2",p*.8);}}
 if(t>=215&&t<261)starWindLines(ctx,t,720,300,16,235,.34,"#e9fbff");
 if(t>=276&&t<320){const p=skyEase(278,287,t)*(1-skyEase(313,319,t));for(let i=0;i<8;i++){const x=((i*241+t*80)%2080)-80,y=360+i%4*85;skyCineLine(ctx,x,y,x+35,y-19,x+104,y+3,["#ffdfb0","#c7e7ff","#f1c5df"][i%3],3,p*.58);}}
 if(t>=340&&t<370){const p=skyEase(345,355,t)*(1-skyEase(364,370,t));for(let i=0;i<12;i++){const x=820+i*23,y=576+Math.sin(t+i)*22;skyGlow(ctx,x,y,13,"rgba(150,242,228,.4)",p*.7);skyStar(ctx,x,y,2.5,"#dffffa",p);}}
 if(t>=388&&t<444)starWindLines(ctx,t,560,280,24,160,.42,"#d8faff");
 if(t>=454&&t<488){const p=skyEase(458,469,t)*(1-skyEase(482,488,t));ctx.save();ctx.globalAlpha=p*.56;ctx.strokeStyle="#f7dfa2";ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(960,846,270+(t-454)*23,76+(t-454)*8,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle="#bddfff";ctx.beginPath();ctx.ellipse(960,846,410+(t-454)*18,112+(t-454)*6,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 if(t>=493&&t<526)starWindLines(ctx,t,965,450,24,20,.24,"#b5dfff");
 if(t>=548&&t<572){const p=skyEase(548,565,t);for(let i=0;i<14;i++){const x=800+i*39,y=800-i%5*17;skyGlow(ctx,x,y,21,"rgba(255,237,171,.34)",p*.6);skyStar(ctx,x,y,3,"#fff0bd",p);}}
}

function renderFrame(time, frame, fps, ctx, width, height, motion) {
 const t=skyClamp(Number.isFinite(time)?time:(frame||0)/Math.max(1,fps||STARTRAIN_FPS),0,STARTRAIN_DURATION);
 const scale=Math.min(width/1920,height/1080),ox=(width-1920*scale)/2,oy=(height-1080*scale)/2;
 ctx.save();ctx.fillStyle="#111b35";ctx.fillRect(0,0,width,height);ctx.translate(ox,oy);ctx.scale(scale,scale);
 const camera=skyDirectorCamera(t),shake=skyDirectorShake(t);
 ctx.save();ctx.translate(960+Math.sin(t*31.7)*shake,540+Math.cos(t*26.3)*shake*.58);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);
 if(t<46)starDrawNimbusTerminal(ctx,t);
 else if(t<96)starDrawBlackout(ctx,t);
 else if(t<150)starDrawMarsh(ctx,t);
 else if(t<206)starDrawWoodMaze(ctx,t);
 else if(t<263)starDrawIceViaduct(ctx,t);
 else if(t<320)starDrawSkyMarket(ctx,t);
 else if(t<372)starDrawEngineRoom(ctx,t);
 else if(t<447)starDrawWindmillCanyon(ctx,t);
 else if(t<490)starDrawObservatory(ctx,t);
 else if(t<526)starDrawStormTunnel(ctx,t);
 else if(t<572)starDrawMoonfallGap(ctx,t);
 else starDrawFirstLightHarbor(ctx,t);
 starDrawSceneAction(ctx,t);ctx.restore();
 let fade=0;for(let i=1;i<STARTRAIN_SCENES.length-1;i++){const d=Math.abs(t-STARTRAIN_SCENES[i]);if(d<.68)fade=Math.max(fade,.9*(1-d/.68));}
 if(fade>.01){ctx.fillStyle="rgba(8,12,29,"+fade.toFixed(3)+")";ctx.fillRect(0,0,1920,1080);}
 skyFilmGrade(ctx,t);skyCaption(ctx,t);ctx.restore();
}
if (typeof window !== "undefined" && !window.TRILYVA_STARTRAIN_STORY) {
  window.TRILYVA_STARTRAIN_STORY = {
    title: "The Last Star Train",
    duration: STARTRAIN_DURATION,
    fps: STARTRAIN_FPS,
    width: 3840,
    height: 2160,
    chapters: STARTRAIN_CHAPTERS,
    cues: STARTRAIN_CUES,
    renderFrame: renderFrame
  };
}

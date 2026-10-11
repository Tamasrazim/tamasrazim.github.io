/* THE SKYROOT BELL — an original ten-minute fantasy cartoon for TRILYVA.
   1920×1080 vector stage, deterministic frame rendering, no external assets.
   Every frame is derived from time; scrubbing and export produce the same pose. */

const SKYROOT_DURATION = 600;
const SKYROOT_FPS = 30;
const SKYROOT_SIZE = { width: 1920, height: 1080 };
const SKYROOT_CHAPTERS = [
  { time: 0,   title: "LUMENREACH",          note: "A village preparing for its lantern festival." },
  { time: 46,  title: "THE MISSING BELL",    note: "The Skyroot's light begins to fade." },
  { time: 96,  title: "SINGING BROOK",       note: "A small rescue reveals the first note." },
  { time: 150, title: "WHISPERWOOD",         note: "Eira finds courage in a familiar sound." },
  { time: 206, title: "THE CRYSTAL RIDGE",   note: "A little dragon flies away with the bell." },
  { time: 263, title: "THE SKY MARKET",     note: "A playful chase across floating islands." },
  { time: 320, title: "CLOUDREST",           note: "The missing bell has a reason for leaving." },
  { time: 372, title: "A LIGHT TO SHARE",    note: "A small kindness changes the plan." },
  { time: 425, title: "THE WAY BACK",        note: "The friends return before the final lantern fades." },
  { time: 476, title: "THREE NOTES",         note: "The village helps the Skyroot remember its song." },
  { time: 526, title: "THE SKYROOT WAKES",   note: "A new bridge of light reaches every home." },
  { time: 572, title: "LANTERN NIGHT",       note: "No one has to watch the lights from far away." }
];

const SKYROOT_CUES = [
 [2, "NARRATOR", "In Lumenreach, paths grew from the roots of one enormous tree, and lanterns glowed in every little window."],
 [10, "EIRA", "Pip, look! The lanterns are waking up!"],
 [17, "PIP", "They always sparkle before the Skyroot Bell rings."],
 [25, "NARRATOR", "Eira was a young fox learning to tend the glowing gardens. Her little moth friend, Pip, carried a lantern no bigger than an apple."],
 [37, "EIRA", "This year, I get to ring the bell. I have practised all week!"],
 [47, "NARRATOR", "Then, just as the first lanterns lifted, the bell's golden note never came. Its place in the branches was empty."],
 [56, "PIP", "Eira... the roots are going dark."],
 [64, "EIRA", "Then we find the bell before the last lantern fades. Come on!"],
 [75, "NARRATOR", "A silver echo drifted from the tree, curled over the hills, and slipped toward Singing Brook."],
 [86, "PIP", "The sound is faint, but I can follow it."],
 [97, "NARRATOR", "At the brook, a tiny pebble-sprite was stuck beneath a fallen branch. The water was rising around its little stone feet."],
 [106, "EIRA", "Hold still, little one. We will move the branch together."],
 [116, "PIP", "I'll light the underside so you can see where to lift."],
 [127, "NARRATOR", "Eira pushed, Pip shone, and the branch rolled away. The pebble-sprite's shell rang like a small silver cup."],
 [137, "PEBBLE", "That is the brook's first note. Take it with you. A kind hand makes a clear sound."],
 [148, "EIRA", "One note down. Two friends, one little plan."],
 [151, "NARRATOR", "The echo led them into Whisperwood, where mist wrapped around old trees and every footstep came back as a whisper."],
 [162, "EIRA", "I know these paths... so why do they feel so strange?"],
 [171, "PIP", "Because the wood repeats what we fear. Listen for what is real."],
 [181, "NARRATOR", "The shadows shaped themselves into tall, wobbly pictures. One whispered that Eira was too small to help a whole village."],
 [192, "EIRA", "Maybe I'm small. But I can still take the next step."],
 [201, "OWL", "And that is what courage sounds like. Here, carry this leaf-feather's note."],
 [208, "NARRATOR", "Beyond the trees, crystal cliffs caught the last warm light. High above them, a little blue dragon flew with a golden bell tied to his cloud-skiff."],
 [218, "EIRA", "There! The Skyroot Bell! He's taking it away!"],
 [228, "NIX", "Just a little farther. Then my home will finally shine."],
 [239, "PIP", "He cannot hear us over that rattly sail. We will have to catch up."],
 [251, "NARRATOR", "Eira and Pip followed the bell's bright reflections up a winding stair of floating stone."],
 [264, "NARRATOR", "They reached the Sky Market, a cheerful jumble of cloud boats, ribbon stalls, and islands that bobbed like boats on a gentle sea."],
 [275, "EIRA", "Excuse me! Small dragon with the very important bell!"],
 [284, "NIX", "I'm not giving it back! I need its light!"],
 [294, "PIP", "Then please slow down so we can talk!"],
 [305, "NARRATOR", "Nix banked around a tower of folded kites. Eira hopped from one floating path to the next, while Pip looped between the fluttering ribbons."],
 [316, "EIRA", "We are not trying to take your light. We want to understand!"],
 [322, "NARRATOR", "A soft cloudbank caught the skiff like a feather pillow. The bell rolled safely into a nest of cushions, and all three landed in Cloudrest."],
 [334, "NIX", "You can stop chasing me. This is my home."],
 [344, "EIRA", "It's beautiful... but every window is dark."],
 [354, "NIX", "The lanterns in Lumenreach shine all night. Nobody noticed that our side of the clouds was dark, so I borrowed the bell."],
 [366, "PIP", "The bell calls the Skyroot to share its light. It cannot shine properly while it is away."],
 [374, "NIX", "I thought the village had so much light that it would not miss one bell."],
 [384, "EIRA", "We should have looked beyond our own windows. But taking the bell made every root dim."],
 [395, "NIX", "I did not mean to hurt anyone. I only wanted my little house to glow."],
 [405, "EIRA", "Then let's find a way to light your home without leaving everyone else in darkness."],
 [416, "NARRATOR", "Eira opened her satchel and placed a tiny glow-seed in Nix's paws. Its light was small, but it warmed the whole cloud nook."],
 [428, "NIX", "You would share your last seed with me?"],
 [437, "EIRA", "It is not my last. And tomorrow we can plant more, together."],
 [447, "NIX", "I am sorry I took the bell. I'll help you bring it home."],
 [458, "PIP", "Then we need the brook's note, the leaf-feather's note, and the crystal wind-note. All three can wake the roots."],
 [470, "NARRATOR", "Nix tuned a tiny crystal sail to catch the ridge's singing wind, then guided his skiff back toward Lumenreach."],
 [479, "NARRATOR", "The way home was dimmer than before. Glowing vines had curled up, and floating bridges hung quiet between the islands."],
 [490, "EIRA", "We are back. But the Skyroot looks lonelier than ever."],
 [500, "NIX", "I brought the bell home. I am ready to make this right."],
 [510, "NARRATOR", "Villagers carried their own lanterns to the roots. Nobody waited for one hero; every small light became part of the plan."],
 [520, "PIP", "A thousand tiny lights can show a path that one big light cannot."],
 [528, "NARRATOR", "At the base of the Skyroot, Eira placed the brook shell, the leaf-feather, and the crystal wind-note around the empty bell hook."],
 [539, "EIRA", "Brook, wood, and wind. Three voices, one song."],
 [548, "NIX", "I'll ring the bell. Will you all sing with me?"],
 [556, "NARRATOR", "The first ring was soft. The second travelled through the roots. The third rose through every branch until the whole tree answered."],
 [566, "PIP", "Look! The lights are coming back!"],
 [574, "NARRATOR", "New lantern-fruits blossomed among the leaves. Long silver roots reached across the sky, making a gentle bridge all the way to Cloudrest."],
 [583, "NIX", "A bridge to my home. Not a stolen light, but a place beside yours."],
 [590, "EIRA", "Next year, we ring the bell together."],
 [596, "NARRATOR", "And on that Lantern Night, no one watched the lights from far away. Every home belonged to the glow."]
];

const SKYROOT_SCENES = [0,46,96,150,206,263,320,372,425,476,526,572,600];

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
  const top = mixColor(p[0][0], p[1][0], f * 0.22);
  const mid = mixColor(p[0][1], p[1][1], f * 0.22);
  const low = mixColor(p[0][2], p[1][2], f * 0.22);
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
  const leaves = [
    [-138,-421,145,106,"#458a82"],[-32,-510,148,122,"#67aa88"],[93,-473,151,114,"#79b891"],
    [174,-393,117,91,"#4c9684"],[-165,-342,116,88,"#71ae8c"],[7,-395,173,124,"#8bc59a"],
    [68,-573,102,83,"#9cd19f"],[-84,-570,107,83,"#77bd91"],[197,-475,83,68,"#5b9d85"]
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
  // Cliff shelves are wide and calm: Cloudrest is a quiet home, not a threat.
  skyPath(ctx, [[0,802],[260,733],[430,771],[636,704],[840,751],[1030,701],[1223,755],[1460,703],[1650,754],[1920,703],[1920,1080],[0,1080]], "#7b88b7", "#646e9e", 3);
  for (let i = 0; i < 5; i++) {
    const x = 140 + i * 370, y = 810 + (i % 2) * 24;
    skyHouse(ctx, x, y, 0.77, t, !!lights, ["#bfc9e8","#d8c7e8","#bcd8df"][i%3]);
    if (lights) skyLantern(ctx,x+88,y-148,.5,"#f7c98f",t,i+20);
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
function skyFox(ctx, x, y, s, t, mood, action) {
  mood = mood || "happy"; action = action || "idle";
  const walk = action === "walk" || action === "run" || action === "climb";
  const stride = walk ? Math.sin(t * (action === "run" ? 9.4 : 5.6)) : Math.sin(t * 2.1) * .12;
  const bounce = walk ? Math.abs(Math.sin(t * 5.6)) * (action === "run" ? 9 : 4) : Math.sin(t * 2.4) * 2.6;
  const blink = Math.sin(t * 0.73 + 1.2) > .985;
  ctx.save(); ctx.translate(x,y+bounce); ctx.scale(s,s);
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
  // Head and ear silhouette.
  skyPath(ctx,[[-47,-142],[-63,-208],[-20,-177],[0,-180],[26,-179],[61,-211],[54,-141]],"#b9625e","#874650",3);
  skyPath(ctx,[[-52,-177],[-54,-197],[-34,-182]],"#f6c0a6",null,0);
  skyPath(ctx,[[34,-181],[55,-198],[49,-174]],"#f6c0a6",null,0);
  skyEllipse(ctx,0,-145,61,57,skyGradient(ctx,-48,-198,47,-91,[[0,"#f2a07e"],[.48,"#db7966"],[1,"#b9625e"]]),"#874650",2.8);
  // Cheeks and muzzle remain consistent at every angle.
  skyEllipse(ctx,-39,-129,18,12,"#efa18d",null); skyEllipse(ctx,39,-129,18,12,"#efa18d",null);
  skyEllipse(ctx,0,-121,33,22,"#ffe7d2",null);
  skyEllipse(ctx,0,-133,6.5,4.8,"#684653",null);
  const eyeH = blink ? 2 : (mood === "sad" ? 16 : 19);
  skyEllipse(ctx,-22,-151,8,eyeH,"#4a3c4b",null);
  skyEllipse(ctx,22,-151,8,eyeH,"#4a3c4b",null);
  if (!blink) {
    skyEllipse(ctx,-24,-158,2.9,4.2,"#ffffff",null); skyEllipse(ctx,20,-158,2.9,4.2,"#ffffff",null);
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
  skyRound(ctx,-11,20,22,22,7,"#f3c96d","#9f825c",2);
  skyGlow(ctx,0,31,27,"rgba(255,231,139,0.5)",0.32);
  for(let i=0;i<5;i++){
    const a=t*1.5+i*1.2,r=50+i*9;
    skyStar(ctx,Math.cos(a)*r,Math.sin(a*1.1)*r*.62,2.7+(i%2), "#fff3c6",.5+.5*Math.sin(t*3+i));
  }
  ctx.restore();
}
function skyDragon(ctx, x, y, s, t, mood, flying) {
  ctx.save();ctx.translate(x,y+Math.sin(t*2.8)*5);ctx.scale(s,s);
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
  skyEllipse(ctx,-15,-112,7,10,"#25374f",null);skyEllipse(ctx,17,-112,7,10,"#25374f",null);
  skyEllipse(ctx,-17,-116,2.5,3.5,"#fff",null);skyEllipse(ctx,15,-116,2.5,3.5,"#fff",null);
  skyEllipse(ctx,0,-91,20,13,"#dce0f5",null);
  skyEllipse(ctx,0,-99,4,3,"#4f5684",null);
  ctx.strokeStyle="#485791";ctx.lineWidth=2.6;ctx.beginPath();
  if(mood==="sad"){ctx.moveTo(-7,-84);ctx.quadraticCurveTo(0,-89,7,-84);}
  else if(mood==="worried"){ctx.moveTo(-8,-86);ctx.quadraticCurveTo(0,-83,8,-86);}
  else{ctx.moveTo(-8,-86);ctx.quadraticCurveTo(0,-78,8,-86);}ctx.stroke();
  // Coral scarf, stitched bell strap and small cloud badge.
  skyRound(ctx,-28,-68,56,14,7,"#efa1a5","#a35f83",2);
  skyPath(ctx,[[16,-62],[45,-54],[43,-28],[21,-37]],"#ed9c9f","#a35f83",2);
  skyRound(ctx,24,-49,27,20,5,"#d7b67b","#8d76a0",2);
  skyEllipse(ctx,37,-39,4,4,"#fff1c3",null);
  if(flying){ctx.strokeStyle="rgba(255,250,230,0.55)";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-80,18);ctx.quadraticCurveTo(-106,8,-119,24);ctx.stroke();}
  ctx.restore();
}
function skyPebble(ctx, x, y, s, t, smile) {
  ctx.save();ctx.translate(x,y+Math.sin(t*2)*3);ctx.scale(s,s);
  skyEllipse(ctx,0,0,45,31,skyGradient(ctx,-37,-27,41,34,[[0,"#c9d1cb"],[.6,"#98a7ab"],[1,"#6d8290"]]),"#627989",3);
  for(let i=0;i<7;i++)skyEllipse(ctx,Math.cos(i*2.4)*29,-8+Math.sin(i*2.4)*16,4,3,"#e9e6d2",null);
  skyEllipse(ctx,-13,-4,4,6,"#2b4559",null);skyEllipse(ctx,13,-4,4,6,"#2b4559",null);
  ctx.strokeStyle="#4b6470";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-8,8);ctx.quadraticCurveTo(0,smile?15:4,8,8);ctx.stroke();
  ctx.restore();
}
function skyOwl(ctx, x, y, s, t) {
  ctx.save();ctx.translate(x,y+Math.sin(t*1.4)*3);ctx.scale(s,s);
  skyPath(ctx,[[-52,-25],[-62,-65],[-30,-52],[-12,-63],[20,-58],[43,-71],[49,-25]],"#90759c","#5f597e",3);
  skyEllipse(ctx,0,-28,48,55,skyGradient(ctx,-35,-78,34,20,[[0,"#c5a8bc"],[.6,"#957da7"],[1,"#74688f"]]),"#625a82",3);
  skyEllipse(ctx,-17,-39,15,17,"#fff1cb",null);skyEllipse(ctx,17,-39,15,17,"#fff1cb",null);
  skyEllipse(ctx,-17,-39,6,7,"#29354d",null);skyEllipse(ctx,17,-39,6,7,"#29354d",null);
  skyPath(ctx,[[-6,-24],[6,-24],[0,-13]],"#ecb56f",null,0);
  ctx.strokeStyle="#7b638e";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-27,12);ctx.lineTo(-37,23);ctx.moveTo(28,12);ctx.lineTo(37,22);ctx.stroke();
  ctx.restore();
}
function skyCaption(ctx, t) {
  let cue = SKYROOT_CUES[0];
  for (let i = 0; i < SKYROOT_CUES.length; i++) {
    if (SKYROOT_CUES[i][0] <= t) cue = SKYROOT_CUES[i]; else break;
  }
  const next = SKYROOT_CUES.find(c => c[0] > cue[0]);
  const fadeIn = skyEase(cue[0], cue[0] + 0.35, t);
  const fadeOut = next ? 1 - skyEase(next[0] - 0.32, next[0], t) : 1;
  ctx.save(); ctx.globalAlpha = fadeIn * fadeOut;
  ctx.fillStyle = "rgba(18,25,48,0.76)"; skyRound(ctx, 220, 870, 1480, 151, 23, ctx.fillStyle, "rgba(239,241,255,0.24)", 2);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#f8d99c"; ctx.font = "800 18px ui-monospace, monospace"; ctx.fillText(cue[1], 960, 907);
  ctx.fillStyle = "#fffaf0"; ctx.font = "600 31px ui-rounded, system-ui, sans-serif";
  const words = cue[2].split(/\s+/), lines = []; let line = "";
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (ctx.measureText(test).width > 1360 && line) { lines.push(line); line = words[i]; } else line = test;
  }
  if (line) lines.push(line);
  lines.slice(0,2).forEach((str, i) => ctx.fillText(str, 960, 953 + i * 37));
  ctx.restore();
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
function skyDrawOpening(ctx, t) {
  skyBackground(ctx,t,"meadow"); skyGround(ctx,t,"#a7dca7","#62b87b");
  skyVillage(ctx,t,true,false);
  skyTree(ctx,1130,985,1.16,t,false,false);
  skyVines(ctx,835,t,true);
  for(let i=0;i<14;i++)skyLantern(ctx,160+i*118,470+(i%4)*61,.62+(i%3)*.06,["#f5d18c","#a9dbe2","#eabbd5"][i%3],t,i);
  // Festival pennants sway along the path.
  for(let i=0;i<9;i++){
    const x=90+i*221,y=595+Math.sin(i)*18;
    ctx.strokeStyle="#9a7b9a";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y-76);ctx.lineTo(x,y+20);ctx.stroke();
    skyPath(ctx,[[x,y-74],[x+58,y-57],[x,y-36]],["#f5b9bc","#bed9ff","#f4dc9e"][i%3],"#f9e9d1",1.5);
  }
  skyFox(ctx,skyMix(435,725,skyEase(2,40,t)),960,1.05,t,"happy","walk");
  skyMoth(ctx,650+Math.sin(t*1.4)*21,785,0.7,t,.4);
  if(t>24&&t<46){
    for(let i=0;i<10;i++)skyStar(ctx,1050+Math.cos(i*2.4)*i*17,390+Math.sin(i*2.4)*i*11,4,"#fff1ac",.8);
  }
  skyParticles(ctx,t,47,{x:0,y:100,w:1920,h:750},"rgba(255,245,194,ALPHA)");
}
function skyDrawMissing(ctx,t){
  skyBackground(ctx,t,"dusk"); skyGround(ctx,t,"#667f93","#314a67");
  skyVillage(ctx,t,false,true);
  skyTree(ctx,990,1115,1.65,t,false,true);
  // A circular empty place shows where the bell used to hang.
  skyGlow(ctx,1064,505,240,"rgba(255,220,143,0.48)",.18);
  ctx.strokeStyle="#f5d9a0";ctx.lineWidth=7;ctx.beginPath();ctx.arc(1064,504,58,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle="rgba(244,223,178,0.55)";ctx.lineWidth=3;
  for(let i=0;i<4;i++){const a=i*Math.PI/2+t*.1;ctx.beginPath();ctx.moveTo(1064+Math.cos(a)*72,504+Math.sin(a)*72);ctx.lineTo(1064+Math.cos(a)*120,504+Math.sin(a)*120);ctx.stroke();}
  for(let i=0;i<19;i++){
    const x=150+i*95,y=500+Math.sin(i*1.3)*85;
    skyLantern(ctx,x,y,.42, "#b6c0da",t,i);
  }
  skyFox(ctx,760,975,1.03,t,"worried","idle");skyMoth(ctx,885,774,.7,t,.2);
  for(let i=0;i<15;i++){const x=900+i*40,y=650+Math.sin(t*1.3+i)*90;skyGlow(ctx,x,y,32,"rgba(197,218,255,0.3)",.12);skyStar(ctx,x,y,3,"#dceaff",.4+.4*Math.sin(t+i));}
}
function skyDrawBrookScene(ctx,t){
  skyBackground(ctx,t,"brook");skyBrook(ctx,t);
  skyTree(ctx,1700,920,.54,t,false,true);
  skyCloud(ctx,280,265,.8,"#f7fffb",t,3);skyCloud(ctx,1300,310,.7,"#f7fffb",t,5);
  // A fallen branch crosses the bank until Eira and Pip move it.
  ctx.strokeStyle="#8f6b66";ctx.lineWidth=28;ctx.lineCap="round";
  const branchMove=skyEase(104,127,t);
  ctx.beginPath();ctx.moveTo(1065,730);ctx.quadraticCurveTo(1230-branchMove*140,680,1370-branchMove*260,791);ctx.stroke();
  ctx.strokeStyle="#d7ac8e";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(1072,724);ctx.quadraticCurveTo(1230-branchMove*140,680,1370-branchMove*260,791);ctx.stroke();
  skyPebble(ctx,1250-branchMove*42,807,0.85,t,t>128);
  skyFox(ctx,skyMix(510,965,skyEase(98,130,t)),960,1.02,t,t>110&&t<130?"worried":"happy",t<126?"walk":"reach");
  skyMoth(ctx,1065+Math.sin(t*1.5)*30,690,.68,t,.38);
  if(t>130){for(let i=0;i<8;i++)skyStar(ctx,1170+Math.cos(i*2.4)*i*17,760+Math.sin(i*2.4)*i*8,3.2,"#e2fbff",.65);}
  skyParticles(ctx,t,36,{x:0,y:140,w:1920,h:740},"rgba(222,255,242,ALPHA)");
}
function skyDrawWoodScene(ctx,t){
  skyBackground(ctx,t,"wood");skyForest(ctx,t);
  for(let i=0;i<11;i++){
    const x=100+i*185,top=180+(i%3)*65;
    ctx.strokeStyle="#6c7395";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x-20,top,x+20,top+70,x,top+140);ctx.stroke();
    ctx.fillStyle="rgba(168,192,232,0.14)";ctx.beginPath();ctx.ellipse(x,top+45,60,98,.2,0,Math.PI*2);ctx.fill();
  }
  // Mist is layered behind the characters; its drift is time-based.
  for(let i=0;i<7;i++){
    const x=(i*355+t*18)%2300-190,y=690+(i%3)*57;
    skyEllipse(ctx,x,y,220,42,"rgba(192,215,235,0.10)",null,0,0);
  }
  const fear=skyEase(169,185,t)*(1-skyEase(188,198,t));
  if(fear>0){
    ctx.save();ctx.globalAlpha=fear*.48;
    const shadowX=660+Math.sin(t*1.4)*22;
    skyPath(ctx,[[shadowX-55,782],[shadowX-70,685],[shadowX-48,630],[shadowX-30,534],[shadowX,492],[shadowX+31,532],[shadowX+46,626],[shadowX+73,690],[shadowX+55,782]],"#171d3a",null,0);
    skyEllipse(ctx,shadowX-18,587,5,7,"#d7dffb",null);skyEllipse(ctx,shadowX+19,587,5,7,"#d7dffb",null);
    ctx.restore();
  }
  skyFox(ctx,skyMix(990,785,skyEase(153,188,t)),968,1.0,t,t>166&&t<194?"worried":"happy","walk");
  skyMoth(ctx,skyMix(1100,885,skyEase(153,188,t)),760,.73,t,.48);
  skyOwl(ctx,1295,703,.92,t);
  if(t>188){for(let i=0;i<5;i++)skyStar(ctx,1260+i*17,646+i*5,3,"#ffedb7",.8);}
  skyParticles(ctx,t,45,{x:0,y:100,w:1920,h:800},"rgba(195,222,255,ALPHA)");
}
function skyDrawRidgeScene(ctx,t){
  skyCrystalRidge(ctx,t);
  for(let i=0;i<7;i++)skyCloud(ctx,120+i*290,610+(i%3)*70,.72,"#fffaff",t,i*2);
  skyFloatingIsland(ctx,1600,811,.68,t,"#a0d8cc");
  const p=skyEase(210,239,t);
  skyDragon(ctx,skyMix(1420,1390,p),skyMix(512,425,p),1.0,t,t<232?"worried":"happy",true);
  skySkiff(ctx,skyMix(1400,1500,skyEase(220,254,t)),skyMix(564,454,skyEase(220,254,t)),.91,t,Math.sin(t)*.02);
  if(t>216&&t<255){
    skyBell(ctx,1514,514,.55,t,.46);
    for(let i=0;i<14;i++)skyStar(ctx,1470+Math.cos(i*2.1)*i*13,489+Math.sin(i*2.1)*i*8,2.8,"#fff2bd",.8);
  }
  skyFox(ctx,skyMix(580,1160,skyEase(209,250,t)),970,.9,t,"determined","run");
  skyMoth(ctx,skyMix(725,1290,skyEase(210,250,t)),780,.62,t,.4);
}
function skyDrawMarketScene(ctx,t){
  skyMarket(ctx,t);
  // The chase follows a clear left-to-right screen direction in the wide stage.
  const p=skyEase(265,317,t);
  skySkiff(ctx,skyMix(1450,1680,p),skyMix(460,535,p),.83,t,Math.sin(t*2)*.055);
  skyDragon(ctx,skyMix(1510,1745,p),skyMix(472,535,p),.82,t,"worried",true);
  skyBell(ctx,skyMix(1450,1683,p),skyMix(482,545,p),.44,t,.36);
  skyFox(ctx,skyMix(390,1280,p),skyMix(926,840,skyEase(282,302,t)),.9,t,t>282&&t<302?"worried":"determined","run");
  skyMoth(ctx,skyMix(535,1310,p),skyMix(730,685,skyEase(282,302,t)),.63,t,.36);
  // Ribbon streamers pass in front briefly, helping the chase feel fast without blur.
  for(let i=0;i<10;i++){
    const x=((i*223+t*(90+i*2))%2250)-150,y=410+(i%4)*70+Math.sin(t*2+i)*14;
    ctx.strokeStyle=["rgba(255,221,165,0.67)","rgba(206,224,255,0.65)","rgba(255,195,215,0.64)"][i%3];
    ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+36,y-26,x+72,y+26,x+110,y);ctx.stroke();
  }
  skyParticles(ctx,t,34,{x:0,y:210,w:1920,h:600},"rgba(255,246,214,ALPHA)");
}
function skyDrawCloudHomeScene(ctx,t,lights){
  skyCloudHome(ctx,t,lights);
  skySkiff(ctx,skyMix(1030,875,skyEase(322,347,t)),skyMix(610,630,skyEase(322,347,t)),.65,t,.04);
  skyDragon(ctx,skyMix(1000,820,skyEase(329,350,t)),skyMix(579,621,skyEase(329,350,t)),.94,t,t<393?"worried":"sad",false);
  skyFox(ctx,skyMix(1240,1115,skyEase(337,353,t)),941,.82,t,t>370&&t<405?"worried":"happy",t<344?"walk":"idle");
  skyMoth(ctx,skyMix(1350,1195,skyEase(337,353,t)),767,.62,t,.34);
  if(t>=416){
    skyLantern(ctx,925,650,.73,"#ffe1a1",t,3);
    skyGlow(ctx,925,650,150,"rgba(255,220,137,0.45)",skyEase(416,428,t)*.44);
    for(let i=0;i<13;i++)skyStar(ctx,910+Math.cos(i*2.1)*i*13,642+Math.sin(i*2.1)*i*8,2.6,"#fff2be",.8);
  }
  skyParticles(ctx,t,27,{x:80,y:250,w:1760,h:580},"rgba(226,232,255,ALPHA)");
}
function skyDrawReturn(ctx,t){
  skyBackground(ctx,t,"dusk");skyGround(ctx,t,"#657c9a","#344d72");
  skyVines(ctx,760,t,false);skyTree(ctx,975,1124,1.56,t,false,true);
  skyVillage(ctx,t,false,true);
  for(let i=0;i<20;i++){
    const x=90+i*94,y=670+(i%5)*34;
    skyLantern(ctx,x,y,.45,["#f1d4a3","#c4dbff","#edc6d9"][i%3],t,i);
  }
  skySkiff(ctx,skyMix(1520,1100,skyEase(429,471,t)),skyMix(420,545,skyEase(429,471,t)),.71,t,.02);
  skyDragon(ctx,skyMix(1518,1150,skyEase(429,471,t)),skyMix(410,515,skyEase(429,471,t)),.79,t,"happy",true);
  skyBell(ctx,skyMix(1518,1150,skyEase(429,471,t)),skyMix(470,570,skyEase(429,471,t)),.45,t,.36);
  skyFox(ctx,skyMix(480,835,skyEase(428,471,t)),972,.94,t,"determined","walk");
  skyMoth(ctx,skyMix(610,940,skyEase(428,471,t)),745,.64,t,.33);
  if(t>488){
    for(let i=0;i<16;i++){
      const x=150+i*104,y=690+(i%4)*41;
      skyLantern(ctx,x,y,.43,["#f0dca0","#c8dcff","#edc0d3"][i%3],t,i+12);
    }
  }
  skyParticles(ctx,t,30,{x:0,y:150,w:1920,h:820},"rgba(255,229,177,ALPHA)");
}
function skyDrawGathering(ctx,t){
  skyBackground(ctx,t,"dusk");skyGround(ctx,t,"#576f91","#2a4264");
  skyVines(ctx,785,t,false);skyTree(ctx,970,1160,1.7,t,false,true);skyVillage(ctx,t,false,true);
  // The village gathers around the empty hook before the ceremony begins.
  for(let i=0;i<25;i++){
    const a=i*2.399,rx=300+(i%4)*95,ry=210+(i%5)*40;
    const x=970+Math.cos(a)*rx,y=760+Math.sin(a)*ry*.55;
    skyLantern(ctx,x,y,.34+(i%3)*.035,["#f4d894","#c9dbff","#f2bed5"][i%3],t,i+84);
  }
  // Nix has brought the bell back; it stays quiet until everyone is ready.
  const returned=skyEase(497,505,t);
  if(returned>0){
    ctx.save();ctx.globalAlpha=returned;
    skySkiff(ctx,1190,770,.52,t,.015);
    skyDragon(ctx,1117,744,.79,t,"happy",false);
    skyBell(ctx,1025,495,.76,t,.18);
    ctx.restore();
  }
  skyFox(ctx,skyMix(775,842,skyEase(479,505,t)),1000,.98,t,t<499?"determined":"happy","walk");
  skyMoth(ctx,skyMix(930,975,skyEase(479,505,t)),786,.68,t,.42);
  // Villagers place their own lights around the tree, instead of waiting for a single saviour.
  for(let i=0;i<13;i++){
    const x=145+i*135,y=850+(i%3)*40;
    skyLantern(ctx,x,y,.3,["#f7dfa7","#cbdcff","#efc4d7"][i%3],t,i+109);
  }
  if(t>508){
    for(let i=0;i<7;i++){
      const p=skyEase(508,523,t),x=970+(i-3)*75,y=770-p*(85+(i%3)*15);
      skyGlow(ctx,x,y,32,"rgba(255,224,145,0.34)",p*.32);
      skyStar(ctx,x,y,3,"#fff0bd",.7);
    }
  }
  skyParticles(ctx,t,30,{x:0,y:130,w:1920,h:780},"rgba(255,229,177,ALPHA)");
}
function skyDrawAwakening(ctx,t){
  skyBackground(ctx,t,"night");
  skyGround(ctx,t,"#4e6e83","#1f3d57");
  skyVillage(ctx,t, t>550, true);
  skyTree(ctx,970,1160,1.7,t,true,true);
  skyVines(ctx,785,t,t>554);
  // Every villager carries one small light toward the tree.
  for(let i=0;i<22;i++){
    const x=65+i*87, y=820+(i%3)*54;
    skyLantern(ctx,x,y,.34,["#f4d894","#c9dbff","#f2bed5"][i%3],t,i+40);
  }
  const ringPower=skyEase(544,565,t);
  skyBell(ctx,1025,495,1.04,t,ringPower*.65);
  skyRingNotes(ctx,1025,493,t,ringPower);
  skyFox(ctx,skyMix(725,865,skyEase(525,550,t)),1000,1.0,t,t<540?"determined":"happy",t<546?"walk":"ring");
  skyMoth(ctx,skyMix(835,985,skyEase(525,550,t)),789,.71,t,.5);
  skyDragon(ctx,skyMix(1225,1124,skyEase(525,551,t)),skyMix(840,771,skyEase(525,551,t)),.8,t,"happy",false);
  if(t>550){
    for(let i=0;i<36;i++){
      const a=i*2.399 + t*.15, r=50+skyHash(i+4)*540;
      const x=970+Math.cos(a)*r,y=445+Math.sin(a)*r*.62;
      skyGlow(ctx,x,y,46,"rgba(255,225,143,0.34)",skyEase(550,567,t)*.3);
      skyStar(ctx,x,y,2.4+skyHash(i+20)*3,"#fff1bd",.5+.5*Math.sin(t*4+i));
    }
  }
  skyParticles(ctx,t,82,{x:0,y:100,w:1920,h:850},"rgba(255,238,183,ALPHA)");
}
function skyDrawFestival(ctx,t){
  skyBackground(ctx,t,"night");skyGround(ctx,t,"#4e6d7d","#214257");
  skyVillage(ctx,t,true,false);skyTree(ctx,1130,1090,1.13,t,true,false);skyVines(ctx,795,t,true);
  for(let i=0;i<30;i++){
    const x=44+i*65,y=210+(i%6)*77+Math.sin(t*1.2+i)*10;
    skyLantern(ctx,x,y,.49+(i%3)*.07,["#f6d690","#afdfed","#e7bad6","#d5d3ff"][i%4],t,i+60);
  }
  skyFox(ctx,skyMix(815,905,skyEase(574,590,t)),963,1.01,t,"happy",t<589?"walk":"ring");
  skyMoth(ctx,skyMix(975,1005,skyEase(574,590,t)),760,.72,t,.48);
  skyDragon(ctx,skyMix(1130,1190,skyEase(574,590,t)),850,.79,t,"happy",false);
  skySkiff(ctx,1460,790,.45,t,.03);
  skyParticles(ctx,t,90,{x:0,y:100,w:1920,h:850},"rgba(255,237,180,ALPHA)");
  if(t>588){
    ctx.save();ctx.globalAlpha=skyEase(588,593,t);
    ctx.fillStyle="rgba(14,22,48,0.8)";skyRound(ctx,430,270,1060,260,28,ctx.fillStyle,"rgba(255,244,212,0.7)",2);
    ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#fff4ce";
    ctx.font="900 52px ui-rounded, system-ui, sans-serif";ctx.fillText("THE SKYROOT BELL",960,365);
    ctx.fillStyle="#e1d9ff";ctx.font="700 19px ui-monospace, monospace";ctx.fillText("A LUMENREACH STORY",960,426);
    ctx.fillStyle="#f1d08a";ctx.fillRect(835,470,250,2);ctx.restore();
  }
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
function renderFrame(time, frame, fps, ctx, width, height, motion) {
  const t = skyClamp(Number.isFinite(time) ? time : (frame || 0) / Math.max(1, fps || SKYROOT_FPS), 0, SKYROOT_DURATION);
  const scale = Math.min(width / 1920, height / 1080);
  const ox = (width - 1920 * scale) / 2, oy = (height - 1080 * scale) / 2;
  ctx.save(); ctx.fillStyle = "#111b35"; ctx.fillRect(0, 0, width, height);
  ctx.translate(ox, oy); ctx.scale(scale, scale);
  if (t < 46) skyDrawOpening(ctx,t);
  else if (t < 96) skyDrawMissing(ctx,t);
  else if (t < 150) skyDrawBrookScene(ctx,t);
  else if (t < 206) skyDrawWoodScene(ctx,t);
  else if (t < 263) skyDrawRidgeScene(ctx,t);
  else if (t < 320) skyDrawMarketScene(ctx,t);
  else if (t < 372) skyDrawCloudHomeScene(ctx,t,false);
  else if (t < 425) skyDrawCloudHomeScene(ctx,t,true);
  else if (t < 476) skyDrawReturn(ctx,t);
  else if (t < 526) skyDrawGathering(ctx,t);
  else if (t < 572) skyDrawAwakening(ctx,t);
  else skyDrawFestival(ctx,t);
  // Gentle fades make each location change feel like a deliberate edit.
  let fade = 0;
  for (let i = 1; i < SKYROOT_SCENES.length - 1; i++) {
    const d = Math.abs(t - SKYROOT_SCENES[i]);
    if (d < 1.15) fade = Math.max(fade, 0.94 * (1 - d / 1.15));
  }
  if (fade > 0.01) { ctx.fillStyle = "rgba(8,12,29," + fade.toFixed(3) + ")"; ctx.fillRect(0,0,1920,1080); }
  skyFilmGrade(ctx,t);
  skyCaption(ctx,t);
  ctx.restore();
}
if (typeof window !== "undefined") {
  window.TRILYVA_SKYROOT_STORY = {
    title: "The Skyroot Bell",
    duration: SKYROOT_DURATION,
    fps: SKYROOT_FPS,
    width: 1920,
    height: 1080,
    chapters: SKYROOT_CHAPTERS,
    cues: SKYROOT_CUES,
    renderFrame: renderFrame
  };
}

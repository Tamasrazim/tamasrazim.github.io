(() => {
  "use strict";

  const rows = [
    [["Esc",0,1,"fn"],["F1",12,1,""],["F2",18,1,""],["F3",24,1,""],["F4",30,1,""],["F5",36,1,""],["F6",42,1,""],["F7",48,1,""],["F8",54,1,""],["F9",60,1,""],["F10",66,1,""],["F11",72,1,""],["F12",78,1,""],["Del",85,1,"nav"],["VOL",99,1,"knob"]],
    [["~",1,1,""],["1",7,1,""],["2",13,1,""],["3",19,1,""],["4",25,1,""],["5",31,1,""],["6",37,1,""],["7",43,1,""],["8",49,1,""],["9",55,1,""],["0",61,1,""],["-",67,1,""],["=",73,1,""],["Backspace",79,2,"mod"],["PgUp",86,1,"nav"]],
    [["Tab",2,1.5,"mod"],["Q",8,1,""],["W",14,1,""],["E",20,1,""],["R",26,1,""],["T",32,1,""],["Y",38,1,""],["U",44,1,""],["I",50,1,""],["O",56,1,""],["P",62,1,""],["[",68,1,""],["]",74,1,""],["\\",80,1.5,"mod"],["PgDn",87,1,"nav"]],
    [["Caps",3,1.75,"mod"],["A",9,1,""],["S",15,1,""],["D",21,1,""],["F",27,1,""],["G",33,1,""],["H",39,1,""],["J",45,1,""],["K",51,1,""],["L",57,1,""],[";",63,1,""],["'",69,1,""],["Enter",81,2.25,"nav"],["PrtSc",84,1,"nav"]],
    [["LShift",4,2.25,"mod"],["Z",10,1,""],["X",16,1,""],["C",22,1,""],["V",28,1,""],["B",34,1,""],["N",40,1,""],["M",46,1,""],[",",52,1,""],[".",58,1,""],["/",64,1,""],["RShift",70,1.75,"mod"],["Up",82,1,"nav"]],
    [["LCtrl",5,1.25,"mod"],["Win",11,1.25,"mod"],["LAlt",17,1.25,"mod"],["Space",35,6.25,""],["RAlt",59,1.25,"mod"],["Fn",53,1.25,"fn"],["RCtrl",71,1.25,"mod"],["Left",77,1,"nav"],["Down",83,1,"nav"],["Right",89,1,"nav"]]
  ];

  const keyboard = document.querySelector("#keyboard");
  if (!keyboard) return;

  keyboard.innerHTML = "";
  keyboard.style.display = "flex";
  keyboard.style.flexDirection = "column";
  keyboard.style.gap = "6px";
  keyboard.style.overflowX = "auto";
  keyboard.style.padding = "4px 2px 10px";

  const css = document.createElement("style");
  css.textContent =
    ".f75-enh-row{display:flex;gap:6px;min-width:920px}" +
    ".f75-enh-key{height:48px;flex:0 0 auto;border:1px solid #2d2d2d;background:linear-gradient(145deg,#171717,#0a0a0a);border-radius:8px;color:#c8c8c2;display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;padding:7px;cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease;font:10px ui-monospace,SFMono-Regular,Consolas,monospace}" +
    ".f75-enh-key:hover{transform:translateY(-2px);border-color:#5d5d5d}" +
    ".f75-enh-key.is-live{border-color:#d9ff57;box-shadow:0 0 18px #d9ff5730;color:#efffc7}" +
    ".f75-enh-key .lab{font-weight:800}.f75-enh-key .idx{font-size:7px;color:#575752}" +
    ".f75-enh-knob{border-radius:50%;align-items:center;justify-content:center;padding:0;color:#ff9dd4}" +
    ".f75-live-wrap{border:1px solid #2d2d2d;border-radius:11px;background:#080808;margin:0 0 14px;padding:14px}" +
    ".f75-live-head{display:flex;align-items:center;justify-content:space-between;gap:12px;font:10px ui-monospace,SFMono-Regular,Consolas,monospace;color:#777}" +
    ".f75-live-title{color:#f2f2ed;font-weight:900;letter-spacing:.12em}" +
    ".f75-live-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#9cffb1;box-shadow:0 0 12px #9cffb1;margin-right:8px}" +
    ".f75-live-source{margin-left:9px;color:#65655f}" +
    ".f75-live-held{color:#d9ff57}" +
    ".f75-live-current{min-height:70px;display:grid;place-items:center;text-align:center;border:1px solid #242424;border-radius:9px;background:#050505;margin-top:10px;padding:14px;font:800 22px/1.1 ui-monospace,SFMono-Regular,Consolas,monospace;color:#f5f5ef}" +
    ".f75-live-meta{margin-top:8px;text-align:center;color:#666;font:9px ui-monospace,SFMono-Regular,Consolas,monospace;word-break:break-all}" +
    ".f75-live-history{display:flex;gap:6px;flex-wrap:wrap;margin-top:11px}" +
    ".f75-live-chip{padding:4px 7px;border:1px solid #252525;border-radius:6px;background:#0d0d0d;color:#a7a7a1;font:9px ui-monospace,SFMono-Regular,Consolas,monospace}" +
    "@media(max-width:680px){.f75-enh-row{min-width:860px}.f75-enh-key{height:42px;font-size:8px}.f75-live-current{font-size:17px}}";
  document.head.appendChild(css);

  const liveWrap = document.createElement("section");
  liveWrap.className = "f75-live-wrap";
  liveWrap.innerHTML =
    '<div class="f75-live-head"><div><span class="f75-live-dot"></span><span class="f75-live-title">LIVE PRESS VIEW</span><span class="f75-live-source" id="f75LiveSource">OS keyboard events</span></div><div class="f75-live-held" id="f75LiveHeld">0 held</div></div>' +
    '<div class="f75-live-current" id="f75LiveCurrent">Press a key on the keyboard…</div>' +
    '<div class="f75-live-meta" id="f75LiveMeta">No live keypress yet.</div>' +
    '<div class="f75-live-history" id="f75LiveHistory"></div>';
  keyboard.parentElement?.insertBefore(liveWrap, keyboard);

  const liveHeld = new Set();
  const liveHistory = [];
  const sourceEl = liveWrap.querySelector("#f75LiveSource");
  const currentEl = liveWrap.querySelector("#f75LiveCurrent");
  const metaEl = liveWrap.querySelector("#f75LiveMeta");
  const heldEl = liveWrap.querySelector("#f75LiveHeld");
  const historyEl = liveWrap.querySelector("#f75LiveHistory");

  const human = code => ({
    Escape:"Esc",Backquote:"~",Tab:"Tab",CapsLock:"Caps",ShiftLeft:"LShift",ShiftRight:"RShift",
    ControlLeft:"LCtrl",ControlRight:"RCtrl",AltLeft:"LAlt",AltRight:"RAlt",MetaLeft:"Win",
    Enter:"Enter",Backspace:"Backspace",Space:"Space",Minus:"-",Equal:"=",BracketLeft:"[",
    BracketRight:"]",Backslash:"\\",Semicolon:";",Quote:"'",Comma:",",Period:".",Slash:"/",
    ArrowLeft:"Left",ArrowDown:"Down",ArrowUp:"Up",ArrowRight:"Right",Delete:"Del",
    PageUp:"PgUp",PageDown:"PgDn",PrintScreen:"PrtSc",
    F1:"F1",F2:"F2",F3:"F3",F4:"F4",F5:"F5",F6:"F6",F7:"F7",F8:"F8",F9:"F9",F10:"F10",F11:"F11",F12:"F12"
  }[code] || (code.startsWith("Key") ? code.slice(3) : code.startsWith("Digit") ? code.slice(5) : code));

  const renderLive = () => {
    heldEl.textContent = liveHeld.size + " held";
    if (liveHeld.size) {
      currentEl.textContent = [...liveHeld].map(human).join(" + ");
    } else if (!liveHistory.length) {
      currentEl.textContent = "Press a key on the keyboard…";
    } else {
      currentEl.textContent = "No keys held";
    }
    historyEl.innerHTML = liveHistory.map(x => '<span class="f75-live-chip">' + x + '</span>').join("");
  };

  const noteLive = (code, matrix, source) => {
    sourceEl.textContent = source;
    metaEl.textContent = human(code) + (matrix == null ? "" : " · matrix #" + matrix);
  };

  const markDown = (code, matrix, source) => {
    if (liveHeld.has(code)) return;
    liveHeld.add(code);
    if (matrix !== undefined && matrix !== null) flash(matrix, 280);
    liveHistory.unshift(human(code));
    if (liveHistory.length > 8) liveHistory.length = 8;
    noteLive(code, matrix, source);
    renderLive();
  };

  const markUp = code => {
    liveHeld.delete(code);
    renderLive();
  };

  document.addEventListener("keydown", e => {
    if (e.repeat) return;
    const t = e.target;
    if (t && ((t.tagName === "INPUT" && t.type !== "color") || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    const idx = codeMap[e.code];
    if (idx !== undefined) markDown(e.code, idx, "OS keyboard events");
  }, true);

  document.addEventListener("keyup", e => {
    markUp(e.code);
  }, true);

  window.addEventListener("blur", () => {
    liveHeld.clear();
    renderLive();
  });

  const usageToMatrix = {
    0x04:9,0x05:34,0x06:22,0x07:21,0x08:20,0x09:27,0x0a:33,0x0b:39,0x0c:50,0x0d:45,0x0e:51,0x0f:57,
    0x10:46,0x11:40,0x12:56,0x13:62,0x14:8,0x15:26,0x16:15,0x17:32,0x18:44,0x19:28,0x1a:14,0x1b:16,0x1c:38,0x1d:10,
    0x1e:7,0x1f:13,0x20:19,0x21:25,0x22:31,0x23:37,0x24:43,0x25:49,0x26:55,0x27:61,
    0x28:81,0x29:0,0x2a:79,0x2b:2,0x2c:35,0x2d:67,0x2e:73,0x2f:68,0x30:74,0x31:80,0x33:63,0x34:69,0x35:1,0x36:52,0x37:58,0x38:64,
    0x3a:12,0x3b:18,0x3c:24,0x3d:30,0x3e:36,0x3f:42,0x40:48,0x41:54,0x42:60,0x43:66,0x44:72,0x45:78,
    0x46:84,0x4b:86,0x4c:85,0x4e:87,0x4f:89,0x50:77,0x51:83,0x52:82,
    0xff:53
  };
  const modToMatrix = [5,4,17,11,71,70,59,undefined];

  let hidAttached = null;
  let hidHeld = new Set();

  const consumeHidReport = event => {
    const data = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
    if (!data.length) return;
    const next = new Set();
    if (data.length >= 1) {
      for (let bit = 0; bit < 8; bit++) if (data[0] & (1 << bit)) {
        const idx = modToMatrix[bit];
        if (idx !== undefined) next.add(idx);
      }
    }
    const start = data.length >= 8 ? 2 : 0;
    for (let i = start; i < Math.min(data.length, start + 6); i++) {
      const usage = data[i];
      const idx = usageToMatrix[usage];
      if (idx !== undefined) next.add(idx);
    }

    for (const idx of next) {
      if (!hidHeld.has(idx)) {
        const key = keyboard.querySelector('[data-matrix="' + idx + '"]')?.querySelector(".lab")?.textContent || ("Matrix #" + idx);
        liveHeld.add("HID#" + idx);
        liveHistory.unshift(key);
        if (liveHistory.length > 8) liveHistory.length = 8;
        flash(idx, 280);
        sourceEl.textContent = "WebHID input report";
        currentEl.textContent = [...liveHeld].map(x => x.startsWith("HID#") ? x.replace("HID#","Matrix #") : human(x)).join(" + ");
        metaEl.textContent = "report 0x" + Number(event.reportId).toString(16).padStart(2,"0") + " · " + [...data].map(x => x.toString(16).padStart(2,"0")).join(" ");
      }
    }
    for (const idx of hidHeld) if (!next.has(idx)) liveHeld.delete("HID#" + idx);
    hidHeld = next;
    heldEl.textContent = liveHeld.size + " held";
    historyEl.innerHTML = liveHistory.map(x => '<span class="f75-live-chip">' + x + '</span>').join("");
  };

  const attachHidObserver = () => {
    const d = window.__f75Device;
    if (!d || d === hidAttached) return;
    hidAttached = d;
    try {
      d.addEventListener("inputreport", consumeHidReport);
      sourceEl.textContent = "WebHID input report + OS events";
    } catch {}
  };
  setInterval(attachHidObserver, 300);
  attachHidObserver();

  const selected = (window.__f75Selected = {});
  const flash = (index, duration = 150) => {
    const el = keyboard.querySelector('[data-matrix="' + index + '"]');
    if (!el) return;
    el.classList.add("is-live");
    clearTimeout(el.__t);
    el.__t = setTimeout(() => el.classList.remove("is-live"), duration);
  };

  const select = (index, label, el) => {
    document.querySelectorAll("#keyboard [data-matrix].selected").forEach(x => x.classList.remove("selected"));
    el.classList.add("selected");
    selected.index = index;
    const badge = document.querySelector("#selectedKeyBadge");
    const chosen = document.querySelector("#selectedLabel");
    const input = document.querySelector("#selectedKey");
    if (badge) badge.textContent = "index " + index;
    if (chosen) chosen.textContent = label + " · matrix " + index;
    if (input) input.value = label + " (#" + index + ")";
  };

  rows.forEach(row => {
    const wrap = document.createElement("div");
    wrap.className = "f75-enh-row";

    row.forEach(item => {
      const [label,index,width,kind] = item;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "f75-enh-key " + (kind === "knob" ? "f75-enh-knob" : "");
      b.style.width = (width * 50 + Math.max(0,width - 1) * 6) + "px";
      b.dataset.matrix = String(index);
      b.innerHTML = '<span class="lab"></span><span class="idx">#' + index + '</span>';
      b.querySelector(".lab").textContent = label;
      b.addEventListener("click", () => select(index,label,b));
      wrap.appendChild(b);
    });

    keyboard.appendChild(wrap);
  });

  const codeMap = {
    KeyA:9,KeyB:34,KeyC:22,KeyD:21,KeyE:20,KeyF:27,KeyG:33,KeyH:39,KeyI:50,KeyJ:45,
    KeyK:51,KeyL:57,KeyM:46,KeyN:40,KeyO:56,KeyP:62,KeyQ:8,KeyR:26,KeyS:15,KeyT:32,
    KeyU:44,KeyV:28,KeyW:14,KeyX:16,KeyY:38,KeyZ:10,
    Digit1:7,Digit2:13,Digit3:19,Digit4:25,Digit5:31,Digit6:37,Digit7:43,Digit8:49,Digit9:55,Digit0:61,
    Enter:81,Escape:0,Backspace:79,Tab:2,Space:35,Minus:67,Equal:73,BracketLeft:68,BracketRight:74,
    Backslash:80,Semicolon:63,Quote:69,Comma:52,Period:58,Slash:64,CapsLock:3,
    F1:12,F2:18,F3:24,F4:30,F5:36,F6:42,F7:48,F8:54,F9:60,F10:66,F11:72,F12:78,
    PrintScreen:84,Delete:85,PageUp:86,PageDown:87,ArrowLeft:77,ArrowDown:83,ArrowUp:82,ArrowRight:89,
    ShiftLeft:4,ControlLeft:5,AltLeft:17,MetaLeft:11,ShiftRight:70,ControlRight:71,AltRight:59
  };


  const ledHost = document.querySelector("#ledPreview");
  if (ledHost) {
    ledHost.innerHTML = "";
    for (let i = 0; i < 75; i++) {
      const p = document.createElement("span");
      p.style.width = "20px";
      p.style.height = "12px";
      p.style.borderRadius = "3px";
      p.style.display = "block";
      ledHost.appendChild(p);
    }
  }

  const getState = () => ({
    color: document.querySelector("#rgbColor")?.value || "#6d8dff",
    brightness: Number(document.querySelector("#brightness")?.value || 7),
    speed: Number(document.querySelector("#speed")?.value || 2),
    effect: Number(document.querySelector(".effect.selected")?.dataset.effect || 1)
  });

  const animate = now => {
    if (!ledHost) return;
    const s = getState();
    const speed = Math.max(1, Number(s.speed || 1));
    const bright = Math.max(.12, Number(s.brightness || 1) / 9);
    [...ledHost.children].forEach((p,i) => {
      let v = .55;
      if (Number(s.effect) === 0) v = 0;
      else if (Number(s.effect) === 1) v = 1;
      else if (Number(s.effect) === 2) v = .45 + .35 * (.5 + .5 * Math.sin(now / 520 * speed));
      else if (Number(s.effect) === 3) v = .2 + .8 * (.5 + .5 * Math.sin(now / 150 * speed + i * .22));
      else if (Number(s.effect) === 5) v = .12 + .88 * Math.max(0, Math.sin(now / 260 * speed + i * .55));
      else if (Number(s.effect) === 8) v = .12 + .88 * (((i * 7 + Math.floor(now / 90 * speed)) % 75) / 74);
      else v = .3 + .7 * (.5 + .5 * Math.sin(now / 280 * speed + i * .17));

      p.style.background = s.color || "#6d8dff";
      p.style.opacity = String(Math.min(1,v * bright));
      p.style.boxShadow = "0 0 12px " + (s.color || "#6d8dff") + "66";
    });

    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
})();
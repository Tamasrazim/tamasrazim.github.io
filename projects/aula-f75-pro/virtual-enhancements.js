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
    ".f75-enh-key .lab{font-weight:800}.f75-enh-key .idx{font-size:7px;color:#575752}.f75-enh-key .map{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#d9ff57aa;font-size:7px}" +
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
    const map = matrix == null ? "" : readMappings()[matrix];
    metaEl.textContent = human(code) +
      (matrix == null ? "" : " · matrix #" + matrix) +
      (map ? " · mapped → " + map : "");
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

  const hidReportState = { lastId: null, lastHex: "", packetCount: 0 };

  const consumeHidReport = event => {
    const data = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
    if (!data.length) return;

    hidReportState.lastId = Number(event.reportId);
    hidReportState.lastHex = [...data].map(x => x.toString(16).padStart(2,"0")).join(" ");
    hidReportState.packetCount++;

    // Keep hardware highlighting conservative: the OS key event path is the
    // authoritative physical-key visualizer. WebHID reports are shown here as
    // an observer because this keyboard's firmware report format is not the
    // standard boot-keyboard report.
    sourceEl.textContent = "WebHID input report + OS events";
    metaEl.textContent =
      "report 0x" + hidReportState.lastId.toString(16).padStart(2,"0") +
      " · " + hidReportState.lastHex +
      " · packet " + hidReportState.packetCount;

    if (!liveHeld.size) {
      currentEl.textContent = "HID activity detected";
      setTimeout(() => {
        if (!liveHeld.size) currentEl.textContent = "No keys held";
      }, 260);
    }
  };

  let hidAttached = null;
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

  window.addEventListener("storage", e => {
    if (e.key === "f75pro:mappings") updateMappingBadges();
  });
  window.addEventListener("f75:mappings-changed", updateMappingBadges);

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
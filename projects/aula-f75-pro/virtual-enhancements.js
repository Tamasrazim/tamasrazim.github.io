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
    "@media(max-width:680px){.f75-enh-row{min-width:860px}.f75-enh-key{height:42px;font-size:8px}}";
  document.head.appendChild(css);

  const selected = (window.__f75Selected = {});
  const flash = index => {
    const el = keyboard.querySelector('[data-matrix="' + index + '"]');
    if (!el) return;
    el.classList.add("is-live");
    clearTimeout(el.__t);
    el.__t = setTimeout(() => el.classList.remove("is-live"), 150);
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

  addEventListener("keydown", e => {
    const idx = codeMap[e.code];
    if (idx !== undefined) flash(idx);
  });

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
(() => {
  "use strict";

  const RX_VID = 0x3554;
  const RX_PID = 0xFA09;
  const BT_PID = 0xFA08;
  const RID = 0x13;
  const FRAME_LEN = 20;
  const DATA_LEN = 19;
  const EFFECTS = [
    [0, "off"], [1, "static"], [2, "breathing"], [3, "wave"],
    [4, "spectrum"], [5, "ripple"], [6, "reactive"],
    [7, "starlight"], [8, "rain"], [9, "snake"], [10, "marquee"],
    [11, "aurora"], [12, "laser"], [13, "firework"], [14, "gradient"],
    [15, "rainbow_wave"], [16, "prism"], [17, "cycle"], [18, "tidal"],
    [21, "custom"]
  ];

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const S = {
    receiver: null,
    collection: null,
    inputListener: null,
    packets: [],
    lastConfig: [],
    sequence: 0,
    selectedEffect: 3,
    timeoutMs: 1800,
    color: "#6d8dff",
    brightness: 7,
    speed: 2,
    perKey: new Uint8Array(126 * 3),
    connectedAt: null
  };

  function hexByte(n) {
    return Number(n).toString(16).padStart(2, "0").toUpperCase();
  }
  function hex(buf, max = 200) {
    return [...buf].slice(0, max).map(hexByte).join(" ");
  }
  function checksum(frame19) {
    let sum = 0;
    for (let i = 0; i < 19; i++) sum = (sum + frame19[i]) & 0xFF;
    return sum;
  }
  function makeFrame(command, sub, seq = 0, payload = []) {
    const f = new Uint8Array(FRAME_LEN);
    f[0] = RID;
    f[1] = command & 0xFF;
    f[2] = sub & 0xFF;
    f[3] = seq & 0xFF;
    for (let i = 0; i < Math.min(15, payload.length); i++) f[4 + i] = payload[i] & 0xFF;
    f[19] = checksum(f);
    return f;
  }
  function validFrame(f) {
    return f instanceof Uint8Array &&
      f.length >= FRAME_LEN &&
      f[0] === RID &&
      checksum(f) === f[19];
  }
  function appendLog(text) {
    const box = $("#eventLog");
    if (!box) return;
    const old = box.textContent || "";
    const next = (old ? old + "\\n" : "") + "[2.4G] " + text;
    box.textContent = next.slice(-12000);
  }
  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }
  function setBadge(id, text, cls = "") {
    const el = $(id);
    if (!el) return;
    el.className = "badge" + (cls ? " " + cls : "");
    el.textContent = text;
  }
  function setStatus(text, cls = "") {
    setText("#wirelessStatus", text);
    const dot = $("#wirelessDot");
    if (dot) dot.className = "statusDot " + (cls || "live");
  }

  function outputCollections(device) {
    return (device.collections || []).map((c, i) => ({
      index: i,
      usagePage: c.usagePage,
      usage: c.usage,
      input: Array.isArray(c.inputReports) ? c.inputReports.length : 0,
      output: Array.isArray(c.outputReports) ? c.outputReports.length : 0,
      feature: Array.isArray(c.featureReports) ? c.featureReports.length : 0,
      outputReports: c.outputReports || []
    }));
  }

  function chooseCollection(device) {
    const cs = outputCollections(device);
    if (!cs.length) return null;
    return [...cs]
      .filter(c => c.output > 0)
      .sort((a, b) => {
        const ar = a.outputReports.some(r => Number(r.reportId) === RID) ? 1 : 0;
        const br = b.outputReports.some(r => Number(r.reportId) === RID) ? 1 : 0;
        return (br - ar) || (b.output - a.output);
      })[0] || null;
  }

  function renderCollections(device) {
    const grid = $("#wirelessCollections");
    if (!grid) return;
    grid.innerHTML = "";
    for (const c of outputCollections(device)) {
      const el = document.createElement("div");
      el.className = "kv";
      el.innerHTML =
        "<div><small>collection</small><strong>#"+c.index+"</strong></div>" +
        "<div><small>usage page</small><strong>0x"+hexByte(c.usagePage || 0)+"</strong></div>" +
        "<div><small>input</small><strong>"+c.input+"</strong></div>" +
        "<div><small>output</small><strong>"+c.output+"</strong></div>";
      grid.appendChild(el);
    }
  }

  async function openReceiver(device) {
    if (!device) throw new Error("No 2.4G receiver selected.");
    if (!device.opened) await device.open();

    const collection = chooseCollection(device);
    if (!collection) throw new Error("Receiver has no WebHID output collection.");
    const report = collection.outputReports.find(r => Number(r.reportId) === RID) ||
      collection.outputReports.find(r => Number(r.reportId) === 0) ||
      collection.outputReports[0];
    if (!report) throw new Error("No usable receiver output report.");

    S.receiver = device;
    S.collection = collection;
    S.connectedAt = new Date();
    renderCollections(device);

    if (S.inputListener) {
      try { device.removeEventListener("inputreport", S.inputListener); } catch {}
    }

    S.inputListener = (event) => {
      if (event.device !== device) return;
      const reportId = Number(event.reportId);
      const data = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
      if (reportId !== RID) return;

      const f = new Uint8Array(FRAME_LEN);
      f[0] = RID;
      f.set(data.slice(0, DATA_LEN), 1);
      const ok = validFrame(f);
      S.packets.unshift({
        at: new Date().toISOString(),
        frame: f,
        valid: ok,
        source: "echo/input"
      });
      S.packets = S.packets.slice(0, 60);
      renderPacket(f, ok, "RX");
    };
    device.addEventListener("inputreport", S.inputListener);

    setStatus("2.4G RECEIVER · CONNECTED", "ok");
    setBadge("wirelessBadge", "receiver live", "ok");
    setText("#wirelessId", device.vendorId.toString(16).padStart(4,"0") + ":" + device.productId.toString(16).padStart(4,"0"));
    setText("#wirelessProduct", device.productName || "AULA 2.4G Wireless Receiver");
    setText("#wirelessTransport", "WebHID · 20-byte output");
    appendLog("receiver connected: " + (device.productName || "2.4G receiver"));
    return report;
  }

  async function connectReceiver() {
    if (!("hid" in navigator)) {
      setStatus("WebHID unavailable", "live");
      appendLog("WebHID is unavailable in this browser.");
      return;
    }
    try {
      const devices = await navigator.hid.requestDevice({
        filters: [{ vendorId: RX_VID, productId: RX_PID }]
      });
      if (devices.length) {
        await openReceiver(devices[0]);
      } else {
        appendLog("receiver picker returned no device.");
      }
    } catch (e) {
      appendLog("receiver connection failed: " + (e?.message || e));
      setStatus("2.4G receiver not connected", "live");
    }
  }

  function disconnectReceiver() {
    const d = S.receiver;
    if (d && S.inputListener) {
      try { d.removeEventListener("inputreport", S.inputListener); } catch {}
    }
    if (d && d.opened) d.close().catch(() => {});
    S.receiver = null;
    S.collection = null;
    S.inputListener = null;
    setStatus("2.4G receiver offline", "live");
    setBadge("wirelessBadge", "simulation", "live");
    setText("#wirelessTransport", "Offline simulation");
    appendLog("receiver disconnected.");
  }

  async function sendFrame(frame, waitEcho = true) {
    if (!validFrame(frame)) throw new Error("Invalid 0x13 frame checksum.");
    if (!S.receiver) {
      renderPacket(frame, true, "SIM");
      return frame;
    }
    const d = S.receiver;
    const started = performance.now();
    await d.sendReport(RID, frame.slice(1));

    if (!waitEcho) {
      renderPacket(frame, true, "TX");
      return frame;
    }

    return new Promise((resolve, reject) => {
      let timer = null;
      const handler = (event) => {
        if (event.device !== d || Number(event.reportId) !== RID) return;
        const data = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
        const rx = new Uint8Array(FRAME_LEN);
        rx[0] = RID;
        rx.set(data.slice(0, DATA_LEN), 1);
        if (!validFrame(rx)) return;
        if (rx[1] !== frame[1] || rx[2] !== frame[2] || rx[3] !== frame[3]) return;
        cleanup();
        renderPacket(rx, true, "RX");
        setText("#wirelessLatency", Math.round(performance.now() - started) + " ms");
        resolve(rx);
      };
      const cleanup = () => {
        clearTimeout(timer);
        try { d.removeEventListener("inputreport", handler); } catch {}
      };
      timer = setTimeout(() => {
        cleanup();
        reject(new Error("2.4G echo timeout for " + hex(frame.slice(0, 4))));
      }, S.timeoutMs);
      d.addEventListener("inputreport", handler);
    });
  }

  async function readConfig() {
    setStatus(S.receiver ? "READING RECEIVER CONFIG…" : "SIMULATING RECEIVER READ…", "live");
    try {
      S.packets = [];
      const request = makeFrame(0x44, 0x01, 0);
      if (!S.receiver) {
        renderPacket(request, true, "SIM");
        const fragments = [];
        for (let seq = 0; seq < 10; seq++) {
          const p = new Uint8Array(15);
          p[0] = seq === 0 ? 0x80 : 0;
          p[11] = 0;
          p[12] = S.selectedEffect;
          p[13] = S.brightness;
          p[14] = (S.speed & 0x0f) << 4;
          const f = makeFrame(0x44, 0x0A, seq, p);
          fragments.push(f);
          renderPacket(f, true, "SIM RX");
        }
        S.lastConfig = fragments;
      } else {
        await sendFrame(request, false);
        const deadline = performance.now() + 3000;
        const received = [];
        while (performance.now() < deadline && received.length < 10) {
          const next = S.packets.find(x =>
            x.valid && x.frame[1] === 0x44 && x.frame[2] === 0x0A &&
            !received.some(y => y[3] === x.frame[3])
          );
          if (next) {
            received.push(next.frame);
            continue;
          }
          await new Promise(r => setTimeout(r, 25));
        }
        if (!received.length) throw new Error("No 0x44/0x0A config fragments received.");
        received.sort((a,b) => a[3] - b[3]);
        S.lastConfig = received;
      }

      const seqs = S.lastConfig.map(f => f[3]).join(",");
      setText("#wirelessPacketCount", S.lastConfig.length + " config fragment(s)");
      setText("#wirelessSequences", seqs || "—");
      setStatus(S.receiver ? "2.4G CONFIG READ" : "SIMULATED 2.4G CONFIG READ", "ok");
      appendLog("config read: " + S.lastConfig.length + " fragment(s), seq " + (seqs || "none"));
      decodeConfig();
    } catch (e) {
      setStatus("2.4G READ ERROR", "live");
      appendLog("config read failed: " + (e?.message || e));
    }
  }

  function decodeConfig() {
    const first = S.lastConfig[0];
    if (!first) {
      setText("#wirelessDecoded", "No receiver config loaded.");
      return;
    }
    const lines = [
      "fragments: " + S.lastConfig.length,
      "effect: " + (first[15] ?? 0),
      "header: " + hex(first.slice(0, 8)),
      "fragment 0: " + hex(first.slice(8, 19))
    ];
    setText("#wirelessDecoded", lines.join("\\n"));
  }

  function rgbBytes(hexColor) {
    const s = String(hexColor || "").replace("#", "");
    return [
      parseInt(s.slice(0,2) || "00",16),
      parseInt(s.slice(2,4) || "00",16),
      parseInt(s.slice(4,6) || "00",16)
    ];
  }

  function updateColorLabel() {
    const input = $("#wirelessColor");
    if (!input) return;
    S.color = input.value;
    setText("#wirelessColorOut", S.color.toUpperCase());
    renderLedPreview();
  }

  function buildPerKeyFrames() {
    const frames = [];
    const R = S.perKey.slice(0,126);
    const G = S.perKey.slice(126,252);
    const B = S.perKey.slice(252,378);
    const planes = [R,G,B];

    for (let plane = 0; plane < 3; plane++) {
      for (let chunk = 0; chunk < 9; chunk++) {
        const payload = new Uint8Array(15);
        payload[0] = 0x0E;
        payload.set(planes[plane].slice(chunk * 14, chunk * 14 + 14), 1);
        frames.push(makeFrame(0x02, 0x1C, frames.length, payload));
      }
    }
    frames.push(makeFrame(0x02, 0x1C, frames.length, [0x06,0x00,0x00,0x5A,0xA5]));
    return frames;
  }

  function renderLedPreview() {
    const box = $("#wirelessLedPreview");
    if (!box) return;
    const [r,g,b] = rgbBytes(S.color);
    const css = "rgb(" + r + "," + g + "," + b + ")";
    box.innerHTML = "";
    for (let i = 0; i < 126; i++) {
      const s = document.createElement("span");
      s.className = "on";
      s.style.background = css;
      s.style.boxShadow = "0 0 10px rgba(" + r + "," + g + "," + b + ",.45)";
      box.appendChild(s);
    }
  }

  function fillPerKeySolid() {
    const [r,g,b] = rgbBytes(S.color);
    S.perKey.fill(0);
    S.perKey.fill(r, 0, 126);
    S.perKey.fill(g, 126, 252);
    S.perKey.fill(b, 252, 378);
    renderLedPreview();
    setText("#wirelessPerKeyCount", "126 LEDs · solid " + S.color.toUpperCase());
    appendLog("prepared 126-LED solid table " + S.color.toUpperCase());
  }

  async function streamCustomPerKey() {
    if (!S.receiver) {
      const frames = buildPerKeyFrames();
      frames.slice(0,2).forEach(f => renderPacket(f, true, "SIM TX"));
      setStatus("SIMULATED CUSTOM STREAM", "ok");
      setText("#wirelessPacketCount", frames.length + " frames prepared");
      appendLog("simulated custom 2.4G stream: " + frames.length + " frames");
      return;
    }

    try {
      const colorConfig = S.lastConfig[0] ? S.lastConfig.map(f => f.slice()) : [];
      if (!colorConfig.length) throw new Error("Read receiver config before sending custom mode.");

      setStatus("WRITING CUSTOM RGB…", "live");
      const cfg = colorConfig.map(x => new Uint8Array(x));
      for (const f of cfg) {
        f[1] = 0x04;
        f[2] = 0x0A;
        if (f[3] === 0) {
          f[8] = 0x01;
          f[14] = 0x00;
          f[15] = 21;
          f[17] = 0x01;
        }
        f[19] = checksum(f);
      }
      for (const f of cfg) await sendFrame(f, true);

      const frames = buildPerKeyFrames();
      for (const f of frames) await sendFrame(f, true);
      await sendFrame(makeFrame(0x0A, 0x01, 0, [0x04,0x07]), true);

      setStatus("CUSTOM RGB SENT", "ok");
      appendLog("custom 2.4G RGB stream sent: " + frames.length + " table frames + save.");
      setText("#wirelessPacketCount", (cfg.length + frames.length + 1) + " total frames sent");
    } catch (e) {
      setStatus("CUSTOM RGB WRITE FAILED", "live");
      appendLog("custom RGB write failed: " + (e?.message || e));
    }
  }

  function renderPacket(frame, valid, dir) {
    const box = $("#wirelessPacketLog");
    if (!box) return;
    const line = dir + "  " + hex(frame) + "  " + (valid ? "CHK OK" : "CHK FAIL");
    box.textContent = (line + "\\n" + box.textContent).slice(0, 14000);
  }

  function scanAuthorized() {
    if (!navigator.hid?.getDevices) return;
    navigator.hid.getDevices().then(devices => {
      const rx = devices.find(d => d.vendorId === RX_VID && d.productId === RX_PID);
      const bt = devices.find(d => d.vendorId === RX_VID && d.productId === BT_PID);
      if (rx && !S.receiver) openReceiver(rx).catch(e => appendLog("auto-open 2.4G failed: " + e.message));
      if (bt) {
        setBadge("btBadge", "BT HID authorized", "warn");
        setText("#btStatus", "Bluetooth HID device visible to WebHID");
      }
      setText("#deviceCount", devices.length + " authorized HID device(s)");
    }).catch(() => {});
  }

  function init() {
    $("#wirelessConnectBtn")?.addEventListener("click", connectReceiver);
    $("#wirelessDisconnectBtn")?.addEventListener("click", disconnectReceiver);
    $("#wirelessReadBtn")?.addEventListener("click", readConfig);
    $("#wirelessPrepareBtn")?.addEventListener("click", fillPerKeySolid);
    $("#wirelessSendBtn")?.addEventListener("click", streamCustomPerKey);
    $("#wirelessColor")?.addEventListener("input", updateColorLabel);
    $("#wirelessEffect")?.addEventListener("change", e => {
      S.selectedEffect = Number(e.target.value);
      appendLog("effect target set to " + S.selectedEffect);
    });

    if (navigator.hid) {
      navigator.hid.addEventListener("connect", e => {
        const d = e.device;
        if (d.vendorId === RX_VID && d.productId === RX_PID) {
          openReceiver(d).catch(err => appendLog("receiver hotplug failed: " + err.message));
        }
        if (d.vendorId === RX_VID && d.productId === BT_PID) {
          setBadge("btBadge", "BT HID connected", "warn");
          setText("#btStatus", "Bluetooth HID connected — vendor configuration unavailable in WebHID");
        }
      });
      navigator.hid.addEventListener("disconnect", e => {
        if (e.device === S.receiver) disconnectReceiver();
      });
    }

    updateColorLabel();
    setStatus("2.4G receiver offline", "live");
    setText("#deviceCount", "Scanning authorized HID…");
    scanAuthorized();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();

  window.F75Wireless = {
    connectReceiver,
    disconnectReceiver,
    readConfig,
    buildPerKeyFrames,
    validateFrame: validFrame
  };
})();
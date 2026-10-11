/* TRILYVA Native Voice Engine
 * First-party Tauri bridge for an optional, already-running VoiceStudio instance.
 * Only the Rust commands call a fixed loopback origin; this file has no remote URLs.
 */
(function () {
  'use strict';

  var tauri = window.__TAURI__;
  var invoke = tauri && tauri.core && tauri.core.invoke;
  if (typeof invoke !== 'function') return;

  var SR = 22050;
  var FILM_SECONDS = 300;
  var working = false;
  var online = false;
  var latestSrt = '';
  var context = null;
  var speakerMeta = {
    NARRATOR: { label: 'Narrator', gain: 0.88, pan: 0 },
    NORI: { label: 'Nori', gain: 0.92, pan: -0.08 },
    CAPTAIN: { label: 'Captain', gain: 0.86, pan: 0.12 },
    BUNNY: { label: 'Rabbit', gain: 0.88, pan: 0.18 }
  };

  function el(id) { return document.getElementById(id); }

  function injectStyles() {
    if (el('tvsNativeStyles')) return;
    var style = document.createElement('style');
    style.id = 'tvsNativeStyles';
    style.textContent = [
      '.tvs-native-panel{border:1px solid #36363d;background:#0b0b0e;padding:13px;display:flex;flex-direction:column;gap:10px}',
      '.tvs-native-head{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}',
      '.tvs-native-head strong{font-size:10px;letter-spacing:.14em;color:#f1f1f4}',
      '.tvs-native-badge{font-size:9px;color:#92929c;border:1px solid #35353c;padding:3px 6px;letter-spacing:.08em}',
      '.tvs-native-copy{font:10px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;color:#92929c;margin:0}',
      '.tvs-native-controls{display:grid;grid-template-columns:minmax(150px,1fr) auto auto;gap:7px;align-items:end}',
      '.tvs-native-field label{display:block;font:9px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.1em;color:#92929c;margin-bottom:5px;text-transform:uppercase}',
      '.tvs-native-field select{width:100%;min-width:0;background:#111114;border:1px solid #393940;color:#eee;padding:8px;font:10px ui-monospace,SFMono-Regular,Consolas,monospace}',
      '.tvs-native-voices{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}',
      '.tvs-native-status{font:10px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;color:#aaa;overflow-wrap:anywhere}',
      '.tvs-native-status.good{color:#eee}.tvs-native-status.bad{color:#c6a0a0}',
      '.tvs-native-actions{display:flex;gap:7px;flex-wrap:wrap}',
      '.tvs-native-actions .tvs-btn{flex:0 0 auto}',
      '.tvs-native-panel button[disabled]{opacity:.4;cursor:not-allowed}',
      '@media(max-width:760px){.tvs-native-controls{grid-template-columns:1fr 1fr}.tvs-native-controls .tvs-native-field{grid-column:1/-1}.tvs-native-voices{grid-template-columns:repeat(2,minmax(0,1fr))}}',
      '@media(max-width:430px){.tvs-native-controls,.tvs-native-voices{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(style);
  }

  function install() {
    var overlay = el('trilyvaVoiceStudio');
    if (!overlay || el('tvsNativePanel')) return;
    var status = el('tvsStatus');
    if (!status) return;
    injectStyles();

    var panel = document.createElement('section');
    panel.id = 'tvsNativePanel';
    panel.className = 'tvs-native-panel';
    panel.setAttribute('aria-label', 'VoiceStudio neural voice engine');
    panel.innerHTML = [
      '<div class="tvs-native-head"><strong>OPTIONAL / NEURAL VOICE ENGINE</strong><span class="tvs-native-badge">DESKTOP ONLY</span></div>',
      '<p class="tvs-native-copy">Use a VoiceStudio instance that you have installed and started yourself. TRILYVA connects only to 127.0.0.1:3900; it does not upload text, download models, or call a cloud service. The local engine and model must already be installed.</p>',
      '<div class="tvs-native-controls">',
      '  <div class="tvs-native-field"><label for="tvsNativeModel">Speech engine</label><select id="tvsNativeModel">',
      '    <option value="tts-1" selected>Active VoiceStudio engine</option>',
      '    <option value="omnivoice">OmniVoice</option>',
      '    <option value="voxcpm2">VoxCPM2</option>',
      '    <option value="cosyvoice">CosyVoice</option>',
      '    <option value="mlx-audio">MLX Audio</option>',
      '    <option value="kittentts">KittenTTS</option>',
      '    <option value="moss-tts-nano">MOSS TTS Nano</option>',
      '  </select></div>',
      '  <button type="button" class="tvs-btn" id="tvsNativeProbe">Check connection</button>',
      '  <button type="button" class="tvs-btn" id="tvsNativeLoadVoices" disabled>Load voices</button>',
      '</div>',
      '<div class="tvs-native-voices">',
      '  <div class="tvs-native-field"><label for="tvsVoiceNarrator">Narrator voice</label><select id="tvsVoiceNarrator"><option value="default">Default / active profile</option></select></div>',
      '  <div class="tvs-native-field"><label for="tvsVoiceNori">Nori voice</label><select id="tvsVoiceNori"><option value="default">Default / active profile</option></select></div>',
      '  <div class="tvs-native-field"><label for="tvsVoiceCaptain">Captain voice</label><select id="tvsVoiceCaptain"><option value="default">Default / active profile</option></select></div>',
      '  <div class="tvs-native-field"><label for="tvsVoiceBunny">Rabbit voice</label><select id="tvsVoiceBunny"><option value="default">Default / active profile</option></select></div>',
      '</div>',
      '<p class="tvs-native-copy">Load profiles to map separate voices to the four speakers. Engine names are offered by VoiceStudio but may not be installed or supported on this machine. Check the exact engine and weights licence before using generated audio in paid stock work.</p>',
      '<div class="tvs-native-actions"><button type="button" class="tvs-btn primary" id="tvsNativeBuild" disabled>Build 05:00 neural WAV</button><button type="button" class="tvs-btn" id="tvsNativeSrt" disabled>Download neural subtitles</button></div>',
      '<div class="tvs-native-status" id="tvsNativeState" role="status" aria-live="polite">VoiceStudio has not been checked.</div>'
    ].join('');

    status.insertAdjacentElement('beforebegin', panel);
    el('tvsNativeProbe').addEventListener('click', probe);
    el('tvsNativeLoadVoices').addEventListener('click', loadVoices);
    el('tvsNativeBuild').addEventListener('click', build);
    el('tvsNativeSrt').addEventListener('click', function () {
      if (!latestSrt) return;
      downloadBlob(new Blob([latestSrt], { type: 'text/plain;charset=utf-8' }), 'trilyva-neural-dialogue.en.srt');
    });
  }

  function setState(message, kind) {
    var state = el('tvsNativeState');
    if (state) {
      state.className = 'tvs-native-status' + (kind === 'good' ? ' good' : kind === 'bad' ? ' bad' : '');
      state.textContent = message;
    }
  }

  function setProgress(value) {
    var bar = el('tvsProgress');
    if (bar) bar.style.width = Math.max(0, Math.min(100, value)) + '%';
  }

  function setMainStatus(message) {
    var status = el('tvsStatus');
    if (status) {
      status.className = 'tvs-status';
      status.textContent = message;
    }
  }

  async function probe() {
    var button = el('tvsNativeProbe');
    button.disabled = true;
    setState('Checking the local VoiceStudio service…');
    try {
      var result = await invoke('voicestudio_probe');
      online = !!(result && result.online);
      setState(result && result.message ? result.message : (online ? 'VoiceStudio is ready.' : 'VoiceStudio was not found.'), online ? 'good' : 'bad');
      el('tvsNativeLoadVoices').disabled = !online;
      el('tvsNativeBuild').disabled = !online;
    } catch (error) {
      online = false;
      el('tvsNativeLoadVoices').disabled = true;
      el('tvsNativeBuild').disabled = true;
      setState('Native connector failed: ' + String(error && error.message || error), 'bad');
    } finally {
      button.disabled = false;
    }
  }

  function extractVoices(payload) {
    var list = [];
    if (Array.isArray(payload)) list = payload;
    else if (payload && typeof payload === 'object') {
      var candidates = [payload.data, payload.voices, payload.items, payload.results, payload.profiles];
      for (var i = 0; i < candidates.length; i++) {
        if (Array.isArray(candidates[i])) { list = candidates[i]; break; }
      }
      if (!list.length && payload.data && typeof payload.data === 'object') {
        var nested = payload.data.voices || payload.data.profiles || payload.data.items;
        if (Array.isArray(nested)) list = nested;
      }
    }

    var seen = Object.create(null);
    return list.slice(0, 500).map(function (item) {
      if (typeof item === 'string') return { id: item, label: item };
      if (!item || typeof item !== 'object') return null;
      var id = item.id || item.voice_id || item.profile_id || item.value || item.name;
      var label = item.name || item.label || item.display_name || item.title || id;
      if (id == null) return null;
      id = String(id).trim();
      label = String(label == null ? id : label).trim();
      if (!id || id.length > 200 || /[\u0000-\u001f]/.test(id) || seen[id]) return null;
      seen[id] = true;
      return { id: id, label: label.slice(0, 140) || id };
    }).filter(Boolean);
  }

  async function loadVoices() {
    var button = el('tvsNativeLoadVoices');
    button.disabled = true;
    setState('Loading local VoiceStudio voice profiles…');
    try {
      var payload = await invoke('voicestudio_voices');
      var voices = extractVoices(payload);
      if (!voices.length) {
        setState('The local endpoint answered but did not return a recognised voice list. The default profile remains available.', 'bad');
        return;
      }
      ['tvsVoiceNarrator', 'tvsVoiceNori', 'tvsVoiceCaptain', 'tvsVoiceBunny'].forEach(function (id) {
        var select = el(id);
        var previous = select.value;
        select.innerHTML = '';
        var defaultOption = document.createElement('option');
        defaultOption.value = 'default';
        defaultOption.textContent = 'Default / active profile';
        select.appendChild(defaultOption);
        voices.forEach(function (voice) {
          var option = document.createElement('option');
          option.value = voice.id;
          option.textContent = voice.label;
          select.appendChild(option);
        });
        if (Array.from(select.options).some(function (option) { return option.value === previous; })) select.value = previous;
      });
      setState('Loaded ' + voices.length + ' local voice profiles. Assign a profile to each speaker.', 'good');
    } catch (error) {
      setState('Could not load profiles: ' + String(error && error.message || error), 'bad');
    } finally {
      button.disabled = !online;
    }
  }

  function parseTime(value) {
    var parts = String(value).trim().split(':');
    if (parts.length === 2) {
      var minutes = Number(parts[0]), seconds = Number(parts[1]);
      if (!Number.isInteger(minutes) || !Number.isFinite(seconds) || seconds < 0 || seconds >= 60) return NaN;
      return minutes * 60 + seconds;
    }
    if (parts.length === 3) {
      var hours = Number(parts[0]), mins = Number(parts[1]), secs = Number(parts[2]);
      if (!Number.isInteger(hours) || !Number.isInteger(mins) || mins < 0 || mins >= 60 ||
          !Number.isFinite(secs) || secs < 0 || secs >= 60) return NaN;
      return hours * 3600 + mins * 60 + secs;
    }
    return NaN;
  }

  function parseScript(raw) {
    var rows = [], errors = [];
    String(raw).split(/\r?\n/).forEach(function (line, index) {
      var value = line.trim();
      if (!value || value.charAt(0) === '#') return;
      var pieces = value.split('|');
      if (pieces.length < 3) {
        errors.push('Line ' + (index + 1) + ': use MM:SS | SPEAKER | dialogue.');
        return;
      }
      var start = parseTime(pieces.shift());
      var speaker = String(pieces.shift()).trim().toUpperCase();
      var text = pieces.join('|').trim();
      if (!Number.isFinite(start) || start < 0 || start >= FILM_SECONDS) {
        errors.push('Line ' + (index + 1) + ': time must be inside 00:00–04:59.');
        return;
      }
      if (!speakerMeta[speaker]) {
        errors.push('Line ' + (index + 1) + ': unknown speaker. Use NARRATOR, NORI, CAPTAIN, or BUNNY.');
        return;
      }
      if (!text) {
        errors.push('Line ' + (index + 1) + ': dialogue is empty.');
        return;
      }
      if (text.length > 4096) {
        errors.push('Line ' + (index + 1) + ': VoiceStudio accepts at most 4096 characters per cue.');
        return;
      }
      rows.push({ start: start, speaker: speaker, text: text, sourceLine: index + 1, duration: 0 });
    });
    rows.sort(function (a, b) { return a.start - b.start || a.sourceLine - b.sourceLine; });
    return { rows: rows, errors: errors };
  }

  function voiceFor(speaker) {
    var ids = {
      NARRATOR: 'tvsVoiceNarrator',
      NORI: 'tvsVoiceNori',
      CAPTAIN: 'tvsVoiceCaptain',
      BUNNY: 'tvsVoiceBunny'
    };
    return el(ids[speaker]).value || 'default';
  }

  async function audioForCue(row, model, voice, initialSpeed, maxDuration, total, index) {
    var speed = initialSpeed;
    var decoded = null;
    var attempts = 0;
    while (attempts < 3) {
      setMainStatus('Neural synthesis ' + (index + 1) + '/' + total + ' · ' + speakerMeta[row.speaker].label +
        ' · line ' + row.sourceLine + ' · speed ' + speed.toFixed(2) + '×');
      var result = await invoke('voicestudio_synthesize', {
        input: row.text,
        model: model,
        voice: voice,
        speed: speed
      });
      if (!result || typeof result.audioBase64 !== 'string') throw new Error('VoiceStudio returned no audio bytes for line ' + row.sourceLine + '.');
      var binary = atob(result.audioBase64);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      if (!context) {
        var AudioContextType = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextType) throw new Error('This native WebView does not expose the Web Audio decoding API.');
        context = new AudioContextType();
      }
      decoded = await context.decodeAudioData(bytes.buffer.slice(0));
      attempts++;
      if (!Number.isFinite(decoded.duration) || decoded.duration <= 0) throw new Error('VoiceStudio returned an empty audio cue.');
      if (decoded.duration <= maxDuration || speed >= 3.95 || attempts >= 3) break;
      var adjusted = Math.min(4, Math.max(speed * 1.12, speed * (decoded.duration / maxDuration) * 1.025));
      if (adjusted <= speed + 0.01) break;
      speed = adjusted;
    }
    return decoded;
  }

  function mixAudio(left, right, row, audioBuffer, maxDuration) {
    var meta = speakerMeta[row.speaker];
    var start = Math.round(row.start * SR);
    var sourceRate = audioBuffer.sampleRate;
    var sourceFrames = audioBuffer.length;
    var estimatedFrames = Math.ceil(sourceFrames * SR / sourceRate);
    var space = left.length - start;
    var maxFrames = Math.max(1, Math.floor(Math.min(maxDuration, space / SR) * SR));
    var count = Math.min(estimatedFrames, maxFrames, space);
    var c0 = audioBuffer.getChannelData(0);
    var c1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : c0;
    var leftGain = meta.gain * Math.sqrt((1 - meta.pan) / 2);
    var rightGain = meta.gain * Math.sqrt((1 + meta.pan) / 2);
    var clipped = estimatedFrames > count;

    for (var i = 0; i < count; i++) {
      var position = i * sourceRate / SR;
      var p0 = Math.min(sourceFrames - 1, Math.floor(position));
      var p1 = Math.min(sourceFrames - 1, p0 + 1);
      var fraction = position - p0;
      var mono0 = c0[p0] + (c0[p1] - c0[p0]) * fraction;
      var mono1 = c1[p0] + (c1[p1] - c1[p0]) * fraction;
      var sample = (mono0 + mono1) * 0.5;
      var fadeIn = Math.min(1, i / Math.max(1, Math.round(SR * 0.008)));
      var fadeOut = Math.min(1, (count - 1 - i) / Math.max(1, Math.round(SR * 0.025)));
      var env = Math.max(0, Math.min(fadeIn, fadeOut));
      left[start + i] += sample * leftGain * env;
      right[start + i] += sample * rightGain * env;
    }
    row.duration = count / SR;
    return clipped;
  }

  function writeWav(left, right) {
    var frames = Math.min(left.length, right.length);
    var buffer = new ArrayBuffer(44 + frames * 4);
    var view = new DataView(buffer);
    function writeText(offset, value) {
      for (var i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    }
    writeText(0, 'RIFF');
    view.setUint32(4, 36 + frames * 4, true);
    writeText(8, 'WAVE');
    writeText(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 2, true);
    view.setUint32(24, SR, true);
    view.setUint32(28, SR * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    writeText(36, 'data');
    view.setUint32(40, frames * 4, true);
    var offset = 44;
    for (var i = 0; i < frames; i++) {
      var l = Math.max(-1, Math.min(1, left[i]));
      var r = Math.max(-1, Math.min(1, right[i]));
      view.setInt16(offset, l < 0 ? l * 32768 : l * 32767, true);
      offset += 2;
      view.setInt16(offset, r < 0 ? r * 32768 : r * 32767, true);
      offset += 2;
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  function stamp(seconds) {
    var ms = Math.max(0, Math.round(seconds * 1000));
    var hours = Math.floor(ms / 3600000); ms %= 3600000;
    var minutes = Math.floor(ms / 60000); ms %= 60000;
    var secs = Math.floor(ms / 1000); ms %= 1000;
    function pad(number, size) { return String(number).padStart(size, '0'); }
    return pad(hours, 2) + ':' + pad(minutes, 2) + ':' + pad(secs, 2) + ',' + pad(ms, 3);
  }

  function buildSrt(rows) {
    return rows.map(function (row, index) {
      var end = Math.min(FILM_SECONDS, Math.max(row.start + 0.12, row.start + row.duration));
      return (index + 1) + '\n' + stamp(row.start) + ' --> ' + stamp(end) + '\n' +
        '[' + speakerMeta[row.speaker].label + '] ' + row.text + '\n';
    }).join('\n');
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  async function build() {
    if (working || !online) return;
    if (el('tvsBuild').disabled) {
      setState('The built-in voice renderer is busy. Wait for it to finish before starting the neural engine.', 'bad');
      return;
    }
    var parsed = parseScript(el('tvsScript').value);
    if (parsed.errors.length) {
      setState('Fix the dialogue script first: ' + parsed.errors.slice(0, 4).join(' '), 'bad');
      setMainStatus('Neural render stopped: the dialogue script has validation errors.');
      return;
    }
    if (!parsed.rows.length) {
      setState('The dialogue script is empty.', 'bad');
      return;
    }

    working = true;
    var button = el('tvsNativeBuild');
    var checkButton = el('tvsNativeProbe');
    var voicesButton = el('tvsNativeLoadVoices');
    var srtButton = el('tvsNativeSrt');
    var localButton = el('tvsBuild');
    var localSrtButton = el('tvsSrt');
    var localSrtWasEnabled = !localSrtButton.disabled;
    var succeeded = false;
    var total = Math.round(SR * FILM_SECONDS);
    var model = el('tvsNativeModel').value || 'tts-1';
    var initialSpeed = Number(el('tvsRate').value) || 1;
    var left = new Float32Array(total);
    var right = new Float32Array(total);
    var clipped = 0;
    var outputLink = el('tvsDownload');
    button.disabled = true;
    checkButton.disabled = true;
    voicesButton.disabled = true;
    srtButton.disabled = true;
    localButton.disabled = true;
    localSrtButton.disabled = true;
    setProgress(0);
    setState('Generating a timed dialogue track in the selected local engine…');
    setMainStatus('Preparing ' + parsed.rows.length + ' neural dialogue cues. Keep TRILYVA open.');
    try {
      for (var i = 0; i < parsed.rows.length; i++) {
        var row = parsed.rows[i];
        var nextStart = i + 1 < parsed.rows.length ? parsed.rows[i + 1].start : FILM_SECONDS;
        var maxDuration = Math.max(0.2, nextStart - row.start - 0.035);
        var audioBuffer = await audioForCue(row, model, voiceFor(row.speaker), initialSpeed, maxDuration, parsed.rows.length, i);
        if (mixAudio(left, right, row, audioBuffer, maxDuration)) clipped++;
        setProgress(((i + 1) / parsed.rows.length) * 90);
        setState('Synthesizing cue ' + (i + 1) + ' of ' + parsed.rows.length + ' · ' + row.start.toFixed(1) + ' s');
        await new Promise(function (resolve) { window.setTimeout(resolve, 0); });
      }

      setMainStatus('Writing the five-minute stereo PCM WAV…');
      setProgress(94);
      await new Promise(function (resolve) { window.setTimeout(resolve, 0); });
      var blob = writeWav(left, right);
      latestSrt = buildSrt(parsed.rows);
      if (outputLink.dataset.url) {
        try { URL.revokeObjectURL(outputLink.dataset.url); } catch (_) {}
      }
      var outputUrl = URL.createObjectURL(blob);
      outputLink.dataset.url = outputUrl;
      outputLink.href = outputUrl;
      outputLink.download = 'trilyva-neural-voice-track.wav';
      outputLink.textContent = 'Download WAV';
      outputLink.hidden = false;
      srtButton.disabled = false;
      localSrtButton.disabled = true;
      succeeded = true;
      try {
        window.dispatchEvent(new CustomEvent('trilyva:voice-track-ready', {
          detail: { blob: blob, durationSeconds: FILM_SECONDS, sampleRate: SR, engine: model }
        }));
      } catch (_) {}
      setProgress(100);
      var message = 'READY · 05:00 WAV · ' + (blob.size / 1048576).toFixed(1) + ' MB · ' + parsed.rows.length + ' neural cues.';
      if (clipped) message += ' ' + clipped + ' cue(s) reached their time boundary and were faded to avoid overlap.';
      setState(message, clipped ? '' : 'good');
      setMainStatus(message + ' Use “Finish Movie” to combine it with your rendered video.');
    } catch (error) {
      setProgress(0);
      setState('Neural render failed: ' + String(error && error.message || error), 'bad');
      setMainStatus('Neural render stopped. No partial WAV was downloaded. Check the local engine and retry.');
    } finally {
      working = false;
      button.disabled = !online;
      checkButton.disabled = false;
      voicesButton.disabled = !online;
      localButton.disabled = false;
      localSrtButton.disabled = succeeded ? true : !localSrtWasEnabled;
      if (context && context.state === 'running') {
        try { await context.suspend(); } catch (_) {}
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();

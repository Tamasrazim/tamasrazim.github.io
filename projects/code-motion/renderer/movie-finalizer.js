/* TRILYVA Movie Finalizer — local video + audio assembly.
 * Uses built-in HTML media capture and MediaRecorder. No external runtime,
 * network requests, codecs downloads, or cloud services.
 *
 * This is a real-time WebM finalizer: duration is approximately the source
 * video's duration. The browser decodes/re-encodes the video while it plays.
 */
(function () {
  'use strict';

  var overlay, videoInput, audioInput, videoEl, audioEl, startBtn, cancelBtn;
  var statusEl, progressEl, qualityEl, keepAudioEl, videoInfo, audioInfo;
  var recorder = null, chunks = [], working = false, cancelled = false, recordingError = '';
  var videoBlob = null, audioBlob = null, audioLabel = '', videoLabel = '';
  var videoUrl = '', audioUrl = '', outputUrl = '';
  var sourceVideoStream = null, sourceAudioStream = null, mixedStream = null;
  var lastGeneratedTrack = null, startedAt = 0, pollTimer = null;

  function $(id) { return document.getElementById(id); }
  function setStatus(message, kind) {
    if (!statusEl) return;
    statusEl.className = 'tmf-status' + (kind ? ' tmf-' + kind : '');
    statusEl.textContent = message;
  }
  function setProgress(fraction) {
    if (progressEl) progressEl.style.width = Math.round(Math.max(0, Math.min(1, fraction)) * 100) + '%';
  }
  function humanTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
    var s = Math.floor(seconds);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  function formatBytes(n) {
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }
  function chooseMime(hasAudio) {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    var candidates = hasAudio
      ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    for (var i = 0; i < candidates.length; i++) {
      try { if (MediaRecorder.isTypeSupported(candidates[i])) return candidates[i]; } catch (_) {}
    }
    return '';
  }
  function revokeUrl(url) {
    if (url) { try { URL.revokeObjectURL(url); } catch (_) {} }
  }
  function closeInputUrl(which) {
    if (which === 'video') { revokeUrl(videoUrl); videoUrl = ''; }
    else { revokeUrl(audioUrl); audioUrl = ''; }
  }
  function triggerDownload(blob, filename) {
    revokeUrl(outputUrl);
    outputUrl = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = outputUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  function supportsCapture() {
    return !!(window.MediaRecorder && videoEl &&
      (typeof videoEl.captureStream === 'function' || typeof videoEl.mozCaptureStream === 'function'));
  }
  function mediaReady(el) {
    return new Promise(function (resolve, reject) {
      if (el.readyState >= 2 && Number.isFinite(el.duration)) { resolve(); return; }
      var done = false;
      function clean() {
        el.removeEventListener('loadedmetadata', check);
        el.removeEventListener('canplay', check);
        el.removeEventListener('error', fail);
      }
      function check() {
        if (!done && el.readyState >= 2 && Number.isFinite(el.duration)) {
          done = true; clean(); resolve();
        }
      }
      function fail() {
        if (done) return;
        done = true; clean();
        reject(new Error('The browser could not decode the selected media file.'));
      }
      el.addEventListener('loadedmetadata', check);
      el.addEventListener('canplay', check);
      el.addEventListener('error', fail);
      check();
    });
  }
  function updateButtons() {
    var ready = !!videoBlob && !!videoEl && Number.isFinite(videoEl.duration) &&
      videoEl.duration > 0 && supportsCapture() && !!chooseMime(!!audioBlob);
    if (startBtn) startBtn.disabled = working || !ready;
    if (cancelBtn) cancelBtn.disabled = !working;
  }
  function open() {
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    $('tmfClose').focus();
    if (!supportsCapture()) setStatus('This browser does not expose media capture + MediaRecorder. Use a recent Chromium-based browser for local WebM finishing.', 'warn');
  }
  function close() {
    if (working) {
      setStatus('Stop or finish the active recording before closing this window.', 'warn');
      return;
    }
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function injectCss() {
    if ($('trilyvaMovieFinalizerCss')) return;
    var style = document.createElement('style');
    style.id = 'trilyvaMovieFinalizerCss';
    style.textContent = [
      '#trilyvaMovieFinalizerBtn{border:1px solid #45454d;padding:7px 10px!important;color:#f5f5f5!important;white-space:nowrap}',
      '.tmf-overlay{position:fixed;inset:0;z-index:12010;background:rgba(0,0,0,.86);backdrop-filter:blur(12px);display:none;align-items:center;justify-content:center;padding:20px;color:#eee}',
      '.tmf-overlay.open{display:flex}.tmf-window{width:min(950px,100%);max-height:calc(100vh - 40px);overflow:auto;background:#09090b;border:1px solid #34343b;box-shadow:0 25px 100px #000;font:13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}',
      '.tmf-head{display:flex;align-items:center;gap:14px;padding:17px 20px;border-bottom:1px solid #29292e}.tmf-head strong{font:600 14px/1.2 ui-sans-serif,system-ui;letter-spacing:.12em}.tmf-head small{color:#8a8a94;font-size:10px;letter-spacing:.1em}.tmf-spacer{flex:1}.tmf-x{width:33px;height:33px;border:1px solid #38383f;color:#eee;font-size:20px}',
      '.tmf-body{padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px}.tmf-card{border:1px solid #2c2c32;background:#0d0d10;padding:14px;min-width:0}.tmf-label{display:block;color:#a1a1aa;font-size:10px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 8px}.tmf-card input[type=file],.tmf-card select{width:100%;font:11px ui-monospace,Consolas,monospace;color:#ddd;background:#121216;border:1px solid #393940;padding:10px;max-width:100%}',
      '.tmf-meta{color:#94949e;font-size:11px;margin-top:8px;min-height:18px;overflow-wrap:anywhere}.tmf-note{font:11px/1.65 ui-sans-serif,system-ui;color:#92929b}.tmf-actions{display:flex;gap:8px;flex-wrap:wrap;padding:0 20px 16px}.tmf-btn{background:#141417;color:#f4f4f5;border:1px solid #424249;padding:10px 13px;font:600 10px/1.2 ui-monospace,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;text-decoration:none}.tmf-btn:hover:not(:disabled){background:#f4f4f5;color:#09090b}.tmf-btn.primary{background:#f3f3f4;color:#09090b;border-color:#f3f3f4}.tmf-btn:disabled{opacity:.4;cursor:not-allowed}',
      '.tmf-status{margin:0 20px 12px;padding:12px;background:#101013;border:1px solid #29292f;min-height:44px;font-size:11px;color:#bbb;overflow-wrap:anywhere}.tmf-progress{height:3px;background:#24242a;margin:0 20px 20px;overflow:hidden}.tmf-progress i{display:block;width:0;height:100%;background:#eee;transition:width .15s linear}.tmf-green{color:#d7e7d6}.tmf-warn{color:#f0d19d}.tmf-error{color:#f3a5a5}',
      '.tmf-hidden-media{position:fixed;left:-10000px;top:0;width:640px;height:360px;opacity:.001;pointer-events:none;z-index:-1}',
      '@media(max-width:650px){.tmf-overlay{padding:0}.tmf-window{height:100dvh;max-height:100dvh;border:0}.tmf-body{grid-template-columns:1fr;padding:12px}.tmf-head{padding:13px}.tmf-actions{padding:0 12px 12px}.tmf-status{margin:0 12px 12px}.tmf-progress{margin:0 12px 16px}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function init() {
    var nav = document.querySelector('.hdr-acts');
    if (!nav || $('trilyvaMovieFinalizerBtn')) return;
    injectCss();

    var button = document.createElement('button');
    button.id = 'trilyvaMovieFinalizerBtn';
    button.type = 'button';
    button.textContent = 'Finish Movie';
    button.title = 'Combine a rendered video and local audio into one WebM movie';
    button.addEventListener('click', open);
    var voiceButton = $('trilyvaVoiceStudioBtn');
    if (voiceButton && voiceButton.parentNode === nav) voiceButton.insertAdjacentElement('afterend', button);
    else nav.appendChild(button);

    overlay = document.createElement('div');
    overlay.id = 'trilyvaMovieFinalizer';
    overlay.className = 'tmf-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'TRILYVA Finish Movie');
    overlay.innerHTML = [
      '<section class="tmf-window">',
      '<header class="tmf-head"><div><strong>TRILYVA / FINISH MOVIE</strong><br><small>LOCAL ASSEMBLY · VIDEO + AUDIO → WEBM</small></div><div class="tmf-spacer"></div><button class="tmf-x" id="tmfClose" aria-label="Close">×</button></header>',
      '<div class="tmf-body">',
      '<section class="tmf-card"><label class="tmf-label" for="tmfVideoFile">01 / Rendered video or stock clip</label><input id="tmfVideoFile" type="file" accept="video/*,.mp4,.webm,.mov,.m4v"><div class="tmf-meta" id="tmfVideoInfo">No video selected.</div><p class="tmf-note">Choose the video exported from TRILYVA. Common browser-decodable MP4 and WebM sources are supported. The source video duration determines the final length.</p></section>',
      '<section class="tmf-card"><label class="tmf-label" for="tmfAudioFile">02 / Dialogue, music, or soundtrack (optional)</label><input id="tmfAudioFile" type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm"><div class="tmf-meta" id="tmfAudioInfo">No audio selected — video-only output.</div><div class="tmf-actions" style="padding:10px 0 0"><button class="tmf-btn" id="tmfUseGenerated" disabled>Use generated Voice Studio WAV</button><button class="tmf-btn" id="tmfClearAudio">Video only</button></div><p class="tmf-note">Use the generated five-minute dialogue/soundtrack WAV or import any local audio track. Audio begins at 00:00; if it is shorter than the video, the remainder is silent.</p></section>',
      '<section class="tmf-card"><label class="tmf-label" for="tmfQuality">03 / WebM encoding quality</label><select id="tmfQuality"><option value="8">Standard · 8 Mbps</option><option value="16" selected>High · 16 Mbps</option><option value="28">Very high · 28 Mbps</option><option value="45">4K / high motion · 45 Mbps</option><option value="65">Maximum · 65 Mbps</option></select><div class="tmf-meta">Output: WebM video; Opus audio when a soundtrack is selected.</div><p class="tmf-note">Available bitrate and resolution are bounded by the browser, source file, and hardware encoder. This finalizer preserves the decoded source dimensions; it does not upscale the clip.</p></section>',
      '<section class="tmf-card"><label class="tmf-label">04 / Render method</label><div class="tmf-meta">Real-time media capture</div><p class="tmf-note">The browser plays the source video at normal speed while recording its video stream and the selected audio. A five-minute source therefore takes about five minutes to finalize. Keep this tab open while recording.</p><p class="tmf-note">This is fully local but re-encodes the video. For lossless stock delivery, keep your original render and use a separate validated muxing workflow where available.</p></section>',
      '</div>',
      '<div class="tmf-actions"><button class="tmf-btn primary" id="tmfStart" disabled>Create finished movie</button><button class="tmf-btn" id="tmfCancel" disabled>Cancel render</button></div>',
      '<div class="tmf-status" id="tmfStatus" role="status" aria-live="polite">Choose a video. Audio is optional. No files are uploaded.</div><div class="tmf-progress"><i id="tmfProgress"></i></div>',
      '</section>',
      '<video class="tmf-hidden-media" id="tmfSourceVideo" playsinline preload="auto"></video>',
      '<audio class="tmf-hidden-media" id="tmfSourceAudio" preload="auto"></audio>'
    ].join('');
    document.body.appendChild(overlay);

    videoInput = $('tmfVideoFile');
    audioInput = $('tmfAudioFile');
    videoEl = $('tmfSourceVideo');
    audioEl = $('tmfSourceAudio');
    startBtn = $('tmfStart');
    cancelBtn = $('tmfCancel');
    statusEl = $('tmfStatus');
    progressEl = $('tmfProgress');
    qualityEl = $('tmfQuality');
    keepAudioEl = $('tmfUseGenerated');
    videoInfo = $('tmfVideoInfo');
    audioInfo = $('tmfAudioInfo');

    $('tmfClose').addEventListener('click', close);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });
    videoInput.addEventListener('change', onVideoSelected);
    audioInput.addEventListener('change', onAudioSelected);
    keepAudioEl.addEventListener('click', useGeneratedAudio);
    $('tmfClearAudio').addEventListener('click', clearAudio);
    startBtn.addEventListener('click', startRecording);
    cancelBtn.addEventListener('click', cancelRecording);
    window.addEventListener('trilyva:voice-track-ready', function (e) {
      if (!e.detail || !(e.detail.blob instanceof Blob)) return;
      lastGeneratedTrack = e.detail.blob;
      keepAudioEl.disabled = false;
      keepAudioEl.textContent = 'Use generated Voice Studio WAV';
      if (!audioBlob) setStatus('Voice Studio WAV is ready to use. Select a video, then click “Use generated Voice Studio WAV”.', 'green');
    });
    updateButtons();
  }

  async function onVideoSelected() {
    if (working) return;
    var file = videoInput.files && videoInput.files[0];
    if (!file) return;
    if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name)) {
      setStatus('Select a video file (MP4 or WebM recommended).', 'error');
      return;
    }
    closeInputUrl('video');
    videoBlob = file;
    videoLabel = file.name;
    videoUrl = URL.createObjectURL(file);
    videoInfo.textContent = 'Loading local file…';
    videoEl.src = videoUrl;
    videoEl.muted = true;
    videoEl.load();
    setStatus('Reading video metadata locally…');
    try {
      await mediaReady(videoEl);
      videoInfo.textContent = file.name + ' · ' + Math.round(videoEl.videoWidth) + '×' + Math.round(videoEl.videoHeight) + ' · ' + humanTime(videoEl.duration) + ' · ' + formatBytes(file.size);
      setStatus('Video ready. Select an optional audio file or use Voice Studio’s generated WAV.', 'green');
    } catch (e) {
      videoBlob = null;
      videoInfo.textContent = 'This file could not be decoded by the browser.';
      setStatus(e.message, 'error');
    }
    updateButtons();
  }

  async function onAudioSelected() {
    if (working) return;
    var file = audioInput.files && audioInput.files[0];
    if (!file) return;
    if (!file.type.startsWith('audio/') && !/\.(wav|mp3|m4a|ogg|aac|flac|webm)$/i.test(file.name)) {
      setStatus('Select an audio file (WAV recommended).', 'error');
      return;
    }
    closeInputUrl('audio');
    audioBlob = file;
    audioLabel = file.name;
    audioUrl = URL.createObjectURL(file);
    audioEl.src = audioUrl;
    audioEl.load();
    audioInfo.textContent = 'Loading local audio…';
    try {
      await mediaReady(audioEl);
      audioInfo.textContent = file.name + ' · ' + humanTime(audioEl.duration) + ' · ' + formatBytes(file.size);
      setStatus('Audio ready. The soundtrack will begin at the start of the video.', 'green');
    } catch (e) {
      audioBlob = null;
      audioInfo.textContent = 'This file could not be decoded by the browser.';
      setStatus(e.message, 'error');
    }
    updateButtons();
  }

  function useGeneratedAudio() {
    if (!lastGeneratedTrack || working) return;
    closeInputUrl('audio');
    audioInput.value = '';
    audioBlob = lastGeneratedTrack;
    audioLabel = 'nori-and-the-last-light-voice-track.wav';
    audioUrl = URL.createObjectURL(audioBlob);
    audioEl.src = audioUrl;
    audioEl.load();
    audioInfo.textContent = audioLabel + ' · 05:00 · generated in this session';
    mediaReady(audioEl).then(updateButtons).catch(function (e) {
      setStatus('Generated WAV could not be decoded: ' + e.message, 'error');
    });
    setStatus('Using the Voice Studio track. Choose the source video, then create the movie.', 'green');
    updateButtons();
  }

  function clearAudio() {
    if (working) return;
    audioBlob = null;
    audioLabel = '';
    audioInput.value = '';
    closeInputUrl('audio');
    audioEl.removeAttribute('src');
    audioEl.load();
    audioInfo.textContent = 'No audio selected — video-only output.';
    setStatus('Video-only output selected.', 'green');
    updateButtons();
  }

  function updateButtons() {
    if (!startBtn) return;
    var ready = !!videoBlob && !!videoEl && videoEl.readyState >= 2 &&
      Number.isFinite(videoEl.duration) && videoEl.duration > 0 &&
      (!audioBlob || (audioEl && audioEl.readyState >= 2 && Number.isFinite(audioEl.duration))) &&
      supportsCapture() && !!chooseMime(!!audioBlob);
    startBtn.disabled = working || !ready;
    cancelBtn.disabled = !working;
  }

  async function startRecording() {
    if (working || !videoBlob) return;
    if (!supportsCapture()) {
      setStatus('This browser lacks the required media capture API. Use an up-to-date Chromium-based browser.', 'error');
      return;
    }
    var mime = chooseMime(!!audioBlob);
    if (!mime) {
      setStatus('No compatible WebM MediaRecorder codec is available in this browser.', 'error');
      return;
    }
    cancelled = false;
    recordingError = '';
    working = true;
    chunks = [];
    updateButtons();
    setProgress(0);
    startBtn.disabled = true;
    setStatus('Preparing local media capture. Do not close or navigate away from this tab…');

    try {
      videoEl.pause();
      videoEl.currentTime = 0;
      videoEl.muted = true;

      sourceVideoStream = (videoEl.captureStream || videoEl.mozCaptureStream).call(videoEl);
      var videoTracks = sourceVideoStream.getVideoTracks();
      if (!videoTracks.length) throw new Error('The selected video did not produce a capturable video track.');

      // Do not accidentally export the source video's own audio as a second,
      // unsynchronised audio track. The selected soundtrack is the sole audio.
      sourceVideoStream.getAudioTracks().forEach(function (track) {
        try { sourceVideoStream.removeTrack(track); } catch (_) {}
        try { track.stop(); } catch (_) {}
      });

      var tracks = videoTracks.slice();
      if (audioBlob) {
        audioEl.pause();
        audioEl.currentTime = 0;
        if (!(audioEl.captureStream || audioEl.mozCaptureStream)) {
          throw new Error('This browser cannot capture the chosen audio stream.');
        }
        sourceAudioStream = (audioEl.captureStream || audioEl.mozCaptureStream).call(audioEl);
        var audioTracks = sourceAudioStream.getAudioTracks();
        if (!audioTracks.length) throw new Error('The selected audio did not produce a capturable audio track.');
        tracks = tracks.concat(audioTracks);
      }
      mixedStream = new MediaStream(tracks);
      var bitrate = Math.round(Number(qualityEl.value) * 1000000);
      var config = { mimeType: mime, videoBitsPerSecond: bitrate };
      if (audioBlob) config.audioBitsPerSecond = 192000;
      recorder = new MediaRecorder(mixedStream, config);
      recorder.ondataavailable = function (e) {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      recorder.onerror = function (e) {
        var error = e.error || new Error('MediaRecorder reported an unknown error.');
        recordingError = String(error.message || error);
        setStatus('Recording error: ' + recordingError + '. Discarding incomplete output…', 'error');
        try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch (_) {}
      };
      recorder.onstop = onRecordingStopped;
      videoEl.onended = function () {
        try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch (_) {}
      };
      recorder.start(1000);
      startedAt = Date.now();
      pollTimer = window.setInterval(function () {
        if (!working) return;
        var duration = Number.isFinite(videoEl.duration) ? videoEl.duration : 0;
        var pos = Number.isFinite(videoEl.currentTime) ? videoEl.currentTime : 0;
        setProgress(duration > 0 ? pos / duration : 0);
        setStatus('Recording local WebM · ' + humanTime(pos) + ' / ' + humanTime(duration) +
          ' · ' + mime + ' · elapsed wall time ' + humanTime((Date.now() - startedAt) / 1000));
      }, 250);

      // Both play() calls are triggered directly from the user's start action
      // after source selection has already resolved metadata.
      var vp = videoEl.play();
      var ap = audioBlob ? audioEl.play() : Promise.resolve();
      await Promise.all([vp, ap]);
      setStatus('Recording started. The final file will download when the source video ends.', 'green');
    } catch (e) {
      var message = String(e && e.message || e);
      cancelled = true;
      try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch (_) {}
      stopStreams();
      working = false;
      updateButtons();
      setStatus('Could not start finalization: ' + message, 'error');
    }
  }

  function stopStreams() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    try { if (videoEl) videoEl.pause(); } catch (_) {}
    try { if (audioEl) audioEl.pause(); } catch (_) {}
    [sourceVideoStream, sourceAudioStream, mixedStream].forEach(function (stream) {
      if (stream) stream.getTracks().forEach(function (track) { try { track.stop(); } catch (_) {} });
    });
    sourceVideoStream = sourceAudioStream = mixedStream = null;
    if (videoEl) videoEl.onended = null;
  }

  function cancelRecording() {
    if (!working) return;
    cancelled = true;
    setStatus('Cancelling. The incomplete output will be discarded…', 'warn');
    try {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      else {
        stopStreams(); working = false; updateButtons();
        setStatus('Cancelled. No output file was kept.', 'warn');
      }
    } catch (e) {
      stopStreams(); working = false; updateButtons();
      setStatus('Cancelled. ' + e.message, 'warn');
    }
  }

  function onRecordingStopped() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    var wasCancelled = cancelled;
    var recordedMime = (recorder && recorder.mimeType) || 'video/webm';
    stopStreams();
    recorder = null;
    working = false;
    updateButtons();
    if (wasCancelled || recordingError) {
      chunks = [];
      setProgress(0);
      if (recordingError) setStatus('Recording failed. The incomplete movie was discarded: ' + recordingError, 'error');
      else setStatus('Cancelled. The incomplete movie was discarded.', 'warn');
      recordingError = '';
      return;
    }
    if (!chunks.length) {
      setStatus('No output data was received from MediaRecorder. The source may use an unsupported codec.', 'error');
      return;
    }
    var blob = new Blob(chunks, { type: recordedMime });
    chunks = [];
    if (blob.size < 1024) {
      setStatus('The recording is unexpectedly small (' + blob.size + ' bytes); no file was downloaded.', 'error');
      return;
    }
    setProgress(1);
    var base = (videoLabel || 'trilyva-movie').replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'trilyva-movie';
    triggerDownload(blob, base + '-finished.webm');
    setStatus('MOVIE READY · ' + formatBytes(blob.size) + ' · ' + recordedMime + ' · ' +
      humanTime(videoEl.duration) + ' · ' + (audioBlob ? ('audio: ' + audioLabel) : 'video only') +
      '. The source file is unchanged.', 'green');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
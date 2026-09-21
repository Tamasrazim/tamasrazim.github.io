/**
 * Code → Motion local media stack descriptor.
 *
 * Mediabunny supplies the format/muxing layer and WebCodecs integration.
 * Actual H.264 / HEVC / AV1 / VP9 / VP8 encoder availability comes from
 * the browser/device's WebCodecs implementation and is probed at runtime.
 */
(function () {
  'use strict';

  var VERSION = '1.58.1';

  window.TamasrazimMediaStack = Object.freeze({
    name: 'Mediabunny',
    version: VERSION,
    loaded: !!window.Mediabunny,
    upstream: 'https://github.com/Vanilagy/mediabunny/tree/v' + VERSION,
    license: 'MPL-2.0',
    vendorPath: 'projects/code-motion/vendor/mediabunny/' + VERSION + '/mediabunny.min.cjs',
    encoderLayer: 'WebCodecs / browser / device',
    muxerLayer: 'Mediabunny',
    containers: ['mp4', 'mkv', 'webm', 'mov', 'mpeg-ts', 'ogg', 'wave'],
    videoCodecs: ['avc', 'hevc', 'av1', 'vp9', 'vp8'],
    status: !!window.Mediabunny ? 'READY' : 'PENDING_VENDOR_BUILD'
  });
})();

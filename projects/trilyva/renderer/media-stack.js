// What this does: Connects visual layers and media timing so a composition can be previewed and rendered as one scene.

/**
 * KYNESTRA V2 media-stack compatibility descriptor.
 *
 * V2 uses the browser/device WebCodecs implementation for encoding and
 * contains its own small local muxers for the supported MP4/WebM outputs.
 */
(function () {
  'use strict';
  window.TamasrazimMediaStack = Object.freeze({
    name: 'Native WebCodecs + local muxers',
    version: '2',
    encoderLayer: 'WebCodecs / browser / device',
    muxerLayer: 'Local V2 muxer',
    containers: ['mp4', 'webm'],
    videoCodecs: ['avc', 'vp9', 'vp8'],
    externalRuntimeDependency: false,
    status: ('VideoEncoder' in window && 'VideoFrame' in window) ? 'AVAILABLE' : 'LIMITED'
  });

  // Keep batch tools out of the renderer overlay; use the dedicated desktop workflow when needed.

})();
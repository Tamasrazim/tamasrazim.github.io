# Code → Motion technical note

## Runtime dependencies

The uploaded Motion Renderer V2 is a browser-first single-file renderer. It does not bundle Mediabunny or another third-party media runtime.

Video encoding uses the browser/device's WebCodecs implementation when available. The page contains its own limited MP4 / WebM muxing code for the output paths it supports.

Codec availability is capability-tested at runtime, so support depends on the browser and device rather than being guaranteed by the repository.

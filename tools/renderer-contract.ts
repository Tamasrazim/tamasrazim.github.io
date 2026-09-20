export type StillFormat = "png" | "jpg" | "webp" | "svg";
export type VideoContainer = "webm" | "mp4";
export type VideoEngine = "webcodecs" | "mediarecorder";
export type SourceKind = "CODE" | "GRID" | "SAFE";

export interface SceneSource {
  id: string;
  name: string;
  kind: SourceKind;
  visible: boolean;
  locked: boolean;
  previewOnly?: boolean;
}

export interface RenderSpec {
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  loop: boolean;
  loopDurationSeconds: number | null;
  transparent: boolean;
  stillFormat: StillFormat;
  videoEngine: VideoEngine;
  videoContainer: VideoContainer;
  bitrate: number;
  keyframeSeconds: number;
}

export interface StockMetadata {
  title: string;
  description: string;
  keywords: string[];
  creator: string;
  category: string;
  source: "Animation Renderer — Tamasrazim";
  delivery: RenderSpec;
  generatedAt: string;
}

export interface Scene {
  name: string;
  code: string;
  sources: SceneSource[];
}

export function normalizeKeywords(value: string): string[] {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .filter((keyword, index, all) => all.indexOf(keyword) === index);
}

export function isPreviewOnlySource(source: SceneSource): boolean {
  return source.previewOnly === true || source.kind === "GRID" || source.kind === "SAFE";
}

export function createDefaultRenderSpec(): RenderSpec {
  return {
    width: 3840,
    height: 2160,
    fps: 60,
    durationSeconds: 30,
    loop: false,
    loopDurationSeconds: null,
    transparent: false,
    stillFormat: "png",
    videoEngine: "webcodecs",
    videoContainer: "webm",
    bitrate: 24000000,
    keyframeSeconds: 2
  };
}

export interface RendererProject {
  schemaVersion: 1;
  app: "Animation Renderer — Tamasrazim";
  fileType: "tamasrazim-render-project";
  exportedAt: string;
  activeScene: number;
  scenes: Scene[];
  render: RenderSpec & {
    videoCodec: string | null;
  };
  stock: StockMetadata;
}

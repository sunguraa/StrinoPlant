export interface PresetMeta {
  id: string;
  mapId: string;
  name: string;
  author: string;
  description: string;
  updatedAt: string;
}

export interface PresetIndex {
  version: number;
  presets: PresetMeta[];
}

export interface PresetFull extends PresetMeta {
  canvasData: string; // JSON-serialized CanvasState
}

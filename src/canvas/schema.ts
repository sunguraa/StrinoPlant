// Canvas state schema — defaults, constants, and factory functions

import type { CanvasObject, CanvasObjectType, LayerConfig, Viewport } from "@/types/canvas";

/** Min/max zoom levels */
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 5;
export const ZOOM_STEP = 1.1; // multiply/divide per wheel tick

/** Default viewport (no pan, no zoom) */
export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 };

export const DEFAULT_LAYER_ID = "default";
export const DEFAULT_LAYER_NAME = "Layer 1";

export function createLayerName(index: number): string {
  return `Layer ${index}`;
}

export function createDefaultLayers(): LayerConfig[] {
  return [{ id: DEFAULT_LAYER_ID, name: DEFAULT_LAYER_NAME, visible: true }];
}

/** Default style values */
export const DEFAULT_STROKE = "#ffffff";
export const DEFAULT_STROKE_WIDTH = 5;
export const DEFAULT_FILL = "transparent";
export const DEFAULT_FONT_SIZE = 24;
export const DEFAULT_POINTER_LENGTH = 15;
export const DEFAULT_POINTER_WIDTH = 12;

let counter = 0;

/** Generate a unique ID for canvas objects */
export function generateId(): string {
  counter += 1;
  return `obj_${Date.now()}_${counter}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Create a new CanvasObject with defaults filled in */
export function createCanvasObject(
  type: CanvasObjectType,
  overrides: Partial<CanvasObject>,
): CanvasObject {
  const base: CanvasObject = {
    id: generateId(),
    type,
    x: 0,
    y: 0,
    stroke: DEFAULT_STROKE,
    strokeWidth: DEFAULT_STROKE_WIDTH,
  };

  if (type === "arrow") {
    base.pointerLength = DEFAULT_POINTER_LENGTH;
    base.pointerWidth = DEFAULT_POINTER_WIDTH;
  }

  if (type === "text") {
    base.fontSize = DEFAULT_FONT_SIZE;
    base.text = "";
    base.fill = DEFAULT_STROKE; // text uses fill color
    base.width = 200;
  }

  if (type === "rect" || type === "circle") {
    base.fill = "transparent";
  }

  return { ...base, ...overrides };
}

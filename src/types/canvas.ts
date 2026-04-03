// Canvas object types — normalized schema for persistence and sync

export type ToolType = "select" | "pen" | "line" | "arrow" | "rect" | "circle" | "text" | "eraser";

export type CanvasObjectType =
  | "freehand"
  | "line"
  | "arrow"
  | "rect"
  | "circle"
  | "text"
  | "agentIcon"
  | "abilityIcon"
  | "utilityIcon"
  | "mediaAnnotation";

export interface LayerConfig {
  id: string;
  name: string;
  visible: boolean;
}

export interface CanvasObject {
  id: string;
  type: CanvasObjectType;
  // Position & geometry (canvas-space coordinates)
  x: number;
  y: number;
  // For freehand, line, arrow — points relative to (x, y)
  points?: number[];
  // For rect
  width?: number;
  height?: number;
  // For circle
  radius?: number;
  // For text
  text?: string;
  fontSize?: number;
  // For agentIcon / abilityIcon / utilityIcon
  agentId?: string;
  iconUrl?: string;
  iconSize?: number;
  skillFileNum?: number; // For abilityIcon
  utilityId?: string; // For utilityIcon
  // For mediaAnnotation
  mediaDataUrl?: string; // base64 data URL of the uploaded image
  mediaWidth?: number; // display width of the image frame
  mediaHeight?: number; // display height of the image frame
  frameOffsetX?: number; // offset of the frame from the dot (x)
  frameOffsetY?: number; // offset of the frame from the dot (y)
  // Layer assignment (for user-created layers)
  layer?: string;
  // Style
  stroke: string;
  strokeWidth: number;
  fill?: string;
  // Arrow-specific
  pointerLength?: number;
  pointerWidth?: number;
  // Rotation (degrees)
  rotation?: number;
  // Opacity 0-1
  opacity?: number;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface CanvasState {
  objects: CanvasObject[];
  viewport: Viewport;
  layers: LayerConfig[];
}

/** Map from ToolType to the CanvasObjectType it creates (tools that draw) */
export const TOOL_TO_OBJECT_TYPE: Partial<Record<ToolType, CanvasObjectType>> = {
  pen: "freehand",
  line: "line",
  arrow: "arrow",
  rect: "rect",
  circle: "circle",
  text: "text",
};

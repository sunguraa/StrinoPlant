// Canvas state management — serialization, deserialization, coordinate transforms

import type { CanvasObject, CanvasState, LayerConfig, Viewport } from "@/types/canvas";
import { normalizePublicAssetUrl } from "@/lib/base-path";
import {
  DEFAULT_LAYER_ID,
  DEFAULT_VIEWPORT,
  createDefaultLayers,
  createLayerName,
} from "@/canvas/schema";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getObjectLayerIds(objects: CanvasObject[]): string[] {
  const layerIds = new Set<string>();

  for (const obj of objects) {
    if (typeof obj.layer === "string" && obj.layer.trim()) {
      layerIds.add(obj.layer);
    }
  }

  return [...layerIds];
}

export function normalizeCanvasLayers(rawLayers: unknown, objects: CanvasObject[]): LayerConfig[] {
  const normalizedLayers: LayerConfig[] = [];
  const seenIds = new Set<string>();

  if (Array.isArray(rawLayers)) {
    for (const rawLayer of rawLayers) {
      if (!isRecord(rawLayer)) continue;

      const id =
        typeof rawLayer.id === "string" && rawLayer.id.trim() ? rawLayer.id.trim() : undefined;
      if (!id || seenIds.has(id)) continue;

      normalizedLayers.push({
        id,
        name:
          typeof rawLayer.name === "string" && rawLayer.name.trim()
            ? rawLayer.name.trim()
            : createLayerName(normalizedLayers.length + 1),
        visible: rawLayer.visible !== false,
      });
      seenIds.add(id);
    }
  }

  for (const layerId of getObjectLayerIds(objects)) {
    if (seenIds.has(layerId)) continue;

    normalizedLayers.push({
      id: layerId,
      name: createLayerName(normalizedLayers.length + 1),
      visible: true,
    });
    seenIds.add(layerId);
  }

  return normalizedLayers.length > 0 ? normalizedLayers : createDefaultLayers();
}

export function normalizeCanvasObjects(
  objects: CanvasObject[],
  layers: LayerConfig[],
): CanvasObject[] {
  const fallbackLayerId = layers[0]?.id ?? DEFAULT_LAYER_ID;
  const layerIds = new Set(layers.map((layer) => layer.id));

  return objects.map((obj) => ({
    ...obj,
    layer: typeof obj.layer === "string" && layerIds.has(obj.layer) ? obj.layer : fallbackLayerId,
    iconUrl: typeof obj.iconUrl === "string" ? normalizePublicAssetUrl(obj.iconUrl) : obj.iconUrl,
  }));
}

function normalizeViewport(rawViewport: unknown): Viewport {
  if (!isRecord(rawViewport)) {
    return { ...DEFAULT_VIEWPORT };
  }

  return {
    x: typeof rawViewport.x === "number" ? rawViewport.x : DEFAULT_VIEWPORT.x,
    y: typeof rawViewport.y === "number" ? rawViewport.y : DEFAULT_VIEWPORT.y,
    scale: typeof rawViewport.scale === "number" ? rawViewport.scale : DEFAULT_VIEWPORT.scale,
  };
}

/**
 * Serialize canvas state (objects + viewport) to a JSON string.
 */
export function serializeCanvas(
  objects: CanvasObject[],
  viewport: Viewport,
  layers: LayerConfig[],
): string {
  const normalizedLayers = normalizeCanvasLayers(layers, objects);
  const state: CanvasState = {
    objects: normalizeCanvasObjects(objects, normalizedLayers),
    viewport,
    layers: normalizedLayers,
  };
  return JSON.stringify(state);
}

/**
 * Deserialize a JSON string back to CanvasState.
 * Returns null if the input is invalid.
 */
export function deserializeCanvas(json: string): CanvasState | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed) || !Array.isArray(parsed.objects)) return null;

    const objects = parsed.objects as CanvasObject[];
    const layers = normalizeCanvasLayers(parsed.layers, objects);

    return {
      objects: normalizeCanvasObjects(objects, layers),
      viewport: normalizeViewport(parsed.viewport),
      layers,
    };
  } catch {
    return null;
  }
}

/**
 * Convert screen (pointer) coordinates to canvas-space coordinates,
 * accounting for stage position and scale.
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: Viewport,
): { x: number; y: number } {
  return {
    x: (screenX - viewport.x) / viewport.scale,
    y: (screenY - viewport.y) / viewport.scale,
  };
}

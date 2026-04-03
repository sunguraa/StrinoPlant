/**
 * Bidirectional sync between local canvas state and a Yjs document.
 *
 * The Y.Doc uses two top-level Y.Maps:
 * - "objects": keyed by object ID -> JSON-serialized CanvasObject
 * - "layers": keyed by layer metadata keys -> JSON-serialized LayerConfig/order
 */

import * as Y from "yjs";
import { createDefaultLayers, createLayerName } from "@/canvas/schema";
import { normalizeCanvasLayers, normalizeCanvasObjects } from "@/canvas/state";
import type { CanvasObject, LayerConfig } from "@/types/canvas";

const LAYER_ORDER_KEY = "__order";
const LAYER_KEY_PREFIX = "layer:";

export interface YjsCanvasMaps {
  objectsMap: Y.Map<string>;
  layersMap: Y.Map<string>;
}

export interface SharedCanvasState {
  objects: CanvasObject[];
  layers: LayerConfig[];
}

function parseJson<T>(value: string | undefined): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getLayerStorageKey(layerId: string): string {
  return `${LAYER_KEY_PREFIX}${layerId}`;
}

function loadRawLayersFromYjs(layersMap: Y.Map<string>): LayerConfig[] {
  const layersById = new Map<string, LayerConfig>();

  layersMap.forEach((value, key) => {
    if (!key.startsWith(LAYER_KEY_PREFIX)) return;

    const layerId = key.slice(LAYER_KEY_PREFIX.length);
    const parsed = parseJson<LayerConfig>(value);
    if (!parsed || !layerId) return;

    layersById.set(layerId, {
      id: layerId,
      name: parsed.name?.trim() ? parsed.name.trim() : createLayerName(layersById.size + 1),
      visible: parsed.visible !== false,
    });
  });

  if (layersById.size === 0) return [];

  const storedOrder = parseJson<string[]>(layersMap.get(LAYER_ORDER_KEY)) ?? [];
  const orderedIds = storedOrder.filter((layerId) => layersById.has(layerId));
  const remainingIds = [...layersById.keys()].filter((layerId) => !orderedIds.includes(layerId));

  return [...orderedIds, ...remainingIds]
    .map((layerId) => layersById.get(layerId))
    .filter((layer): layer is LayerConfig => Boolean(layer));
}

export function hasYjsLayerState(layersMap: Y.Map<string>): boolean {
  let hasLayerState = false;

  layersMap.forEach((_value, key) => {
    if (key === LAYER_ORDER_KEY || key.startsWith(LAYER_KEY_PREFIX)) {
      hasLayerState = true;
    }
  });

  return hasLayerState;
}

/**
 * Initialize the Yjs document maps if not present.
 */
export function initYjsDoc(doc: Y.Doc): YjsCanvasMaps {
  return {
    objectsMap: doc.getMap<string>("objects"),
    layersMap: doc.getMap<string>("layers"),
  };
}

/**
 * Load all objects from Y.Doc into CanvasObject[].
 */
export function loadObjectsFromYjs(objectsMap: Y.Map<string>): CanvasObject[] {
  const result: CanvasObject[] = [];
  objectsMap.forEach((value, key) => {
    try {
      const obj = JSON.parse(value) as CanvasObject;
      obj.id = key; // ensure ID consistency
      result.push(obj);
    } catch {
      // Skip malformed entries
    }
  });
  return result;
}

export function loadLayersFromYjs(layersMap: Y.Map<string>): LayerConfig[] {
  return loadRawLayersFromYjs(layersMap);
}

export function loadFromYjs(
  objectsMap: Y.Map<string>,
  layersMap: Y.Map<string>,
): SharedCanvasState {
  const objects = loadObjectsFromYjs(objectsMap);
  const layers = normalizeCanvasLayers(loadRawLayersFromYjs(layersMap), objects);

  return {
    objects: normalizeCanvasObjects(objects, layers),
    layers,
  };
}

/**
 * Push local state to Y.Doc when seeding a new room.
 */
export function pushLocalToYjs(
  objects: CanvasObject[],
  layers: LayerConfig[],
  maps: YjsCanvasMaps,
  doc: Y.Doc,
): void {
  doc.transact(() => {
    const nextLayers = normalizeCanvasLayers(layers, objects);
    const nextObjects = normalizeCanvasObjects(objects, nextLayers);

    for (const obj of nextObjects) {
      maps.objectsMap.set(obj.id, JSON.stringify(obj));
    }

    syncLayersToYjs(nextLayers, maps.layersMap);
  });
}

/**
 * Apply a single object change to Y.Doc (add or update).
 */
export function syncObjectToYjs(obj: CanvasObject, objectsMap: Y.Map<string>): void {
  objectsMap.set(obj.id, JSON.stringify(obj));
}

export function syncLayersToYjs(layers: LayerConfig[], layersMap: Y.Map<string>): void {
  const nextLayers = layers.length > 0 ? layers : createDefaultLayers();
  const nextLayerIds = new Set(nextLayers.map((layer) => layer.id));

  layersMap.forEach((_value, key) => {
    if (key.startsWith(LAYER_KEY_PREFIX)) {
      const layerId = key.slice(LAYER_KEY_PREFIX.length);
      if (!nextLayerIds.has(layerId)) {
        layersMap.delete(key);
      }
    }
  });

  layersMap.set(LAYER_ORDER_KEY, JSON.stringify(nextLayers.map((layer) => layer.id)));

  nextLayers.forEach((layer, index) => {
    layersMap.set(
      getLayerStorageKey(layer.id),
      JSON.stringify({
        ...layer,
        name: layer.name.trim() || createLayerName(index + 1),
        visible: layer.visible !== false,
      }),
    );
  });
}

/**
 * Remove an object from Y.Doc.
 */
export function removeObjectFromYjs(objectId: string, objectsMap: Y.Map<string>): void {
  objectsMap.delete(objectId);
}

/**
 * Apply a batch of changes to Y.Doc in a single transaction.
 */
export function syncBatchToYjs(
  objects: CanvasObject[],
  deletedIds: string[],
  objectsMap: Y.Map<string>,
  doc: Y.Doc,
): void {
  doc.transact(() => {
    for (const obj of objects) {
      objectsMap.set(obj.id, JSON.stringify(obj));
    }
    for (const id of deletedIds) {
      objectsMap.delete(id);
    }
  });
}

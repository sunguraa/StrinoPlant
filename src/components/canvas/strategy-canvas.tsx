"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import {
  Stage,
  Layer,
  Line,
  Arrow,
  Rect,
  Circle,
  Text,
  Image,
  Group,
  Image as KonvaImage,
  Transformer,
} from "react-konva";
import Konva from "konva";
import { CanvasToolbar } from "@/components/canvas/canvas-toolbar";
import {
  MIN_SCALE,
  MAX_SCALE,
  ZOOM_STEP,
  DEFAULT_VIEWPORT,
  createDefaultLayers,
  DEFAULT_STROKE,
  DEFAULT_STROKE_WIDTH,
  createCanvasObject,
} from "@/canvas/schema";
import { serializeCanvas, deserializeCanvas, screenToCanvas } from "@/canvas/state";
import { getUtilityIconPath } from "@/lib/wiki/utilities";
import {
  getCachedMinimapPath,
  getCachedSkillPath,
  getCachedBarrierPath,
  getCachedBlankPath,
} from "@/lib/wiki/cache";
import { getSetup, saveSetup } from "@/lib/storage";
import type {
  CanvasObject,
  CanvasObjectType,
  LayerConfig,
  ToolType,
  Viewport,
} from "@/types/canvas";
import { TOOL_TO_OBJECT_TYPE } from "@/types/canvas";
import { STRINOVA_AGENTS } from "@/lib/wiki/agents";
import { useCollab } from "@/lib/yjs/use-collab";

// ---------------------------------------------------------------------------
// Cursor map per tool
// ---------------------------------------------------------------------------
const TOOL_CURSORS: Record<ToolType, string> = {
  select: "default",
  pen: "crosshair",
  line: "crosshair",
  arrow: "crosshair",
  rect: "crosshair",
  circle: "crosshair",
  text: "text",
  eraser: "pointer",
};

// ---------------------------------------------------------------------------
// Side-based agent icon colors (attack = orange, defense = blue)
// ---------------------------------------------------------------------------
const SIDE_COLORS = {
  attack: "#ef4444",
  defense: "#3b82f6",
} as const;

interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MEDIA_ANNOTATION_DOT_RADIUS = 8;
const MARQUEE_MIN_SIZE_PX = 4;

function normalizeSelectionBox(box: SelectionBox): SelectionBox {
  return {
    x: box.width < 0 ? box.x + box.width : box.x,
    y: box.height < 0 ? box.y + box.height : box.y,
    width: Math.abs(box.width),
    height: Math.abs(box.height),
  };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false;

  let element = target instanceof HTMLElement ? target : target.parentElement;

  while (element) {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement ||
      element.isContentEditable
    ) {
      return true;
    }

    element = element.parentElement;
  }

  return false;
}

function loadStoredCanvasState(setupId?: string) {
  if (!setupId) return null;

  const setup = getSetup(setupId);
  if (!setup?.canvasData) return null;

  return deserializeCanvas(setup.canvasData);
}

export interface StrategyCanvasHandle {
  deleteObjectsByLayer: (layerId: string) => void;
}

// ---------------------------------------------------------------------------
// Name edit state passed from parent
// ---------------------------------------------------------------------------
export interface NameEditState {
  editingName: boolean;
  nameInput: string;
  setNameInput: (v: string) => void;
  onStartEdit: () => void;
  onFinishEdit: (save: boolean) => void;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface StrategyCanvasProps {
  mapWikiPage?: string;
  localMinimap?: string;
  setupId?: string;
  mapId?: string;
  layers?: LayerConfig[];
  activeLayerId?: string;
  setupName?: string;
  mapName?: string;
  nameEditState?: NameEditState;
  // Collab props
  collabToken?: string | null;
  collabEnabled?: boolean;
  onStartCollab?: () => string | Promise<string>;
  onStopCollab?: () => void;
  onLayersChange?: (layers: LayerConfig[]) => void;
  onLocalSetupSaved?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const StrategyCanvas = forwardRef<StrategyCanvasHandle, StrategyCanvasProps>(
  function StrategyCanvas(
    {
      mapWikiPage,
      localMinimap,
      setupId,
      mapId,
      layers: sharedLayersProp,
      activeLayerId,
      setupName,
      mapName,
      nameEditState,
      collabToken,
      collabEnabled,
      onStartCollab,
      onStopCollab,
      onLayersChange,
      onLocalSetupSaved,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const isDrawing = useRef(false);
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });
    const spaceHeld = useRef(false);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const marqueeStart = useRef<{ x: number; y: number } | null>(null);
    const selectionDragState = useRef<{
      pointerStart: { x: number; y: number };
      startPositions: Map<string, { x: number; y: number }>;
    } | null>(null);

    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [viewport, setViewport] = useState<Viewport>(() => {
      const storedState = loadStoredCanvasState(setupId);
      if (storedState) return storedState.viewport;

      return { ...DEFAULT_VIEWPORT };
    });
    const [objects, setObjects] = useState<CanvasObject[]>(() => {
      const storedState = loadStoredCanvasState(setupId);
      if (storedState) return storedState.objects;

      return [];
    });
    const objectsRef = useRef(objects);
    objectsRef.current = objects;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [history, setHistory] = useState<CanvasObject[][]>([]);
    const [activeTool, setActiveTool] = useState<ToolType>("pen");
    const [strokeColor, setStrokeColor] = useState(DEFAULT_STROKE);
    const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE_WIDTH);
    const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
    const [cursorStyle, setCursorStyle] = useState(TOOL_CURSORS.pen);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [marqueeRect, setMarqueeRect] = useState<SelectionBox | null>(null);
    const [minScale, setMinScale] = useState(MIN_SCALE);

    // Agent profile image cache (state-based so render can read it)
    const [agentImages, setAgentImages] = useState<Map<string, HTMLImageElement>>(new Map());

    // Generic icon image cache for abilities/utilities
    const [iconImages, setIconImages] = useState<Map<string, HTMLImageElement>>(new Map());

    // Media annotation image cache
    const [mediaImages, setMediaImages] = useState<Map<string, HTMLImageElement>>(new Map());

    // Inline text editing state
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    // Toggle barriers state (default: barriers shown)
    const [showBarriers, setShowBarriers] = useState(true);
    const [hasLocalSetup, setHasLocalSetup] = useState(() => Boolean(setupId && getSetup(setupId)));

    const sharedLayers =
      sharedLayersProp && sharedLayersProp.length > 0 ? sharedLayersProp : createDefaultLayers();
    const visibleLayerIds = new Set(
      sharedLayers.filter((layer) => layer.visible).map((layer) => layer.id),
    );
    const availableLayerIds = new Set(sharedLayers.map((layer) => layer.id));
    const visibleObjects = objects.filter((obj) => {
      const layerId = obj.layer ?? sharedLayers[0]?.id ?? "default";
      return availableLayerIds.has(layerId) && visibleLayerIds.has(layerId);
    });
    const visibleObjectIdSet = new Set(visibleObjects.map((obj) => obj.id));
    const activeSelectedIds = selectedIds.filter((id) => visibleObjectIdSet.has(id));
    const skipNextLayerSyncRef = useRef(false);

    const commitObjects = useCallback((nextObjects: CanvasObject[]) => {
      objectsRef.current = nextObjects;
      setObjects(nextObjects);
    }, []);

    // -----------------------------------------------------------------------
    // Collab: useCollab hook lives inside the canvas to avoid state relay loops
    // -----------------------------------------------------------------------
    const handleRemoteChange = useCallback(
      (remoteState: { objects: CanvasObject[]; layers: LayerConfig[] }) => {
        commitObjects(remoteState.objects);

        if (onLayersChange) {
          skipNextLayerSyncRef.current = true;
          onLayersChange(remoteState.layers);
        }
      },
      [commitObjects, onLayersChange],
    );

    const collab = useCollab({
      setupId: setupId ?? "",
      mapId: mapId ?? "",
      collabToken,
      enabled: collabEnabled ?? false,
      localObjects: objects,
      localLayers: sharedLayers,
      onRemoteChange: handleRemoteChange,
    });

    const syncLayersToCollab = collab.syncLayers;

    // Collab: sync selection to peers
    useEffect(() => {
      if (collabEnabled) {
        collab.setSelection(selectedIds);
      }
    }, [selectedIds, collabEnabled, collab]);

    const sharedLayerSignature = JSON.stringify(sharedLayers);
    const lastSharedLayerSignatureRef = useRef(sharedLayerSignature);

    useEffect(() => {
      if (!collabEnabled) {
        lastSharedLayerSignatureRef.current = sharedLayerSignature;
        return;
      }

      if (skipNextLayerSyncRef.current) {
        skipNextLayerSyncRef.current = false;
        lastSharedLayerSignatureRef.current = sharedLayerSignature;
        return;
      }

      if (sharedLayerSignature === lastSharedLayerSignatureRef.current) return;

      lastSharedLayerSignatureRef.current = sharedLayerSignature;
      syncLayersToCollab(sharedLayers);
    }, [sharedLayers, sharedLayerSignature, collabEnabled, syncLayersToCollab]);

    useEffect(() => {
      STRINOVA_AGENTS.forEach((agent) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.src = agent.profileUrl;
        img.onload = () => {
          setAgentImages((prev) => {
            const next = new Map(prev);
            next.set(agent.id, img);
            return next;
          });
        };
      });
    }, []);

    const loadIconImage = useCallback((url: string) => {
      setIconImages((prev) => {
        if (prev.has(url)) return prev;
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        img.onload = () => {
          setIconImages((p) => {
            const next = new Map(p);
            next.set(url, img);
            return next;
          });
        };
        return prev;
      });
    }, []);

    // Load icon images for ability/utility objects
    useEffect(() => {
      objects.forEach((obj) => {
        if ((obj.type === "abilityIcon" || obj.type === "utilityIcon") && obj.iconUrl) {
          setIconImages((prev) => {
            if (prev.has(obj.iconUrl!)) return prev;
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.src = obj.iconUrl!;
            img.onload = () => {
              setIconImages((p) => {
                const next = new Map(p);
                next.set(obj.iconUrl!, img);
                return next;
              });
            };
            return prev;
          });
        }
      });
    }, [objects]);

    // Load media images for mediaAnnotation objects
    useEffect(() => {
      objects.forEach((obj) => {
        if (obj.type === "mediaAnnotation" && obj.mediaDataUrl) {
          setMediaImages((prev) => {
            if (prev.has(obj.id)) return prev;
            const img = new window.Image();
            img.src = obj.mediaDataUrl!;
            img.onload = () => {
              setMediaImages((p) => {
                const next = new Map(p);
                next.set(obj.id, img);
                return next;
              });
            };
            return prev;
          });
        }
      });
    }, [objects]);

    const changeActiveTool = useCallback((tool: ToolType) => {
      setActiveTool(tool);
      if (!spaceHeld.current) setCursorStyle(TOOL_CURSORS[tool]);
      if (tool !== "select") {
        setSelectedIds([]);
        marqueeStart.current = null;
        selectionDragState.current = null;
        setMarqueeRect(null);
      }
    }, []);

    // -----------------------------------------------------------------------
    // Fit-to-window when map image loads — handled in mapImage onload callback
    // -----------------------------------------------------------------------
    const handleMapImageLoaded = useCallback(
      (img: HTMLImageElement) => {
        setMapImage(img);

        const dims = {
          width: containerRef.current?.clientWidth ?? 800,
          height: containerRef.current?.clientHeight ?? 600,
        };
        const fitScale = Math.min((dims.width * 0.9) / img.width, (dims.height * 0.9) / img.height);
        const effectiveMinScale = Math.max(fitScale, MIN_SCALE);
        setMinScale(effectiveMinScale);

        // Only auto-fit if no saved viewport was loaded
        let hasSavedViewport = false;
        if (setupId) {
          const storedState = loadStoredCanvasState(setupId);
          if (storedState && storedState.viewport.scale !== 1) hasSavedViewport = true;
        }

        if (!hasSavedViewport) {
          setViewport({
            x: (dims.width - img.width * fitScale) / 2,
            y: (dims.height - img.height * fitScale) / 2,
            scale: fitScale,
          });
        }
      },
      [setupId],
    );

    // -----------------------------------------------------------------------
    // Attach Transformer to selected node
    // -----------------------------------------------------------------------
    useEffect(() => {
      if (!transformerRef.current) return;
      const stage = stageRef.current;
      if (!stage || activeSelectedIds.length === 0) {
        transformerRef.current.nodes([]);
        transformerRef.current.getLayer()?.batchDraw();
        return;
      }
      const nodes = activeSelectedIds
        .map((id) => stage.findOne("#" + id))
        .filter((node): node is Konva.Node => Boolean(node));
      transformerRef.current.nodes(nodes);
      transformerRef.current.getLayer()?.batchDraw();
    }, [activeSelectedIds, objects]);

    useEffect(() => {
      if (!transformerRef.current || activeSelectedIds.length === 0) return;
      transformerRef.current.forceUpdate();
      transformerRef.current.getLayer()?.batchDraw();
    }, [activeSelectedIds, objects]);

    // -----------------------------------------------------------------------
    // Resize observer
    // -----------------------------------------------------------------------
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const update = () => setDimensions({ width: el.clientWidth, height: el.clientHeight });
      update();
      const obs = new ResizeObserver(update);
      obs.observe(el);
      return () => obs.disconnect();
    }, []);

    // -----------------------------------------------------------------------
    // Load map background image
    // -----------------------------------------------------------------------
    useEffect(() => {
      if (!mapWikiPage) return;
      let cancelled = false;

      function loadFromUrl(src: string, crossOrigin?: string) {
        const img = new window.Image();
        if (crossOrigin) img.crossOrigin = crossOrigin;
        img.onload = () => {
          if (!cancelled) handleMapImageLoaded(img);
        };
        img.src = src;
      }

      // Le Brun City doesn't have barrier/blank variants yet
      const isLeBrunCity = mapId === "le-brun-city";
      let src: string;
      if (isLeBrunCity) {
        src = localMinimap || getCachedMinimapPath(mapId ?? "");
      } else if (showBarriers) {
        src = getCachedBarrierPath(mapId ?? "");
      } else {
        src = getCachedBlankPath(mapId ?? "");
      }

      loadFromUrl(src);
      return () => {
        cancelled = true;
      };
    }, [mapWikiPage, localMinimap, handleMapImageLoaded, mapId, showBarriers]);

    // -----------------------------------------------------------------------
    // Auto-save (debounced 500ms)
    // -----------------------------------------------------------------------
    useEffect(() => {
      if (!setupId || !mapId || !hasLocalSetup) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const setup = getSetup(setupId);
        if (!setup) return;
        saveSetup({
          ...setup,
          canvasData: serializeCanvas(objects, viewport, sharedLayers),
          updatedAt: new Date().toISOString(),
        });
      }, 500);
      return () => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
      };
    }, [objects, viewport, sharedLayers, setupId, mapId, hasLocalSetup]);

    const handleSaveLocalCopy = useCallback(() => {
      if (!setupId || !mapId || hasLocalSetup) return;

      const existingSetup = getSetup(setupId);
      if (existingSetup) {
        setHasLocalSetup(true);
        onLocalSetupSaved?.();
        return;
      }

      const timestamp = new Date().toISOString();
      saveSetup({
        id: setupId,
        mapId,
        name: setupName?.trim() || "Shared Setup",
        canvasData: serializeCanvas(objects, viewport, sharedLayers),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      setHasLocalSetup(true);
      onLocalSetupSaved?.();
    }, [
      setupId,
      mapId,
      hasLocalSetup,
      setupName,
      objects,
      viewport,
      sharedLayers,
      onLocalSetupSaved,
    ]);

    // -----------------------------------------------------------------------
    // Push history snapshot
    // -----------------------------------------------------------------------
    const pushHistory = useCallback((prev: CanvasObject[]) => {
      setHistory((h) => [...h, prev]);
    }, []);

    const updateCanvasObject = useCallback(
      (
        objectId: string,
        updater: (obj: CanvasObject) => CanvasObject,
        options?: { sync?: boolean },
      ) => {
        const currentObjects = objectsRef.current;
        let updatedObject: CanvasObject | null = null;

        const nextObjects = currentObjects.map((candidate) => {
          if (candidate.id !== objectId) return candidate;

          updatedObject = updater(candidate);
          return updatedObject;
        });

        if (!updatedObject) {
          return null;
        }

        commitObjects(nextObjects);

        if (options?.sync && updatedObject) {
          collab.syncObject(updatedObject);
        }

        return updatedObject;
      },
      [collab, commitObjects],
    );

    // -----------------------------------------------------------------------
    // Undo / Clear / Delete selected
    // -----------------------------------------------------------------------
    const handleUndo = useCallback(() => {
      setHistory((h) => {
        if (h.length === 0) return h;
        const prev = h[h.length - 1];
        setObjects((current) => {
          if (collabEnabled) {
            const currentIds = current.map((o) => o.id);
            const prevIds = new Set(prev.map((o) => o.id));
            const deletedIds = currentIds.filter((id) => !prevIds.has(id));
            collab.syncBatch(prev, deletedIds);
          }
          return prev;
        });
        return h.slice(0, -1);
      });
    }, [collabEnabled, collab]);

    const handleDeleteSelected = useCallback(() => {
      if (activeSelectedIds.length === 0) return;
      const selectedIdSet = new Set(activeSelectedIds);
      pushHistory(objects);
      setObjects((prev) => prev.filter((o) => !selectedIdSet.has(o.id)));
      if (collabEnabled) {
        for (const id of activeSelectedIds) {
          collab.removeObject(id);
        }
      }
      setSelectedIds([]);
    }, [activeSelectedIds, objects, pushHistory, collabEnabled, collab]);

    // -----------------------------------------------------------------------
    // Expose imperative handle for parent to delete objects by layer
    // -----------------------------------------------------------------------
    useImperativeHandle(
      ref,
      () => ({
        deleteObjectsByLayer(layerId: string) {
          const removedIds = objects
            .filter((obj) => (obj.layer ?? "default") === layerId)
            .map((obj) => obj.id);

          if (removedIds.length === 0) return;

          const removedIdSet = new Set(removedIds);

          pushHistory(objects);

          setObjects((prev) => prev.filter((obj) => !removedIdSet.has(obj.id)));
          setSelectedIds((prev) => prev.filter((id) => !removedIdSet.has(id)));

          if (collabEnabled) {
            for (const id of removedIds) {
              collab.removeObject(id);
            }
          }
        },
      }),
      [objects, pushHistory, collabEnabled, collab],
    );

    // -----------------------------------------------------------------------
    // Space key tracking (for space+drag panning) + Ctrl+Z + Delete + Tool shortcuts
    // -----------------------------------------------------------------------
    useEffect(() => {
      const TOOL_SHORTCUTS: Record<string, ToolType> = {
        v: "select",
        p: "pen",
        l: "line",
        a: "arrow",
        r: "rect",
        c: "circle",
        t: "text",
        e: "eraser",
      };
      const down = (e: KeyboardEvent) => {
        if (
          editingTextId ||
          isEditableTarget(e.target) ||
          isEditableTarget(document.activeElement)
        ) {
          return;
        }
        if (e.code === "Space" && !e.repeat) {
          spaceHeld.current = true;
          setCursorStyle("grab");
        }
        if (e.ctrlKey && e.key === "z") {
          e.preventDefault();
          handleUndo();
        }
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          handleDeleteSelected();
        }
        // Tool shortcut keys (single letter, no modifiers)
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          const tool = TOOL_SHORTCUTS[e.key.toLowerCase()];
          if (tool) {
            e.preventDefault();
            changeActiveTool(tool);
          }
        }
      };
      const up = (e: KeyboardEvent) => {
        if (e.code === "Space") {
          spaceHeld.current = false;
          setCursorStyle(TOOL_CURSORS[activeTool]);
        }
      };
      window.addEventListener("keydown", down);
      window.addEventListener("keyup", up);
      return () => {
        window.removeEventListener("keydown", down);
        window.removeEventListener("keyup", up);
      };
    }, [handleUndo, handleDeleteSelected, editingTextId, activeTool, changeActiveTool]);

    // -----------------------------------------------------------------------
    // Viewport clamping — prevent panning too far off-screen
    // -----------------------------------------------------------------------
    const clampViewport = useCallback(
      (vp: Viewport): Viewport => {
        const stage = stageRef.current;
        const stageW = stage?.width() ?? dimensions.width;
        const stageH = stage?.height() ?? dimensions.height;
        const mapW = mapImage?.width ?? stageW;
        const mapH = mapImage?.height ?? stageH;
        // Ensure at least 25% of the map image remains visible in the viewport
        const minVisibleX = mapW * vp.scale * 0.25;
        const minVisibleY = mapH * vp.scale * 0.25;
        const maxPanX = stageW - minVisibleX;
        const minPanX = -(mapW * vp.scale - minVisibleX);
        const maxPanY = stageH - minVisibleY;
        const minPanY = -(mapH * vp.scale - minVisibleY);
        const clampedScale = Math.max(minScale, Math.min(MAX_SCALE, vp.scale));
        return {
          x: Math.max(minPanX, Math.min(maxPanX, vp.x)),
          y: Math.max(minPanY, Math.min(maxPanY, vp.y)),
          scale: clampedScale,
        };
      },
      [dimensions.width, dimensions.height, minScale, mapImage],
    );

    // -----------------------------------------------------------------------
    // Zoom (mouse wheel)
    // -----------------------------------------------------------------------
    const handleWheel = useCallback(
      (e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const direction = e.evt.deltaY < 0 ? 1 : -1;
        const oldScale = viewport.scale;
        const newScale = Math.min(
          MAX_SCALE,
          Math.max(minScale, direction > 0 ? oldScale * ZOOM_STEP : oldScale / ZOOM_STEP),
        );

        const mousePointTo = {
          x: (pointer.x - viewport.x) / oldScale,
          y: (pointer.y - viewport.y) / oldScale,
        };
        setViewport(
          clampViewport({
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
            scale: newScale,
          }),
        );
      },
      [viewport, clampViewport, minScale],
    );

    // -----------------------------------------------------------------------
    // Canvas position from pointer
    // -----------------------------------------------------------------------
    const getCanvasPos = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        const stage = e.target.getStage();
        const pointer = stage?.getPointerPosition();
        if (!pointer) return null;
        return screenToCanvas(pointer.x, pointer.y, viewport);
      },
      [viewport],
    );

    const selectOnly = useCallback((id: string) => {
      setSelectedIds([id]);
    }, []);

    const getSelectionClientRect = useCallback(
      (box: SelectionBox) => {
        const normalized = normalizeSelectionBox(box);
        return {
          x: normalized.x * viewport.scale + viewport.x,
          y: normalized.y * viewport.scale + viewport.y,
          width: normalized.width * viewport.scale,
          height: normalized.height * viewport.scale,
        };
      },
      [viewport],
    );

    const getCanvasPointerFromNode = useCallback(
      (node: Konva.Node) => {
        const stage = node.getStage();
        const pointer = stage?.getPointerPosition();
        if (!pointer) return null;
        return screenToCanvas(pointer.x, pointer.y, viewport);
      },
      [viewport],
    );

    const getObjectClientRect = useCallback(
      (obj: CanvasObject): SelectionBox | null => {
        if (obj.type === "mediaAnnotation") {
          const frameX = obj.x + (obj.frameOffsetX ?? 80);
          const frameY = obj.y + (obj.frameOffsetY ?? -80);
          const frameW = obj.mediaWidth ?? 200;
          const frameH = obj.mediaHeight ?? 150;
          const minX = Math.min(obj.x - MEDIA_ANNOTATION_DOT_RADIUS, frameX);
          const minY = Math.min(obj.y - MEDIA_ANNOTATION_DOT_RADIUS, frameY);
          const maxX = Math.max(obj.x + MEDIA_ANNOTATION_DOT_RADIUS, frameX + frameW);
          const maxY = Math.max(obj.y + MEDIA_ANNOTATION_DOT_RADIUS, frameY + frameH);

          return getSelectionClientRect({
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          });
        }

        const node = stageRef.current?.findOne("#" + obj.id);
        if (!node) return null;

        const rect = node.getClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
      },
      [getSelectionClientRect],
    );

    // -----------------------------------------------------------------------
    // Mouse Down
    // -----------------------------------------------------------------------
    const handleMouseDown = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        // Middle-click starts pan
        if ("button" in e.evt && e.evt.button === 1) {
          isPanning.current = true;
          panStart.current = { x: e.evt.clientX - viewport.x, y: e.evt.clientY - viewport.y };
          return;
        }

        // Space held -> pan mode
        if (spaceHeld.current) {
          isPanning.current = true;
          const clientX =
            "clientX" in e.evt ? e.evt.clientX : (e.evt as TouchEvent).touches[0].clientX;
          const clientY =
            "clientY" in e.evt ? e.evt.clientY : (e.evt as TouchEvent).touches[0].clientY;
          panStart.current = { x: clientX - viewport.x, y: clientY - viewport.y };
          return;
        }

        const pos = getCanvasPos(e);
        if (!pos) return;

        if (activeTool === "select") {
          // Click on empty stage -> start marquee selection in canvas space.
          const clickedOnEmpty =
            e.target === e.target.getStage() || e.target.getParent() === e.target.getStage();
          if (clickedOnEmpty) {
            marqueeStart.current = pos;
            selectionDragState.current = null;
            setMarqueeRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
          }
          return;
        }

        if (activeTool === "eraser") {
          const target = e.target;
          const id = target.id();
          if (id && id !== stageRef.current?.id()) {
            pushHistory(objects);
            setObjects((prev) => prev.filter((o) => o.id !== id));
            if (collabEnabled) collab.removeObject(id);
          }
          return;
        }

        if (activeTool === "text") {
          pushHistory(objects);
          const obj = createCanvasObject("text", {
            x: pos.x,
            y: pos.y,
            text: "",
            stroke: strokeColor,
            strokeWidth,
            fill: strokeColor,
            width: 400,
            fontSize: 28,
            layer: activeLayerId ?? "default",
          });
          setObjects((prev) => [...prev, obj]);
          setSelectedIds([obj.id]);
          if (collabEnabled) collab.syncObject(obj);
          // Start inline editing after a short delay to allow render
          setTimeout(() => setEditingTextId(obj.id), 50);
          return;
        }

        // Drawing tools (pen, line, arrow, rect, circle)
        const objectType = TOOL_TO_OBJECT_TYPE[activeTool];
        if (!objectType) return;

        isDrawing.current = true;
        pushHistory(objects);

        const overrides: Partial<CanvasObject> = {
          x: pos.x,
          y: pos.y,
          stroke: strokeColor,
          strokeWidth,
          layer: activeLayerId ?? "default",
        };

        if (activeTool === "pen") {
          overrides.points = [0, 0];
        } else if (activeTool === "line" || activeTool === "arrow") {
          overrides.points = [0, 0, 0, 0];
        } else if (activeTool === "rect") {
          overrides.width = 0;
          overrides.height = 0;
        } else if (activeTool === "circle") {
          overrides.radius = 0;
        }

        const obj = createCanvasObject(objectType, overrides);
        setObjects((prev) => [...prev, obj]);
      },
      [
        activeTool,
        viewport,
        objects,
        strokeColor,
        strokeWidth,
        getCanvasPos,
        pushHistory,
        activeLayerId,
        collabEnabled,
        collab,
      ],
    );

    // -----------------------------------------------------------------------
    // Mouse Move
    // -----------------------------------------------------------------------
    const handleMouseMove = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (isPanning.current) {
          const clientX =
            "clientX" in e.evt ? e.evt.clientX : (e.evt as TouchEvent).touches[0].clientX;
          const clientY =
            "clientY" in e.evt ? e.evt.clientY : (e.evt as TouchEvent).touches[0].clientY;
          setViewport((v) =>
            clampViewport({
              ...v,
              x: clientX - panStart.current.x,
              y: clientY - panStart.current.y,
            }),
          );
          return;
        }

        if (marqueeStart.current) {
          const pos = getCanvasPos(e);
          if (!pos) return;

          setMarqueeRect({
            x: marqueeStart.current.x,
            y: marqueeStart.current.y,
            width: pos.x - marqueeStart.current.x,
            height: pos.y - marqueeStart.current.y,
          });
          return;
        }

        if (!isDrawing.current) return;
        const pos = getCanvasPos(e);
        if (!pos) return;

        setObjects((prev) => {
          const updated = prev.slice();
          const last = updated[updated.length - 1];
          if (!last) return prev;

          if (activeTool === "pen") {
            updated[updated.length - 1] = {
              ...last,
              points: [...(last.points ?? []), pos.x - last.x, pos.y - last.y],
            };
          } else if (activeTool === "line" || activeTool === "arrow") {
            updated[updated.length - 1] = {
              ...last,
              points: [0, 0, pos.x - last.x, pos.y - last.y],
            };
          } else if (activeTool === "rect") {
            updated[updated.length - 1] = {
              ...last,
              width: pos.x - last.x,
              height: pos.y - last.y,
            };
          } else if (activeTool === "circle") {
            const dx = pos.x - last.x;
            const dy = pos.y - last.y;
            updated[updated.length - 1] = {
              ...last,
              radius: Math.sqrt(dx * dx + dy * dy),
            };
          }
          return updated;
        });
      },
      [activeTool, getCanvasPos, clampViewport],
    );

    // -----------------------------------------------------------------------
    // Mouse Up
    // -----------------------------------------------------------------------
    const handleMouseUp = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (marqueeStart.current) {
          const endPos = getCanvasPos(e);
          const nextRect = endPos
            ? {
                x: marqueeStart.current.x,
                y: marqueeStart.current.y,
                width: endPos.x - marqueeStart.current.x,
                height: endPos.y - marqueeStart.current.y,
              }
            : (marqueeRect ?? {
                x: marqueeStart.current.x,
                y: marqueeStart.current.y,
                width: 0,
                height: 0,
              });
          const selectionRect = getSelectionClientRect(nextRect);
          const didDragMarquee =
            selectionRect.width >= MARQUEE_MIN_SIZE_PX ||
            selectionRect.height >= MARQUEE_MIN_SIZE_PX;
          const nextSelectedIds = !didDragMarquee
            ? []
            : visibleObjects
                .filter((obj) => {
                  const objectRect = getObjectClientRect(obj);
                  return objectRect
                    ? Konva.Util.haveIntersection(selectionRect, objectRect)
                    : false;
                })
                .map((obj) => obj.id);

          (globalThis as { __selectionDebug?: unknown }).__selectionDebug = {
            didDragMarquee,
            selectionRect,
            nextSelectedIds,
          };

          setSelectedIds(nextSelectedIds);

          marqueeStart.current = null;
          setMarqueeRect(null);
        }

        // Sync the last drawn object to collab when drawing finishes
        if (isDrawing.current && collabEnabled) {
          const lastObj = objects[objects.length - 1];
          if (lastObj) collab.syncObject(lastObj);
        }

        isDrawing.current = false;
        isPanning.current = false;
      },
      [
        getCanvasPos,
        getObjectClientRect,
        getSelectionClientRect,
        marqueeRect,
        visibleObjects,
        collabEnabled,
        collab,
        objects,
      ],
    );

    // -----------------------------------------------------------------------
    // HTML5 drag-and-drop (agent icon from sidebar)
    // -----------------------------------------------------------------------
    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();

        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const pos = screenToCanvas(screenX, screenY, viewport);

        // 1) Handle ability drops
        const abilityData = e.dataTransfer.getData("application/x-ability");
        if (abilityData) {
          const [agentId, skillFileNumStr] = abilityData.split(":");
          const agent = STRINOVA_AGENTS.find((a) => a.id === agentId);
          if (!agent) return;
          const skillFileNum = parseInt(skillFileNumStr, 10);
          const skillIconPath = getCachedSkillPath(agentId, skillFileNum);
          loadIconImage(skillIconPath);
          pushHistory(objects);
          const obj = createCanvasObject("abilityIcon" as CanvasObjectType, {
            x: pos.x,
            y: pos.y,
            agentId,
            iconUrl: skillIconPath,
            iconSize: 38,
            skillFileNum,
            stroke: "#ffffff",
            strokeWidth: 1,
            layer: activeLayerId ?? "default",
          });
          setObjects((prev) => [...prev, obj]);
          if (collabEnabled) collab.syncObject(obj);
          return;
        }

        // 2) Handle utility drops
        const utilityData = e.dataTransfer.getData("application/x-utility");
        if (utilityData) {
          const utilityIconPath = getUtilityIconPath(utilityData);
          if (!utilityIconPath) return;
          loadIconImage(utilityIconPath);
          pushHistory(objects);
          const obj = createCanvasObject("utilityIcon" as CanvasObjectType, {
            x: pos.x,
            y: pos.y,
            utilityId: utilityData,
            iconUrl: utilityIconPath,
            iconSize: 38,
            stroke: "#ffffff",
            strokeWidth: 1,
            layer: activeLayerId ?? "default",
          });
          setObjects((prev) => [...prev, obj]);
          if (collabEnabled) collab.syncObject(obj);
          return;
        }

        // 3) Handle agent icon drops
        const agentId = e.dataTransfer.getData("application/x-agent-id");
        if (!agentId) return;

        const side = e.dataTransfer.getData("application/x-agent-side");
        const sideColor = side === "defense" ? SIDE_COLORS.defense : SIDE_COLORS.attack;

        pushHistory(objects);
        const agent = STRINOVA_AGENTS.find((a) => a.id === agentId);
        const obj = createCanvasObject("agentIcon" as CanvasObjectType, {
          x: pos.x,
          y: pos.y,
          agentId,
          iconUrl: agent?.profileUrl,
          iconSize: 50,
          stroke: sideColor,
          strokeWidth: 2,
          fill: sideColor,
          layer: activeLayerId ?? "default",
        });
        setObjects((prev) => [...prev, obj]);
        if (collabEnabled) collab.syncObject(obj);
      },
      [viewport, objects, pushHistory, loadIconImage, activeLayerId, collabEnabled, collab],
    );

    // -----------------------------------------------------------------------
    // onTransformEnd — normalize scale back to 1 and bake into geometry
    // -----------------------------------------------------------------------
    const handleTransformEnd = useCallback(
      (e: Konva.KonvaEventObject<Event>, obj: CanvasObject) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        updateCanvasObject(
          obj.id,
          (o) => {
            const updates: Partial<CanvasObject> = {
              rotation: node.rotation(),
            };

            switch (o.type) {
              case "rect":
                updates.x = node.x();
                updates.y = node.y();
                updates.width = (o.width ?? 0) * scaleX;
                updates.height = (o.height ?? 0) * scaleY;
                break;
              case "circle":
                updates.x = node.x();
                updates.y = node.y();
                updates.radius = (o.radius ?? 0) * Math.max(scaleX, scaleY);
                break;
              case "text":
                updates.x = node.x();
                updates.y = node.y();
                updates.fontSize = Math.round((o.fontSize ?? 20) * scaleY);
                break;
              case "agentIcon":
              case "abilityIcon":
              case "utilityIcon":
                updates.x = node.x();
                updates.y = node.y();
                updates.iconSize = Math.round((o.iconSize ?? 40) * scaleX);
                break;
              case "mediaAnnotation":
                updates.frameOffsetX = node.x() - o.x;
                updates.frameOffsetY = node.y() - o.y;
                updates.mediaWidth = Math.round((o.mediaWidth ?? 200) * scaleX);
                updates.mediaHeight = Math.round((o.mediaHeight ?? 150) * scaleY);
                break;
            }

            return { ...o, ...updates };
          },
          { sync: true },
        );

        // Reset scale on the node
        node.scaleX(1);
        node.scaleY(1);
      },
      [updateCanvasObject],
    );

    const startSelectionAwareDrag = useCallback(
      (obj: CanvasObject, target: Konva.Node) => {
        if (activeTool !== "select") return;

        const keepMultiSelection =
          activeSelectedIds.length > 1 && activeSelectedIds.includes(obj.id);
        setSelectedIds(keepMultiSelection ? activeSelectedIds : [obj.id]);
        pushHistory(objects);

        if (!keepMultiSelection) {
          selectionDragState.current = null;
          return;
        }

        const pointerStart = getCanvasPointerFromNode(target);
        if (!pointerStart) {
          selectionDragState.current = null;
          return;
        }

        const selectedIdSet = new Set(activeSelectedIds);
        selectionDragState.current = {
          pointerStart,
          startPositions: new Map(
            objects
              .filter((candidate) => selectedIdSet.has(candidate.id))
              .map((candidate) => [candidate.id, { x: candidate.x, y: candidate.y }]),
          ),
        };
      },
      [activeSelectedIds, activeTool, getCanvasPointerFromNode, objects, pushHistory],
    );

    const applySelectionDrag = useCallback(
      (target: Konva.Node, options?: { sync?: boolean }) => {
        const dragState = selectionDragState.current;
        if (!dragState) return false;

        const pointer = getCanvasPointerFromNode(target);
        if (!pointer) return false;

        const deltaX = pointer.x - dragState.pointerStart.x;
        const deltaY = pointer.y - dragState.pointerStart.y;

        const currentObjects = objectsRef.current;
        const updatedObjects: CanvasObject[] = [];

        const nextObjects = currentObjects.map((obj) => {
          const start = dragState.startPositions.get(obj.id);
          if (!start) return obj;

          const updatedObject = {
            ...obj,
            x: start.x + deltaX,
            y: start.y + deltaY,
          };

          updatedObjects.push(updatedObject);
          return updatedObject;
        });

        if (updatedObjects.length > 0) {
          commitObjects(nextObjects);
        }

        if (options?.sync && updatedObjects.length > 0) {
          collab.syncBatch(updatedObjects, []);
        }

        return true;
      },
      [getCanvasPointerFromNode, collab, commitObjects],
    );

    // -----------------------------------------------------------------------
    // Common props for selectable/draggable objects
    // -----------------------------------------------------------------------
    const selectableProps = useCallback(
      (obj: CanvasObject) => ({
        draggable: activeTool === "select",
        onClick: activeTool === "select" ? () => selectOnly(obj.id) : undefined,
        onTap: activeTool === "select" ? () => selectOnly(obj.id) : undefined,
        onDragStart:
          activeTool === "select"
            ? (e: Konva.KonvaEventObject<DragEvent>) => {
                startSelectionAwareDrag(obj, e.target);
              }
            : undefined,
        onDragMove:
          activeTool === "select"
            ? (e: Konva.KonvaEventObject<DragEvent>) => {
                applySelectionDrag(e.target);
              }
            : undefined,
        onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
          const node = e.target;
          const wasMultiDrag = Boolean(selectionDragState.current);
          if (wasMultiDrag) {
            applySelectionDrag(node, { sync: true });
            selectionDragState.current = null;
            return;
          }

          updateCanvasObject(obj.id, (current) => ({ ...current, x: node.x(), y: node.y() }), {
            sync: true,
          });
        },
        onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(e, obj),
      }),
      [
        activeTool,
        applySelectionDrag,
        handleTransformEnd,
        selectOnly,
        startSelectionAwareDrag,
        updateCanvasObject,
      ],
    );

    // -----------------------------------------------------------------------
    // Render individual canvas objects
    // -----------------------------------------------------------------------
    const renderObject = useCallback(
      (obj: CanvasObject) => {
        const common = { id: obj.id, opacity: obj.opacity ?? 1 };

        switch (obj.type) {
          case "freehand":
            return (
              <Line
                key={obj.id}
                {...common}
                {...selectableProps(obj)}
                x={obj.x}
                y={obj.y}
                points={obj.points ?? []}
                stroke={obj.stroke}
                strokeWidth={obj.strokeWidth}
                lineCap="round"
                lineJoin="round"
                tension={0.5}
                globalCompositeOperation="source-over"
              />
            );
          case "line":
            return (
              <Line
                key={obj.id}
                {...common}
                {...selectableProps(obj)}
                x={obj.x}
                y={obj.y}
                points={obj.points ?? []}
                stroke={obj.stroke}
                strokeWidth={obj.strokeWidth}
                lineCap="round"
              />
            );
          case "arrow":
            return (
              <Arrow
                key={obj.id}
                {...common}
                {...selectableProps(obj)}
                x={obj.x}
                y={obj.y}
                points={obj.points ?? []}
                stroke={obj.stroke}
                strokeWidth={obj.strokeWidth}
                fill={obj.stroke}
                pointerLength={obj.pointerLength ?? 15}
                pointerWidth={obj.pointerWidth ?? 12}
                lineCap="round"
              />
            );
          case "rect":
            return (
              <Rect
                key={obj.id}
                {...common}
                {...selectableProps(obj)}
                x={obj.x}
                y={obj.y}
                width={obj.width ?? 0}
                height={obj.height ?? 0}
                stroke={obj.stroke}
                strokeWidth={obj.strokeWidth}
                fill={obj.fill ?? "transparent"}
                rotation={obj.rotation ?? 0}
              />
            );
          case "circle":
            return (
              <Circle
                key={obj.id}
                {...common}
                {...selectableProps(obj)}
                x={obj.x}
                y={obj.y}
                radius={obj.radius ?? 0}
                stroke={obj.stroke}
                strokeWidth={obj.strokeWidth}
                fill={obj.fill ?? "transparent"}
                rotation={obj.rotation ?? 0}
              />
            );
          case "text":
            return (
              <Text
                key={obj.id}
                {...common}
                {...selectableProps(obj)}
                x={obj.x}
                y={obj.y}
                text={editingTextId === obj.id ? "" : (obj.text ?? "")}
                fontSize={obj.fontSize ?? 24}
                fill={obj.fill ?? obj.stroke}
                stroke="#000000"
                strokeWidth={2}
                fillAfterStrokeEnabled
                width={obj.width ?? 200}
                wrap="word"
                rotation={obj.rotation ?? 0}
                onDblClick={() => {
                  if (activeTool !== "select") return;
                  setEditingTextId(obj.id);
                }}
                onDblTap={() => {
                  if (activeTool !== "select") return;
                  setEditingTextId(obj.id);
                }}
              />
            );
          case "agentIcon": {
            const size = obj.iconSize ?? 50;
            const agentImg = agentImages.get(obj.agentId ?? "");
            const iconColor = obj.stroke ?? "#ef4444";
            return (
              <Group
                key={obj.id}
                {...common}
                x={obj.x}
                y={obj.y}
                width={size}
                height={size}
                offsetX={size / 2}
                offsetY={size / 2}
                {...selectableProps(obj)}
                onMouseEnter={(e) => {
                  setHoveredId(obj.id);
                  const stage = e.target.getStage();
                  if (stage)
                    stage.container().style.cursor = activeTool === "select" ? "grab" : cursorStyle;
                }}
                onMouseLeave={(e) => {
                  setHoveredId(null);
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = cursorStyle;
                }}
              >
                {hoveredId === obj.id && (
                  <Circle
                    x={size / 2}
                    y={size / 2}
                    radius={size / 2 + 4}
                    stroke="#60a5fa"
                    strokeWidth={2}
                    dash={[4, 2]}
                  />
                )}
                <Circle
                  x={size / 2}
                  y={size / 2}
                  radius={size / 2 + 2}
                  fill={obj.fill ?? iconColor}
                  stroke={iconColor}
                  strokeWidth={obj.strokeWidth}
                />
                {agentImg ? (
                  <Group
                    clipFunc={(ctx: {
                      arc: (x: number, y: number, r: number, start: number, end: number) => void;
                    }) => {
                      ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
                    }}
                  >
                    <KonvaImage image={agentImg} x={1} y={1} width={size - 2} height={size - 2} />
                  </Group>
                ) : (
                  <Text
                    text={(obj.agentId ?? "?")[0].toUpperCase()}
                    fontSize={size * 0.5}
                    fill="#ffffff"
                    align="center"
                    verticalAlign="middle"
                    width={size}
                    height={size}
                  />
                )}
              </Group>
            );
          }
          case "abilityIcon":
          case "utilityIcon": {
            const size = obj.iconSize ?? 38;
            const iconImg = iconImages.get(obj.iconUrl ?? "");
            return (
              <Group
                key={obj.id}
                {...common}
                x={obj.x}
                y={obj.y}
                width={size}
                height={size}
                offsetX={size / 2}
                offsetY={size / 2}
                {...selectableProps(obj)}
                onMouseEnter={(e) => {
                  setHoveredId(obj.id);
                  const stage = e.target.getStage();
                  if (stage)
                    stage.container().style.cursor = activeTool === "select" ? "grab" : cursorStyle;
                }}
                onMouseLeave={(e) => {
                  setHoveredId(null);
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = cursorStyle;
                }}
              >
                {hoveredId === obj.id && (
                  <Circle
                    x={size / 2}
                    y={size / 2}
                    radius={size / 2 + 4}
                    stroke="#60a5fa"
                    strokeWidth={2}
                    dash={[4, 2]}
                  />
                )}
                <Circle
                  x={size / 2}
                  y={size / 2}
                  radius={size / 2}
                  fill="#2a2a3e"
                  stroke="#555"
                  strokeWidth={1}
                />
                {iconImg && (
                  <Group
                    clipFunc={(ctx: {
                      arc: (x: number, y: number, r: number, start: number, end: number) => void;
                    }) => {
                      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
                    }}
                  >
                    <KonvaImage image={iconImg} x={2} y={2} width={size - 4} height={size - 4} />
                  </Group>
                )}
              </Group>
            );
          }
          case "mediaAnnotation": {
            const dotRadius = MEDIA_ANNOTATION_DOT_RADIUS;
            const frameX = obj.frameOffsetX ?? 80;
            const frameY = obj.frameOffsetY ?? -80;
            const frameW = obj.mediaWidth ?? 200;
            const frameH = obj.mediaHeight ?? 150;
            const mediaImg = mediaImages.get(obj.id);
            const isSelectMode = activeTool === "select";

            const handleSelect = () => selectOnly(obj.id);

            const handlePartMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
              setHoveredId(obj.id);
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = isSelectMode ? "grab" : cursorStyle;
            };

            const handlePartMouseLeave = (e: Konva.KonvaEventObject<MouseEvent>) => {
              setHoveredId(null);
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = cursorStyle;
            };

            const syncDotPosition = (
              e: Konva.KonvaEventObject<DragEvent>,
              options?: { sync?: boolean },
            ) => {
              const node = e.target;
              const nextX = node.x();
              const nextY = node.y();
              const deltaX = nextX - obj.x;
              const deltaY = nextY - obj.y;

              updateCanvasObject(
                obj.id,
                (o) => ({
                  ...o,
                  x: nextX,
                  y: nextY,
                  frameOffsetX: (o.frameOffsetX ?? 80) - deltaX,
                  frameOffsetY: (o.frameOffsetY ?? -80) - deltaY,
                }),
                options,
              );
            };

            const syncFramePosition = (
              e: Konva.KonvaEventObject<DragEvent>,
              options?: { sync?: boolean },
            ) => {
              const node = e.target;

              updateCanvasObject(
                obj.id,
                (o) => ({
                  ...o,
                  frameOffsetX: node.x() - o.x,
                  frameOffsetY: node.y() - o.y,
                }),
                options,
              );
            };

            const handlePartDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
              if (!isSelectMode) return;
              startSelectionAwareDrag(obj, e.target);
            };

            const handleDotDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
              if (applySelectionDrag(e.target)) return;
              syncDotPosition(e);
            };

            const handleDotDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
              const wasMultiDrag = Boolean(selectionDragState.current);
              if (wasMultiDrag) {
                applySelectionDrag(e.target, { sync: true });
                selectionDragState.current = null;
                return;
              }
              syncDotPosition(e, { sync: true });
            };

            const handleFrameDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
              if (applySelectionDrag(e.target)) return;
              syncFramePosition(e);
            };

            const handleFrameDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
              const wasMultiDrag = Boolean(selectionDragState.current);
              if (wasMultiDrag) {
                applySelectionDrag(e.target, { sync: true });
                selectionDragState.current = null;
                return;
              }
              syncFramePosition(e, { sync: true });
            };

            return [
              <Line
                key={`${obj.id}-connector`}
                points={[obj.x, obj.y, obj.x + frameX + frameW / 2, obj.y + frameY + frameH / 2]}
                stroke={obj.stroke}
                strokeWidth={1}
                dash={[4, 3]}
                opacity={(obj.opacity ?? 1) * 0.6}
                listening={false}
              />,
              <Group
                key={`${obj.id}-dot`}
                x={obj.x}
                y={obj.y}
                opacity={obj.opacity ?? 1}
                draggable={isSelectMode}
                onClick={isSelectMode ? handleSelect : undefined}
                onTap={isSelectMode ? handleSelect : undefined}
                onDragStart={isSelectMode ? handlePartDragStart : undefined}
                onDragMove={isSelectMode ? handleDotDragMove : undefined}
                onDragEnd={isSelectMode ? handleDotDragEnd : undefined}
                onMouseEnter={handlePartMouseEnter}
                onMouseLeave={handlePartMouseLeave}
              >
                <Circle
                  x={0}
                  y={0}
                  radius={dotRadius}
                  fill={obj.stroke}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
                {hoveredId === obj.id && (
                  <Circle
                    x={0}
                    y={0}
                    radius={dotRadius + 4}
                    stroke="#60a5fa"
                    strokeWidth={2}
                    dash={[4, 2]}
                  />
                )}
              </Group>,
              <Group
                key={obj.id}
                id={obj.id}
                x={obj.x + frameX}
                y={obj.y + frameY}
                width={frameW}
                height={frameH}
                opacity={obj.opacity ?? 1}
                draggable={isSelectMode}
                onClick={isSelectMode ? handleSelect : undefined}
                onTap={isSelectMode ? handleSelect : undefined}
                onDragStart={isSelectMode ? handlePartDragStart : undefined}
                onDragMove={isSelectMode ? handleFrameDragMove : undefined}
                onDragEnd={isSelectMode ? handleFrameDragEnd : undefined}
                onTransformEnd={(e) => handleTransformEnd(e, obj)}
                onMouseEnter={handlePartMouseEnter}
                onMouseLeave={handlePartMouseLeave}
              >
                <Rect
                  x={0}
                  y={0}
                  width={frameW}
                  height={frameH}
                  fill="#1a1a2e"
                  stroke={obj.stroke}
                  strokeWidth={obj.strokeWidth}
                  cornerRadius={4}
                />
                {mediaImg && (
                  <KonvaImage image={mediaImg} x={2} y={2} width={frameW - 4} height={frameH - 4} />
                )}
              </Group>,
            ];
          }
          default:
            return null;
        }
      },
      [
        activeTool,
        cursorStyle,
        hoveredId,
        agentImages,
        iconImages,
        mediaImages,
        editingTextId,
        selectableProps,
        handleTransformEnd,
        applySelectionDrag,
        selectOnly,
        startSelectionAwareDrag,
        updateCanvasObject,
      ],
    );

    // -----------------------------------------------------------------------
    // Selected object info for toolbar
    // -----------------------------------------------------------------------
    const selectedObject =
      activeSelectedIds.length === 1
        ? objects.find((o) => o.id === activeSelectedIds[0])
        : undefined;

    const handleChangeSelectedColor = useCallback(
      (color: string) => {
        if (activeSelectedIds.length !== 1) return;
        const selectedId = activeSelectedIds[0];
        pushHistory(objects);
        updateCanvasObject(
          selectedId,
          (o) => ({ ...o, stroke: color, fill: o.type === "text" ? color : o.fill }),
          { sync: true },
        );
      },
      [activeSelectedIds, objects, pushHistory, updateCanvasObject],
    );

    const handleChangeSelectedFontSize = useCallback(
      (size: number) => {
        if (activeSelectedIds.length !== 1) return;
        const selectedId = activeSelectedIds[0];
        pushHistory(objects);
        updateCanvasObject(selectedId, (o) => ({ ...o, fontSize: size }), { sync: true });
      },
      [activeSelectedIds, objects, pushHistory, updateCanvasObject],
    );

    // -----------------------------------------------------------------------
    // Media annotation upload
    // -----------------------------------------------------------------------
    const handleUploadImage = useCallback(() => {
      mediaInputRef.current?.click();
    }, []);

    // -----------------------------------------------------------------------
    // Export as image
    // -----------------------------------------------------------------------
    const handleExportImage = useCallback(() => {
      const stage = stageRef.current;
      if (!stage) return;

      // Temporarily hide UI layers (transformer, marquee)
      const layers = stage.getLayers();
      const transformerLayer = layers[layers.length - 1]; // Last layer = transformer
      const marqueeLayer = layers[layers.length - 2]; // Second-to-last = marquee
      const prevTransformerVisible = transformerLayer?.visible();
      const prevMarqueeVisible = marqueeLayer?.visible();
      transformerLayer?.visible(false);
      marqueeLayer?.visible(false);

      try {
        const dataUrl = stage.toDataURL({ pixelRatio: 2 });

        // Sanitize filename
        const safeName = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
        const fileName = `${safeName(mapName || "map")}-${safeName(setupName || "setup")}.png`;

        const link = document.createElement("a");
        link.download = fileName;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        // Restore visibility
        transformerLayer?.visible(prevTransformerVisible ?? true);
        marqueeLayer?.visible(prevMarqueeVisible ?? true);
        stage.batchDraw();
      }
    }, [mapName, setupName]);

    const handleMediaFileChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith("image/")) return;

        // Max 2MB to avoid localStorage bloat
        if (file.size > 2 * 1024 * 1024) {
          alert("Image must be under 2MB");
          e.target.value = "";
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const img = new window.Image();
          img.onload = () => {
            // Scale to max 200px wide, maintaining aspect ratio
            const maxW = 200;
            const scale = Math.min(1, maxW / img.width);
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);

            // Place in center of current view
            const centerX = (dimensions.width / 2 - viewport.x) / viewport.scale;
            const centerY = (dimensions.height / 2 - viewport.y) / viewport.scale;

            pushHistory(objects);
            const obj = createCanvasObject("mediaAnnotation" as CanvasObjectType, {
              x: centerX,
              y: centerY,
              mediaDataUrl: dataUrl,
              mediaWidth: w,
              mediaHeight: h,
              frameOffsetX: 80,
              frameOffsetY: -80,
              stroke: "#a855f7",
              strokeWidth: 2,
              layer: activeLayerId ?? "default",
            });

            // Pre-cache the image
            setMediaImages((prev) => {
              const next = new Map(prev);
              next.set(obj.id, img);
              return next;
            });

            setObjects((prev) => [...prev, obj]);
            if (collabEnabled) collab.syncObject(obj);
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
        e.target.value = "";
      },
      [dimensions, viewport, objects, pushHistory, activeLayerId, collabEnabled, collab],
    );

    const normalizedMarqueeRect = marqueeRect ? normalizeSelectionBox(marqueeRect) : null;

    // -----------------------------------------------------------------------
    // Collab: cursor tracking
    // -----------------------------------------------------------------------
    const handleContainerMouseMove = useCallback(
      (e: React.MouseEvent) => {
        if (!collabEnabled) return;
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const canvasPos = screenToCanvas(screenX, screenY, viewport);
        collab.setCursor(canvasPos.x, canvasPos.y);
      },
      [collabEnabled, collab, viewport],
    );

    const handleContainerMouseLeave = useCallback(() => {
      if (collabEnabled) collab.clearCursorFn();
    }, [collabEnabled, collab]);

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <CanvasToolbar
          activeTool={activeTool}
          setActiveTool={changeActiveTool}
          strokeColor={strokeColor}
          setStrokeColor={setStrokeColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          zoom={viewport.scale}
          onUndo={handleUndo}
          onDelete={handleDeleteSelected}
          hasSelection={activeSelectedIds.length > 0}
          selectedObjectType={selectedObject?.type}
          onChangeSelectedColor={handleChangeSelectedColor}
          onChangeSelectedFontSize={handleChangeSelectedFontSize}
          onUploadImage={handleUploadImage}
          showBarriers={showBarriers}
          onToggleBarriers={() => setShowBarriers((v) => !v)}
          onExportImage={handleExportImage}
          mapName={mapName}
          setupName={setupName}
          nameEditState={nameEditState}
          collabEnabled={collabEnabled}
          collabPeerCount={collab.peerCount}
          collabLink={collab.collabLink}
          onStartCollab={onStartCollab}
          onStopCollab={() => {
            collab.stopCollab();
            onStopCollab?.();
          }}
          showSaveLocalCopy={Boolean(collabEnabled && !hasLocalSetup)}
          onSaveLocalCopy={handleSaveLocalCopy}
        />
        <div
          ref={containerRef}
          className="relative flex-1 bg-[#1a1a2e]"
          style={{ cursor: cursorStyle }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onMouseMove={handleContainerMouseMove}
          onMouseLeave={handleContainerMouseLeave}
        >
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleMediaFileChange}
          />
          <Stage
            ref={stageRef}
            width={dimensions.width}
            height={dimensions.height}
            x={viewport.x}
            y={viewport.y}
            scaleX={viewport.scale}
            scaleY={viewport.scale}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            {/* Layer 1: Map background */}
            <Layer listening={false}>
              {mapImage && <Image image={mapImage} x={0} y={0} alt="" />}
            </Layer>

            {/* Layer 2: Drawing objects */}
            <Layer>{visibleObjects.map(renderObject)}</Layer>

            {/* Layer 3: Remote cursors (collab) */}
            {collabEnabled && collab.remoteUsers && collab.remoteUsers.size > 0 && (
              <Layer listening={false}>
                {Array.from(collab.remoteUsers.entries()).map(([clientId, user]) => {
                  if (!user.cursor) return null;
                  return (
                    <Group key={clientId} x={user.cursor.x} y={user.cursor.y}>
                      <Circle radius={6 / viewport.scale} fill={user.color} opacity={0.9} />
                      <Text
                        text={user.name}
                        fontSize={12 / viewport.scale}
                        fill={user.color}
                        x={10 / viewport.scale}
                        y={-4 / viewport.scale}
                      />
                    </Group>
                  );
                })}
              </Layer>
            )}

            {/* Layer 4: Marquee selection */}
            <Layer listening={false}>
              {normalizedMarqueeRect &&
                (normalizedMarqueeRect.width > 0 || normalizedMarqueeRect.height > 0) && (
                  <Rect
                    x={normalizedMarqueeRect.x}
                    y={normalizedMarqueeRect.y}
                    width={normalizedMarqueeRect.width}
                    height={normalizedMarqueeRect.height}
                    fill="rgba(96, 165, 250, 0.14)"
                    stroke="#60a5fa"
                    strokeWidth={1.5 / viewport.scale}
                    dash={[8 / viewport.scale, 4 / viewport.scale]}
                  />
                )}
            </Layer>

            {/* Layer 5: Transformer for selected elements */}
            <Layer>
              <Transformer
                ref={transformerRef}
                rotateEnabled={activeSelectedIds.length === 1}
                borderStroke="#7c3aed"
                borderStrokeWidth={1.5}
                anchorStroke="#7c3aed"
                anchorFill="#ffffff"
                anchorSize={8}
                anchorCornerRadius={2}
                enabledAnchors={
                  activeSelectedIds.length === 1
                    ? ["top-left", "top-right", "bottom-left", "bottom-right"]
                    : []
                }
                keepRatio={true}
                boundBoxFunc={(oldBox, newBox) => {
                  // Prevent too-small elements
                  if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) return oldBox;
                  return newBox;
                }}
              />
            </Layer>
          </Stage>
          {/* Inline text editing overlay */}
          {editingTextId &&
            (() => {
              const obj = objects.find((o) => o.id === editingTextId);
              if (!obj || obj.type !== "text") return null;
              const screenX = obj.x * viewport.scale + viewport.x;
              const screenY = obj.y * viewport.scale + viewport.y;
              const screenFontSize = (obj.fontSize ?? 28) * viewport.scale;
              const screenWidth = Math.max(300, (obj.width ?? 400) * viewport.scale);
              return (
                <textarea
                  ref={textInputRef}
                  autoFocus
                  className="absolute z-50 resize-none overflow-hidden border-none bg-transparent outline-none"
                  style={{
                    left: screenX,
                    top: screenY,
                    fontSize: screenFontSize,
                    color: obj.fill ?? obj.stroke,
                    width: screenWidth,
                    minHeight: Math.max(screenFontSize * 1.5, 40),
                    lineHeight: 1.2,
                    fontFamily: "Arial, sans-serif",
                  }}
                  defaultValue={obj.text ?? ""}
                  onInput={(e) => {
                    const ta = e.currentTarget;
                    ta.style.height = "auto";
                    ta.style.height = ta.scrollHeight + "px";
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    pushHistory(objects);
                    if (editingTextId) {
                      updateCanvasObject(editingTextId, (o) => ({ ...o, text: value }), {
                        sync: true,
                      });
                    }
                    setEditingTextId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      const value = e.currentTarget.value;
                      pushHistory(objects);
                      if (editingTextId) {
                        updateCanvasObject(editingTextId, (o) => ({ ...o, text: value }), {
                          sync: true,
                        });
                      }
                      setEditingTextId(null);
                    }
                    e.stopPropagation(); // prevent canvas shortcuts
                  }}
                />
              );
            })()}
        </div>
      </div>
    );
  },
);

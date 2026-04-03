"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";
import type { CanvasObject, LayerConfig } from "@/types/canvas";
import { clearCursor, getRemoteUsers, updateCursorPosition, updateSelection } from "./awareness";
import {
  createCollabSession,
  destroyCollabSession,
  generateCollabLink,
  type CollabState,
  type CollabUser,
} from "./provider";
import { createDefaultLayers } from "@/canvas/schema";
import { hasYjsLayerState, initYjsDoc, loadFromYjs, pushLocalToYjs, syncLayersToYjs } from "./sync";

export interface RemoteCanvasState {
  objects: CanvasObject[];
  layers: LayerConfig[];
}

export interface UseCollabOptions {
  setupId: string;
  mapId: string;
  collabToken?: string | null;
  enabled: boolean;
  localObjects: CanvasObject[];
  localLayers: LayerConfig[];
  onRemoteChange: (state: RemoteCanvasState) => void;
}

export interface UseCollabReturn {
  isConnected: boolean;
  peerCount: number;
  remoteUsers: Map<number, CollabUser>;
  collabLink: string;
  syncObject: (obj: CanvasObject) => void;
  removeObject: (id: string) => void;
  syncBatch: (objects: CanvasObject[], deletedIds: string[]) => void;
  syncLayers: (layers: LayerConfig[]) => void;
  setCursor: (x: number, y: number) => void;
  clearCursorFn: () => void;
  setSelection: (ids: string[]) => void;
  startCollab: () => void;
  stopCollab: () => void;
}

/**
 * Sentinel used as Y.Transaction origin to identify local changes.
 * Remote changes will have a different (or null) origin.
 */
const LOCAL_ORIGIN = "local-canvas";
const AUTO_START_DELAY_MS = 100;

interface ActiveCollabSession {
  session: CollabState;
  objectsMap: Y.Map<string>;
  layersMap: Y.Map<string>;
  objectsObserver: (event: Y.YMapEvent<string>) => void;
  layersObserver: (event: Y.YMapEvent<string>) => void;
  awarenessHandler: (changes: { added: number[]; updated: number[]; removed: number[] }) => void;
}

export function useCollab({
  setupId,
  mapId,
  collabToken,
  enabled,
  localObjects,
  localLayers,
  onRemoteChange,
}: UseCollabOptions): UseCollabReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(0);
  const [remoteUsers, setRemoteUsers] = useState<Map<number, CollabUser>>(new Map());
  const [collabLink, setCollabLink] = useState("");

  // Refs for the Yjs session (so we don't close over stale state)
  const sessionRef = useRef<ActiveCollabSession | null>(null);
  const objectsMapRef = useRef<Y.Map<string> | null>(null);
  const startingRef = useRef(false);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTokenRef = useRef(0);
  const mountedRef = useRef(true);
  const enabledRef = useRef(enabled);

  // Keep a stable ref to the callback so observe doesn't go stale
  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;

  // Keep a stable ref to localObjects for push-on-connect
  const localObjectsRef = useRef(localObjects);
  localObjectsRef.current = localObjects;

  const localLayersRef = useRef(localLayers);
  localLayersRef.current = localLayers;

  enabledRef.current = enabled;

  const resetCollabState = useCallback(() => {
    if (!mountedRef.current) return;

    setIsConnected(false);
    setPeerCount(0);
    setRemoteUsers(new Map());
    setCollabLink("");
  }, []);

  const clearPendingStart = useCallback(() => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
  }, []);

  const cleanupSession = useCallback(
    (
      activeSession: ActiveCollabSession | null,
      options?: { immediate?: boolean; resetState?: boolean },
    ) => {
      const resetState = options?.resetState ?? true;

      if (!activeSession) {
        if (resetState) {
          resetCollabState();
        }
        return;
      }

      const isCurrentSession = sessionRef.current === activeSession;
      if (isCurrentSession) {
        sessionRef.current = null;
        objectsMapRef.current = null;
      }

      activeSession.objectsMap.unobserve(activeSession.objectsObserver);
      activeSession.layersMap.unobserve(activeSession.layersObserver);
      activeSession.session.awareness.off("change", activeSession.awarenessHandler);
      destroyCollabSession(activeSession.session, { immediate: options?.immediate });

      if (resetState && (isCurrentSession || sessionRef.current === null)) {
        resetCollabState();
      }
    },
    [resetCollabState],
  );

  // -----------------------------------------------------------------------
  // Start / stop collab session
  // -----------------------------------------------------------------------
  const startSession = useCallback(async () => {
    if (!enabledRef.current || !setupId || !mapId || !collabToken) return;
    if (sessionRef.current || startingRef.current) return;

    const startToken = startTokenRef.current + 1;
    startTokenRef.current = startToken;
    startingRef.current = true;

    try {
      const session = createCollabSession(setupId, collabToken);

      if (
        startToken !== startTokenRef.current ||
        !enabledRef.current ||
        !mountedRef.current ||
        sessionRef.current
      ) {
        destroyCollabSession(session);
        return;
      }

      const { objectsMap, layersMap } = initYjsDoc(session.doc);
      const objectsObserver = (event: Y.YMapEvent<string>) => {
        if (event.transaction.origin === LOCAL_ORIGIN) return;

        onRemoteChangeRef.current(loadFromYjs(objectsMap, layersMap));
      };

      const layersObserver = (event: Y.YMapEvent<string>) => {
        if (event.transaction.origin === LOCAL_ORIGIN) return;

        onRemoteChangeRef.current(loadFromYjs(objectsMap, layersMap));
      };

      const awarenessHandler = (changes: {
        added: number[];
        updated: number[];
        removed: number[];
      }) => {
        if (!mountedRef.current) return;

        // Skip updates that only affect the local user (e.g., our own
        // cursor moves) to avoid re-render loops:
        // setCursor → awareness change → setRemoteUsers → re-render → …
        const localId = session.awareness.clientID;
        const allChangedIds = [...changes.added, ...changes.updated, ...changes.removed];
        const onlyLocal = allChangedIds.length > 0 && allChangedIds.every((id) => id === localId);
        if (onlyLocal) return;

        const users = getRemoteUsers(session.awareness);
        setRemoteUsers(new Map(users));
        setPeerCount(users.size);
      };

      const activeSession: ActiveCollabSession = {
        session,
        objectsMap,
        layersMap,
        objectsObserver,
        layersObserver,
        awarenessHandler,
      };

      sessionRef.current = activeSession;
      objectsMapRef.current = objectsMap;

      objectsMap.observe(objectsObserver);
      layersMap.observe(layersObserver);
      session.awareness.on("change", awarenessHandler);
      // Initial awareness read — pass all known clients as "added" so
      // we pick up any remote users that connected before we attached.
      const knownClientIds = [...session.awareness.getStates().keys()];
      awarenessHandler({ added: knownClientIds, updated: [], removed: [] });

      if (mountedRef.current) {
        setIsConnected(true);
        setCollabLink(generateCollabLink(mapId, setupId, collabToken));
      }

      const initialSync = await session.provider.waitForInitialSync();

      if (
        startToken !== startTokenRef.current ||
        !enabledRef.current ||
        !mountedRef.current ||
        sessionRef.current !== activeSession
      ) {
        cleanupSession(activeSession);
        return;
      }

      const remoteState = loadFromYjs(objectsMap, layersMap);
      const hasRemoteState = remoteState.objects.length > 0 || hasYjsLayerState(layersMap);

      if (hasRemoteState) {
        onRemoteChangeRef.current(remoteState);
      } else if (
        initialSync.shouldSeedLocal &&
        (localObjectsRef.current.length > 0 || localLayersRef.current.length > 0)
      ) {
        pushLocalToYjs(
          localObjectsRef.current,
          localLayersRef.current.length > 0 ? localLayersRef.current : createDefaultLayers(),
          { objectsMap, layersMap },
          session.doc,
        );
      }

      if (startToken !== startTokenRef.current || !enabledRef.current || !mountedRef.current) {
        cleanupSession(activeSession);
      }
    } catch (error) {
      console.error("[StrinoPlant] Failed to start collab session", error);

      if (startToken === startTokenRef.current) {
        resetCollabState();
      }
    } finally {
      if (startToken === startTokenRef.current) {
        startingRef.current = false;
      }
    }
  }, [setupId, mapId, collabToken, cleanupSession, resetCollabState]);

  const stopSession = useCallback(
    (options?: { immediate?: boolean; resetState?: boolean }) => {
      clearPendingStart();
      startTokenRef.current += 1;
      startingRef.current = false;
      cleanupSession(sessionRef.current, options);
    },
    [cleanupSession, clearPendingStart],
  );

  const scheduleStart = useCallback(() => {
    clearPendingStart();
    startTimerRef.current = setTimeout(() => {
      startTimerRef.current = null;
      void startSession();
    }, AUTO_START_DELAY_MS);
  }, [clearPendingStart, startSession]);

  // Auto-start when enabled or session identity changes.
  const sessionKey = `${setupId}:${mapId}:${collabToken ?? ""}`;
  const lastSessionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const didSessionChange =
      lastSessionKeyRef.current !== null && lastSessionKeyRef.current !== sessionKey;
    lastSessionKeyRef.current = sessionKey;

    if (didSessionChange && (sessionRef.current || startingRef.current)) {
      stopSession();
    }

    if (enabled) {
      scheduleStart();
    } else {
      stopSession();
    }

    return clearPendingStart;
  }, [enabled, sessionKey, scheduleStart, stopSession, clearPendingStart]);

  useEffect(() => {
    if (!enabled) return;

    const handlePageHide = () => {
      stopSession({ immediate: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        const awareness = sessionRef.current?.session.awareness;
        if (awareness) {
          clearCursor(awareness);
        }
        return;
      }

      if (enabledRef.current && !sessionRef.current && !startingRef.current) {
        scheduleStart();
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, scheduleStart, stopSession]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopSession({ immediate: true, resetState: false });
    };
  }, [stopSession]);

  // -----------------------------------------------------------------------
  // Sync methods — called by the canvas when objects change
  // -----------------------------------------------------------------------
  const syncObject = useCallback((obj: CanvasObject) => {
    const objectsMap = objectsMapRef.current;
    const doc = sessionRef.current?.session.doc;
    if (!objectsMap || !doc) return;

    doc.transact(() => {
      objectsMap.set(obj.id, JSON.stringify(obj));
    }, LOCAL_ORIGIN);
  }, []);

  const removeObject = useCallback((id: string) => {
    const objectsMap = objectsMapRef.current;
    const doc = sessionRef.current?.session.doc;
    if (!objectsMap || !doc) return;

    doc.transact(() => {
      objectsMap.delete(id);
    }, LOCAL_ORIGIN);
  }, []);

  const syncBatch = useCallback((objects: CanvasObject[], deletedIds: string[]) => {
    const objectsMap = objectsMapRef.current;
    const doc = sessionRef.current?.session.doc;
    if (!objectsMap || !doc) return;

    doc.transact(() => {
      for (const obj of objects) {
        objectsMap.set(obj.id, JSON.stringify(obj));
      }
      for (const id of deletedIds) {
        objectsMap.delete(id);
      }
    }, LOCAL_ORIGIN);
  }, []);

  const syncLayers = useCallback((layers: LayerConfig[]) => {
    const activeSession = sessionRef.current;
    if (!activeSession) return;

    activeSession.session.doc.transact(() => {
      syncLayersToYjs(layers, activeSession.layersMap);
    }, LOCAL_ORIGIN);
  }, []);

  // -----------------------------------------------------------------------
  // Awareness methods
  // -----------------------------------------------------------------------
  const setCursor = useCallback((x: number, y: number) => {
    const awareness = sessionRef.current?.session.awareness;
    if (!awareness) return;
    updateCursorPosition(awareness, x, y);
  }, []);

  const clearCursorFn = useCallback(() => {
    const awareness = sessionRef.current?.session.awareness;
    if (!awareness) return;
    clearCursor(awareness);
  }, []);

  const setSelection = useCallback((ids: string[]) => {
    const awareness = sessionRef.current?.session.awareness;
    if (!awareness) return;
    updateSelection(awareness, ids);
  }, []);

  // -----------------------------------------------------------------------
  // Session control (for the UI to toggle)
  // -----------------------------------------------------------------------
  const startCollab = useCallback(() => {
    clearPendingStart();
    if (!sessionRef.current && !startingRef.current) {
      void startSession();
    }
  }, [startSession, clearPendingStart]);

  const stopCollab = useCallback(() => {
    if (sessionRef.current || startingRef.current) {
      stopSession();
    }
  }, [stopSession]);

  return {
    isConnected,
    peerCount,
    remoteUsers,
    collabLink,
    syncObject,
    removeObject,
    syncBatch,
    syncLayers,
    setCursor,
    clearCursorFn,
    setSelection,
    startCollab,
    stopCollab,
  };
}

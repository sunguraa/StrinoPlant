"use client";

import dynamic from "next/dynamic";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { createDefaultLayers, createLayerName } from "@/canvas/schema";
import { deserializeCanvas } from "@/canvas/state";
import { getMapById } from "@/lib/maps";
import { getSetupEditorHref } from "@/lib/routes";
import { createSetup, getSetup, renameSetup } from "@/lib/storage";
import { generateCollabLink } from "@/lib/yjs";
import type { StrategyCanvasHandle } from "@/components/canvas/strategy-canvas";
import type { LayerConfig } from "@/types/canvas";

const StrategyCanvas = dynamic(
  () => import("@/components/canvas/strategy-canvas").then((mod) => mod.StrategyCanvas),
  { ssr: false },
);

const emptySubscribe = () => () => {};

function normalizeSetupId(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function normalizeCollabToken(token: string | null): string | null {
  const trimmed = token?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function createCollabToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadInitialLayers(setupId?: string | null): LayerConfig[] {
  if (!setupId) return createDefaultLayers();

  const setup = getSetup(setupId);
  if (!setup?.canvasData) return createDefaultLayers();

  return deserializeCanvas(setup.canvasData)?.layers ?? createDefaultLayers();
}

function SetupEditorShell({
  mapId,
  setupId,
  initialCollabToken,
}: {
  mapId: string;
  setupId: string | null;
  initialCollabToken: string | null;
}) {
  const router = useRouter();
  const map = getMapById(mapId);
  const [labelVersion, setLabelVersion] = useState(0);
  const label = useSyncExternalStore(
    emptySubscribe,
    () => {
      void labelVersion;
      if (!setupId) return "New Setup";
      const setup = getSetup(setupId);
      return setup?.name ?? "Untitled Setup";
    },
    () => (!setupId ? "New Setup" : "Loading…"),
  );

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const [layers, setLayers] = useState<LayerConfig[]>(() => loadInitialLayers(setupId));
  const [activeLayerId, setActiveLayerId] = useState(
    () => loadInitialLayers(setupId)[0]?.id ?? "default",
  );
  const canvasRef = useRef<StrategyCanvasHandle>(null);
  const [collabToken, setCollabToken] = useState<string | null>(initialCollabToken);
  const didAutoCreateSetup = useRef(false);

  useEffect(() => {
    setCollabToken(initialCollabToken);
  }, [initialCollabToken]);

  useEffect(() => {
    if (setupId || didAutoCreateSetup.current) return;

    didAutoCreateSetup.current = true;
    const setup = createSetup(mapId, "Untitled Setup");
    router.replace(
      getSetupEditorHref(mapId, {
        setupId: setup.id,
        collabToken: initialCollabToken,
      }),
      { scroll: false },
    );
  }, [setupId, mapId, router, initialCollabToken]);

  useEffect(() => {
    if (layers.length === 0) return;

    if (!layers.some((layer) => layer.id === activeLayerId)) {
      setActiveLayerId(layers[0].id);
    }
  }, [layers, activeLayerId]);

  const handleToggleLayer = useCallback((layerId: string) => {
    setLayers((prev) => prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l)));
  }, []);

  const handleAddLayer = useCallback(() => {
    const newLayer: LayerConfig = {
      id: `layer-${Date.now()}`,
      name: createLayerName(layers.length + 1),
      visible: true,
    };
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  }, [layers.length]);

  const handleDeleteLayer = useCallback(
    (layerId: string) => {
      setLayers((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((l) => l.id !== layerId);
        if (activeLayerId === layerId) {
          setActiveLayerId(next[0].id);
        }
        return next;
      });
      canvasRef.current?.deleteObjectsByLayer(layerId);
    },
    [activeLayerId],
  );

  const handleSelectLayer = useCallback((layerId: string) => {
    setActiveLayerId(layerId);
  }, []);

  const handleRenameLayer = useCallback((layerId: string, name: string) => {
    setLayers((prev) => prev.map((l) => (l.id === layerId ? { ...l, name } : l)));
  }, []);

  const nameEditState = useMemo(
    () => ({
      editingName,
      nameInput,
      setNameInput,
      onStartEdit: () => {
        setNameInput(label);
        setEditingName(true);
      },
      onFinishEdit: (save: boolean) => {
        if (save && setupId && nameInput.trim()) {
          renameSetup(setupId, nameInput.trim());
          setLabelVersion((v) => v + 1);
        }
        setEditingName(false);
      },
    }),
    [editingName, nameInput, label, setupId],
  );

  const replaceCollabToken = useCallback(
    (nextToken: string | null) => {
      if (!setupId) return;

      router.replace(
        getSetupEditorHref(mapId, {
          setupId,
          collabToken: nextToken,
        }),
        { scroll: false },
      );
    },
    [router, mapId, setupId],
  );

  const handleStartCollab = useCallback(() => {
    if (!setupId) return "";

    const ensuredToken = collabToken ?? createCollabToken();

    if (collabToken !== ensuredToken) {
      setCollabToken(ensuredToken);
      replaceCollabToken(ensuredToken);
    }

    return generateCollabLink(mapId, setupId, ensuredToken);
  }, [collabToken, replaceCollabToken, mapId, setupId]);

  const handleStopCollab = useCallback(() => {
    setCollabToken(null);
    replaceCollabToken(null);
  }, [replaceCollabToken]);

  if (!setupId || !map) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  const collabEnabled = collabToken !== null;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          <StrategyCanvas
            ref={canvasRef}
            mapWikiPage={map.wikiPage}
            localMinimap={map.localMinimap}
            setupId={setupId}
            mapId={mapId}
            layers={layers}
            activeLayerId={activeLayerId}
            setupName={label}
            mapName={map.name}
            nameEditState={nameEditState}
            collabToken={collabToken}
            collabEnabled={collabEnabled}
            onStartCollab={handleStartCollab}
            onStopCollab={handleStopCollab}
            onLayersChange={setLayers}
            onLocalSetupSaved={() => setLabelVersion((v) => v + 1)}
          />
        </main>
        <RightSidebar
          layers={layers}
          activeLayerId={activeLayerId}
          onToggleLayer={handleToggleLayer}
          onAddLayer={handleAddLayer}
          onDeleteLayer={handleDeleteLayer}
          onSelectLayer={handleSelectLayer}
          onRenameLayer={handleRenameLayer}
        />
      </div>
    </div>
  );
}

function SetupEditorPageClientInner({ mapId }: { mapId: string }) {
  const searchParams = useSearchParams();
  const setupId = normalizeSetupId(searchParams.get("setupId"));
  const collabToken = normalizeCollabToken(searchParams.get("collab"));

  return (
    <SetupEditorShell
      key={setupId ?? "new-setup"}
      mapId={mapId}
      setupId={setupId}
      initialCollabToken={collabToken}
    />
  );
}

export function SetupEditorPageClient({ mapId }: { mapId: string }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Loading editor…
        </div>
      }
    >
      <SetupEditorPageClientInner mapId={mapId} />
    </Suspense>
  );
}
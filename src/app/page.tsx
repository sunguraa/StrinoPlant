"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import {
  Plus,
  Upload,
  ChevronDown,
  Pencil,
  Trash2,
  Download,
  Check,
  X,
  BookOpen,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RANKED_MAPS } from "@/lib/maps";
import { getSetupEditorHref } from "@/lib/routes";
import { getCachedIntroPath } from "@/lib/wiki/cache";
import {
  getSetupsByMap,
  createSetup,
  importSetup,
  renameSetup,
  deleteSetup,
  exportSetup,
  getSetup,
  type Setup,
} from "@/lib/storage";
import { fetchPresetIndex, fetchPreset, clonePresetToLocal } from "@/lib/presets";
import type { PresetMeta } from "@/types/preset";

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const STORAGE_KEY = "strinoplant_setups";

export default function Home() {
  const router = useRouter();
  const [expandedMap, setExpandedMap] = useState<string | null>(null);
  const [storageVersion, setStorageVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMapRef = useRef<string | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [editingSetup, setEditingSetup] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [activeTab, setActiveTab] = useState<"maps" | "presets">("maps");
  const [presets, setPresets] = useState<PresetMeta[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);

  // Re-render when localStorage changes from another tab
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) {
        setStorageVersion((v) => v + 1);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Derive setups per map — only reads localStorage after mount
  const setupsByMap = useCallback(
    (mapId: string): Setup[] => {
      if (!mounted) return [];
      void storageVersion; // dependency signal for re-render on storage changes
      return getSetupsByMap(mapId);
    },
    [mounted, storageVersion],
  );

  const handleNewSetup = useCallback(
    (mapId: string) => {
      const setup = createSetup(mapId, "Untitled Setup");
      router.push(getSetupEditorHref(mapId, { setupId: setup.id }));
    },
    [router],
  );

  const handleImportClick = useCallback((mapId: string) => {
    importMapRef.current = mapId;
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const setup = await importSetup(file);
        router.push(getSetupEditorHref(setup.mapId, { setupId: setup.id }));
      } catch {
        // silently fail on bad files
      }
      e.target.value = "";
    },
    [router],
  );

  const handleRenameSetup = useCallback((setupId: string, newName: string) => {
    if (newName.trim()) {
      renameSetup(setupId, newName.trim());
      setStorageVersion((v) => v + 1);
    }
    setEditingSetup(null);
  }, []);

  const handleDeleteSetup = useCallback((setupId: string) => {
    deleteSetup(setupId);
    setStorageVersion((v) => v + 1);
  }, []);

  const handleExportSetup = useCallback((setupId: string) => {
    const setup = getSetup(setupId);
    if (setup) exportSetup(setup);
  }, []);

  const toggleExpand = useCallback((mapId: string) => {
    setExpandedMap((prev) => (prev === mapId ? null : mapId));
  }, []);

  const handleSelectMapsTab = useCallback(() => {
    setActiveTab("maps");
    setPresetsLoading(false);
  }, []);

  const handleSelectPresetsTab = useCallback(() => {
    if (activeTab === "presets") return;

    setPresetsLoading(true);
    setActiveTab("presets");
  }, [activeTab]);

  // Fetch presets when tab switches to presets
  useEffect(() => {
    if (activeTab !== "presets") return;
    let cancelled = false;
    fetchPresetIndex()
      .then((idx) => {
        if (!cancelled) setPresets(idx.presets);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPresetsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const handleClonePreset = useCallback(
    async (presetId: string) => {
      try {
        const full = await fetchPreset(presetId);
        const setup = clonePresetToLocal(full);
        setStorageVersion((v) => v + 1);
        router.push(getSetupEditorHref(setup.mapId, { setupId: setup.id }));
      } catch {
        // silently fail
      }
    },
    [router],
  );

  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col px-4 py-8 md:px-6 md:py-12 overflow-auto">
        {/* Tab buttons */}
        <div className="mb-8 flex items-center gap-6">
          <button
            className={`text-2xl font-bold tracking-tight sm:text-3xl transition-colors ${
              activeTab === "maps"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/70"
            }`}
            onClick={handleSelectMapsTab}
          >
            Maps
          </button>
          <button
            className={`text-2xl font-bold tracking-tight sm:text-3xl transition-colors flex items-center gap-2 ${
              activeTab === "presets"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/70"
            }`}
            onClick={handleSelectPresetsTab}
          >
            <BookOpen className="h-6 w-6" />
            Presets
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />

        {activeTab === "maps" ? (
          /* === MAPS TAB === */
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {RANKED_MAPS.map((map) => {
              const setups = setupsByMap(map.id);
              const isExpanded = expandedMap === map.id;
              const introSrc = map.localIntroImage || getCachedIntroPath(map.id);

              return (
                <div key={map.id} className="flex flex-col">
                  <Card
                    className="cursor-pointer overflow-hidden transition-colors hover:ring-primary/50"
                    onClick={() => toggleExpand(map.id)}
                  >
                    {/* Map intro image / gradient background */}
                    <div className="relative h-40 sm:h-48">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={introSrc} alt={map.name} className="h-full w-full object-cover" />
                      {/* Dark gradient overlay + map name */}
                      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-3 pb-2 pt-8">
                        <h2 className="text-sm font-semibold text-white sm:text-base">
                          {map.name}
                        </h2>
                      </div>
                    </div>

                    {/* Setup count + expand indicator */}
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs text-muted-foreground">
                        {setups.length} {setups.length === 1 ? "setup" : "setups"}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </div>
                  </Card>

                  {/* Expanded setup list */}
                  {isExpanded && (
                    <div className="mt-1 rounded-md border border-border bg-card p-2 space-y-1">
                      {setups.length > 0 ? (
                        setups
                          .sort(
                            (a, b) =>
                              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
                          )
                          .map((setup) =>
                            editingSetup === setup.id ? (
                              <div
                                key={setup.id}
                                className="flex w-full items-center gap-1 rounded px-2 py-1.5"
                              >
                                <input
                                  autoFocus
                                  className="flex-1 rounded bg-muted px-2 py-0.5 text-sm font-medium outline-none ring-1 ring-primary"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRenameSetup(setup.id, editName);
                                    if (e.key === "Escape") setEditingSetup(null);
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0.5 text-green-500"
                                  onClick={() => handleRenameSetup(setup.id, editName)}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0.5 text-muted-foreground"
                                  onClick={() => setEditingSetup(null)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div
                                key={setup.id}
                                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted transition-colors group"
                              >
                                <button
                                  className="flex-1 truncate font-medium text-left"
                                  onClick={() =>
                                    router.push(getSetupEditorHref(map.id, { setupId: setup.id }))
                                  }
                                >
                                  {setup.name}
                                </button>
                                <div className="flex items-center gap-0.5 ml-2 shrink-0">
                                  <span className="text-xs text-muted-foreground mr-1">
                                    {formatRelativeDate(setup.updatedAt)}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditName(setup.name);
                                      setEditingSetup(setup.id);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportSetup(setup.id);
                                    }}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSetup(setup.id);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ),
                          )
                      ) : (
                        <p className="px-2 py-1 text-xs text-muted-foreground">No setups yet</p>
                      )}

                      <div className="flex gap-1 pt-1 border-t border-border">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 text-xs"
                          onClick={() => handleNewSetup(map.id)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          New Setup
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 text-xs"
                          onClick={() => handleImportClick(map.id)}
                        >
                          <Upload className="mr-1 h-3 w-3" />
                          Import
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : /* === PRESETS TAB === */
        presetsLoading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-muted-foreground animate-pulse">Loading presets...</span>
          </div>
        ) : presets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg">No community presets available yet</p>
            <p className="text-sm mt-1">Check back soon for curated strategies!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {RANKED_MAPS.filter((m) => presets.some((p) => p.mapId === m.id)).map((map) => {
              const mapPresets = presets.filter((p) => p.mapId === map.id);
              const presetIntroSrc = map.localIntroImage || getCachedIntroPath(map.id);
              return (
                <div key={map.id}>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={presetIntroSrc} alt="" className="h-6 w-6 rounded object-cover" />
                    {map.name}
                    <span className="text-sm font-normal text-muted-foreground">
                      {mapPresets.length} {mapPresets.length === 1 ? "preset" : "presets"}
                    </span>
                  </h2>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {mapPresets.map((preset) => (
                      <Card
                        key={preset.id}
                        className="p-4 hover:ring-1 hover:ring-primary/50 transition-all cursor-pointer group"
                        onClick={() => handleClonePreset(preset.id)}
                      >
                        <h3 className="font-semibold text-sm truncate">{preset.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">by {preset.author}</p>
                        <p className="text-xs text-muted-foreground/70 mt-2 line-clamp-2">
                          {preset.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground/50">
                            Click to use as template
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

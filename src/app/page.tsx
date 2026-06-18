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
import { formatRelativeDate } from "@/lib/date";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) {
        setStorageVersion((v) => v + 1);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setupsByMap = useCallback(
    (mapId: string): Setup[] => {
      if (!mounted) return [];
      void storageVersion;
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
      <div className="flex flex-1 flex-col px-4 py-8 md:px-8 md:py-12 overflow-auto">
        {/* Hero */}
        <div className="mb-10">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Strategy Planner · Local-first
          </span>
          <h1 className="mt-2 font-serif text-3xl font-medium leading-tight tracking-tight">
            Plan setups for <em className="text-muted-foreground">every map</em>.
          </h1>
        </div>

        {/* Section eyebrow + tab filter chips */}
        <div className="mb-6 flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            Browse
          </span>
          <span className="h-px flex-1 bg-border" />
          <div role="tablist" aria-label="Browse mode" className="flex gap-1">
            <button
              role="tab"
              aria-selected={activeTab === "maps"}
              onClick={handleSelectMapsTab}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                activeTab === "maps"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Maps
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "presets"}
              onClick={handleSelectPresetsTab}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors",
                activeTab === "presets"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Presets
            </button>
          </div>
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
              const introSrc = getCachedIntroPath(map.id);

              return (
                <div key={map.id} className="flex flex-col">
                  <div
                    className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl border border-border transition-all hover:ring-1 hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-label={`${map.name}${setups.length > 0 ? ` — ${setups.length} ${setups.length === 1 ? "setup" : "setups"}` : ""}`}
                    onClick={() => toggleExpand(map.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleExpand(map.id);
                      }
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={introSrc}
                      alt={map.name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Bottom scrim + edge vignette for legible overlay text */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-transparent" />
                    <div className="absolute inset-0 rounded-xl shadow-[inset_0_0_40px_rgba(0,0,0,0.45)]" />

                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-serif text-base font-medium text-white drop-shadow-sm sm:text-lg">
                          {map.name}
                        </h2>
                        <span className="text-xs text-white/75">
                          {setups.length > 0
                            ? `${setups.length} ${setups.length === 1 ? "setup" : "setups"}`
                            : "No setups yet"}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-white/85 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {/* Expanded setup list — height animates so cards below slide, not jump */}
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-200 ease-out",
                      isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden" inert={!isExpanded}>
                      <div className="mt-1 space-y-1 rounded-md border border-border bg-card p-2">
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
                                    aria-label="Confirm rename"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0.5 text-muted-foreground"
                                    onClick={() => setEditingSetup(null)}
                                    aria-label="Cancel rename"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <div
                                  key={setup.id}
                                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted transition-colors"
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
                                      className="h-6 w-6 p-0.5"
                                      aria-label={`Rename "${setup.name}"`}
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
                                      className="h-6 w-6 p-0.5"
                                      aria-label={`Export "${setup.name}"`}
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
                                      className="h-6 w-6 p-0.5 text-destructive"
                                      aria-label={`Delete "${setup.name}"`}
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : /* === PRESETS TAB === */
        presetsLoading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-muted-foreground animate-pulse">Loading presets…</span>
          </div>
        ) : presets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg">No community presets available yet</p>
            <p className="text-sm mt-1">Check back soon for curated strategies!</p>
          </div>
        ) : (
          <div className="space-y-10 pb-4">
            {RANKED_MAPS.filter((m) => presets.some((p) => p.mapId === m.id)).map((map) => {
              const mapPresets = presets.filter((p) => p.mapId === map.id);
              const presetIntroSrc = getCachedIntroPath(map.id);
              return (
                <section key={map.id}>
                  <div className="mb-4 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={presetIntroSrc}
                      alt=""
                      className="h-9 w-9 rounded-md object-cover ring-1 ring-border"
                    />
                    <div className="flex items-baseline gap-2">
                      <h2 className="font-serif text-lg font-medium">{map.name}</h2>
                      <span className="text-xs text-muted-foreground">
                        {mapPresets.length} {mapPresets.length === 1 ? "preset" : "presets"}
                      </span>
                    </div>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {mapPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleClonePreset(preset.id)}
                        aria-label={`Use preset: ${preset.name} by ${preset.author}`}
                        className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="relative h-24 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={presetIntroSrc}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-card via-card/40 to-transparent" />
                        </div>
                        <div className="flex flex-1 flex-col p-4 pt-3">
                          <h3 className="truncate text-sm font-semibold">{preset.name}</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">by {preset.author}</p>
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground/80">
                            {preset.description}
                          </p>
                          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                            Use as template
                            <ChevronDown className="h-3 w-3 -rotate-90" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

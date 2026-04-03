"use client";

import { useState, useCallback } from "react";
import { Eye, EyeOff, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { STRINOVA_UTILITIES, getUtilityIconPath } from "@/lib/wiki/utilities";
import type { LayerConfig } from "@/types/canvas";

interface RightSidebarProps {
  className?: string;
  layers: LayerConfig[];
  activeLayerId: string;
  onToggleLayer: (layerId: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (layerId: string) => void;
  onSelectLayer: (layerId: string) => void;
  onRenameLayer: (layerId: string, name: string) => void;
}

export function RightSidebar({
  className,
  layers,
  activeLayerId,
  onToggleLayer,
  onAddLayer,
  onDeleteLayer,
  onSelectLayer,
  onRenameLayer,
}: RightSidebarProps) {
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const handleUtilityDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, utilityId: string) => {
      e.dataTransfer.setData("application/x-utility", utilityId);
      e.dataTransfer.setData("application/x-agent-side", "");
      e.dataTransfer.effectAllowed = "copy";
    },
    [],
  );

  const startRename = useCallback(
    (layerId: string) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;
      setRenamingLayerId(layerId);
      setRenameValue(layer.name);
    },
    [layers],
  );

  const commitRename = useCallback(() => {
    if (renamingLayerId && renameValue.trim()) {
      onRenameLayer(renamingLayerId, renameValue.trim());
    }
    setRenamingLayerId(null);
    setRenameValue("");
  }, [renamingLayerId, renameValue, onRenameLayer]);

  return (
    <aside
      className={cn(
        "flex w-56 xl:w-72 2xl:w-80 shrink-0 flex-col overflow-hidden border-l border-border/40 bg-muted/30",
        className,
      )}
    >
      {/* Utilities section */}
      <div className="border-b border-border/40 px-4 py-3">
        <h3 className="mb-3 text-base font-semibold uppercase tracking-wider text-muted-foreground">
          Utilities
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {STRINOVA_UTILITIES.map((util) => {
            const iconUrl = getUtilityIconPath(util.id);
            return (
              <div
                key={util.id}
                draggable
                onDragStart={(e) => handleUtilityDragStart(e, util.id)}
                className="flex cursor-grab flex-col items-center gap-1.5 transition-opacity hover:opacity-80 active:cursor-grabbing"
              >
                <div className="flex h-14 w-14 xl:h-18 xl:w-18 items-center justify-center rounded-full bg-[#2a2a3e] ring-1 ring-border/40">
                  {iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={iconUrl}
                      alt={util.name}
                      width={44}
                      height={44}
                      className="h-9 w-9 xl:h-11 xl:w-11"
                      draggable={false}
                    />
                  ) : (
                    <div className="h-9 w-9 xl:h-11 xl:w-11 animate-pulse rounded-full bg-muted-foreground/20" />
                  )}
                </div>
                <span className="text-center text-xs leading-tight text-muted-foreground">
                  {util.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Layers section */}
      <div className="flex flex-1 flex-col overflow-hidden px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
            Layers
          </h3>
          <button
            type="button"
            onClick={onAddLayer}
            className="flex items-center gap-1 rounded px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-1">
            {layers.map((layer) => (
              <div
                key={layer.id}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors",
                  activeLayerId === layer.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                {/* Visibility toggle */}
                <button
                  type="button"
                  onClick={() => onToggleLayer(layer.id)}
                  className="shrink-0 p-0.5 transition-colors hover:text-foreground"
                >
                  {layer.visible ? (
                    <Eye className="h-5 w-5" />
                  ) : (
                    <EyeOff className="h-5 w-5 opacity-40" />
                  )}
                </button>

                {/* Name — click to select, double-click to rename */}
                {renamingLayerId === layer.id ? (
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") {
                        setRenamingLayerId(null);
                        setRenameValue("");
                      }
                    }}
                    autoFocus
                    className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-sm outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectLayer(layer.id)}
                    onDoubleClick={() => startRename(layer.id)}
                    className={cn(
                      "min-w-0 flex-1 truncate text-left",
                      !layer.visible && "line-through opacity-40",
                    )}
                  >
                    {layer.name}
                  </button>
                )}

                {/* Delete — only if more than one layer */}
                {layers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteLayer(layer.id)}
                    className="shrink-0 p-0.5 text-muted-foreground/40 transition-colors hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Upload, FileDown, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMapById } from "@/lib/maps";
import { getSetupEditorHref } from "@/lib/routes";
import {
  type Setup,
  getSetupsByMap,
  createSetup,
  deleteSetup,
  renameSetup,
  importSetup,
  exportSetup,
} from "@/lib/storage";

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

function SetupRow({
  setup,
  mapId,
  onDelete,
  onRename,
}: {
  setup: Setup;
  mapId: string;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(setup.name);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== setup.name) {
      onRename(setup.id, trimmed);
    } else {
      setEditName(setup.name);
    }
    setEditing(false);
  };

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card px-4 py-3 transition-colors hover:border-border hover:bg-accent/50">
      <Link
        href={getSetupEditorHref(mapId, { setupId: setup.id })}
        className="flex min-w-0 flex-1 flex-col gap-0.5"
        onClick={(e) => {
          if (editing || confirming) e.preventDefault();
        }}
      >
        {editing ? (
          <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
            <input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setEditName(setup.name);
                  setEditing(false);
                }
              }}
              className="h-7 w-full rounded border border-border bg-background px-2 text-sm font-medium text-foreground outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={(e) => {
                e.preventDefault();
                commitRename();
              }}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={(e) => {
                e.preventDefault();
                setEditName(setup.name);
                setEditing(false);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <span className="truncate text-sm font-medium">{setup.name}</span>
        )}
        <span className="text-xs text-muted-foreground">
          Updated {formatRelativeDate(setup.updatedAt)}
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {!editing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Rename setup"
            onClick={() => {
              setEditName(setup.name);
              setEditing(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Export setup"
          onClick={() => exportSetup(setup)}
        >
          <FileDown className="h-3.5 w-3.5" />
        </Button>
        {confirming ? (
          <div className="flex items-center gap-1">
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onDelete(setup.id)}
            >
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            aria-label="Delete setup"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function MapDetailPageClient({ mapId }: { mapId: string }) {
  const router = useRouter();
  const map = getMapById(mapId);
  const [setups, setSetups] = useState<Setup[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    setSetups(getSetupsByMap(mapId));
  }, [mapId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = () => {
    const setup = createSetup(mapId, "Untitled Setup");
    router.push(getSetupEditorHref(mapId, { setupId: setup.id }));
  };

  const handleDelete = (id: string) => {
    deleteSetup(id);
    refresh();
  };

  const handleRename = (id: string, name: string) => {
    renameSetup(id, name);
    refresh();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const setup = await importSetup(file);
      router.push(getSetupEditorHref(setup.mapId, { setupId: setup.id }));
    } catch {
      // TODO: toast error
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!map) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Map not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{map.name}</h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1.5 h-4 w-4" />
            Import
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Setup
          </Button>
        </div>
      </div>

      {setups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-16 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            No setups yet — create one to get started
          </p>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Setup
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {setups.map((setup) => (
            <SetupRow
              key={setup.id}
              setup={setup}
              mapId={mapId}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          ))}
        </div>
      )}
    </div>
  );
}
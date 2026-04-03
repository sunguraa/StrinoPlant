"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MousePointer2,
  Pen,
  Minus,
  MoveRight,
  Square,
  Circle,
  Type,
  Eraser,
  Undo2,
  Trash2,
  ImagePlus,
  Shield,
  Download,
  Pencil,
  Users,
  Copy,
  Check,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import type { CanvasObjectType, ToolType } from "@/types/canvas";
import type { NameEditState } from "@/components/canvas/strategy-canvas";

const TOOLS: { type: ToolType; label: string; icon: React.ElementType; shortcut?: string }[] = [
  { type: "select", label: "Select", icon: MousePointer2, shortcut: "V" },
  { type: "pen", label: "Pen", icon: Pen, shortcut: "P" },
  { type: "line", label: "Line", icon: Minus, shortcut: "L" },
  { type: "arrow", label: "Arrow", icon: MoveRight, shortcut: "A" },
  { type: "rect", label: "Rectangle", icon: Square, shortcut: "R" },
  { type: "circle", label: "Circle", icon: Circle, shortcut: "C" },
  { type: "text", label: "Text", icon: Type, shortcut: "T" },
  { type: "eraser", label: "Eraser", icon: Eraser, shortcut: "E" },
];

const COLORS = [
  { label: "White", value: "#ffffff" },
  { label: "Red", value: "#ef4444" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#22c55e" },
  { label: "Yellow", value: "#eab308" },
  { label: "Orange", value: "#f97316" },
  { label: "Purple", value: "#a855f7" },
  { label: "Cyan", value: "#06b6d4" },
];

const WIDTHS = [
  { label: "S", value: 2 },
  { label: "M", value: 5 },
  { label: "L", value: 10 },
];

const FONT_SIZES = [
  { label: "S", value: 18 },
  { label: "M", value: 28 },
  { label: "L", value: 42 },
];

interface CanvasToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  strokeColor: string;
  setStrokeColor: (c: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
  zoom: number;
  onUndo: () => void;
  onDelete: () => void;
  hasSelection?: boolean;
  selectedObjectType?: CanvasObjectType;
  onChangeSelectedColor?: (color: string) => void;
  onChangeSelectedFontSize?: (size: number) => void;
  onUploadImage?: () => void;
  showBarriers?: boolean;
  onToggleBarriers?: () => void;
  onExportImage?: () => void;
  mapName?: string;
  setupName?: string;
  nameEditState?: NameEditState;
  collabEnabled?: boolean;
  collabPeerCount?: number;
  collabLink?: string;
  onStartCollab?: () => string | Promise<string>;
  onStopCollab?: () => void;
  showSaveLocalCopy?: boolean;
  onSaveLocalCopy?: () => void;
}

export function CanvasToolbar({
  activeTool,
  setActiveTool,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  zoom,
  onUndo,
  onDelete,
  hasSelection,
  selectedObjectType,
  onChangeSelectedColor,
  onChangeSelectedFontSize,
  onUploadImage,
  showBarriers,
  onToggleBarriers,
  onExportImage,
  mapName,
  setupName,
  nameEditState,
  collabEnabled,
  collabPeerCount,
  collabLink,
  onStartCollab,
  // onStopCollab reserved for future disconnect UI
  showSaveLocalCopy,
  onSaveLocalCopy,
}: CanvasToolbarProps) {
  const isTextSelected = selectedObjectType === "text";
  const [copied, setCopied] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleCopyCollabLink = async () => {
    let linkToCopy = collabLink;

    if (!collabEnabled) {
      linkToCopy = (await onStartCollab?.()) ?? linkToCopy;
    }

    if (!linkToCopy) return;

    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failures are non-fatal for the collab session itself.
    }
  };

  useEffect(() => {
    if (nameEditState?.editingName) {
      nameInputRef.current?.focus();
    }
  }, [nameEditState?.editingName]);

  return (
    <TooltipProvider delay={300}>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 xl:gap-x-2.5 border-b border-border/40 bg-muted/30 px-3 xl:px-5 py-2 xl:py-2.5">
        {/* Map name — Setup name */}
        <div className="flex items-center gap-1 shrink-0 mr-1">
          <span className="text-base font-medium text-foreground whitespace-nowrap">
            {mapName ?? "Map"} &mdash;{" "}
          </span>
          {nameEditState?.editingName ? (
            <input
              ref={nameInputRef}
              className="text-base font-medium bg-transparent border-b border-primary outline-none px-1 min-w-20 max-w-50"
              value={nameEditState.nameInput}
              onChange={(e) => nameEditState.setNameInput(e.target.value)}
              onBlur={() => nameEditState.onFinishEdit(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") nameEditState.onFinishEdit(true);
                if (e.key === "Escape") nameEditState.onFinishEdit(false);
              }}
            />
          ) : (
            <button
              className="text-base font-medium hover:text-primary transition-colors flex items-center gap-1 whitespace-nowrap"
              onClick={() => nameEditState?.onStartEdit()}
            >
              {setupName ?? "Untitled"}
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <Separator orientation="vertical" className="mx-1 h-10" />

        {/* Tool buttons */}
        <div className="flex items-center gap-1.5">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Tooltip key={tool.type}>
                <TooltipTrigger render={<div className="inline-flex" />}>
                  <Button
                    variant={activeTool === tool.type ? "outline" : "ghost"}
                    size="icon-sm"
                    onClick={() => setActiveTool(tool.type)}
                    aria-label={tool.label}
                    aria-pressed={activeTool === tool.type}
                    className="h-8 w-8 xl:h-10 xl:w-10"
                  >
                    <Icon className="h-4 w-4 xl:h-5 xl:w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {tool.label}
                  {tool.shortcut && (
                    <kbd className="ml-1.5 rounded border border-border/60 bg-muted/80 px-1 text-[10px] text-muted-foreground">
                      {tool.shortcut}
                    </kbd>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <Separator orientation="vertical" className="mx-1.5 h-10" />

        {/* Color swatches */}
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <Tooltip key={c.value}>
              <TooltipTrigger render={<div className="inline-flex" />}>
                <Button
                  variant={strokeColor === c.value ? "outline" : "ghost"}
                  size="icon-sm"
                  onClick={() => {
                    setStrokeColor(c.value);
                    if (isTextSelected) onChangeSelectedColor?.(c.value);
                  }}
                  aria-label={c.label}
                  className="h-8 w-8 xl:h-10 xl:w-10"
                >
                  <span
                    className="h-5 w-5 xl:h-6 xl:w-6 rounded-full border border-border/60"
                    style={{ backgroundColor: c.value }}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {c.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator orientation="vertical" className="mx-1.5 h-10" />

        {/* Stroke widths / Font sizes */}
        <div className="flex items-center gap-1.5">
          {isTextSelected
            ? FONT_SIZES.map((fs) => (
                <Button
                  key={fs.value}
                  variant="ghost"
                  size="sm"
                  className="px-3 text-sm"
                  onClick={() => onChangeSelectedFontSize?.(fs.value)}
                >
                  {fs.label}
                </Button>
              ))
            : WIDTHS.map((w) => (
                <Button
                  key={w.value}
                  variant={strokeWidth === w.value ? "outline" : "ghost"}
                  size="sm"
                  className="px-3 text-sm"
                  onClick={() => setStrokeWidth(w.value)}
                >
                  {w.label}
                </Button>
              ))}
        </div>

        <Separator orientation="vertical" className="mx-1.5 h-10" />

        {/* Undo */}
        <Tooltip>
          <TooltipTrigger render={<div className="inline-flex" />}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onUndo}
              aria-label="Undo"
              className="h-8 w-8 xl:h-10 xl:w-10"
            >
              <Undo2 className="h-4 w-4 xl:h-5 xl:w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Undo{" "}
            <kbd className="ml-1.5 rounded border border-border/60 bg-muted/80 px-1 text-[10px] text-muted-foreground">
              Ctrl+Z
            </kbd>
          </TooltipContent>
        </Tooltip>

        {/* Delete selected */}
        <Tooltip>
          <TooltipTrigger render={<div className="inline-flex" />}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onDelete}
              aria-label="Delete selected"
              className="h-8 w-8 xl:h-10 xl:w-10 text-destructive"
              disabled={!hasSelection}
            >
              <Trash2 className="h-4 w-4 xl:h-5 xl:w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Delete Selected{" "}
            <kbd className="ml-1.5 rounded border border-border/60 bg-muted/80 px-1 text-[10px] text-muted-foreground">
              Del
            </kbd>
          </TooltipContent>
        </Tooltip>

        {/* Upload Image */}
        <Separator orientation="vertical" className="mx-1.5 h-10" />
        <Tooltip>
          <TooltipTrigger render={<div className="inline-flex" />}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onUploadImage}
              aria-label="Upload Image"
              className="h-8 w-8 xl:h-10 xl:w-10"
            >
              <ImagePlus className="h-4 w-4 xl:h-5 xl:w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Upload Image
          </TooltipContent>
        </Tooltip>

        <div className="ml-auto flex flex-wrap items-center gap-x-1.5 gap-y-2 xl:gap-x-2.5">
          {/* Zoom indicator */}
          <span className="text-lg tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>

          <Separator orientation="vertical" className="mx-1.5 h-10" />

          {/* Toggle Barriers */}
          <Tooltip>
            <TooltipTrigger render={<div className="inline-flex" />}>
              <Button
                variant={showBarriers ? "outline" : "ghost"}
                size="icon-sm"
                onClick={onToggleBarriers}
                aria-label="Toggle Barriers"
                aria-pressed={showBarriers}
                className="h-8 w-8 xl:h-10 xl:w-10"
              >
                <Shield className="h-4 w-4 xl:h-5 xl:w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Toggle Barriers (show attack/defense zones)
            </TooltipContent>
          </Tooltip>

          {/* Export as Image */}
          <Tooltip>
            <TooltipTrigger render={<div className="inline-flex" />}>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onExportImage}
                aria-label="Export as Image"
                className="h-8 w-8 xl:h-10 xl:w-10"
              >
                <Download className="h-4 w-4 xl:h-5 xl:w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Export as Image
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1.5 h-10" />

          {/* Share / Collab */}
          <Tooltip>
            <TooltipTrigger render={<div className="inline-flex" />}>
              <Button
                variant={collabEnabled ? "outline" : "ghost"}
                size="sm"
                className="h-8 xl:h-10 gap-1 xl:gap-1.5 px-2 xl:px-3"
                onClick={() => {
                  void handleCopyCollabLink();
                }}
              >
                {collabEnabled && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                )}
                <Users className="h-5 w-5" />
                {collabEnabled && (collabPeerCount ?? 0) > 0 && (
                  <span className="text-xs font-medium">{collabPeerCount}</span>
                )}
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : collabEnabled ? (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                ) : null}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {collabEnabled
                ? `${collabPeerCount ?? 0} peer${(collabPeerCount ?? 0) !== 1 ? "s" : ""} connected — click to copy link`
                : "Start collab session & copy share link"}
            </TooltipContent>
          </Tooltip>

          {showSaveLocalCopy && (
            <Tooltip>
              <TooltipTrigger render={<div className="inline-flex" />}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 xl:h-10 gap-1 xl:gap-1.5 px-2 xl:px-3"
                  onClick={onSaveLocalCopy}
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden xl:inline">Save Local Copy</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Save this shared setup to local browser storage
              </TooltipContent>
            </Tooltip>
          )}

          <Separator orientation="vertical" className="mx-1.5 h-10" />

          {/* StrinoPlant home link */}
          <Link
            href="/"
            className="text-sm font-bold tracking-tight text-primary hover:text-primary/80 transition-colors whitespace-nowrap shrink-0"
          >
            StrinoPlant
          </Link>
        </div>
      </div>
    </TooltipProvider>
  );
}

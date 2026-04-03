import type { PresetIndex, PresetFull } from "@/types/preset";
import { withBasePath } from "@/lib/base-path";
import { saveSetup, type Setup } from "./storage";

const PRESETS_BASE_URL = withBasePath("/presets");

let cachedIndex: PresetIndex | null = null;

export async function fetchPresetIndex(): Promise<PresetIndex> {
  if (cachedIndex) return cachedIndex;
  const res = await fetch(`${PRESETS_BASE_URL}/index.json`);
  if (!res.ok) throw new Error("Failed to fetch preset index");
  cachedIndex = (await res.json()) as PresetIndex;
  return cachedIndex;
}

export async function fetchPreset(id: string): Promise<PresetFull> {
  const res = await fetch(`${PRESETS_BASE_URL}/${id}.json`);
  if (!res.ok) throw new Error(`Failed to fetch preset ${id}`);
  return (await res.json()) as PresetFull;
}

export function clonePresetToLocal(preset: PresetFull): Setup {
  const setup: Setup = {
    id: crypto.randomUUID(),
    mapId: preset.mapId,
    name: `${preset.name} (from ${preset.author})`,
    canvasData: preset.canvasData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveSetup(setup);
  return setup;
}

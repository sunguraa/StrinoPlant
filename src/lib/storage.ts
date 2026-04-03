// Local storage utility for saving/loading setups
// All data persists in the browser — no external database needed

export interface Setup {
  id: string;
  mapId: string;
  name: string;
  canvasData: string; // JSON-serialized canvas state
  createdAt: string; // ISO timestamp
  updatedAt: string;
}

const STORAGE_KEY = "strinoplant_setups";

function getAll(): Setup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Setup[]) : [];
  } catch {
    return [];
  }
}

function saveAll(setups: Setup[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(setups));
}

export function getSetupsByMap(mapId: string): Setup[] {
  return getAll().filter((s) => s.mapId === mapId);
}

export function getSetup(id: string): Setup | undefined {
  return getAll().find((s) => s.id === id);
}

export function saveSetup(setup: Setup): void {
  const all = getAll();
  const idx = all.findIndex((s) => s.id === setup.id);
  if (idx >= 0) {
    all[idx] = { ...setup, updatedAt: new Date().toISOString() };
  } else {
    all.push(setup);
  }
  saveAll(all);
}

export function deleteSetup(id: string): void {
  saveAll(getAll().filter((s) => s.id !== id));
}

export function renameSetup(id: string, name: string): void {
  const all = getAll();
  const idx = all.findIndex((s) => s.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], name, updatedAt: new Date().toISOString() };
    saveAll(all);
  }
}

export function createSetup(mapId: string, name: string): Setup {
  const setup: Setup = {
    id: crypto.randomUUID(),
    mapId,
    name,
    canvasData: "{}",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveSetup(setup);
  return setup;
}

export function exportSetup(setup: Setup): void {
  const blob = new Blob([JSON.stringify(setup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${setup.name || "setup"}-${setup.mapId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importSetup(file: File): Promise<Setup> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const setup = JSON.parse(reader.result as string) as Setup;
        if (!setup.id || !setup.mapId) {
          reject(new Error("Invalid setup file"));
          return;
        }
        saveSetup(setup);
        resolve(setup);
      } catch {
        reject(new Error("Failed to parse setup file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

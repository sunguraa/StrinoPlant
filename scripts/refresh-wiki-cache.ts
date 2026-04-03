#!/usr/bin/env npx tsx
/**
 * refresh-wiki-cache.ts
 *
 * Downloads and caches all wiki images locally to public/wiki-cache/.
 * Run: npx tsx scripts/refresh-wiki-cache.ts [--force]
 *
 * Uses only built-in Node.js APIs (fs, path, global fetch).
 */

import fs from "node:fs";
import path from "node:path";

// ─── Configuration ──────────────────────────────────────────────────────────

const WIKI_API_URL = "https://strinova.org/w/api.php";
const CACHE_DIR = path.resolve(import.meta.dirname ?? __dirname, "..", "public", "wiki-cache");
const RATE_LIMIT_MS = 200;

/** Allowed hosts for downloaded image URLs (SSRF prevention) */
const ALLOWED_HOSTS = new Set([
  "static.wikitide.net",
  "strinova.org",
  "static.strinova.org",
  "wiki.biligame.com",
]);

// ─── Inline data (duplicated from src/ to avoid path alias deps) ────────────

const RANKED_MAPS = [
  { id: "area-88", wikiPage: "Area_88" },
  { id: "base-404", wikiPage: "Base_404" },
  { id: "port-euler", wikiPage: "Port_Euler" },
  { id: "space-lab", wikiPage: "Space_Lab" },
  { id: "windy-town", wikiPage: "Windy_Town" },
  { id: "cauchy-street", wikiPage: "Cauchy_Street" },
  { id: "cosmite", wikiPage: "Cosmite" },
  { id: "ocarnus", wikiPage: "Ocarnus" },
  { id: "le-brun-city", wikiPage: "Le_Brun_City" },
] as const;

const STRINOVA_AGENTS = [
  { id: "michele", wikiPage: "Michele" },
  { id: "nobunaga", wikiPage: "Nobunaga" },
  { id: "kokona", wikiPage: "Kokona" },
  { id: "yvette", wikiPage: "Yvette" },
  { id: "flavia", wikiPage: "Flavia" },
  { id: "yugiri", wikiPage: "Yugiri" },
  { id: "leona", wikiPage: "Leona" },
  { id: "chiyo", wikiPage: "Chiyo" },
  { id: "ming", wikiPage: "Ming" },
  { id: "lawine", wikiPage: "Lawine" },
  { id: "meredith", wikiPage: "Meredith" },
  { id: "reiichi", wikiPage: "Reiichi" },
  { id: "kanami", wikiPage: "Kanami" },
  { id: "eika", wikiPage: "Eika" },
  { id: "fragrans", wikiPage: "Fragrans" },
  { id: "mara", wikiPage: "Mara" },
  { id: "celestia", wikiPage: "Celestia" },
  { id: "audrey", wikiPage: "Audrey" },
  { id: "maddelena", wikiPage: "Maddelena" },
  { id: "fuchsia", wikiPage: "Fuchsia" },
  { id: "bai-mo", wikiPage: "Bai_Mo" },
  { id: "galatea", wikiPage: "Galatea" },
  { id: "cielle", wikiPage: "Cielle" },
] as const;

const SKILL_FILE_NUMS = [1, 2, 9, 3] as const; // active, passive, tactical, ultimate

const UTILITY_WIKI_ENTRIES = [
  { id: "shield-barrier", wikiFileName: "Weapon_Shield_Barrier.png" },
] as const;

// ─── Types ──────────────────────────────────────────────────────────────────

interface DownloadTask {
  /** Wiki file name (e.g. "Minimap_Area_88.png") */
  wikiFileName: string;
  /** Relative output path under public/wiki-cache/ */
  outputPath: string;
}

interface DownloadResult {
  task: DownloadTask;
  success: boolean;
  sourceUrl?: string;
  error?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Resolve a wiki file name to a direct image URL via the MediaWiki API.
 */
async function resolveWikiImageUrl(wikiFileName: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    titles: `File:${wikiFileName}`,
    prop: "imageinfo",
    iiprop: "url",
    format: "json",
    origin: "*",
  });

  const apiUrl = `${WIKI_API_URL}?${params}`;
  const resp = await fetch(apiUrl, {
    headers: { "User-Agent": "StrinoPlant/1.0 (wiki-cache-refresh)" },
  });

  if (!resp.ok) {
    throw new Error(`API responded ${resp.status} for ${wikiFileName}`);
  }

  const data = await resp.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  const firstPage = Object.values(pages)[0] as Record<string, unknown>;
  const imageInfo = firstPage?.imageinfo as Array<{ url?: string }> | undefined;
  const url = imageInfo?.[0]?.url;

  if (!url || typeof url !== "string") return null;
  if (!isAllowedUrl(url)) {
    throw new Error(`Blocked URL from untrusted host: ${url}`);
  }

  return url;
}

/**
 * Download a single image and write it to disk.
 */
async function downloadImage(url: string, destPath: string): Promise<void> {
  const resp = await fetch(url, {
    headers: { "User-Agent": "StrinoPlant/1.0 (wiki-cache-refresh)" },
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} downloading ${url}`);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  const dir = path.dirname(destPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(destPath, buffer);
}

// ─── Task builders ──────────────────────────────────────────────────────────

function buildMapTasks(): DownloadTask[] {
  const tasks: DownloadTask[] = [];
  for (const map of RANKED_MAPS) {
    tasks.push({
      wikiFileName: `Minimap_${map.wikiPage}.png`,
      outputPath: `maps/minimap-${map.id}.png`,
    });
    tasks.push({
      wikiFileName: `Intro_${map.wikiPage}.png`,
      outputPath: `maps/intro-${map.id}.png`,
    });
  }
  return tasks;
}

function buildAgentTasks(): DownloadTask[] {
  const tasks: DownloadTask[] = [];
  for (const agent of STRINOVA_AGENTS) {
    // Profile icon
    tasks.push({
      wikiFileName: `${agent.wikiPage}_Profile.png`,
      outputPath: `agents/${agent.id}-profile.png`,
    });
    // Skill icons
    for (const fileNum of SKILL_FILE_NUMS) {
      tasks.push({
        wikiFileName: `${agent.wikiPage}_Skill_${fileNum}.png`,
        outputPath: `agents/${agent.id}-skill-${fileNum}.png`,
      });
    }
  }
  return tasks;
}

function buildUtilityTasks(): DownloadTask[] {
  return UTILITY_WIKI_ENTRIES.map((u) => ({
    wikiFileName: u.wikiFileName,
    outputPath: `utilities/${u.id}.png`,
  }));
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const force = process.argv.includes("--force");

  console.log("🗺️  StrinoPlant Wiki Cache Refresh");
  console.log(`   Cache dir: ${CACHE_DIR}`);
  console.log(`   Force: ${force}`);
  console.log("");

  // Build all tasks
  const tasks = [...buildMapTasks(), ...buildAgentTasks(), ...buildUtilityTasks()];
  console.log(`📦 ${tasks.length} images to process\n`);

  // Load previous manifest to preserve source URLs for skipped files
  const manifestPath = path.join(CACHE_DIR, "manifest.json");
  let previousManifest: Record<string, string> = {};
  try {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed?.images && typeof parsed.images === "object") {
      previousManifest = parsed.images;
    }
  } catch {
    // No previous manifest — that's fine
  }

  const results: DownloadResult[] = [];
  let skipped = 0;

  for (const task of tasks) {
    const destPath = path.join(CACHE_DIR, task.outputPath);

    // Skip existing files unless --force
    if (!force && fs.existsSync(destPath)) {
      skipped++;
      const prevUrl = previousManifest[task.outputPath];
      results.push({ task, success: true, sourceUrl: prevUrl || "(cached)" });
      continue;
    }

    try {
      // Resolve wiki URL
      const imageUrl = await resolveWikiImageUrl(task.wikiFileName);
      if (!imageUrl) {
        const msg = `No image URL found for File:${task.wikiFileName}`;
        console.log(`  ✗ ${task.outputPath} — ${msg}`);
        results.push({ task, success: false, error: msg });
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      // Download
      await downloadImage(imageUrl, destPath);
      console.log(`  ✓ ${task.outputPath}`);
      results.push({ task, success: true, sourceUrl: imageUrl });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ ${task.outputPath} — ${msg}`);
      results.push({ task, success: false, error: msg });
    }

    await sleep(RATE_LIMIT_MS);
  }

  // Write manifest
  const manifest: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    images: Object.fromEntries(
      results.filter((r) => r.success && r.sourceUrl).map((r) => [r.task.outputPath, r.sourceUrl]),
    ),
  };

  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  // Summary
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log("");
  console.log("─".repeat(50));
  console.log(`✅ Succeeded: ${succeeded} (${skipped} skipped/cached)`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
    for (const r of results.filter((r) => !r.success)) {
      console.log(`   - ${r.task.outputPath}: ${r.error}`);
    }
  }
  console.log(`📄 Manifest written to ${manifestPath}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

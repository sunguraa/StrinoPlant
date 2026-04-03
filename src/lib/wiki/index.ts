import { WIKI_API_URL } from "@/lib/maps";
import type { WikiImageInfo } from "@/types/wiki";

/**
 * Allowed hostnames for wiki image URLs (SSRF prevention).
 * Only URLs from these domains are returned to callers.
 */
const ALLOWED_IMAGE_HOSTS = new Set([
  "static.wikitide.net",
  "strinova.org",
  "static.strinova.org",
  "wiki.biligame.com",
]);

/** Simple in-memory cache: fileName → resolved image URL */
const imageUrlCache = new Map<string, string>();

/**
 * Validate that a URL's hostname is in the allowlist.
 * Returns the URL string if safe, or null if it fails validation.
 */
function validateImageUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (!ALLOWED_IMAGE_HOSTS.has(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Fetch an image URL from the MediaWiki API for a given `File:` page name.
 *
 * @param fileName  The wiki file name **without** the `File:` prefix,
 *                  e.g. `"Minimap_Area_88.png"` or `"Michele_Profile.png"`
 * @returns         The validated HTTPS image URL, or `null` on any failure.
 */
export async function fetchImageUrl(fileName: string): Promise<string | null> {
  // Return cached result if available
  const cached = imageUrlCache.get(fileName);
  if (cached) return cached;

  const params = new URLSearchParams({
    action: "query",
    titles: `File:${fileName}`,
    prop: "imageinfo",
    iiprop: "url",
    format: "json",
    origin: "*",
  });

  try {
    const res = await fetch(`${WIKI_API_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    const data: WikiImageInfo = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;

    // MediaWiki returns pages keyed by page ID (or "-1" for missing pages)
    for (const page of Object.values(pages)) {
      if (page.missing !== undefined) continue;
      const info = page.imageinfo?.[0];
      if (!info?.url) continue;

      const validated = validateImageUrl(info.url);
      if (validated) {
        imageUrlCache.set(fileName, validated);
        return validated;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch the minimap image URL for a ranked map.
 *
 * @param wikiPage  The map's wiki page name from `RANKED_MAPS`, e.g. `"Area_88"`
 */
export async function fetchMapImageUrl(wikiPage: string): Promise<string | null> {
  return fetchImageUrl(`Minimap_${wikiPage}.png`);
}

/**
 * Fetch the profile image URL for a Strinova character.
 *
 * @param characterName  The character's wiki page name, e.g. `"Michele"` or `"Bai_Mo"`
 */
export async function fetchCharacterImageUrl(characterName: string): Promise<string | null> {
  return fetchImageUrl(`${characterName}_Profile.png`);
}

/**
 * Fetch the intro/landscape image URL for a ranked map.
 *
 * @param wikiPage  The map's wiki page name from `RANKED_MAPS`, e.g. `"Area_88"`
 */
export async function fetchMapIntroImageUrl(wikiPage: string): Promise<string | null> {
  return fetchImageUrl(`Intro_${wikiPage}.png`);
}

/**
 * Fetch a skill icon URL for a Strinova agent.
 *
 * @param agentWikiPage  The agent's wiki page name, e.g. `"Michele"` or `"Bai_Mo"`
 * @param skillFileNum   The skill file number: 1 (active), 2 (passive), 9 (tactical), 3 (ultimate)
 */
export async function fetchSkillIconUrl(
  agentWikiPage: string,
  skillFileNum: number,
): Promise<string | null> {
  return fetchImageUrl(`${agentWikiPage}_Skill_${skillFileNum}.png`);
}

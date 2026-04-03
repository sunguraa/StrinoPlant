import { withBasePath } from "@/lib/base-path";

/**
 * Local wiki cache path helpers.
 * Images are cached in public/wiki-cache/ by the refresh-wiki-cache script.
 * These helpers return the public URL paths for cached images.
 */

/** Get the cached minimap image path for a map */
export function getCachedMinimapPath(mapId: string): string {
  return withBasePath(`/wiki-cache/maps/minimap-${mapId}.png`);
}

/** Get the cached intro image path for a map */
export function getCachedIntroPath(mapId: string): string {
  return withBasePath(`/wiki-cache/maps/intro-${mapId}.png`);
}

/** Get the cached profile image path for an agent */
export function getCachedProfilePath(agentId: string): string {
  return withBasePath(`/wiki-cache/agents/${agentId}-profile.png`);
}

/** Get the cached skill icon path for an agent */
export function getCachedSkillPath(agentId: string, fileNum: number): string {
  return withBasePath(`/wiki-cache/agents/${agentId}-skill-${fileNum}.png`);
}

/** Get the cached utility icon path */
export function getCachedUtilityPath(utilityId: string): string {
  return withBasePath(`/wiki-cache/utilities/${utilityId}.png`);
}

/** Get the cached barrier map image path (showing attack/defense tinted zones) */
export function getCachedBarrierPath(mapId: string): string {
  return withBasePath(`/wiki-cache/maps/barrier-${mapId}.png`);
}

/** Get the cached blank map image path (clean minimap without barriers) */
export function getCachedBlankPath(mapId: string): string {
  return withBasePath(`/wiki-cache/maps/blank-${mapId}.png`);
}

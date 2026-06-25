import { normalizePublicAssetUrl } from "@/lib/base-path";
import { getCachedUtilityPath } from "./cache";

/** A Strinova utility or ping item */
export interface UtilityItem {
  id: string;
  name: string;
  /** Local icon path served from /public */
  iconPath?: string;
  /** Wiki file name used by the refresh script */
  wikiFileName?: string;
  category: "grenade" | "tactical" | "ping";
}

/** All known Strinova utility items */
const RAW_STRINOVA_UTILITIES: UtilityItem[] = [
  {
    id: "frag-grenade",
    name: "Frag Grenade",
    iconPath: "/icons/utilities/frag-grenade.png",
    wikiFileName: "Weapon_Frag_Grenade.png",
    category: "grenade",
  },
  {
    id: "flashbang",
    name: "Flashbang",
    iconPath: "/icons/utilities/flashbang.png",
    wikiFileName: "Weapon_Flashbang.png",
    category: "grenade",
  },
  {
    id: "windstorm-grenade",
    name: "Windstorm Grenade",
    iconPath: "/icons/utilities/windstorm-grenade.png",
    wikiFileName: "Weapon_Windstorm_Grenade.png",
    category: "grenade",
  },
  {
    id: "slow-grenade",
    name: "Slow Grenade",
    iconPath: "/icons/utilities/slow-grenade.png",
    wikiFileName: "Weapon_Slow_Grenade.png",
    category: "grenade",
  },
  {
    id: "smoke-bomb",
    name: "Smoke Grenade",
    iconPath: "/icons/utilities/smoke-bomb.png",
    wikiFileName: "Weapon_Smoke_Bomb.png",
    category: "grenade",
  },
  {
    id: "healing-grenade",
    name: "Healing Grenade",
    iconPath: "/icons/utilities/healing-grenade.png",
    wikiFileName: "Weapon_Healing_Grenade.png",
    category: "grenade",
  },
  {
    id: "tattletale",
    name: "Tattletale",
    iconPath: "/icons/utilities/tattletale.png",
    wikiFileName: "Weapon_Tattletale.png",
    category: "tactical",
  },
  {
    id: "interceptor",
    name: "Interceptor",
    iconPath: "/icons/utilities/interceptor.png",
    wikiFileName: "Weapon_Interceptor.png",
    category: "tactical",
  },
  {
    id: "shield-barrier",
    name: "Shield Barrier",
    iconPath: getCachedUtilityPath("shield-barrier"),
    wikiFileName: "Weapon_Shield_Barrier.png",
    category: "tactical",
  },
  {
    id: "ping-normal",
    name: "Normal Ping",
    iconPath: "/icons/pings/ping-1.png",
    category: "ping",
  },
  {
    id: "ping-flag",
    name: "Flag Ping",
    iconPath: "/icons/pings/ping-2.png",
    category: "ping",
  },
  {
    id: "ping-danger",
    name: "Danger Ping",
    iconPath: "/icons/pings/ping-3.png",
    category: "ping",
  },
  {
    id: "ping-watch",
    name: "Watch Ping",
    iconPath: "/icons/pings/ping-4.png",
    category: "ping",
  },
  {
    id: "ping-bomb",
    name: "Bomb Ping",
    iconPath: "/icons/pings/ping-5.png",
    category: "ping",
  },
  {
    id: "ping-target",
    name: "Target Ping",
    iconPath: "/icons/pings/ping-6.png",
    category: "ping",
  },
  {
    id: "ping-heart",
    name: "Heart Ping",
    iconPath: "/icons/pings/ping-7.png",
    category: "ping",
  },
];

export const STRINOVA_UTILITIES: UtilityItem[] = RAW_STRINOVA_UTILITIES.map((utility) => ({
  ...utility,
  iconPath: utility.iconPath ? normalizePublicAssetUrl(utility.iconPath) : utility.iconPath,
}));

/**
 * Get the local icon path for a utility item by its ID.
 */
export function getUtilityIconPath(utilityId: string): string | null {
  const util = STRINOVA_UTILITIES.find((u) => u.id === utilityId);
  if (!util) return null;
  return util.iconPath ?? null;
}

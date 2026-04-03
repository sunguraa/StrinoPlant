import { normalizePublicAssetUrl } from "@/lib/base-path";
import { getCachedUtilityPath } from "./cache";

/** A Strinova utility item (grenade or tactical equipment) */
export interface UtilityItem {
  id: string;
  name: string;
  /** Local icon path served from /public */
  iconPath?: string;
  /** Wiki file name used by the refresh script */
  wikiFileName: string;
  category: "grenade" | "tactical";
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
    name: "Smoke Bomb",
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

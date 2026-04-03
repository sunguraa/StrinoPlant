import { normalizePublicAssetUrl } from "@/lib/base-path";

export interface MapConfig {
  id: string;
  name: string;
  wikiPage: string;
  /** Optional local fallback minimap path (under /public) when wiki image is unavailable */
  localMinimap?: string;
  /** Optional local intro image for the home page card when wiki intro is unavailable */
  localIntroImage?: string;
}

const RAW_RANKED_MAPS: MapConfig[] = [
  { id: "area-88", name: "Area 88", wikiPage: "Area_88" },
  { id: "base-404", name: "Base 404", wikiPage: "Base_404" },
  { id: "port-euler", name: "Port Euler", wikiPage: "Port_Euler" },
  { id: "space-lab", name: "Space Lab", wikiPage: "Space_Lab" },
  { id: "windy-town", name: "Windy Town", wikiPage: "Windy_Town" },
  { id: "cauchy-street", name: "Cauchy Street", wikiPage: "Cauchy_Street" },
  { id: "cosmite", name: "Cosmite", wikiPage: "Cosmite" },
  { id: "ocarnus", name: "Ocarnus", wikiPage: "Ocarnus" },
  {
    id: "le-brun-city",
    name: "Le Brun City",
    wikiPage: "Le_Brun_City",
    localMinimap: "/maps/minimap-le-brun-city.png",
    localIntroImage: "/maps/intro-le-brun-city.jpg",
  },
];

export const RANKED_MAPS: MapConfig[] = RAW_RANKED_MAPS.map((map) => ({
  ...map,
  localMinimap: map.localMinimap ? normalizePublicAssetUrl(map.localMinimap) : map.localMinimap,
  localIntroImage: map.localIntroImage
    ? normalizePublicAssetUrl(map.localIntroImage)
    : map.localIntroImage,
}));

export function getMapById(mapId: string): MapConfig | undefined {
  return RANKED_MAPS.find((map) => map.id === mapId);
}

export function getRankedMapStaticParams(): Array<{ mapId: string }> {
  return RANKED_MAPS.map((map) => ({ mapId: map.id }));
}

export const WIKI_BASE_URL = "https://strinova.org/wiki/";
export const WIKI_API_URL = "https://strinova.org/w/api.php";
export const BILIBILI_WIKI_BASE_URL = "https://wiki.biligame.com/klbq/";

export interface MapConfig {
  id: string;
  name: string;
  wikiPage: string;
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
  { id: "le-brun-city", name: "Le Brun City", wikiPage: "Lebrun_City" },
];

export const RANKED_MAPS: MapConfig[] = RAW_RANKED_MAPS;

export function getMapById(mapId: string): MapConfig | undefined {
  return RANKED_MAPS.find((map) => map.id === mapId);
}

export function getRankedMapStaticParams(): Array<{ mapId: string }> {
  return RANKED_MAPS.map((map) => ({ mapId: map.id }));
}

export const WIKI_BASE_URL = "https://strinova.org/wiki/";
export const WIKI_API_URL = "https://strinova.org/w/api.php";
export const BILIBILI_WIKI_BASE_URL = "https://wiki.biligame.com/klbq/";

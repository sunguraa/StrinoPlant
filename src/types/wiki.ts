// Wiki API response types

/** Shape of the MediaWiki API imageinfo response */
export interface WikiImageInfo {
  query: {
    pages: Record<
      string,
      {
        pageid?: number;
        ns: number;
        title: string;
        missing?: string;
        imageinfo?: Array<{
          url: string;
          descriptionurl?: string;
          descriptionshorturl?: string;
        }>;
      }
    >;
  };
}

/** Faction identifiers for Strinova characters */
export type Faction = "P.U.S" | "The Scissors" | "Urbino";

/** Role/class identifiers */
export type AgentRole = "Sentinel" | "Duelist" | "Vanguard" | "Support" | "Controller";

/** Static character configuration */
export interface AgentConfig {
  id: string;
  name: string;
  wikiPage: string;
  faction: Faction;
  role: AgentRole;
  profileUrl: string;
}

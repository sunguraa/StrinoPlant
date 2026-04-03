import type { AgentConfig } from "@/types/wiki";
import { normalizePublicAssetUrl } from "@/lib/base-path";

/** Skill slot definitions mapping skill types to their wiki file number */
export const SKILL_SLOTS = [
  { id: "active", label: "Active", fileNum: 1 },
  { id: "passive", label: "Passive", fileNum: 2 },
  { id: "tactical", label: "Tactical", fileNum: 9 },
  { id: "ultimate", label: "Ultimate", fileNum: 3 },
] as const;

export type SkillSlotId = (typeof SKILL_SLOTS)[number]["id"];

/**
 * All 23 playable Strinova superstrings.
 * Roles that are unconfirmed default to "Duelist" — correct as data is verified.
 */
const RAW_STRINOVA_AGENTS: AgentConfig[] = [
  // ── P.U.S (Painting Utopia Security) ──
  {
    id: "michele",
    name: "Michele",
    wikiPage: "Michele",
    faction: "P.U.S",
    role: "Sentinel",
    profileUrl: "/wiki-cache/agents/michele-profile.png",
  },
  {
    id: "nobunaga",
    name: "Nobunaga",
    wikiPage: "Nobunaga",
    faction: "P.U.S",
    role: "Duelist",
    profileUrl: "/wiki-cache/agents/nobunaga-profile.png",
  },
  {
    id: "kokona",
    name: "Kokona",
    wikiPage: "Kokona",
    faction: "P.U.S",
    role: "Support",
    profileUrl: "/wiki-cache/agents/kokona-profile.png",
  },
  {
    id: "yvette",
    name: "Yvette",
    wikiPage: "Yvette",
    faction: "P.U.S",
    role: "Controller",
    profileUrl: "/wiki-cache/agents/yvette-profile.png",
  },
  {
    id: "flavia",
    name: "Flavia",
    wikiPage: "Flavia",
    faction: "P.U.S",
    role: "Support",
    profileUrl: "/wiki-cache/agents/flavia-profile.png",
  },
  {
    id: "yugiri",
    name: "Yugiri",
    wikiPage: "Yugiri",
    faction: "P.U.S",
    role: "Duelist",
    profileUrl: "/wiki-cache/agents/yugiri-profile.png",
  },
  {
    id: "leona",
    name: "Leona",
    wikiPage: "Leona",
    faction: "P.U.S",
    role: "Vanguard",
    profileUrl: "/wiki-cache/agents/leona-profile.png",
  },
  {
    id: "chiyo",
    name: "Chiyo",
    wikiPage: "Chiyo",
    faction: "P.U.S",
    role: "Controller",
    profileUrl: "/wiki-cache/agents/chiyo-profile.png",
  },

  // ── The Scissors ──
  {
    id: "ming",
    name: "Ming",
    wikiPage: "Ming",
    faction: "The Scissors",
    role: "Duelist",
    profileUrl: "/wiki-cache/agents/ming-profile.png",
  },
  {
    id: "lawine",
    name: "Lawine",
    wikiPage: "Lawine",
    faction: "The Scissors",
    role: "Sentinel",
    profileUrl: "/wiki-cache/agents/lawine-profile.png",
  },
  {
    id: "meredith",
    name: "Meredith",
    wikiPage: "Meredith",
    faction: "The Scissors",
    role: "Support",
    profileUrl: "/wiki-cache/agents/meredith-profile.png",
  },
  {
    id: "reiichi",
    name: "Reiichi",
    wikiPage: "Reiichi",
    faction: "The Scissors",
    role: "Duelist",
    profileUrl: "/wiki-cache/agents/reiichi-profile.png",
  },
  {
    id: "kanami",
    name: "Kanami",
    wikiPage: "Kanami",
    faction: "The Scissors",
    role: "Duelist",
    profileUrl: "/wiki-cache/agents/kanami-profile.png",
  },
  {
    id: "eika",
    name: "Eika",
    wikiPage: "Eika",
    faction: "The Scissors",
    role: "Controller",
    profileUrl: "/wiki-cache/agents/eika-profile.png",
  },
  {
    id: "fragrans",
    name: "Fragrans",
    wikiPage: "Fragrans",
    faction: "The Scissors",
    role: "Vanguard",
    profileUrl: "/wiki-cache/agents/fragrans-profile.png",
  },
  {
    id: "mara",
    name: "Mara",
    wikiPage: "Mara",
    faction: "The Scissors",
    role: "Duelist",
    profileUrl: "/wiki-cache/agents/mara-profile.png",
  },

  // ── Urbino ──
  {
    id: "celestia",
    name: "Celestia",
    wikiPage: "Celestia",
    faction: "Urbino",
    role: "Support",
    profileUrl: "/wiki-cache/agents/celestia-profile.png",
  },
  {
    id: "audrey",
    name: "Audrey",
    wikiPage: "Audrey",
    faction: "Urbino",
    role: "Sentinel",
    profileUrl: "/wiki-cache/agents/audrey-profile.png",
  },
  {
    id: "maddelena",
    name: "Maddelena",
    wikiPage: "Maddelena",
    faction: "Urbino",
    role: "Vanguard",
    profileUrl: "/wiki-cache/agents/maddelena-profile.png",
  },
  {
    id: "fuchsia",
    name: "Fuchsia",
    wikiPage: "Fuchsia",
    faction: "Urbino",
    role: "Duelist",
    profileUrl: "/wiki-cache/agents/fuchsia-profile.png",
  },
  {
    id: "bai-mo",
    name: "Bai Mo",
    wikiPage: "Bai_Mo",
    faction: "Urbino",
    role: "Controller",
    profileUrl: "/wiki-cache/agents/bai-mo-profile.png",
  },
  {
    id: "galatea",
    name: "Galatea",
    wikiPage: "Galatea",
    faction: "Urbino",
    role: "Duelist",
    profileUrl: "/wiki-cache/agents/galatea-profile.png",
  },
  {
    id: "cielle",
    name: "Cielle",
    wikiPage: "Cielle",
    faction: "Urbino",
    role: "Duelist",
    profileUrl: "/wiki-cache/agents/cielle-profile.png",
  },
];

export const STRINOVA_AGENTS: AgentConfig[] = RAW_STRINOVA_AGENTS.map((agent) => ({
  ...agent,
  profileUrl: normalizePublicAssetUrl(agent.profileUrl),
}));

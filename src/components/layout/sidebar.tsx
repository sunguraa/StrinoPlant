"use client";

import { useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { STRINOVA_AGENTS, SKILL_SLOTS } from "@/lib/wiki/agents";
import { getCachedSkillPath } from "@/lib/wiki/cache";
import type { AgentConfig } from "@/types/wiki";

type Tab = "attack" | "defense";

const ATTACK_FACTIONS = ["The Scissors", "Urbino"] as const;
const DEFENSE_FACTIONS = ["P.U.S", "Urbino"] as const;

function getAgentsForTab(tab: Tab): AgentConfig[] {
  const factions = tab === "attack" ? ATTACK_FACTIONS : DEFENSE_FACTIONS;
  return STRINOVA_AGENTS.filter((a) => (factions as readonly string[]).includes(a.faction));
}

/** Split an array into chunks of a given size */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export function Sidebar({ className }: { className?: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("attack");
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  const agents = getAgentsForTab(activeTab);
  const rows = chunk(agents, 3);
  const ringColor = activeTab === "attack" ? "border-red-500" : "border-blue-500";

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, agentId: string) => {
      e.dataTransfer.setData("application/x-agent-id", agentId);
      e.dataTransfer.setData("application/x-agent-side", activeTab);
      e.dataTransfer.effectAllowed = "copy";
    },
    [activeTab],
  );

  const toggleExpanded = useCallback((agentId: string) => {
    setExpandedAgentId((prev) => (prev === agentId ? null : agentId));
  }, []);

  return (
    <aside
      className={cn(
        "flex w-56 xl:w-72 2xl:w-80 shrink-0 flex-col overflow-hidden border-r border-border/40 bg-muted/30",
        className,
      )}
    >
      {/* Tabs */}
      <div className="flex border-b border-border/40">
        {(["attack", "defense"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-3 text-base font-semibold uppercase tracking-wider transition-colors",
              activeTab === tab
                ? tab === "attack"
                  ? "border-b-2 border-red-500 text-red-400"
                  : "border-b-2 border-blue-500 text-blue-400"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Agent grid — rows of 3 with ability dropdown */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-3 xl:gap-5">
          {rows.map((row, rowIdx) => {
            const expandedAgent = row.find((a) => a.id === expandedAgentId);
            return (
              <div key={rowIdx} className="grid grid-cols-3 gap-3 xl:gap-5">
                {row.map((agent) => {
                  const isExpanded = expandedAgentId === agent.id;
                  return (
                    <div key={agent.id} className="flex flex-col items-center gap-1">
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, agent.id)}
                        className="flex cursor-grab flex-col items-center gap-1 active:cursor-grabbing"
                        title={agent.name}
                      >
                        <div className={cn("rounded-full border-4 p-0.5", ringColor)}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={agent.profileUrl}
                            alt={agent.name}
                            width={72}
                            height={72}
                            className="h-14 w-14 rounded-full object-cover xl:h-18 xl:w-18"
                            draggable={false}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(agent.id)}
                        className="flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <span className="max-w-full truncate">{agent.name}</span>
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 shrink-0 transition-transform",
                            isExpanded && "rotate-180",
                          )}
                        />
                      </button>
                    </div>
                  );
                })}

                {/* Ability dropdown — below the row, spans all 3 columns */}
                {expandedAgent && (
                  <div className="col-span-3 flex justify-center gap-3 rounded-lg bg-muted/50 p-2">
                    {SKILL_SLOTS.map((slot) => (
                      <div
                        key={slot.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            "application/x-ability",
                            `${expandedAgent.id}:${slot.fileNum}`,
                          );
                          e.dataTransfer.setData("application/x-agent-side", activeTab);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        className="flex cursor-grab flex-col items-center gap-1 active:cursor-grabbing"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getCachedSkillPath(expandedAgent.id, slot.fileNum)}
                          alt={slot.label}
                          width={28}
                          height={28}
                          className="h-9 w-9 rounded"
                          draggable={false}
                        />
                        <span className="text-xs text-muted-foreground">{slot.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/40 px-3 py-2">
        <p className="text-xs text-muted-foreground/60">Drag agents onto the canvas</p>
      </div>
    </aside>
  );
}

"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { Agent, AgentStatus, Pulse } from "@/lib/types";
import { ThatGuyAvatar, type Mood } from "../ThatGuyAvatar";

const W = 560;
const C = W / 2;
const ring = (mi: number) => 70 + mi * 190; // 0.2 mi → 108px … 1 mi → 260px
const ANGLES = [-105, -40, 15, 75, 140, 200];

const NODE: Record<AgentStatus, { fill: string; badge?: string; dash?: boolean }> = {
  idle: { fill: "#FFFBF0" },
  asked: { fill: "#FFD23F", badge: "…" },
  vouch: { fill: "#7EE8C2", badge: "✅" },
  warning: { fill: "#FF9EBB", badge: "❌" },
  none: { fill: "#E8DFD0", badge: "—" },
  offline: { fill: "#FFFBF0", badge: "zz", dash: true },
  shared: { fill: "#FF6B1A", badge: "🤝" },
};

const PULSE: Record<Pulse["tone"], string> = {
  ask: "#FF6B1A",
  good: "#16a36b",
  bad: "#e0314b",
  muted: "#8a8075",
  share: "#FF6B1A",
};

export function NetworkGraph({
  agents,
  statuses,
  pulses,
  mood,
}: {
  agents: Agent[];
  statuses: Record<string, AgentStatus>;
  pulses: Pulse[];
  mood: Mood;
}) {
  // Only animate pulses that happen while we're watching.
  const [mountedAt] = useState(() => Date.now() - 300);
  const pos = (id: string) => {
    const i = agents.findIndex((a) => a.id === id);
    if (i < 0) return { x: C, y: C };
    const a = (ANGLES[i % ANGLES.length] * Math.PI) / 180;
    const r = ring(agents[i].distanceMi);
    return { x: C + Math.cos(a) * r, y: C + Math.sin(a) * r };
  };
  const live = pulses.filter((p) => p.at >= mountedAt);

  return (
    <svg viewBox={`0 0 ${W} ${W}`} className="h-full w-full" role="img" aria-label="Neighborhood agent network">
      {/* Distance rings */}
      {[0.25, 0.5, 0.75, 1].map((mi) => (
        <g key={mi}>
          <circle cx={C} cy={C} r={ring(mi)} fill="none" stroke="var(--ink)" strokeOpacity={0.18} strokeWidth={2} strokeDasharray="4 8" />
          <text x={C + 6} y={C - ring(mi) + 16} fontSize={12} fontWeight={700} fill="var(--muted)">
            {mi} mi
          </text>
        </g>
      ))}

      {/* Edges */}
      {agents.map((a) => {
        const p = pos(a.id);
        const st = statuses[a.id] ?? "idle";
        const hot = st !== "idle" && st !== "offline";
        return (
          <line
            key={a.id}
            x1={C}
            y1={C}
            x2={p.x}
            y2={p.y}
            stroke="var(--ink)"
            strokeOpacity={hot ? 0.75 : 0.25}
            strokeWidth={hot ? 3 : 2}
            strokeDasharray={st === "offline" ? "3 7" : hot ? undefined : "6 6"}
          />
        );
      })}

      {/* Message pulses */}
      {live.map((p) => {
        const a = pos(p.from);
        const b = pos(p.to);
        const delay = Math.max(0, (p.at - Date.now()) / 1000);
        return (
          <motion.circle
            key={p.id}
            r={p.tone === "share" ? 10 : 8}
            fill={PULSE[p.tone]}
            stroke="#141210"
            strokeWidth={2.5}
            initial={{ cx: a.x, cy: a.y, opacity: 0 }}
            animate={{ cx: [a.x, b.x], cy: [a.y, b.y], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1, delay, ease: "easeInOut", opacity: { duration: 1, delay, times: [0, 0.1, 0.85, 1] } }}
          />
        );
      })}

      {/* Neighbor agents */}
      {agents.map((a) => {
        const p = pos(a.id);
        const st = statuses[a.id] ?? "idle";
        const s = NODE[st];
        return (
          <g key={a.id} transform={`translate(${p.x} ${p.y})`}>
            <motion.g
              key={st}
              initial={{ scale: st === "idle" ? 1 : 1.35 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 12 }}
            >
              <circle r={31} cx={3} cy={3} fill="var(--shadow)" />
              <circle r={31} fill={s.fill} stroke="#141210" strokeWidth={3} strokeDasharray={s.dash ? "5 5" : undefined} />
              <text textAnchor="middle" dy={9} fontSize={26}>
                🏠
              </text>
              {s.badge && (
                <g transform="translate(24 -24)">
                  <circle r={13} fill="#FFFBF0" stroke="#141210" strokeWidth={2.5} />
                  <text textAnchor="middle" dy={5} fontSize={13} fontWeight={800}>
                    {s.badge}
                  </text>
                </g>
              )}
            </motion.g>
            <text textAnchor="middle" y={50} fontSize={15} fontWeight={800} fill="var(--ink)" fontFamily="var(--font-display)">
              {a.name}
            </text>
            <text textAnchor="middle" y={66} fontSize={12} fontWeight={600} fill="var(--muted)">
              {a.distanceMi} mi
            </text>
          </g>
        );
      })}

      {/* Your guy */}
      <g transform={`translate(${C} ${C})`}>
        <circle r={52} cx={4} cy={4} fill="var(--shadow)" />
        <circle r={52} fill="#FFD23F" stroke="#141210" strokeWidth={3.5} />
        <g transform="translate(-46 -50)">
          <ThatGuyAvatar mood={mood} size={92} crop="head" />
        </g>
        <g transform="translate(0 74)">
          <rect x={-46} y={-15} width={92} height={26} rx={8} fill="#FF6B1A" stroke="#141210" strokeWidth={2.5} />
          <text textAnchor="middle" dy={4} fontSize={14} fontWeight={800} fill="#141210" fontFamily="var(--font-display)">
            Your guy
          </text>
        </g>
      </g>
    </svg>
  );
}

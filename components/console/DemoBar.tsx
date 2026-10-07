"use client";

import { FastForward, Play, RotateCcw, Users } from "lucide-react";
import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { ScenarioKey } from "@/lib/types";

/** Keyboard: D run demo · N next day · U switch user · R reset · 1/2/3 scenario. */
export function useDemoKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const k = e.key.toLowerCase();
      const s = api.config.scenarioOrder[Number(k) - 1];
      if (k === "d") api.runDemo();
      else if (k === "n") api.nextDay();
      else if (k === "r") api.resetDemo();
      else if (k === "u") {
        // Read the current user lazily via a one-off snapshot.
        void api.switchUser(document.documentElement.dataset.user === "dana" ? "alex" : "dana");
      } else if (s) api.setScenario(s);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, []);
  const s = Math.floor((now - since) / 1000);
  return (
    <span className="font-mono text-sm font-bold tabular-nums">
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </span>
  );
}

const btn = "sticker-sm press flex h-11 items-center gap-1.5 px-3 text-sm font-extrabold text-cardink";
const kbd = "rounded border-2 border-line/40 px-1 font-mono text-[10px]";

export function DemoBar() {
  const snap = api.useSnapshot();
  useDemoKeys();
  // Expose the user for the "U" shortcut without re-binding listeners.
  useEffect(() => {
    document.documentElement.dataset.user = snap.user;
  }, [snap.user]);

  const active = snap.activeCase[snap.user];
  const canNextDay = !!active && snap.cases[active]?.status === "booked";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => api.runDemo()} className={`${btn} -rotate-1 bg-orange`}>
        <Play size={16} className="fill-cardink" /> Run demo <span className={kbd}>D</span>
      </button>
      {snap.autoplay && (
        <span className="sticker-sm flex h-11 items-center gap-2 bg-card px-3 text-cardink">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ff3b30]" /> autoplay <Elapsed since={snap.autoplay.startedAt} />
        </span>
      )}
      <div className="sticker-sm flex h-11 items-center gap-1 bg-card p-1 text-cardink" role="radiogroup" aria-label="Scenario">
        {api.config.scenarioOrder.map((k: ScenarioKey, i) => (
          <button
            key={k}
            role="radio"
            aria-checked={snap.scenario === k}
            onClick={() => api.setScenario(k)}
            className={`h-8 rounded-lg px-2.5 text-sm font-extrabold ${snap.scenario === k ? "border-2 border-line bg-yellow" : ""}`}
          >
            {api.config.scenarios[k].label} <span className={kbd}>{i + 1}</span>
          </button>
        ))}
      </div>
      <button onClick={() => api.nextDay()} disabled={!canNextDay} className={`${btn} bg-mint disabled:opacity-40`}>
        <FastForward size={16} /> Next day <span className={kbd}>N</span>
      </button>
      <button onClick={() => void api.switchUser(snap.user === "alex" ? "dana" : "alex")} className={`${btn} bg-card`}>
        <Users size={16} /> {snap.user === "alex" ? "Me" : "Dana"} <span className={kbd}>U</span>
      </button>
      <button onClick={() => api.resetDemo()} className={`${btn} bg-card`}>
        <RotateCcw size={16} /> Reset <span className={kbd}>R</span>
      </button>
    </div>
  );
}

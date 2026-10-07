"use client";

import * as api from "@/lib/api";
import type { Mood } from "../ThatGuyAvatar";
import { MessageLog } from "./MessageLog";
import { NetworkGraph } from "./NetworkGraph";
import { TrustTable } from "./TrustTable";

/** Surface B: agent-to-agent traffic for the current household's latest case. */
export function NetworkConsole() {
  const snap = api.useSnapshot();
  const user = snap.user;
  const caseId = snap.activeCase[user];
  const c = caseId ? snap.cases[caseId] : undefined;
  const reveal = caseId ? snap.reveal[caseId] : undefined;
  const agents = api.config.networkFor(user);
  const rows = caseId ? api.tableFor(snap, caseId) : [];
  const lines = caseId ? snap.log.filter((l) => l.caseId === caseId) : [];
  const pulses = caseId ? snap.pulses.filter((p) => p.caseId === caseId) : [];
  const human = api.config.users[user].human;

  const mood: Mood = !c
    ? "idle"
    : c.status === "working"
      ? c.steps.at(-1)?.kind === "warn"
        ? "shrug"
        : "dialing"
      : c.status === "stopped"
        ? "shrug"
        : "proud";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[26px] font-extrabold leading-none">Network Console</h2>
          <p className="font-hand text-xl font-bold leading-tight text-muted">word of mouth, automated · {human}&apos;s household</p>
        </div>
        {c && (
          <span className="sticker-sm rotate-1 bg-yellow px-3 py-1 text-sm font-extrabold text-cardink">
            {c.title} · {c.status === "working" ? "agents talking" : c.status}
          </span>
        )}
      </div>

      <div className="grid min-h-0 flex-[1.35] grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="sticker relative min-h-[300px] overflow-hidden rounded-[18px] bg-paper p-2">
          <NetworkGraph agents={agents} statuses={reveal?.agents ?? {}} pulses={pulses} mood={mood} />
        </div>
        <div className="min-h-[260px]">
          <MessageLog lines={lines} title={`agent-wire · ${human.toLowerCase()}'s guy · 94110`} />
        </div>
      </div>

      <div className="min-h-[220px] flex-1">
        <TrustTable rows={rows} emailed={reveal?.emailed ?? []} chosen={c?.chosenProId} scored={!!reveal?.scored} />
      </div>
    </div>
  );
}

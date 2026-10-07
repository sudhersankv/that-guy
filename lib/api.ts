// The only module components talk to. Today it fronts the scripted mock engine;
// to go live, keep these signatures and swap the bodies for real calls (the
// `use*` hooks become subscriptions to a realtime channel).

"use client";

import { useSyncExternalStore } from "react";
import * as engine from "./engine";
import { HELPED_PEOPLE, PROS, SCENARIOS, SCENARIO_ORDER, USERS, networkFor } from "./mock";
import type { Case, LogLine, Note, ScenarioKey, TrustRow, UserId } from "./types";

const latency = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const config = { users: USERS, scenarios: SCENARIOS, scenarioOrder: SCENARIO_ORDER, helped: HELPED_PEOPLE, pros: PROS, networkFor };

// --- Spec'd API ---------------------------------------------------------------

/** Drop a video / voice note (+ photos). That Guy takes it from here. */
export async function drop(note: Note): Promise<Case> {
  await latency(450);
  return engine.startCase(note);
}

export async function getCase(id: string): Promise<Case | undefined> {
  return engine.getState().cases[id];
}

export async function getNetworkLog(caseId: string): Promise<LogLine[]> {
  return engine.getState().log.filter((l) => l.caseId === caseId);
}

export async function getTrustTable(caseId: string): Promise<TrustRow[]> {
  return engine.tableFor(engine.getState(), caseId);
}

/** Voice-note review after the job. Shared to every neighbor agent. */
export async function submitVouch(caseId: string, _note?: Note): Promise<void> {
  void _note;
  await latency(400);
  engine.vouch(caseId);
}

export async function switchUser(user: UserId): Promise<void> {
  engine.setUser(user);
}

// --- Extra controls ------------------------------------------------------------

export const stopBooking = (caseId: string) => engine.stop(caseId);
export const nextDay = (caseId?: string) => engine.nextDay(caseId);
export const setScenario = (s: ScenarioKey) => engine.setScenario(s);
export const setDemoMode = (on: boolean) => engine.setDemoMode(on);
export const runDemo = () => engine.runDemo();
export const resetDemo = () => engine.reset();

// --- Live hooks ----------------------------------------------------------------

export type Snapshot = engine.State;

export function useSnapshot(): Snapshot {
  return useSyncExternalStore(engine.subscribe, engine.getState, engine.getServerState);
}

export const tableFor = engine.tableFor;

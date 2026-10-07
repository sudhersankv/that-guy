"use client";

import * as api from "@/lib/api";
import { CaseView } from "./CaseView";
import { DropView } from "./DropView";
import { PhoneHeader } from "./PhoneHeader";

/** The phone app driven purely by the store (used inside the /demo phone frame). */
export function PhoneSurface() {
  const snap = api.useSnapshot();
  const caseId = snap.activeCase[snap.user];
  return (
    <div className="min-h-full">
      <PhoneHeader />
      {caseId ? (
        <CaseView
          key={caseId}
          caseId={caseId}
          seeHow={<span className="font-hand text-xl font-bold text-muted">See how → the console on the right</span>}
        />
      ) : (
        <DropView key={`${snap.user}-${snap.epoch}`} />
      )}
    </div>
  );
}

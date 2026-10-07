"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { DropView } from "@/components/phone/DropView";
import { PhoneHeader } from "@/components/phone/PhoneHeader";
import * as api from "@/lib/api";

export default function DropPage() {
  const router = useRouter();
  const snap = api.useSnapshot();
  const caseId = snap.activeCase[snap.user];
  const seen = useRef(caseId);

  // A case started elsewhere (e.g. "Run demo" from the console tab) → follow it.
  useEffect(() => {
    if (caseId && caseId !== seen.current) router.push(`/case/${caseId}`);
    seen.current = caseId;
  }, [caseId, router]);

  return (
    <>
      <PhoneHeader onSwitched={() => undefined} />
      <DropView key={`${snap.user}-${snap.epoch}`} onDropped={(c) => router.push(`/case/${c.id}`)} />
    </>
  );
}

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CaseView } from "@/components/phone/CaseView";
import { PhoneHeader } from "@/components/phone/PhoneHeader";

export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  return (
    <>
      <PhoneHeader onSwitched={() => router.push("/")} />
      <CaseView
        caseId={id}
        seeHow={
          <Link href="/network" target="_blank" className="inline-flex h-11 items-center font-hand text-xl font-bold underline decoration-orange decoration-2 underline-offset-4">
            See how →
          </Link>
        }
      />
    </>
  );
}

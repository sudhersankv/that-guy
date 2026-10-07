import type { ProblemStatus } from "@/lib/types";

const CHIP: Record<ProblemStatus, { label: string; bg: string; tilt: number }> = {
  working: { label: "Working", bg: "#9AD1FF", tilt: -2 },
  question: { label: "Quick question", bg: "#FFD23F", tilt: 2 },
  picking: { label: "Pick your guy", bg: "#FF6B1A", tilt: -2 },
  contacted: { label: "Contacted", bg: "#7EE8C2", tilt: 1.5 },
  checkin: { label: "Done?", bg: "#FF9EBB", tilt: -1.5 },
  feedback: { label: "Done?", bg: "#FF9EBB", tilt: -1.5 },
  done: { label: "Done", bg: "#E8DFD0", tilt: 1 },
};

export function StatusChip({ status }: { status: ProblemStatus }) {
  const c = CHIP[status];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border-2 border-line px-2 py-0.5 text-xs font-extrabold text-cardink"
      style={{ background: c.bg, rotate: `${c.tilt}deg` }}
    >
      {status === "working" && <span className="h-2 w-2 animate-pulse rounded-full bg-cardink" />}
      {c.label}
    </span>
  );
}

/** Statuses where the user has something to do. */
export const NEEDS_YOU: ProblemStatus[] = ["question", "picking", "checkin"];

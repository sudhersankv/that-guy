"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Problem } from "@/lib/types";
import { NEEDS_YOU, StatusChip } from "./StatusChip";

export function ProblemList({ problems }: { problems: Problem[] | undefined }) {
  if (problems === undefined) return <div className="sticker-sm h-14 animate-pulse bg-card" />;
  if (!problems.length)
    return <p className="font-hand text-xl font-bold text-muted">Nothing yet. Lucky you.</p>;
  return (
    <ul className="space-y-2.5">
      {problems.map((p, i) => (
        <motion.li key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            href={`/p/${p.id}`}
            className="sticker-sm press paper flex min-h-14 items-center gap-3 px-3 py-2"
            style={{ rotate: `${i % 2 ? 0.6 : -0.6}deg` }}
          >
            <span className="min-w-0 flex-1 truncate font-display font-extrabold">{p.title}</span>
            {NEEDS_YOU.includes(p.status) && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-orange" aria-label="Needs you" />}
            <StatusChip status={p.status} />
            <ChevronRight size={18} strokeWidth={2.6} />
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}

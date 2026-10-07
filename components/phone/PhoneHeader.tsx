"use client";

import { motion } from "framer-motion";
import * as api from "@/lib/api";
import type { UserId } from "@/lib/types";
import { ThatGuyAvatar } from "../ThatGuyAvatar";
import { ThemeToggle } from "../ThemeToggle";

/** Logo + the demo's household switcher (Me / Dana). */
export function PhoneHeader({ onSwitched }: { onSwitched?: (u: UserId) => void }) {
  const snap = api.useSnapshot();
  const users = Object.values(api.config.users);
  return (
    <header className="pt-safe flex items-center justify-between gap-2 px-4 pb-1">
      <div className="flex items-center gap-2">
        <span className="sticker-sm grid h-11 w-11 -rotate-3 place-items-center overflow-hidden bg-yellow">
          <ThatGuyAvatar crop="head" size={40} />
        </span>
        <span className="font-display text-xl font-extrabold tracking-tight">That Guy</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="sticker-sm flex h-11 items-center gap-1 bg-card p-1 text-cardink" role="radiogroup" aria-label="Household">
          {users.map((u) => {
            const on = snap.user === u.id;
            return (
              <button
                key={u.id}
                role="radio"
                aria-checked={on}
                onClick={() => {
                  void api.switchUser(u.id);
                  onSwitched?.(u.id);
                }}
                className="relative h-8 rounded-lg px-3 text-sm font-extrabold"
              >
                {on && (
                  <motion.span
                    layoutId={`who-${onSwitched ? "page" : "frame"}`}
                    className="absolute inset-0 rounded-lg border-2 border-line bg-orange"
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  />
                )}
                <span className="relative">{u.label}</span>
              </button>
            );
          })}
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}

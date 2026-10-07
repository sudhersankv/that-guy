"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSyncExternalStore } from "react";

type T = { id: number; text: string; emoji?: string };

let items: T[] = [];
const subs = new Set<() => void>();
let n = 0;

export function toast(text: string, emoji?: string) {
  const t = { id: ++n, text, emoji };
  items = [...items, t];
  subs.forEach((s) => s());
  setTimeout(() => {
    items = items.filter((x) => x.id !== t.id);
    subs.forEach((s) => s());
  }, 2600);
}

const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => subs.delete(cb);
};
const empty: T[] = [];

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => empty);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto flex w-full max-w-[430px] flex-col items-center gap-2 px-4 pt-safe">
      <AnimatePresence>
        {list.map((t, i) => (
          <motion.div
            key={t.id}
            layout
            role="status"
            initial={{ opacity: 0, y: -20, rotate: -6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, rotate: i % 2 ? 1.5 : -1.5, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            className="sticker-sm bg-yellow px-4 py-2 text-sm font-bold text-cardink"
          >
            {t.emoji && <span className="mr-1.5">{t.emoji}</span>}
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

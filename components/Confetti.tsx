"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

const COLORS = ["#FFFBF0", "#FF6B1A", "#FFD23F", "#7EE8C2", "#FF9EBB", "#9AD1FF"];

/** One-shot burst of tiny business cards. Re-mount (change `key`) to fire again. */
export function Confetti({ count = 22 }: { count?: number }) {
  const reduce = useReducedMotion();
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const dist = 80 + Math.random() * 100;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 60,
          r: Math.random() * 720 - 360,
          c: COLORS[i % COLORS.length],
        };
      }),
    [count],
  );
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/3 z-10" aria-hidden>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute block h-[14px] w-[22px] rounded-[3px] border-2 border-line"
          style={{ background: b.c }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 140], opacity: [1, 1, 0], rotate: b.r, scale: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        >
          <span className="absolute left-[3px] top-[3px] h-[2px] w-[9px] bg-line/70" />
          <span className="absolute left-[3px] top-[7px] h-[2px] w-[12px] bg-line/40" />
        </motion.span>
      ))}
    </div>
  );
}

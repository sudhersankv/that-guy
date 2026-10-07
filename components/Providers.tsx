"use client";

import { MotionConfig } from "framer-motion";

/** Honors prefers-reduced-motion for every framer-motion animation. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

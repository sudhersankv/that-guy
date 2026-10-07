"use client";

import { AnimatePresence, motion } from "framer-motion";

/**
 * That Guy's single, transient status line. A new `text` replaces the old one
 * (fade/slide); it never stacks into a history.
 */
export function ThatGuyCaption({
  text,
  size = "md",
  align = "center",
}: {
  text: string;
  size?: "md" | "lg";
  align?: "center" | "left";
}) {
  return (
    <div
      className={`relative flex min-h-[3.5rem] items-center ${align === "center" ? "justify-center px-2" : "justify-start"}`}
      aria-live="polite"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={text}
          initial={{ opacity: 0, y: 10, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className={`font-display font-extrabold leading-tight text-ink ${align === "center" ? "text-center" : "text-left"} ${
            size === "lg" ? "text-[24px]" : "text-[19px]"
          }`}
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

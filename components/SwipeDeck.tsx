"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { buzz } from "@/lib/haptics";
import type { Candidate } from "@/lib/types";
import { ProviderCard } from "./ProviderCard";

export type SwipeDir = "pick" | "skip";
type Fling = (dir: SwipeDir) => void;

const DIST = 110;
const VELOCITY = 550;

function Stamp({ text, tone, big }: { text: string; tone: SwipeDir; big?: boolean }) {
  const c = tone === "pick" ? "#0f7a4f" : "#c2301c";
  return (
    <span
      className={`rounded-xl border-[4px] bg-card/85 px-3 py-1 font-display font-extrabold leading-none tracking-wide ${big ? "text-[44px]" : "text-[32px]"}`}
      style={{ color: c, borderColor: c }}
    >
      {text}
    </span>
  );
}

function SwipeCard({
  candidate,
  index,
  onSwipe,
  register,
}: {
  candidate: Candidate;
  index: number;
  onSwipe: (id: string, dir: SwipeDir) => void;
  register?: (fn: Fling) => () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-560, -220, 220, 560], [-40, -16, 16, 30]);
  const pickOpacity = useTransform(x, [20, DIST], [0, 1]);
  const skipOpacity = useTransform(x, [-DIST, -20], [1, 0]);
  const leaving = useRef(false);
  const [thunk, setThunk] = useState(false);
  const isTop = index === 0;
  const id = candidate.provider.id;

  const fling = useCallback<Fling>(
    (dir) => {
      if (leaving.current) return;
      leaving.current = true;
      buzz(10);
      if (dir === "pick") {
        setThunk(true);
        setTimeout(() => void animate(x, 560, { duration: 0.28, ease: "easeIn" }).then(() => onSwipe(id, dir)), 260);
      } else {
        animate(y, -60, { duration: 0.22 });
        void animate(x, -560, { duration: 0.22, ease: "easeIn" }).then(() => onSwipe(id, dir));
      }
    },
    [x, y, onSwipe, id],
  );

  useEffect(() => {
    if (!isTop || !register) return;
    return register(fling);
  }, [isTop, register, fling]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > DIST || info.velocity.x > VELOCITY) fling("pick");
    else if (info.offset.x < -DIST || info.velocity.x < -VELOCITY) fling("skip");
    else void animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
  };

  return (
    <motion.div
      className={`absolute inset-0 ${isTop ? "" : "pointer-events-none"}`}
      style={{ zIndex: 10 - index, transformPerspective: 900, originY: 1 }}
      initial={{ opacity: 0, rotateX: -90, scale: 0.9 }}
      animate={{ opacity: index > 2 ? 0 : 1, rotateX: 0, y: index * 12, scale: 1 - index * 0.05 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{ type: "spring", stiffness: 210, damping: 20, delay: index * 0.08 }}
    >
      <motion.div
        className={`relative h-full ${isTop ? "cursor-grab touch-pan-y active:cursor-grabbing" : ""}`}
        style={{ x, y, rotate }}
        drag={isTop ? "x" : false}
        dragMomentum={false}
        onDragEnd={onDragEnd}
      >
        <motion.div className="h-full" animate={thunk ? { scale: [1, 0.92, 1.04, 1] } : { scale: 1 }} transition={{ duration: 0.26 }}>
          <ProviderCard candidate={candidate} />
        </motion.div>
        {isTop && (
          <>
            <motion.div style={{ opacity: pickOpacity }} className="pointer-events-none absolute left-4 top-24 -rotate-12">
              <Stamp text="MY GUY" tone="pick" />
            </motion.div>
            <motion.div style={{ opacity: skipOpacity }} className="pointer-events-none absolute right-4 top-24 rotate-12">
              <Stamp text="NAH" tone="skip" />
            </motion.div>
            {thunk && (
              <motion.div
                className="pointer-events-none absolute inset-0 grid place-items-center"
                initial={{ scale: 2.6, opacity: 0, rotate: -28 }}
                animate={{ scale: 1, opacity: 1, rotate: -12 }}
                transition={{ duration: 0.16, ease: "easeIn" }}
              >
                <Stamp text="MY GUY" tone="pick" big />
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/** Ranked best → worst. Right = pick, left = skip. */
export function SwipeDeck({
  candidates,
  onSwipe,
  position,
}: {
  candidates: Candidate[];
  onSwipe: (id: string, dir: SwipeDir) => void;
  position: string;
}) {
  const flingRef = useRef<Fling | null>(null);
  const register = useCallback((fn: Fling) => {
    flingRef.current = fn;
    return () => {
      if (flingRef.current === fn) flingRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") flingRef.current?.("pick");
      if (e.key === "ArrowLeft") flingRef.current?.("skip");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[430px] w-full" style={{ perspective: 900 }}>
        <AnimatePresence>
          {candidates.slice(0, 4).map((c, i) => (
            <SwipeCard key={c.provider.id} candidate={c} index={i} onSwipe={onSwipe} register={i === 0 ? register : undefined} />
          ))}
        </AnimatePresence>
      </div>
      <div className="mt-5 flex items-center gap-7">
        <button
          aria-label="Skip"
          onClick={() => flingRef.current?.("skip")}
          className="sticker press grid h-16 w-16 -rotate-3 place-items-center rounded-full bg-pink text-cardink"
        >
          <X size={30} strokeWidth={3} />
        </button>
        <span className="min-w-14 text-center font-hand text-2xl font-bold tabular-nums">{position}</span>
        <button
          aria-label="Pick"
          onClick={() => flingRef.current?.("pick")}
          className="sticker press grid h-16 w-16 rotate-3 place-items-center rounded-full bg-orange text-cardink"
        >
          <Check size={30} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

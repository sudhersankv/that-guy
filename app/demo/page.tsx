"use client";

import { useEffect, useRef, useState } from "react";
import { DemoBar } from "@/components/console/DemoBar";
import { NetworkConsole } from "@/components/console/NetworkConsole";
import { PhoneSurface } from "@/components/phone/PhoneSurface";
import * as api from "@/lib/api";

const PHONE_W = 390;
const PHONE_H = 844;
const BEZEL = 12;

/** A 390×844 phone, scaled down to fit the viewport height. */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientHeight / (PHONE_H + BEZEL * 2))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const w = (PHONE_W + BEZEL * 2) * scale;
  return (
    <div ref={ref} className="flex h-full shrink-0 items-start justify-center" style={{ width: w }}>
      <div
        className="relative origin-top-left rounded-[54px] border-[3px] border-line bg-[#141210]"
        style={{ width: PHONE_W + BEZEL * 2, height: PHONE_H + BEZEL * 2, padding: BEZEL, transform: `scale(${scale})`, boxShadow: "8px 8px 0 var(--shadow)" }}
      >
        <div className="page-paper relative h-full w-full overflow-y-auto overflow-x-hidden rounded-[42px] text-ink no-scrollbar">
          <div className="pointer-events-none sticky top-0 z-40 flex justify-center">
            <div className="mt-2 h-[26px] w-[110px] rounded-full bg-[#141210]" />
          </div>
          <div className="-mt-[34px] pt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function DemoPage() {
  useEffect(() => {
    api.setDemoMode(true);
  }, []);

  return (
    <div className="page-paper flex h-dvh flex-col gap-3 overflow-hidden p-4 text-ink">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold leading-none">That Guy</h1>
          <p className="font-hand text-xl font-bold leading-tight text-muted">Word of mouth, automated.</p>
        </div>
        <DemoBar />
      </div>
      <div className="flex min-h-0 flex-1 gap-5">
        <PhoneFrame>
          <PhoneSurface />
        </PhoneFrame>
        <div id="console" className="min-h-0 min-w-0 flex-1">
          <NetworkConsole />
        </div>
      </div>
    </div>
  );
}

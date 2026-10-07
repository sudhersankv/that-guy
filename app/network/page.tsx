"use client";

import { DemoBar } from "@/components/console/DemoBar";
import { NetworkConsole } from "@/components/console/NetworkConsole";

/** Surface B on its own: put it next to the phone tab (they sync live). */
export default function NetworkPage() {
  return (
    <div className="page-paper flex min-h-dvh flex-col gap-3 p-4 text-ink lg:h-dvh lg:p-5">
      <DemoBar />
      <div className="min-h-0 flex-1">
        <NetworkConsole />
      </div>
    </div>
  );
}

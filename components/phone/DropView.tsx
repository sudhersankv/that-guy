"use client";

import { motion } from "framer-motion";
import { ImagePlus } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import * as api from "@/lib/api";
import type { Case } from "@/lib/types";
import type { Recording } from "@/lib/useRecorder";
import { RecordBubble } from "../RecordBubble";
import { ThatGuyAvatar, type Mood } from "../ThatGuyAvatar";

/** Screen 1: "What broke?" One huge hold-to-record button. Release = sent. */
export function DropView({ onDropped }: { onDropped?: (c: Case) => void }) {
  const snap = api.useSnapshot();
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [photos, setPhotos] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const simulating = snap.sim?.kind === "drop" && snap.sim.user === snap.user;

  const send = async (r: Recording) => {
    if (sending) return;
    setSending(true);
    const c = await api.drop({ audioBlob: r.audioBlob, frames: r.frames, photos });
    onDropped?.(c);
  };
  const onRecordingChange = useCallback((on: boolean) => setRecording(on), []);

  const mood: Mood = sending ? "dialing" : recording ? "listening" : "idle";

  return (
    <div className="flex flex-col items-center px-5">
      <h1 className="mt-3 -rotate-1 text-[42px] font-extrabold leading-none">What broke?</h1>
      <p className="mt-1 text-center font-hand text-[22px] font-bold leading-tight text-muted">
        Show me. I&apos;ll ask the neighbors&apos; guys and handle it.
      </p>
      <div className="relative z-10 -mb-8 mt-1">
        <ThatGuyAvatar mood={mood} size={128} />
      </div>
      <motion.section
        className="flex flex-col items-center"
        animate={sending ? { scale: 0.3, y: -260, opacity: 0.5 } : { scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 20 }}
      >
        <RecordBubble
          size={248}
          simulate={simulating}
          disabled={sending || simulating}
          onSend={send}
          onRecordingChange={onRecordingChange}
          hints={{ idle: "Hold & show me", recording: "Mhm… go on…", sent: "Say no more." }}
          extraControls={
            <>
              <button
                type="button"
                aria-label="Attach photos"
                title="Attach photos"
                onClick={() => fileRef.current?.click()}
                className="sticker-sm press relative grid h-12 w-12 place-items-center rounded-full bg-card text-cardink"
              >
                <ImagePlus size={20} strokeWidth={2.4} />
                {photos > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full border-2 border-line bg-orange px-1 text-xs font-extrabold">
                    {photos}
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => setPhotos((n) => n + (e.target.files?.length ?? 0))}
              />
            </>
          }
        />
      </motion.section>
    </div>
  );
}

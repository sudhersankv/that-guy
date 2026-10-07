"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Camera, Loader2, Mic, Video, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Recording } from "@/lib/useRecorder";
import type { VoiceNote } from "@/lib/useVoiceNote";
import { RecordBubble } from "./RecordBubble";
import { VoiceHold } from "./VoiceHold";

export interface ComposerValue {
  text: string;
  photos: File[];
  audio: Blob | null;
  videoFrames: string[];
}

const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

/**
 * Text + photos + hold-to-record voice + hold-to-record video circle.
 * Any combination can be sent.
 */
export function Composer({
  placeholder = "Tell me what's going on…",
  onSubmit,
  onRecordingChange,
  disabled,
}: {
  placeholder?: string;
  onSubmit: (v: ComposerValue) => Promise<void>;
  onRecordingChange?: (on: boolean) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [voice, setVoice] = useState<VoiceNote | null>(null);
  const [video, setVideo] = useState<{ frames: string[]; audio: Blob | null; url?: string; ms: number } | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Release object URLs on unmount (removals revoke their own).
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const hasContent = !!(text.trim() || photos.length || voice || video);
  const recordingChange = useCallback((on: boolean) => onRecordingChange?.(on), [onRecordingChange]);

  const submit = async () => {
    if (!hasContent || busy) return;
    setBusy(true);
    try {
      await onSubmit({ text: text.trim(), photos: photos.map((p) => p.file), audio: voice?.blob ?? video?.audio ?? null, videoFrames: video?.frames ?? [] });
      setText("");
      setPhotos([]);
      setVoice(null);
      setVideo(null);
      setVideoOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const onVideo = (r: Recording) => {
    setVideo({ frames: r.frames, audio: r.audioBlob, url: r.videoBlob ? URL.createObjectURL(r.videoBlob) : undefined, ms: r.durationMs });
    setVideoOpen(false);
  };

  return (
    <div className="sticker paper rounded-[22px] p-3">
      <AnimatePresence initial={false}>
        {videoOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="relative flex flex-col items-center pb-2 pt-1">
              <button
                type="button"
                onClick={() => setVideoOpen(false)}
                aria-label="Close video"
                className="absolute right-0 top-0 grid h-11 w-11 place-items-center"
              >
                <X size={20} strokeWidth={2.6} />
              </button>
              <RecordBubble
                size={190}
                controls={false}
                repeatable
                onSend={onVideo}
                onRecordingChange={recordingChange}
                hints={{ idle: "Hold & show me", recording: "Mhm… go on…", sent: "Got it." }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={2}
        disabled={disabled}
        aria-label="Describe the problem"
        className="block min-h-14 w-full resize-none bg-transparent px-1 text-[16px] leading-snug text-cardink outline-none placeholder:text-cardmuted"
      />

      {/* Attachments */}
      {(photos.length > 0 || voice || video) && (
        <div className="no-scrollbar -mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pt-1">
          {video && (
            <Attachment onRemove={() => setVideo(null)} label="Remove video">
              {video.url ? (
                <video src={video.url} autoPlay loop muted playsInline className="h-full w-full scale-x-[-1] rounded-full object-cover" />
              ) : (
                <Video size={20} />
              )}
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-cardink px-1 font-mono text-[10px] text-card">{fmt(video.ms)}</span>
            </Attachment>
          )}
          {voice && (
            <Attachment onRemove={() => setVoice(null)} label="Remove voice note" wide>
              <Mic size={16} /> <span className="font-mono text-xs font-bold">{fmt(voice.ms)}</span>
            </Attachment>
          )}
          {photos.map((p, i) => (
            <Attachment key={p.url} onRemove={() => {
                URL.revokeObjectURL(p.url);
                setPhotos((ps) => ps.filter((_, j) => j !== i));
              }} label="Remove photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full rounded-[10px] object-cover" />
            </Attachment>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Add photos"
          className="sticker-sm press grid h-12 w-12 place-items-center rounded-full bg-card text-cardink"
        >
          <Camera size={20} strokeWidth={2.4} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            setPhotos((ps) => [...ps, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
            e.target.value = "";
          }}
        />
        <VoiceHold onRecorded={setVoice} onRecordingChange={recordingChange} disabled={disabled} />
        <button
          type="button"
          onClick={() => setVideoOpen((o) => !o)}
          aria-label={videoOpen ? "Hide video" : "Record a video"}
          aria-pressed={videoOpen}
          className={`sticker-sm press grid h-12 w-12 place-items-center rounded-full text-cardink ${videoOpen ? "bg-yellow" : "bg-card"}`}
        >
          <Video size={20} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!hasContent || busy || disabled}
          className="sticker press ml-auto flex h-12 items-center gap-1.5 rounded-full bg-orange px-5 font-display text-base font-extrabold text-cardink disabled:opacity-40"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} strokeWidth={3} />}
          Send
        </button>
      </div>
    </div>
  );
}

function Attachment({
  children,
  onRemove,
  label,
  wide,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  label: string;
  wide?: boolean;
}) {
  return (
    <motion.div
      initial={{ scale: 0.5, rotate: -10 }}
      animate={{ scale: 1, rotate: wide ? 1.5 : -2 }}
      className={`relative flex h-14 shrink-0 items-center justify-center gap-1 rounded-xl border-2 border-line bg-yellow text-cardink ${wide ? "px-3" : "w-14"}`}
    >
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={label}
        className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border-2 border-line bg-card"
      >
        <X size={12} strokeWidth={3} />
      </button>
    </motion.div>
  );
}

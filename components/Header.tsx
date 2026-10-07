import Link from "next/link";
import { ThatGuyAvatar } from "./ThatGuyAvatar";
import { ThemeToggle } from "./ThemeToggle";

export function Header({ back }: { back?: boolean }) {
  return (
    <header className="pt-safe flex items-center justify-between px-4 pb-1">
      <Link href="/" className="flex h-11 items-center gap-2" aria-label={back ? "Back to my problems" : "That Guy home"}>
        {back && <span className="sticker-sm grid h-11 w-11 place-items-center bg-card text-xl font-extrabold text-cardink">←</span>}
        <span className="sticker-sm grid h-11 w-11 -rotate-6 place-items-center overflow-hidden bg-yellow">
          <ThatGuyAvatar crop="head" size={40} />
        </span>
        <span className="font-display text-xl font-extrabold tracking-tight">That Guy</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}

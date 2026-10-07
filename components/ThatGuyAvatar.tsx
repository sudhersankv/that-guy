"use client";

import { AnimatePresence, motion, useReducedMotion, type Transition } from "framer-motion";

export type Mood = "idle" | "listening" | "dialing" | "proud" | "shrug";

const INK = "#141210";
const SKIN = "#F4B183";
const HAIR = "#3B2416";
const MINT = "#7EE8C2";
const MINT_DARK = "#5FD3AA";
const ORANGE = "#FF6B1A";
const YELLOW = "#FFD23F";
const SKY = "#9AD1FF";
const PINK = "#FF9EBB";
const CREAM = "#FFFBF0";

const fill = { transformBox: "fill-box", transformOrigin: "center" } as const;

/** Shirt sleeve: thick ink outline with a mint fill on top. */
function Sleeve({ d }: { d: string }) {
  return (
    <>
      <path d={d} stroke={INK} strokeWidth={22} strokeLinecap="round" fill="none" />
      <path d={d} stroke={MINT} strokeWidth={15} strokeLinecap="round" fill="none" />
    </>
  );
}

function Palm({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {[-7, -2, 3, 8].map((dx) => (
        <rect key={dx} x={cx + dx - 2.5} y={cy - 17} width={5} height={12} rx={2.5} fill={SKIN} stroke={INK} strokeWidth={2.5} />
      ))}
      <ellipse cx={cx} cy={cy} rx={12} ry={9} fill={SKIN} stroke={INK} strokeWidth={3} />
    </g>
  );
}

function Sparkle({ x, y, delay, still }: { x: number; y: number; delay: number; still: boolean }) {
  return (
    <motion.path
      d="M0 -11 L3 -3 L11 0 L3 3 L0 11 L-3 3 L-11 0 L-3 -3 Z"
      transform={`translate(${x} ${y})`}
      fill={YELLOW}
      stroke={INK}
      strokeWidth={2}
      strokeLinejoin="round"
      style={fill}
      initial={{ scale: 0, rotate: 0 }}
      animate={still ? { scale: 1 } : { scale: [0, 1.2, 0.9, 0], rotate: [0, 45, 90] }}
      transition={still ? undefined : { duration: 1.4, repeat: Infinity, delay, ease: "easeOut" }}
    />
  );
}

/**
 * That Guy: the neighborhood fixer. Sunglasses up, big grin, phone to one ear,
 * pencil behind the other, lanyard full of keys, business cards in his pocket.
 */
export function ThatGuyAvatar({
  mood = "idle",
  size = 120,
  crop = "full",
  className = "",
}: {
  mood?: Mood;
  size?: number;
  /** "head" crops to his face, for small logo spots. */
  crop?: "full" | "head";
  className?: string;
}) {
  const reduce = !!useReducedMotion();
  const loop = (t: Transition): Transition => (reduce ? { duration: 0 } : t);

  const body = {
    idle: { y: [0, -3, 0], rotate: 0, scale: 1 },
    listening: { y: 2, rotate: -6, scale: 1.04 },
    dialing: { y: [0, -1.5, 0], rotate: 0, scale: 1 },
    proud: { y: [0, -7, 0], rotate: 0, scale: 1 },
    shrug: { y: -2, rotate: [-3, 3, -3], scale: 1 },
  }[mood];
  const bodyT: Transition =
    mood === "idle"
      ? loop({ duration: 3, repeat: Infinity, ease: "easeInOut" })
      : mood === "proud"
        ? loop({ duration: 0.6, repeat: Infinity, ease: "easeOut" })
        : mood === "dialing"
          ? loop({ duration: 0.5, repeat: Infinity })
          : mood === "shrug"
            ? loop({ duration: 2.4, repeat: Infinity, ease: "easeInOut" })
            : { type: "spring", stiffness: 200, damping: 14 };

  const showPhone = mood !== "shrug";
  const viewBox = crop === "head" ? "44 22 112 112" : "0 0 200 200";
  const height = crop === "head" ? size : size;

  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={height}
      className={className}
      role="img"
      aria-label={`That Guy (${mood})`}
      overflow="visible"
    >
      <motion.g
        style={{ transformBox: "view-box", transformOrigin: "100px 190px" }}
        animate={body}
        transition={bodyT}
      >
        {/* Mood effects behind him */}
        <AnimatePresence>
          {mood === "proud" && (
            <motion.g key="sparkles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Sparkle x={24} y={60} delay={0} still={reduce} />
              <Sparkle x={178} y={44} delay={0.35} still={reduce} />
              <Sparkle x={160} y={16} delay={0.7} still={reduce} />
              <Sparkle x={40} y={24} delay={1.05} still={reduce} />
            </motion.g>
          )}
          {mood === "dialing" && (
            <motion.g key="ring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {["M166 62 q7 7 0 15", "M173 55 q12 13 0 29", "M180 48 q17 20 0 43"].map((d, i) => (
                <motion.path
                  key={d}
                  d={d}
                  stroke={INK}
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  fill="none"
                  animate={reduce ? { opacity: 1 } : { opacity: [0, 1, 0] }}
                  transition={loop({ duration: 0.9, repeat: Infinity, delay: i * 0.15 })}
                />
              ))}
              <motion.text
                x={132}
                y={30}
                fontFamily="Caveat, cursive"
                fontWeight={700}
                fontSize={20}
                fill={INK}
                transform="rotate(12 150 30)"
                animate={reduce ? { opacity: 1 } : { opacity: [0, 1, 1, 0], y: [4, 0, 0, -3] }}
                transition={loop({ duration: 1.2, repeat: Infinity })}
              >
                ring ring!
              </motion.text>
            </motion.g>
          )}
          {mood === "shrug" && (
            <motion.g key="q" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.text
                x={150}
                y={38}
                fontFamily="Caveat, cursive"
                fontWeight={700}
                fontSize={34}
                fill={INK}
                animate={reduce ? {} : { y: [38, 32, 38], rotate: [0, 8, 0] }}
                transition={loop({ duration: 1.6, repeat: Infinity })}
              >
                ?
              </motion.text>
              <text x={36} y={40} fontFamily="Caveat, cursive" fontWeight={700} fontSize={22} fill={INK}>
                ?
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Pencil tucked behind his left ear (viewer's left) */}
        <g transform="translate(52 62) rotate(-32)">
          <rect x={-5} y={-40} width={10} height={8} rx={2} fill={PINK} stroke={INK} strokeWidth={2.5} />
          <rect x={-5} y={-33} width={10} height={42} fill={YELLOW} stroke={INK} strokeWidth={2.5} />
          <path d="M-5 9 L5 9 L0 20 Z" fill="#F4D7A8" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
          <path d="M-1.8 15 L1.8 15 L0 20 Z" fill={INK} />
        </g>

        {/* Shirt */}
        <path d="M36 204 C38 162 64 140 100 138 C136 140 162 162 164 204 Z" fill={MINT} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
        <path d="M84 139 L94 157 L100 146 Z" fill={CREAM} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        <path d="M116 139 L106 157 L100 146 Z" fill={CREAM} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />

        {/* Business cards poking out of the shirt pocket */}
        <g>
          <rect x={57} y={145} width={21} height={14} rx={2} fill={CREAM} stroke={INK} strokeWidth={2.5} transform="rotate(-12 67 152)" />
          <rect x={61} y={142} width={21} height={14} rx={2} fill={CREAM} stroke={INK} strokeWidth={2.5} transform="rotate(9 71 149)" />
          <line x1={64} y1={146} x2={76} y2={148} stroke={ORANGE} strokeWidth={3} transform="rotate(9 71 149)" />
          <path d="M54 156 H84 V176 Q69 183 54 176 Z" fill={MINT_DARK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </g>

        {/* Lanyard heavy with keys */}
        <path d="M88 142 L98 176 M112 142 L102 176" stroke={INK} strokeWidth={8} strokeLinecap="round" />
        <path d="M88 142 L98 176 M112 142 L102 176" stroke={ORANGE} strokeWidth={4} strokeLinecap="round" />
        <motion.g
          style={{ transformBox: "view-box", transformOrigin: "100px 180px" }}
          animate={reduce ? {} : { rotate: mood === "dialing" || mood === "proud" ? [-10, 10, -10] : [-4, 4, -4] }}
          transition={loop({ duration: mood === "dialing" || mood === "proud" ? 0.5 : 2.6, repeat: Infinity, ease: "easeInOut" })}
        >
          <circle cx={100} cy={181} r={6} fill="none" stroke={INK} strokeWidth={3} />
          {[
            { r: -28, c: YELLOW },
            { r: 0, c: SKY },
            { r: 26, c: ORANGE },
          ].map(({ r, c }) => (
            <g key={r} transform={`rotate(${r} 100 182)`}>
              <rect x={98} y={188} width={4} height={12} rx={1} fill={c} stroke={INK} strokeWidth={2} />
              <circle cx={100} cy={189} r={5} fill={c} stroke={INK} strokeWidth={2.2} />
            </g>
          ))}
        </motion.g>

        {/* Left arm (viewer's left), per mood */}
        {mood === "idle" && <Sleeve d="M54 162 C40 172 38 188 42 204" />}
        {mood === "dialing" && <Sleeve d="M54 162 C40 172 38 188 42 204" />}
        {mood === "listening" && <Sleeve d="M54 160 C30 150 28 118 44 102" />}
        {mood === "proud" && <Sleeve d="M54 160 C30 156 28 132 34 116" />}
        {mood === "shrug" && <Sleeve d="M54 160 C34 160 26 146 24 134" />}

        {/* Neck + head */}
        <rect x={88} y={118} width={24} height={24} rx={6} fill={SKIN} stroke={INK} strokeWidth={3} />
        <ellipse cx={60} cy={88} rx={9} ry={11} fill={SKIN} stroke={INK} strokeWidth={3} />
        <ellipse cx={140} cy={88} rx={9} ry={11} fill={SKIN} stroke={INK} strokeWidth={3} />
        <ellipse cx={100} cy={84} rx={42} ry={44} fill={SKIN} stroke={INK} strokeWidth={3.5} />
        <path
          d="M58 78 C55 40 80 30 100 32 C122 30 146 40 142 78 C134 58 118 52 100 54 C82 52 66 58 58 78 Z"
          fill={HAIR}
          stroke={INK}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        {/* Sunglasses pushed up on his head */}
        <g transform="rotate(-4 100 46)">
          <path d="M68 46 L58 54 M132 46 L142 54" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <rect x={67} y={38} width={29} height={17} rx={8} fill={INK} />
          <rect x={104} y={38} width={29} height={17} rx={8} fill={INK} />
          <path d="M96 45 Q100 41 104 45" stroke={INK} strokeWidth={3.5} fill="none" />
          <path d="M73 43 L81 43 M110 43 L118 43" stroke={SKY} strokeWidth={2.5} strokeLinecap="round" />
        </g>

        {/* Face */}
        <path
          d={mood === "shrug" ? "M76 65 Q84 58 92 64 M108 64 Q116 58 124 65" : mood === "listening" ? "M76 70 Q84 66 92 70 M108 66 Q116 60 124 66" : "M76 70 Q84 65 92 70 M108 70 Q116 65 124 70"}
          stroke={INK}
          strokeWidth={3.5}
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx={mood === "listening" ? 81 : 84} cy={82} rx={4.5} ry={6} fill={INK} />
        <motion.ellipse
          cx={mood === "listening" ? 113 : 116}
          cy={82}
          rx={4.5}
          ry={6}
          fill={INK}
          style={fill}
          animate={mood === "idle" && !reduce ? { scaleY: [1, 1, 0.12, 1, 1] } : { scaleY: 1 }}
          transition={mood === "idle" && !reduce ? { duration: 4.2, repeat: Infinity, times: [0, 0.82, 0.86, 0.9, 1] } : undefined}
        />
        <path d="M100 86 Q106 94 99 97" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
        <circle cx={71} cy={98} r={6} fill={PINK} opacity={0.75} />
        <circle cx={129} cy={98} r={6} fill={PINK} opacity={0.75} />
        {mood === "listening" ? (
          <ellipse cx={100} cy={109} rx={7} ry={8} fill="#6B1E14" stroke={INK} strokeWidth={3} />
        ) : mood === "shrug" ? (
          <path d="M84 109 Q92 104 100 109 Q108 114 116 109" stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />
        ) : (
          <g>
            <path d="M78 102 Q100 132 122 102 Q100 110 78 102 Z" fill="#6B1E14" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
            <path d="M83 104.5 Q100 111 117 104.5 L115 109 Q100 115 85 109 Z" fill="#FFFFFF" />
          </g>
        )}

        {/* Right arm (viewer's right): phone to the ear, or palm up for a shrug */}
        {showPhone ? (
          <g>
            <Sleeve d="M146 162 C172 152 172 124 152 104" />
            <motion.g
              style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
              animate={mood === "dialing" && !reduce ? { rotate: [-9, 9, -9] } : { rotate: 0 }}
              transition={mood === "dialing" && !reduce ? { duration: 0.16, repeat: Infinity } : undefined}
            >
              <rect x={140} y={64} width={19} height={38} rx={5} fill={ORANGE} stroke={INK} strokeWidth={3} transform="rotate(14 149 83)" />
              <rect x={144} y={70} width={11} height={4} rx={2} fill={INK} transform="rotate(14 149 83)" />
              <circle cx={151} cy={101} r={11} fill={SKIN} stroke={INK} strokeWidth={3} />
              <path d="M141 93 q7 -5 14 -1" stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round" />
            </motion.g>
          </g>
        ) : (
          <g>
            <Sleeve d="M146 160 C166 160 174 146 176 134" />
            <Palm cx={178} cy={126} />
          </g>
        )}

        {/* Left hand, drawn over the head so the cupped ear reads */}
        {mood === "listening" && (
          <path d="M45 74 C33 79 33 101 47 106 C52 99 52 82 45 74 Z" fill={SKIN} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        )}
        {mood === "proud" && (
          <g>
            <rect x={29} y={80} width={10} height={24} rx={5} fill={SKIN} stroke={INK} strokeWidth={3} />
            <rect x={22} y={98} width={26} height={22} rx={8} fill={SKIN} stroke={INK} strokeWidth={3} />
            <path d="M24 106 H40 M24 113 H40" stroke={INK} strokeWidth={2} />
          </g>
        )}
        {mood === "shrug" && <Palm cx={22} cy={126} />}
      </motion.g>
    </svg>
  );
}

/** He peeks up from the bottom edge of the screen. Decorative only. */
export function MascotPeek({ mood = "idle", bottom = 0 }: { mood?: Mood; bottom?: number }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 z-30 mx-auto w-full max-w-[430px]" style={{ bottom }} aria-hidden>
      <motion.div
        className="absolute right-3 bottom-0"
        initial={{ y: 120 }}
        animate={{ y: 34 }}
        transition={{ type: "spring", stiffness: 140, damping: 14, delay: 0.3 }}
      >
        <ThatGuyAvatar mood={mood} size={96} />
      </motion.div>
    </div>
  );
}

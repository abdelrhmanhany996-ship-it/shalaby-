/**
 * Shalaby, the assistant's face: a young Egyptian advisor in a navy blazer, red tie and a red tarboosh with a swinging
 * tassel, with a neat moustache. Drawn in SVG so it stays sharp at any size, follows the theme, and can move:
 * it blinks, waves hello, looks up and thinks while the AI works, and talks while an answer appears.
 */
export type ShalabyState = "idle" | "welcome" | "thinking" | "speaking" | "happy" | "sorry" | "sleepy" | "listening";

const SKIN = "#c98d5f";
const SKIN_SHADE = "#b07648";
const HAIR = "#1f1612";
const RED = "#c8232b";
const RED_DARK = "#951a21";
const NAVY = "#1c2a4a";
const NAVY_DARK = "#121c33";
const INK = "#20150f";

function Eyes({ state }: { state: ShalabyState }) {
  if (state === "sleepy")
    return (
      <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M76 104 q8 5 16 0" />
        <path d="M108 104 q8 5 16 0" />
      </g>
    );
  if (state === "happy")
    return (
      <g stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none">
        <path d="M75 106 q9 -9 18 0" />
        <path d="M107 106 q9 -9 18 0" />
      </g>
    );
  // where the eyes look
  const look = state === "thinking" ? { x: 3, y: -4 } : state === "listening" ? { x: -3, y: 0 } : { x: 0, y: 0 };
  return (
    <g className="sh-eyes">
      {[84, 116].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy="104" rx="9.5" ry="10.5" fill="#fff" />
          <circle cx={cx + look.x} cy={105 + look.y} r="5.6" fill="#4a2c1a" />
          <circle cx={cx + look.x} cy={105 + look.y} r="3" fill={INK} />
          <circle cx={cx + look.x + 2} cy={102.5 + look.y} r="1.6" fill="#fff" />
        </g>
      ))}
      {/* eyelids for blinking */}
      <g className="sh-lids" fill={SKIN}>
        <rect x="73" y="92" width="23" height="25" className="sh-lid" />
        <rect x="105" y="92" width="23" height="25" className="sh-lid" />
      </g>
    </g>
  );
}

function Brows({ state }: { state: ShalabyState }) {
  const p = { stroke: HAIR, strokeWidth: 5.5, strokeLinecap: "round" as const, fill: "none" };
  if (state === "sorry")
    return (
      <g {...p}>
        <path d="M74 92 q9 -6 18 -2" transform="rotate(10 83 90)" />
        <path d="M108 90 q9 -4 18 2" transform="rotate(-10 117 90)" />
      </g>
    );
  if (state === "thinking")
    return (
      <g {...p}>
        <path d="M74 90 q9 -4 18 0" />
        <path d="M108 84 q9 -6 18 -1" />
      </g>
    );
  const lift = state === "welcome" || state === "happy" ? -3 : 0;
  return (
    <g {...p} transform={`translate(0 ${lift})`}>
      <path d="M74 90 q9 -6 18 -1" />
      <path d="M108 89 q9 -5 18 1" />
    </g>
  );
}

function Mouth({ state }: { state: ShalabyState }) {
  if (state === "speaking")
    return <ellipse className="sh-talk" cx="100" cy="137" rx="8" ry="5" fill="#6b2323" stroke={INK} strokeWidth="2" />;
  if (state === "sorry") return <path d="M90 140 q10 -6 20 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />;
  if (state === "thinking") return <path d="M93 138 q6 2 13 -1" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />;
  if (state === "sleepy") return <ellipse cx="100" cy="138" rx="4" ry="3" fill="#6b2323" />;
  const big = state === "happy" || state === "welcome";
  return big ? (
    <path d="M86 134 q14 14 28 0 q-14 5 -28 0z" fill="#6b2323" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
  ) : (
    <path d="M88 135 q12 9 24 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
  );
}

export function ShalabyCharacter({ state = "idle", size = 96, className = "" }: { state?: ShalabyState; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={size * 1.1}
      className={`shalaby-character sh-state-${state} ${className}`}
      role="img"
      aria-label={state === "thinking" ? "شلبي بيفكّر" : state === "speaking" ? "شلبي بيرد" : "شلبي"}
    >
      <g className="sh-body">
        {/* shoulders: navy blazer, white shirt, red tie */}
        <path d="M30 220 q4 -48 46 -58 l24 10 l24 -10 q42 10 46 58z" fill={NAVY} />
        <path d="M76 162 l24 10 l24 -10 l-6 22 l-18 -6 l-18 6z" fill={NAVY_DARK} opacity=".6" />
        <path d="M84 160 l16 22 l16 -22 l-4 -6 h-24z" fill="#f4f1ea" />
        <path d="M96 170 h8 l4 30 l-8 10 l-8 -10z" fill={RED} />
        <path d="M95 166 h10 l-2 6 h-6z" fill={RED_DARK} />
        {/* badge */}
        <circle cx="140" cy="186" r="9" fill={RED} />
        <text x="140" y="190" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="'IBM Plex Sans Arabic', sans-serif">
          ش
        </text>
        {/* neck */}
        <path d="M88 146 h24 v18 q-12 8 -24 0z" fill={SKIN_SHADE} />
      </g>

      {state === "welcome" && (
        <g className="sh-wave">
          <path d="M150 210 q6 -40 22 -64" stroke={NAVY} strokeWidth="18" strokeLinecap="round" fill="none" />
          <g transform="translate(172 140)">
            <ellipse cx="0" cy="0" rx="12" ry="14" fill={SKIN} />
            {[-8, -3, 2, 7].map((x, i) => (
              <rect key={i} x={x - 2} y={-26 + Math.abs(i - 1.5) * 2} width="5" height="16" rx="2.5" fill={SKIN} />
            ))}
            <rect x="-17" y="-6" width="6" height="13" rx="3" fill={SKIN} transform="rotate(-30 -14 0)" />
          </g>
        </g>
      )}

      <g className="sh-head">
        {/* ears */}
        <ellipse cx="54" cy="110" rx="8" ry="12" fill={SKIN_SHADE} />
        <ellipse cx="146" cy="110" rx="8" ry="12" fill={SKIN_SHADE} />
        {/* face */}
        <path d="M56 98 q0 -36 44 -38 q44 2 44 38 q0 34 -16 46 q-12 9 -28 9 q-16 0 -28 -9 q-16 -12 -16 -46z" fill={SKIN} />
        {/* hair below the tarboosh, sideburns */}
        <path d="M56 98 q-2 -22 14 -30 l4 22 q-8 2 -10 16z" fill={HAIR} />
        <path d="M144 98 q2 -22 -14 -30 l-4 22 q8 2 10 16z" fill={HAIR} />
        {/* cheeks */}
        <circle cx="72" cy="122" r="7" fill="#e0866e" opacity={state === "happy" || state === "welcome" ? 0.5 : 0.25} />
        <circle cx="128" cy="122" r="7" fill="#e0866e" opacity={state === "happy" || state === "welcome" ? 0.5 : 0.25} />
        <Brows state={state} />
        <Eyes state={state} />
        {/* nose */}
        <path d="M100 108 q-5 12 -3 16 q4 2 7 0" stroke={SKIN_SHADE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* the moustache */}
        <path d="M82 128 q9 -7 18 -2 q9 -5 18 2 q-4 5 -10 4 q-5 -1 -8 -3 q-3 2 -8 3 q-6 1 -10 -4z" fill={HAIR} />
        <Mouth state={state} />

        {/* the tarboosh, tilted a little, with a swinging tassel */}
        <g transform="rotate(-6 100 60)">
          <path d="M66 72 q34 -10 68 0 l-8 -40 q-26 -8 -52 0z" fill={RED} />
          <path d="M66 72 q34 -10 68 0 l-2 -9 q-32 -9 -64 0z" fill={RED_DARK} />
          <ellipse cx="100" cy="32" rx="26" ry="5" fill={RED_DARK} />
          <g className="sh-tassel" style={{ transformOrigin: "100px 32px" }}>
            <path d="M100 32 q14 4 22 18" stroke={INK} strokeWidth="2.5" fill="none" />
            <path d="M118 46 l8 2 l-2 16 l-6 -2 z" fill={INK} />
          </g>
        </g>
      </g>

      {state === "thinking" && (
        <g className="sh-thought" fill="#9aa3b2">
          <circle cx="160" cy="60" r="5" />
          <circle cx="172" cy="44" r="7" />
          <circle cx="186" cy="24" r="9" />
        </g>
      )}
      {state === "listening" && (
        <g className="sh-rings" fill="none" stroke={RED} strokeWidth="2.5" strokeLinecap="round">
          <path d="M34 98 q-8 12 0 24" />
          <path d="M24 92 q-12 18 0 36" />
        </g>
      )}
      {state === "sorry" && <path d="M146 76 q-6 10 0 16 q6 -6 0 -16z" fill="#7ac8f0" className="sh-sweat" />}
      {state === "happy" && (
        <g fill="#f5c542" className="sh-sparkles">
          <path d="M32 56 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3z" />
          <path d="M170 92 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z" />
        </g>
      )}
      {state === "sleepy" && (
        <g fill="#9aa3b2" fontSize="16" fontWeight="700" className="sh-zzz">
          <text x="150" y="60">z</text>
          <text x="162" y="44" fontSize="20">
            z
          </text>
        </g>
      )}
    </svg>
  );
}

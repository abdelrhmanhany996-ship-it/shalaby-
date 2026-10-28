import { useEffect, useState } from "react";

export type ZakiMood =
  | "idle" | "wave" | "thinking" | "happy" | "talking" | "listening" | "sorry" | "surprised" | "sleepy"
  | "offer" | "cheer" | "confused" | "thanks" | "watch" | "point" | "bye";

/** Moods that only exist as artwork; the built-in drawing shows the closest basic one. */
const drawingFallback: Partial<Record<ZakiMood, ZakiMood>> = {
  offer: "talking", cheer: "happy", confused: "thinking", thanks: "happy", watch: "thinking", point: "talking", bye: "wave",
};

/** Drop PNG/WebP files named after each mood into public/zaki/ and they replace the built-in drawing automatically. */
const FILE_BASE = "/zaki/";
const known = new Map<string, "ok" | "bad">();

function useArt(mood: ZakiMood) {
  const [state, setState] = useState<"ok" | "bad" | "loading">(() => known.get(mood) ?? "loading");
  useEffect(() => {
    const cached = known.get(mood);
    if (cached) return setState(cached);
    setState("loading");
    let alive = true;
    const img = new Image();
    img.onload = () => {
      known.set(mood, "ok");
      if (alive) setState("ok");
    };
    img.onerror = () => {
      known.set(mood, "bad");
      if (alive) setState("bad");
    };
    img.src = `${FILE_BASE}${mood}.png`;
    return () => {
      alive = false;
    };
  }, [mood]);
  return state;
}

const SKIN = "#e2ad80";
const SKIN_SHADE = "#cf9669";
const HAIR = "#2a1d19";
const RED = "#c8232b";

function Eyes({ mood }: { mood: ZakiMood }) {
  if (mood === "happy")
    return (
      <g fill="none" stroke="#2a1d19" strokeWidth="4" strokeLinecap="round">
        <path d="M76 88 Q84 78 92 88" />
        <path d="M108 88 Q116 78 124 88" />
      </g>
    );
  if (mood === "sleepy")
    return (
      <g fill="none" stroke="#2a1d19" strokeWidth="4" strokeLinecap="round">
        <path d="M76 90 Q84 96 92 90" />
        <path d="M108 90 Q116 96 124 90" />
      </g>
    );
  const look = mood === "thinking" ? { x: 3, y: -4 } : mood === "listening" ? { x: -2, y: 0 } : { x: 0, y: 0 };
  const big = mood === "surprised" ? 1.25 : 1;
  return (
    <g className="zaki-eyes" style={{ transformOrigin: "100px 88px" }}>
      {[84, 116].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy="88" rx={9 * big} ry={10.5 * big} fill="#fff" />
          <circle cx={cx + look.x} cy={88 + look.y} r={5.4 * big} fill="#2a1d19" className="zaki-pupil" />
          <circle cx={cx + look.x + 1.8} cy={85.5 + look.y} r="1.7" fill="#fff" />
        </g>
      ))}
    </g>
  );
}

function Brows({ mood }: { mood: ZakiMood }) {
  const common = { fill: "none", stroke: HAIR, strokeWidth: 4, strokeLinecap: "round" as const };
  if (mood === "sorry")
    return (
      <g {...common}>
        <path d="M74 72 Q84 66 94 74" />
        <path d="M126 72 Q116 66 106 74" />
      </g>
    );
  if (mood === "thinking")
    return (
      <g {...common}>
        <path d="M74 70 Q84 63 94 69" />
        <path d="M106 72 Q116 70 126 74" />
      </g>
    );
  if (mood === "surprised")
    return (
      <g {...common}>
        <path d="M74 64 Q84 58 94 64" />
        <path d="M106 64 Q116 58 126 64" />
      </g>
    );
  return (
    <g {...common} className="zaki-brows">
      <path d="M74 71 Q84 66 94 70" />
      <path d="M106 70 Q116 66 126 71" />
    </g>
  );
}

function Mouth({ mood }: { mood: ZakiMood }) {
  switch (mood) {
    case "happy":
      return (
        <g>
          <path d="M82 108 Q100 132 118 108 Z" fill="#7a2a2a" stroke="#2a1d19" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M88 110 Q100 116 112 110 L112 112 Q100 119 88 112 Z" fill="#fff" />
        </g>
      );
    case "talking":
      return <ellipse className="zaki-talk" cx="100" cy="114" rx="9" ry="7" fill="#7a2a2a" stroke="#2a1d19" strokeWidth="2.5" />;
    case "surprised":
      return <ellipse cx="100" cy="116" rx="7" ry="9" fill="#7a2a2a" stroke="#2a1d19" strokeWidth="2.5" />;
    case "sorry":
      return <path d="M88 118 Q94 111 100 117 Q106 123 112 116" fill="none" stroke="#2a1d19" strokeWidth="3.5" strokeLinecap="round" />;
    case "thinking":
      return <path d="M92 115 Q101 111 110 116" fill="none" stroke="#2a1d19" strokeWidth="3.5" strokeLinecap="round" />;
    case "sleepy":
      return <ellipse className="zaki-yawn" cx="100" cy="116" rx="6" ry="7" fill="#7a2a2a" stroke="#2a1d19" strokeWidth="2.5" />;
    case "listening":
      return <path d="M91 113 Q100 119 109 113" fill="none" stroke="#2a1d19" strokeWidth="3.5" strokeLinecap="round" />;
    default:
      return <path d="M88 111 Q100 123 112 111" fill="none" stroke="#2a1d19" strokeWidth="3.8" strokeLinecap="round" />;
  }
}

/** The built-in, hand-drawn Zaki: a friendly sales colleague with a headset. */
function ZakiDrawing({ mood }: { mood: ZakiMood }) {
  return (
    <svg viewBox="0 0 200 200" className={`zaki-svg zaki-mood-${mood}`} role="img" aria-label="زكي">
      {/* body */}
      <path d="M26 200 Q28 150 72 142 L128 142 Q172 150 174 200 Z" fill={RED} />
      <path d="M72 142 L100 168 L128 142 Z" fill="#a51a21" />
      <path d="M84 142 L100 160 L116 142 L108 140 L100 150 L92 140 Z" fill="#fff" />
      <g>
        <rect x="132" y="162" width="26" height="15" rx="3" fill="#fff" />
        <text x="145" y="173" fontSize="9" textAnchor="middle" fill="#2a1d19" fontWeight="700">زكي</text>
      </g>
      {/* neck */}
      <rect x="88" y="124" width="24" height="24" rx="8" fill={SKIN_SHADE} />
      {/* waving arm */}
      {mood === "wave" && (
        <g className="zaki-wave-arm" style={{ transformOrigin: "162px 168px" }}>
          <rect x="150" y="112" width="18" height="60" rx="9" fill={RED} />
          <circle cx="159" cy="106" r="12" fill={SKIN} />
          <path d="M152 100 L151 92 M159 98 L159 90 M166 100 L168 93" stroke={SKIN} strokeWidth="4.5" strokeLinecap="round" />
        </g>
      )}
      {/* ears + head */}
      <circle cx="53" cy="90" r="8" fill={SKIN_SHADE} />
      <circle cx="147" cy="90" r="8" fill={SKIN_SHADE} />
      <circle cx="100" cy="86" r="49" fill={SKIN} />
      {/* hair */}
      <path d="M52 82 Q50 38 100 36 Q150 38 148 82 Q140 60 118 56 Q96 66 70 60 Q58 66 52 82 Z" fill={HAIR} />
      {/* headset */}
      <path d="M50 88 Q48 34 100 32 Q152 34 150 88" fill="none" stroke="#3a3a3d" strokeWidth="6" strokeLinecap="round" />
      <rect x="40" y="80" width="16" height="26" rx="7" fill="#3a3a3d" />
      <rect x="44" y="86" width="8" height="14" rx="3" fill={RED} />
      <path d="M44 104 Q46 122 72 122" fill="none" stroke="#3a3a3d" strokeWidth="4" strokeLinecap="round" />
      <circle cx="76" cy="122" r="5" fill="#3a3a3d" />
      {mood === "listening" && (
        <g fill="none" stroke={RED} strokeWidth="2.5" strokeLinecap="round" className="zaki-rings">
          <path d="M30 78 Q24 93 30 108" />
          <path d="M20 70 Q10 93 20 116" />
        </g>
      )}
      {/* face */}
      <Brows mood={mood} />
      <Eyes mood={mood} />
      <circle cx="72" cy="104" r="7" fill="#f08a7a" opacity={mood === "happy" ? 0.6 : 0.32} />
      <circle cx="128" cy="104" r="7" fill="#f08a7a" opacity={mood === "happy" ? 0.6 : 0.32} />
      <Mouth mood={mood} />
      {/* extras */}
      {mood === "thinking" && (
        <g fill="#9aa3b2" className="zaki-thought">
          <circle cx="150" cy="42" r="4" />
          <circle cx="162" cy="30" r="6" />
          <circle cx="178" cy="16" r="9" />
        </g>
      )}
      {mood === "happy" && (
        <g fill="#f5c542" className="zaki-sparkles">
          <path d="M156 40 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" />
          <path d="M40 40 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" />
        </g>
      )}
      {mood === "sorry" && <path d="M138 58 q-6 10 0 16 q6 -6 0 -16z" fill="#7ac8f0" className="zaki-sweat" />}
      {mood === "sleepy" && (
        <g fill="#9aa3b2" fontSize="14" fontWeight="700" className="zaki-zzz">
          <text x="146" y="44">z</text>
          <text x="158" y="30" fontSize="18">z</text>
        </g>
      )}
    </svg>
  );
}

export function ZakiAvatar({ mood = "idle", size = 64, className = "" }: { mood?: ZakiMood; size?: number; className?: string }) {
  const art = useArt(mood);
  return (
    <span className={`zaki-avatar-art ${className}`} style={{ width: size, height: size }}>
      {art === "loading" ? null : art === "ok" ? (
        <img src={`${FILE_BASE}${mood}.png`} alt="زكي" draggable={false} className={`zaki-img zaki-mood-${mood}`} />
      ) : (
        <ZakiDrawing mood={drawingFallback[mood] ?? mood} />
      )}
    </span>
  );
}

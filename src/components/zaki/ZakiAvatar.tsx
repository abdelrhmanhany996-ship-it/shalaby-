import { ShalabyCharacter, type ShalabyState } from "./ShalabyCharacter";

export type ZakiMood =
  | "idle" | "wave" | "thinking" | "happy" | "talking" | "listening" | "sorry" | "surprised" | "sleepy"
  | "offer" | "cheer" | "confused" | "thanks" | "watch" | "point" | "bye";

const toState: Record<ZakiMood, ShalabyState> = {
  idle: "idle", wave: "welcome", bye: "welcome", surprised: "welcome",
  thinking: "thinking", confused: "thinking", watch: "thinking",
  talking: "speaking", offer: "speaking", point: "speaking",
  happy: "happy", cheer: "happy", thanks: "happy",
  sorry: "sorry", sleepy: "sleepy", listening: "listening",
};

/** Shalaby's face for a mood. It is always the drawn character, so it looks the same everywhere and in both themes. */
export function ZakiAvatar({ mood = "idle", size = 64, className = "" }: { mood?: ZakiMood; size?: number; className?: string }) {
  return (
    <span className={`zaki-avatar-art ${className}`} style={{ width: size, height: size * 1.1 }}>
      <ShalabyCharacter state={toState[mood] ?? "idle"} size={size} />
    </span>
  );
}

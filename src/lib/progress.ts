export type Tone = "red" | "orange" | "yellow" | "green" | "shine";

/**
 * The colour of a target progress bar, from the percent of the target reached:
 * up to 20 red, up to 50 orange, up to 75 yellow, up to 100 green, and above the target a glowing green with a star.
 */
export function progressTone(percent: number): { tone: Tone; over: boolean } {
  const p = Number.isFinite(percent) ? percent : 0;
  if (p > 100) return { tone: "shine", over: true };
  if (p > 75) return { tone: "green", over: false };
  if (p > 50) return { tone: "yellow", over: false };
  if (p > 20) return { tone: "orange", over: false };
  return { tone: "red", over: false };
}

export const toneNames: Record<Tone, string> = { red: "لحد 20٪", orange: "لحد 50٪", yellow: "لحد 75٪", green: "لحد 100٪", shine: "فوق الهدف" };

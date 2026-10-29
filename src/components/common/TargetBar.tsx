import { progressTone } from "../../lib/progress";

interface Props {
  /** Percent of the target reached (not capped: above 100 the bar glows and gets a star). */
  percent: number;
  /** Where the person should be by today, as a percent; drawn as a thin marker. */
  expectedPercent?: number;
  height?: number;
}

/** The progress bar every target screen uses, so a colour always means the same thing. */
export function TargetBar({ percent, expectedPercent, height }: Props) {
  const { tone, over } = progressTone(percent);
  const width = percent > 0 ? Math.min(100, Math.max(2, percent)) : 0;
  return (
    <div
      className={`target-bar tb-${tone}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, Math.round(percent))}
      aria-label={over ? "تخطّى الهدف" : "نسبة الإنجاز من الهدف"}
      style={height ? { height } : undefined}
    >
      <i style={{ width: `${width}%` }} />
      {expectedPercent !== undefined && expectedPercent > 0 && expectedPercent < 100 && (
        <span className="tb-pace" title={`المفروض تكون هنا النهارده (${expectedPercent}%)`} style={{ insetInlineStart: `${expectedPercent}%` }} />
      )}
      {over && (
        <span className="tb-star" title="تخطّى الهدف" aria-hidden="true">
          ★
        </span>
      )}
    </div>
  );
}

const legend: [string, string][] = [
  ["#d62b34", "لحد 20٪"],
  ["#f08a24", "لحد 50٪"],
  ["#f2c200", "لحد 75٪"],
  ["#17a34a", "لحد 100٪"],
  ["#36d46b", "فوق الهدف ⭐"],
];

/** What each colour of the bar means. */
export function TargetLegend() {
  return (
    <div className="target-legend" aria-label="معنى الألوان">
      {legend.map(([color, label]) => (
        <span key={label} style={{ ["--c" as string]: color }}>
          {label}
        </span>
      ))}
    </div>
  );
}

import type { Department } from "../../types/crm";
import { departmentNames } from "../../lib/presentation";

const ids = Object.keys(departmentNames) as Department[];

/** A customer can be interested in several departments at once; the first one picked is the primary. */
export function InterestPicker({ value, onChange }: { value: Department[]; onChange: (v: Department[]) => void }) {
  const toggle = (d: Department) => {
    if (value.includes(d)) {
      if (value.length > 1) onChange(value.filter((x) => x !== d)); // at least one stays selected
    } else onChange([...value, d]);
  };
  return (
    <div className="field">
      <span>مهتم بإيه؟ <em>ممكن أكتر من حاجة</em></span>
      <div className="interest-chips" role="group" aria-label="اهتمامات العميل">
        {ids.map((d) => (
          <button type="button" key={d} aria-pressed={value.includes(d)} className={value.includes(d) ? "on" : ""} onClick={() => toggle(d)}>
            {departmentNames[d]}
          </button>
        ))}
      </div>
    </div>
  );
}

export const interestNames = (list: Department[]) => list.map((d) => departmentNames[d]).join("، ");

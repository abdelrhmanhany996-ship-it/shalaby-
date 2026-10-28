import { useMemo } from "react";
import type { ReactNode } from "react";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";

export interface FilterSelect {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  /** Text of the "no filter" option, e.g. "كل الفروع". */
  allLabel: string;
  /** Shown beside the search box instead of under "تصفية إضافية". */
  primary?: boolean;
  /** The value that means "no filter". Defaults to "all". */
  all?: string;
}

interface Props {
  search?: { value: string; onChange: (v: string) => void; placeholder: string };
  selects?: FilterSelect[];
  dates?: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void; label?: string };
  /** Number of rows after filtering and the noun used for them ("عميل"). */
  count?: { shown: number; noun: string };
  actions?: ReactNode;
  /** Resets everything the page filters by. */
  onReset: () => void;
}

/** One filter toolbar for every list in the system: search, a few quick selects, extra filters, count and reset. */
export function FilterBar({ search, selects = [], dates, count, actions, onReset }: Props) {
  const visibleSelects = selects.filter((s) => s.options.length > 0);
  const primary = visibleSelects.filter((s) => s.primary);
  const more = visibleSelects.filter((s) => !s.primary);
  const active = useMemo(
    () => !!search?.value.trim() || visibleSelects.some((s) => s.value !== (s.all ?? "all")) || !!dates?.from || !!dates?.to,
    [search?.value, visibleSelects, dates?.from, dates?.to],
  );
  const activeExtra = more.some((s) => s.value !== (s.all ?? "all")) || !!dates?.from || !!dates?.to;

  const renderSelect = (s: FilterSelect) => (
    <select key={s.id} aria-label={s.label} value={s.value} onChange={(e) => s.onChange(e.target.value)}>
      <option value={s.all ?? "all"}>{s.allLabel}</option>
      {s.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <div className="filter-toolbar">
        {search && (
          <label className="directory-search">
            <Search size={18} />
            <input type="search" aria-label={search.placeholder} placeholder={search.placeholder} value={search.value} onChange={(e) => search.onChange(e.target.value)} />
          </label>
        )}
        {primary.map(renderSelect)}
        {actions}
      </div>
      {(more.length > 0 || dates) && (
        <details className="advanced-filters" open={activeExtra || undefined}>
          <summary>
            <SlidersHorizontal size={14} />
            تصفية إضافية{activeExtra ? " (مفعّلة)" : ""}
            <ChevronDown size={13} />
          </summary>
          <div className="field-grid">
            {more.map((s) => (
              <label className="field" key={s.id}>
                <span>{s.label}</span>
                {renderSelect(s)}
              </label>
            ))}
            {dates && (
              <>
                <label className="field">
                  <span>{dates.label ?? "التاريخ"} من</span>
                  <input type="date" value={dates.from} max={dates.to || undefined} onChange={(e) => dates.onFrom(e.target.value)} />
                </label>
                <label className="field">
                  <span>{dates.label ?? "التاريخ"} إلى</span>
                  <input type="date" value={dates.to} min={dates.from || undefined} onChange={(e) => dates.onTo(e.target.value)} />
                </label>
              </>
            )}
          </div>
        </details>
      )}
      {count && (
        <div className="filter-count">
          <span>
            {count.shown} {count.noun} {active ? "مطابق للبحث والفلاتر" : ""}
          </span>
          {active && <button onClick={onReset}>مسح الفلاتر</button>}
        </div>
      )}
    </>
  );
}

/** Dates in the lists are "YYYY-MM-DD" (or an ISO timestamp); compare only the day. */
export function inDateRange(value: string | undefined, from: string, to: string): boolean {
  if (!from && !to) return true;
  const day = (value || "").slice(0, 10);
  if (!day) return false;
  return (!from || day >= from) && (!to || day <= to);
}

import { useEffect, useRef, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import type { Lead } from "../../types/crm";
import { matchesPerson, norm } from "../../lib/searchText";

/** Search a registered customer by name or number first; adding a new one is the fallback when nobody matches. */
export function CustomerSearch({
  leads,
  value,
  onChange,
  onCreate,
  label = "العميل",
}: {
  leads: Lead[];
  value: Lead | null;
  onChange: (lead: Lead | null) => void;
  /** Called with whatever was typed when the person wants a new customer instead. */
  onCreate: (typed: string) => void;
  label?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (value)
    return (
      <div className="field">
        <span>{label}</span>
        <div className="broker-picked">
          <span>
            <strong>{value.name}</strong>
            <small dir="ltr">{value.phone}</small>
          </span>
          <button type="button" className="icon-button" aria-label="غيّر العميل" onClick={() => onChange(null)}>
            <X size={16} />
          </button>
        </div>
      </div>
    );

  const t = norm(q);
  const matches = t ? leads.filter((l) => matchesPerson(l, q)).slice(0, 8) : [];
  return (
    <div className="field broker-search" ref={box}>
      <span>{label}: ابدأ بالبحث، يمكن يكون مسجّل قبل كده</span>
      <div style={{ position: "relative" }}>
        <Search size={16} className="broker-search-icon" />
        <input
          value={q}
          autoComplete="off"
          placeholder="اكتب اسم العميل أو رقمه"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (matches[0]) onChange(matches[0]);
              else if (q.trim()) onCreate(q.trim());
            }
            if (e.key === "Escape") setOpen(false);
          }}
          role="combobox"
          aria-expanded={open && !!t}
          aria-autocomplete="list"
        />
        {open && t && (
          <div className="search-results broker-results" role="listbox">
            {matches.map((l) => (
              <button type="button" role="option" aria-selected={false} key={l.id} onClick={() => onChange(l)}>
                <span>
                  <strong>{l.name}</strong>
                  <small dir="ltr">{l.phone}</small>
                </span>
              </button>
            ))}
            {!matches.length && <p>مفيش عميل مسجّل بالاسم أو الرقم ده.</p>}
            <button type="button" className="broker-new" onClick={() => onCreate(q.trim())}>
              <span>
                <strong>
                  <UserPlus size={14} /> سجّل «{q.trim()}» كعميل جديد
                </strong>
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

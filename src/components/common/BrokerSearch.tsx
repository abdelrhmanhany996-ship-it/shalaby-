import { useEffect, useRef, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import type { BrokerEntity } from "../../types/crm";
import { matchesPerson, norm } from "../../lib/searchText";

/** Type a broker's name or number and pick from the matches; optionally offer to add a new one. */
export function BrokerSearch({
  brokers,
  value,
  onChange,
  onCreate,
  label = "الوسيط",
}: {
  brokers: BrokerEntity[];
  value: string;
  onChange: (id: string) => void;
  onCreate?: (name: string) => void;
  label?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const picked = brokers.find((b) => b.id === value);

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const t = norm(q);
  const matches = t ? brokers.filter((b) => b.active).filter((b) => matchesPerson(b, q)).slice(0, 8) : [];

  if (picked)
    return (
      <div className="field">
        <span>{label}</span>
        <div className="broker-picked">
          <span>
            <strong>{picked.name}</strong>
            <small dir="ltr">{picked.phone}</small>
          </span>
          <button type="button" className="icon-button" aria-label="شيل الوسيط" onClick={() => onChange("")}>
            <X size={16} />
          </button>
        </div>
      </div>
    );

  return (
    <div className="field broker-search" ref={box}>
      <span>{label}</span>
      <div style={{ position: "relative" }}>
        <Search size={16} className="broker-search-icon" />
        <input
          value={q}
          placeholder="اكتب اسم الوسيط أو رقمه"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (matches[0]) onChange(matches[0].id);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          role="combobox"
          aria-expanded={open && !!t}
          aria-autocomplete="list"
        />
        {open && t && (
          <div className="search-results broker-results" role="listbox">
            {matches.map((b) => (
              <button type="button" role="option" aria-selected={false} key={b.id} onClick={() => onChange(b.id)}>
                <span>
                  <strong>{b.name}</strong>
                  <small dir="ltr">{b.phone}</small>
                </span>
              </button>
            ))}
            {!matches.length && <p>مفيش وسيط بالاسم ده.</p>}
            {onCreate && (
              <button type="button" className="broker-new" onClick={() => onCreate(q.trim())}>
                <span>
                  <strong>
                    <UserPlus size={14} /> إضافة «{q.trim()}» كوسيط جديد
                  </strong>
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

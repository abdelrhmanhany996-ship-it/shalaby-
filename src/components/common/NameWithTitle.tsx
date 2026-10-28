import { useEffect, useRef, useState } from "react";
import { customerTitles, splitTitle, withTitle } from "../../lib/names";

interface Props {
  value: string; // the full name, title included ("م. أحمد")
  onChange: (full: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  fieldName?: string;
}

const OTHER = "__other";
const isKnown = (t: string) => (customerTitles as readonly string[]).includes(t);

/** A name box with the customer's preferred title next to it; the title is stored as part of the name. */
export function NameWithTitle({ value, onChange, label = "اسم العميل", required, placeholder = "الاسم اللي هنناديه بيه", fieldName = "customerName" }: Props) {
  const first = splitTitle(value);
  const [title, setTitle] = useState(first.title);
  const [name, setName] = useState(first.name);
  const [custom, setCustom] = useState(!!first.title && !isKnown(first.title));
  // What we last sent up, so our own edits are never mistaken for a different customer being loaded.
  const sent = useRef(value);

  useEffect(() => {
    if (value === sent.current) return;
    sent.current = value;
    const s = splitTitle(value);
    setTitle(s.title);
    setName(s.name);
    setCustom(!!s.title && !isKnown(s.title));
  }, [value]);

  const emit = (t: string, n: string) => {
    const full = withTitle(t, n) || (t ? "" : n);
    sent.current = full;
    onChange(full);
  };

  return (
    <div className="field">
      <span>
        {label} {required && <em>مطلوب</em>}
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <select
          aria-label="اللقب"
          style={{ width: 118, flexShrink: 0 }}
          value={custom ? OTHER : title}
          onChange={(e) => {
            if (e.target.value === OTHER) {
              setCustom(true);
              setTitle("");
              emit("", name);
            } else {
              setCustom(false);
              setTitle(e.target.value);
              emit(e.target.value, name);
            }
          }}
        >
          <option value="">بدون لقب</option>
          {customerTitles.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          <option value={OTHER}>لقب آخر…</option>
        </select>
        {custom && (
          <input
            aria-label="اللقب"
            style={{ width: 96, flexShrink: 0 }}
            placeholder="اللقب"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              emit(e.target.value, name);
            }}
          />
        )}
        <input
          name={fieldName}
          autoComplete="off"
          required={required}
          placeholder={placeholder}
          style={{ flex: 1, minWidth: 0 }}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            emit(title, e.target.value);
          }}
        />
      </div>
    </div>
  );
}

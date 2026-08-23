import { useMemo, useRef, useState } from "react";

// A combobox for picking your character. Autocompletes existing raiders but also
// accepts a brand-new name (someone with no points/SRs yet).
export default function IdentityPicker({ players, onPick, autoFocus, placeholder }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);

  const term = q.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!term) return players.slice(0, 8);
    const starts = [];
    const contains = [];
    for (const p of players) {
      const n = p.name.toLowerCase();
      if (n.startsWith(term)) starts.push(p);
      else if (n.includes(term)) contains.push(p);
      if (starts.length >= 8) break;
    }
    return [...starts, ...contains].slice(0, 8);
  }, [players, term]);

  const exact = term && players.some((p) => p.name.toLowerCase() === term);
  // Offer "use exactly what I typed" for a new raider not already listed.
  const options = [
    ...matches.map((p) => ({ name: p.name, meta: `${p.totalPoints} pts`, isNew: false })),
    ...(q.trim() && !exact
      ? [{ name: q.trim(), meta: "new raider — no points yet", isNew: true }]
      : []),
  ];

  const commit = (name) => {
    if (!name) return;
    onPick(name);
    setQ("");
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) setOpen(true);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(options[active]?.name || q.trim());
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="idpicker" ref={boxRef} onBlur={() => setTimeout(() => setOpen(false), 120)}>
      <input
        className="search"
        autoFocus={autoFocus}
        placeholder={placeholder || "Type your character name…"}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && options.length > 0 && (
        <div className="idpicker-drop">
          {options.map((o, i) => (
            <button
              key={o.name + (o.isNew ? "-new" : "")}
              className={`idpicker-item${i === active ? " active" : ""}${o.isNew ? " new" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => commit(o.name)}
            >
              <span className="idpicker-name">
                {o.isNew && <span className="idpicker-plus">+ </span>}
                {o.name}
              </span>
              <span className="muted small">{o.meta}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

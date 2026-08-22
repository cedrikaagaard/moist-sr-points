import { useEffect, useRef } from "react";
import { RAID_META, wowheadUrl } from "../data.js";
import { href } from "../router.js";

// A Wowhead item link. The global tooltips.js script (loaded in index.html)
// decorates these with an icon + hover tooltip. Because we render links
// dynamically, we nudge it to re-scan on mount.
export function WowheadLink({ id, name, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.$WowheadPower && ref.current) {
      try {
        window.$WowheadPower.refreshLinks();
      } catch {
        /* tooltip decoration is best-effort */
      }
    }
  }, [id, name]);

  if (!id) return <span className={className}>{name}</span>;
  return (
    <a
      ref={ref}
      className={className}
      href={wowheadUrl(id)}
      target="_blank"
      rel="noreferrer"
      data-wowhead={`item=${id}&domain=classic`}
    >
      {name}
    </a>
  );
}

export function RaidBadge({ raid, size = "md", onClick, active }) {
  const meta = RAID_META[raid];
  return (
    <span
      className={`raid-badge raid-${raid.toLowerCase()} raid-${size}${active ? " active" : ""}${onClick ? " clickable" : ""}`}
      onClick={onClick}
      style={{ "--badge-color": meta?.color }}
    >
      {meta?.short || raid}
    </span>
  );
}

export function StatTile({ label, value, sub, accent }) {
  return (
    <div className="stat-tile">
      <div className="stat-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function PlayerLink({ name, className }) {
  return (
    <a className={`player-link ${className || ""}`} href={href("players", name)}>
      {name}
    </a>
  );
}

// Horizontal bar chart. Each bar is direct-labeled, so the raid colors need
// no legend box. rows: [{label, value, color, raid}]
export function BarChart({ rows, max, format = (v) => v }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="barchart">
      {rows.map((r) => (
        <div className="barchart-row" key={r.label}>
          <div className="barchart-label">{r.label}</div>
          <div className="barchart-track">
            <div
              className="barchart-fill"
              style={{ width: `${(r.value / top) * 100}%`, background: r.color }}
            />
          </div>
          <div className="barchart-value">{format(r.value)}</div>
        </div>
      ))}
    </div>
  );
}

export function Rank({ n }) {
  const medal = n === 1 ? "gold" : n === 2 ? "silver" : n === 3 ? "bronze" : null;
  return <span className={`rank${medal ? " rank-" + medal : ""}`}>{n}</span>;
}

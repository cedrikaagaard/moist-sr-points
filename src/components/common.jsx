import { useEffect } from "react";
import { RAID_META, wowheadUrl } from "../data.js";
import { href, navigate } from "../router.js";

// The Wowhead tooltip script decorates links with icons/tooltips, but for
// dynamically rendered links you have to call refreshLinks(). That scans the
// whole document, so calling it once per link (130+ on the Points page) is what
// makes typing lag. Instead every link schedules a SINGLE coalesced refresh.
let refreshTimer = null;
function scheduleWowheadRefresh() {
  if (refreshTimer) return;
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    try {
      window.$WowheadPower?.refreshLinks();
    } catch {
      /* tooltip decoration is best-effort */
    }
  }, 250);
}

// A Wowhead item link (icon + hover tooltip via the global tooltips.js script).
// The href is the real Wowhead URL (so the icon, tooltip and quality colour all
// work), but a normal left click goes to our internal item page instead;
// ctrl/cmd/middle click still opens Wowhead in a new tab. Pass `external` to
// always open Wowhead (used on the item page itself).
export function WowheadLink({ id, name, className, external }) {
  useEffect(() => {
    if (id) scheduleWowheadRefresh();
  }, [id]);

  if (!id) return <span className={className}>{name}</span>;

  const common = {
    className,
    href: wowheadUrl(id),
    "data-wowhead": `item=${id}&domain=classic`,
  };
  if (external) {
    return <a {...common} target="_blank" rel="noreferrer">{name}</a>;
  }
  const onClick = (e) => {
    // Let modified / non-left clicks fall through to Wowhead.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate("item", id);
  };
  return <a {...common} onClick={onClick}>{name}</a>;
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

// The GitHub "mark" (Octocat) logo, inline so it inherits currentColor.
export function GitHubIcon({ size = 16, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

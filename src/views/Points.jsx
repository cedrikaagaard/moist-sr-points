import { useMemo, useState } from "react";
import { RAID_ORDER, RAID_META } from "../data.js";
import { WowheadLink, RaidBadge, Rank, PlayerLink } from "../components/common.jsx";
import { navigate } from "../router.js";

export default function Points({ data, raid }) {
  const activeRaid = RAID_ORDER.includes(raid) ? raid : "MC";
  const [query, setQuery] = useState("");
  const meta = RAID_META[activeRaid];
  const items = data.pointsByRaid[activeRaid] || [];

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return items.map((it) => ({ ...it, matchOnly: false }));
    return items
      .map((it) => {
        const itemMatch = it.item.toLowerCase().includes(q);
        const entries = it.entries.filter((e) => e.character.toLowerCase().includes(q));
        return { ...it, entries: itemMatch ? it.entries : entries, matchOnly: !itemMatch };
      })
      .filter((it) => it.entries.length > 0);
  }, [items, q]);

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <h1>Points by item</h1>
          <p className="muted">
            Each SR here is worth <strong>{meta.srValue} points</strong>. Winner = highest{" "}
            <em>roll + points</em>, but only among raiders who reserved the item.
          </p>
        </div>
        <input
          className="search"
          placeholder="Filter items or players…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="segmented">
        {RAID_ORDER.map((r) => (
          <button
            key={r}
            className={`segmented-btn${r === activeRaid ? " active" : ""}`}
            style={{ "--seg-color": RAID_META[r].color }}
            onClick={() => navigate("points", r)}
          >
            <span className="seg-dot" style={{ background: RAID_META[r].color }} />
            {RAID_META[r].short}
            <span className="seg-count">{(data.pointsByRaid[r] || []).length}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && <div className="empty">No items or players match “{query}”.</div>}

      <div className="item-grid">
        {filtered.map((it) => (
          <ItemCard key={it.item} item={it} highlight={q && it.matchOnly ? q : null} />
        ))}
      </div>
    </div>
  );
}

function ItemCard({ item, highlight }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? item.entries : item.entries.slice(0, 8);
  const top = item.entries[0]?.points || 1;

  return (
    <div className="item-card">
      <div className="item-card-head">
        <RaidBadge raid={item.raid} size="sm" />
        <WowheadLink id={item.itemId} name={item.item} className="item-title" />
        <span className="item-count">{item.entries.length} reserved</span>
      </div>
      <ul className="point-list">
        {shown.map((e, i) => (
          <li key={e.character + i} className={highlight && e.character.toLowerCase().includes(highlight) ? "hit" : ""}>
            <Rank n={i + 1} />
            <PlayerLink name={e.character} className="point-name" />
            <div className="point-bar-track">
              <div className="point-bar-fill" style={{ width: `${(e.points / top) * 100}%` }} />
            </div>
            <span className="point-value">{e.points}</span>
          </li>
        ))}
      </ul>
      {item.entries.length > 8 && (
        <button className="link-btn" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : `Show all ${item.entries.length}`}
        </button>
      )}
    </div>
  );
}

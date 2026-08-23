import { useMemo, useState } from "react";
import { RAID_ORDER, RAID_META } from "../data.js";
import { WowheadLink, RaidBadge, Rank, PlayerLink } from "../components/common.jsx";
import { navigate } from "../router.js";
import { useMe, makeIsMe } from "../identity.js";
import { useDebouncedValue } from "../lib/useDebouncedValue.js";

export default function Points({ data, raid }) {
  const isMe = makeIsMe(useMe());
  // Default view is "all" raids — most people just want to find their own item.
  const activeRaid = RAID_ORDER.includes(raid) ? raid : "all";
  const [query, setQuery] = useState("");
  const meta = RAID_META[activeRaid];
  const items =
    activeRaid === "all"
      ? RAID_ORDER.flatMap((r) => data.pointsByRaid[r] || [])
      : data.pointsByRaid[activeRaid] || [];

  const q = useDebouncedValue(query.trim().toLowerCase());
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

  const tabs = ["all", ...RAID_ORDER];

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <h1>Points by item</h1>
          <p className="muted">
            {activeRaid === "all" ? (
              <>
                Each soft-reserve is worth <strong>10 points</strong> — except{" "}
                <strong>Naxxramas</strong>, where it's <strong>5</strong>.
              </>
            ) : (
              <>
                Each SR in {meta.name} is worth <strong>{meta.srValue} points</strong>.
              </>
            )}{" "}
            Winner = highest <em>roll + points</em>, among raiders who reserved the item.
          </p>
        </div>
        <input
          className="search"
          placeholder="Search your name or an item…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="segmented">
        {tabs.map((r) => {
          const isAll = r === "all";
          const color = isAll ? "var(--gold)" : RAID_META[r].color;
          const count = isAll
            ? RAID_ORDER.reduce((n, x) => n + (data.pointsByRaid[x] || []).length, 0)
            : (data.pointsByRaid[r] || []).length;
          return (
            <button
              key={r}
              className={`segmented-btn${r === activeRaid ? " active" : ""}`}
              style={{ "--seg-color": color }}
              onClick={() => navigate("points", r)}
            >
              <span className="seg-dot" style={{ background: color }} />
              {isAll ? "All" : RAID_META[r].short}
              <span className="seg-count">{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && <div className="empty">No items or players match “{query}”.</div>}

      <div className="item-grid">
        {filtered.map((it) => (
          <ItemCard key={it.item} item={it} highlight={q && it.matchOnly ? q : null} isMe={isMe} />
        ))}
      </div>
    </div>
  );
}

function ItemCard({ item, highlight, isMe }) {
  const [expanded, setExpanded] = useState(false);
  const top = item.entries[0]?.points || 1;

  // Show the top 8, but if "you" are further down, pin your row so you always
  // see where you stand on the item.
  const myIndex = item.entries.findIndex((e) => isMe(e.character));
  const shown = expanded ? item.entries : item.entries.slice(0, 8);
  const showPinned = !expanded && myIndex >= 8;

  const Row = (e, i) => (
    <li
      key={e.character + i}
      className={`${highlight && e.character.toLowerCase().includes(highlight) ? "hit " : ""}${isMe(e.character) ? "me" : ""}`}
    >
      <Rank n={i + 1} />
      <PlayerLink name={e.character} className="point-name" />
      {isMe(e.character) && <span className="you-tag">you</span>}
      <div className="point-bar-track">
        <div className="point-bar-fill" style={{ width: `${(e.points / top) * 100}%` }} />
      </div>
      <span className="point-value">{e.points}</span>
    </li>
  );

  return (
    <div className="item-card">
      <div className="item-card-head">
        <RaidBadge raid={item.raid} size="sm" />
        <WowheadLink id={item.itemId} name={item.item} className="item-title" />
        <span className="item-count">{item.entries.length} reserved</span>
      </div>
      <ul className="point-list">
        {shown.map((e, i) => Row(e, i))}
        {showPinned && (
          <>
            <li className="point-ellipsis">⋯</li>
            {Row(item.entries[myIndex], myIndex)}
          </>
        )}
      </ul>
      {item.entries.length > 8 && (
        <button className="link-btn" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : `Show all ${item.entries.length}`}
        </button>
      )}
    </div>
  );
}

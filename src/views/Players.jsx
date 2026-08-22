import { useMemo, useState } from "react";
import { RAID_ORDER, RAID_META } from "../data.js";
import { WowheadLink, RaidBadge, StatTile } from "../components/common.jsx";
import { navigate, href } from "../router.js";

export default function Players({ data, name }) {
  if (name) {
    const player = data.playerByName.get(name.toLowerCase());
    if (player) return <PlayerProfile data={data} player={player} />;
  }
  return <PlayerDirectory data={data} initial={name || ""} />;
}

function PlayerDirectory({ data, initial }) {
  const [query, setQuery] = useState(initial);
  const q = query.trim().toLowerCase();
  const list = useMemo(() => {
    const base = q ? data.players.filter((p) => p.name.toLowerCase().includes(q)) : data.players;
    return base.slice(0, 120);
  }, [data.players, q]);

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <h1>Raiders</h1>
          <p className="muted">{data.players.length} tracked · sorted by total points</p>
        </div>
        <input
          className="search"
          autoFocus
          placeholder="Search a raider…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="player-grid">
        {list.map((p) => (
          <a key={p.name} className="player-card" href={href("players", p.name)}>
            <div className="player-card-top">
              <span className="player-avatar">{p.name.slice(0, 2).toUpperCase()}</span>
              <div>
                <div className="player-card-name">{p.name}</div>
                <div className="player-card-raids">
                  {p.raids.map((r) => (
                    <RaidBadge key={r} raid={r} size="xs" />
                  ))}
                </div>
              </div>
            </div>
            <div className="player-card-stats">
              <span>
                <strong>{p.totalPoints.toLocaleString()}</strong> pts
              </span>
              <span>
                <strong>{p.srCount}</strong> SR
              </span>
              <span>
                <strong>{p.points.length}</strong> items
              </span>
            </div>
          </a>
        ))}
      </div>
      {q && list.length === 0 && <div className="empty">No raider matches “{query}”.</div>}
    </div>
  );
}

function PlayerProfile({ data, player }) {
  // Group point holdings by raid.
  const byRaid = {};
  for (const r of RAID_ORDER) byRaid[r] = [];
  for (const p of player.points) byRaid[p.raid].push(p);

  // SR counts per item for this player (from history).
  const srPerItem = new Map();
  for (const h of player.history) {
    srPerItem.set(h.item, (srPerItem.get(h.item) || 0) + h.quantity);
  }

  return (
    <div className="view">
      <button className="back-btn" onClick={() => navigate("players")}>
        ← All raiders
      </button>

      <div className="profile-head">
        <span className="player-avatar lg">{player.name.slice(0, 2).toUpperCase()}</span>
        <div>
          <h1>{player.name}</h1>
          <div className="player-card-raids">
            {player.raids.map((r) => (
              <RaidBadge key={r} raid={r} size="sm" />
            ))}
          </div>
        </div>
      </div>

      <div className="stat-row">
        <StatTile label="Total points" value={player.totalPoints.toLocaleString()} accent="var(--gold)" />
        <StatTile label="Soft-reserves" value={player.srCount} />
        <StatTile label="Items with points" value={player.points.length} />
        <StatTile label="SR records" value={player.history.length} />
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Points by item</h2>
            <span className="muted">across all raids</span>
          </div>
          {RAID_ORDER.filter((r) => byRaid[r].length).map((r) => (
            <div key={r} className="profile-raid-group">
              <div className="profile-raid-label">
                <RaidBadge raid={r} size="sm" /> {RAID_META[r].name}
              </div>
              <ul className="profile-item-list">
                {byRaid[r].map((p) => (
                  <li key={p.item}>
                    <WowheadLink id={p.itemId} name={p.item} className="item-name" />
                    <span className="muted small">
                      {srPerItem.get(p.item) ? `${srPerItem.get(p.item)} SR` : ""}
                    </span>
                    <span className="point-pill">{p.points}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {player.points.length === 0 && <div className="empty">No accumulated points yet.</div>}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>SR history</h2>
            <span className="muted">{player.history.length} records</span>
          </div>
          <ul className="timeline">
            {player.history.map((h, i) => (
              <li key={i}>
                <span className="timeline-date">{h.date}</span>
                <RaidBadge raid={h.raid} size="xs" />
                <WowheadLink id={h.itemId} name={h.item} className="item-name" />
                {h.quantity > 1 && <span className="qty-pill">×{h.quantity}</span>}
              </li>
            ))}
          </ul>
          {player.history.length === 0 && <div className="empty">No SR history recorded.</div>}
        </section>
      </div>
    </div>
  );
}

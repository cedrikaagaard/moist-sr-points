import { useMemo, useState } from "react";
import { RaidBadge } from "../components/common.jsx";
import ProfileBody from "../components/ProfileBody.jsx";
import { navigate, href } from "../router.js";
import { useDebouncedValue } from "../lib/useDebouncedValue.js";

export default function Players({ data, name }) {
  if (name) {
    const player = data.playerByName.get(name.toLowerCase());
    if (player) return <PlayerProfile data={data} player={player} />;
  }
  return <PlayerDirectory data={data} initial={name || ""} />;
}

function PlayerDirectory({ data, initial }) {
  const [query, setQuery] = useState(initial);
  const q = useDebouncedValue(query.trim().toLowerCase());
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

      <ProfileBody data={data} player={player} />
    </div>
  );
}

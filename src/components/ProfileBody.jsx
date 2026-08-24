import { useMemo } from "react";
import { RAID_ORDER, RAID_META } from "../data.js";
import { WowheadLink, RaidBadge, StatTile } from "./common.jsx";
import { winChances } from "../lib/odds.js";

// The shared body of a raider page: stats, win-odds "best bets", points by item,
// and SR history. Used by the Raiders profile and by "My Page".
export default function ProfileBody({ data, player }) {
  // Points grouped by raid.
  const byRaid = {};
  for (const r of RAID_ORDER) byRaid[r] = [];
  for (const p of player.points) byRaid[p.raid].push(p);

  // SR counts per item (from this player's history).
  const srPerItem = new Map();
  for (const h of player.history) {
    srPerItem.set(h.item, (srPerItem.get(h.item) || 0) + h.quantity);
  }

  // Win-the-roll odds for each item this player has points on.
  const bets = useMemo(() => {
    return player.points
      .map((p) => {
        const item = data.itemByKey.get(`${p.raid}|${p.itemId}`);
        const field = item ? item.entries.map((e) => e.points) : [p.points];
        const idx = item ? item.entries.findIndex((e) => e.character === player.name) : 0;
        const chances = winChances(field);
        return {
          ...p,
          contenders: field.length,
          rank: idx + 1,
          winPct: chances[idx] ?? 0,
        };
      })
      .sort((a, b) => b.winPct - a.winPct);
  }, [player, data.itemByKey]);

  const topBets = bets.slice(0, 6);

  return (
    <>
      <div className="stat-row">
        <StatTile label="Total points" value={player.totalPoints.toLocaleString()} accent="var(--gold)" />
        <StatTile label="Items won" value={player.wins ?? 0} />
        <StatTile label="Soft-reserves" value={player.srCount} />
        <StatTile label="Achievements" value={player.achievements?.length ?? 0} />
      </div>

      {player.achievements?.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Achievements</h2>
            <span className="muted">{player.achievements.length} earned</span>
          </div>
          <div className="ach-grid">
            {player.achievements.map((a) => (
              <div key={a.id} className={`ach ach-${a.rarity}`} title={a.desc}>
                <span className="ach-emoji">{a.emoji}</span>
                <div className="ach-text">
                  <div className="ach-name">{a.name}</div>
                  <div className="ach-desc muted small">{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {topBets.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Best bets</h2>
            <span className="muted">chance to win the roll</span>
          </div>
          <ul className="bets">
            {topBets.map((b) => (
              <li key={`${b.raid}-${b.itemId}`}>
                <RaidBadge raid={b.raid} size="xs" />
                <WowheadLink id={b.itemId} name={b.item} className="item-name bets-item" />
                <span className="bets-rank">
                  #{b.rank}
                  <span className="muted"> / {b.contenders}</span>
                </span>
                <div className="bets-bar-track">
                  <div className="bets-bar-fill" style={{ width: `${Math.round(b.winPct * 100)}%` }} />
                </div>
                <span className="bets-pct">{formatPct(b.winPct)}</span>
              </li>
            ))}
          </ul>
          <p className="bets-note muted small">
            Odds assume <strong>everyone with points</strong> reserves and rolls. In a real raid
            fewer show up, so your true chances are usually better, and anyone can SR and win on a
            pure roll. Think of these as worst-case.
          </p>
        </section>
      )}

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
    </>
  );
}

function formatPct(x) {
  if (x >= 0.995) return "~100%";
  if (x < 0.005) return "<1%";
  return `${Math.round(x * 100)}%`;
}

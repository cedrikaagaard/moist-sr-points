import { RAID_META, wowheadUrl } from "../data.js";
import { WowheadLink, RaidBadge, Rank, PlayerLink, StatTile } from "../components/common.jsx";
import { winChances } from "../lib/odds.js";
import { DROP_RATES } from "../data/dropRates.js";
import { useMe, makeIsMe } from "../identity.js";
import { navigate } from "../router.js";

export default function Item({ data, id }) {
  const isMe = makeIsMe(useMe());
  const itemId = Number(id);
  const item = data.itemsById.get(itemId);

  if (!item) {
    return (
      <div className="view">
        <button className="back-btn" onClick={() => navigate("points")}>← Points</button>
        <div className="empty">Item not found.</div>
      </div>
    );
  }

  const meta = RAID_META[item.raid];
  const entries = item.entries; // current point holders, sorted desc
  const chances = winChances(entries.map((e) => e.points));
  const top = entries[0]?.points || 1;

  const winners = data.wins.filter((w) => w.itemId === itemId); // date desc
  const srs = data.srHistory.filter((h) => h.itemId === itemId);
  const srCount = srs.reduce((a, h) => a + h.quantity, 0);

  const rate = DROP_RATES[itemId];
  const clears = data.clears[item.raid] || 0;
  const expected = rate != null ? clears * rate : null;

  return (
    <div className="view">
      <button className="back-btn" onClick={() => navigate("points", item.raid)}>
        ← {meta.name} points
      </button>

      <div className="item-page-head">
        <div>
          <div className="item-page-eyebrow">
            <RaidBadge raid={item.raid} size="sm" /> {meta.name}
          </div>
          <h1>
            <WowheadLink id={itemId} name={item.item} className="item-page-title" external />
          </h1>
        </div>
        <div className="item-page-links">
          <button
            className="ext-link"
            onClick={() => window.open(wowheadUrl(itemId), "_blank", "noopener")}
          >
            View on Wowhead ↗
          </button>
          <button className="ext-link ghost" onClick={() => navigate("points", item.raid)}>
            All {meta.short} points →
          </button>
        </div>
      </div>

      <div className="stat-row">
        <StatTile label="Current holders" value={entries.length} />
        <StatTile label="Total soft-reserves" value={srCount} />
        <StatTile label="Times won" value={winners.length} />
        <StatTile
          label="Drop rate"
          value={rate != null ? `${Math.round(rate * 100)}%` : "?"}
          sub={rate != null ? `~${expected.toFixed(1)} expected in ${clears} clears` : "add in dropRates.js"}
        />
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Standings</h2>
            <span className="muted">points · chance to win the roll</span>
          </div>
          {entries.length === 0 && <div className="empty">Nobody has points on this item yet.</div>}
          <ul className="point-list">
            {entries.map((e, i) => (
              <li key={e.character} className={isMe(e.character) ? "me" : ""}>
                <Rank n={i + 1} />
                <PlayerLink name={e.character} className="point-name" />
                {isMe(e.character) && <span className="you-tag">you</span>}
                <div className="point-bar-track">
                  <div className="point-bar-fill" style={{ width: `${(e.points / top) * 100}%` }} />
                </div>
                <span className="point-value">{e.points}</span>
                <span className="item-odds">{formatPct(chances[i] ?? 0)}</span>
              </li>
            ))}
          </ul>
          {entries.length > 0 && (
            <p className="bets-note muted small">
              Win chance assumes everyone with points reserves and rolls. Fewer usually show up, so
              real odds are better, and a 0-point SR can still win on the roll.
            </p>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Past winners</h2>
            <span className="muted">{winners.length} awarded</span>
          </div>
          <ul className="timeline">
            {winners.map((w, i) => (
              <li key={i} className={isMe(w.character) ? "me" : ""}>
                <span className="timeline-date">{w.date || "-"}</span>
                <PlayerLink name={w.character} className="loot-winner" />
                {isMe(w.character) && <span className="you-tag">you</span>}
              </li>
            ))}
          </ul>
          {winners.length === 0 && <div className="empty">Not awarded yet.</div>}
        </section>
      </div>
    </div>
  );
}

function formatPct(x) {
  if (x >= 0.995) return "~100%";
  if (x < 0.005) return "<1%";
  return `${Math.round(x * 100)}%`;
}

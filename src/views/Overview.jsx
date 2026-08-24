import { RAID_ORDER, RAID_META } from "../data.js";
import { StatTile, BarChart, WowheadLink, RaidBadge, PlayerLink, Rank } from "../components/common.jsx";
import { navigate } from "../router.js";
import { useMe, makeIsMe } from "../identity.js";

export default function Overview({ data }) {
  const isMe = makeIsMe(useMe());
  const { stats, contested, activity, players } = data;
  const raidRows = RAID_ORDER.map((r) => ({
    label: RAID_META[r].name,
    value: stats.srByRaid[r],
    color: RAID_META[r].color,
  }));
  const peakWeek = Math.max(1, ...activity.map((a) => a.srs));

  return (
    <div className="view">
      <section className="hero">
        <h1>
          <span className="hero-accent">Moist</span> soft-reserve points
        </h1>
        <p className="hero-sub">
          Accumulative SR tracking across Molten Core, Blackwing Lair, AQ40 and Naxxramas.
          Every soft-reserve earns points toward the roll. Miss the drop, keep the points.
        </p>
      </section>

      <div className="stat-row">
        <StatTile label="Raiders tracked" value={stats.playerCount} />
        <StatTile label="Soft-reserves placed" value={stats.srCount.toLocaleString()} />
        <StatTile label="BiS items with points" value={stats.itemCount} />
        <StatTile
          label="Data window"
          value={`${monthsBetween(stats.firstDate, stats.lastDate)} mo`}
          sub={`${stats.firstDate} → ${stats.lastDate}`}
        />
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Soft-reserves by raid</h2>
            <span className="muted">Naxx SRs are worth 5 pts, the rest 10</span>
          </div>
          <BarChart rows={raidRows} format={(v) => v.toLocaleString()} />
          <div className="raid-legend">
            {RAID_ORDER.map((r) => (
              <button key={r} className="raid-legend-item" onClick={() => navigate("points", r)}>
                <RaidBadge raid={r} size="sm" /> {RAID_META[r].name} →
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>SR activity</h2>
            <span className="muted">per week</span>
          </div>
          <Sparkline data={activity} peak={peakWeek} />
        </section>
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Most contested items</h2>
            <span className="muted">by total SRs</span>
          </div>
          <ol className="ranked-list">
            {contested.slice(0, 10).map((c, i) => (
              <li key={c.item}>
                <Rank n={i + 1} />
                <RaidBadge raid={c.raid} size="sm" />
                <WowheadLink id={c.itemId} name={c.item} className="item-name" />
                <span className="ranked-metric">
                  {c.srs} SR<span className="muted"> · {c.players} raiders</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Point leaders</h2>
            <span className="muted">total accumulated points</span>
          </div>
          <ol className="ranked-list">
            {players.slice(0, 10).map((p, i) => (
              <li key={p.name} className={isMe(p.name) ? "me" : ""}>
                <Rank n={i + 1} />
                <PlayerLink name={p.name} className="item-name" />
                {isMe(p.name) && <span className="you-tag">you</span>}
                <span className="ranked-metric">
                  {p.totalPoints.toLocaleString()} pts
                  <span className="muted"> · {p.srCount} SR</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <HallOfFame superlatives={data.superlatives} isMe={isMe} />

      <GuildLuck luck={data.luck} />

      <section className="panel">
        <div className="panel-head">
          <h2>Recent loot</h2>
          <span className="muted">items awarded</span>
        </div>
        <ul className="loot-feed">
          {data.lootFeed.slice(0, 16).map((w, i) => (
            <li key={i} className={isMe(w.character) ? "me" : ""}>
              <span className="loot-date">{w.date}</span>
              <RaidBadge raid={w.raid} size="xs" />
              <WowheadLink id={w.itemId} name={w.item} className="item-name loot-item" />
              <span className="loot-arrow">→</span>
              <PlayerLink name={w.character} className="loot-winner" />
              {isMe(w.character) && <span className="you-tag">you</span>}
            </li>
          ))}
        </ul>
        {data.lootFeed.length === 0 && <div className="empty">No loot recorded yet.</div>}
      </section>
    </div>
  );
}

function GuildLuck({ luck }) {
  if (!luck || luck.coverage.withRates === 0) {
    return (
      <section className="panel">
        <div className="panel-head">
          <h2>Guild luck</h2>
          <span className="muted">drops vs. expected</span>
        </div>
        <div className="empty luck-empty">
          <p>
            <strong>Add drop rates to unlock this.</strong>
          </p>
          <p className="muted">
            Fill in <code>src/data/dropRates.js</code>. Every tracked item is already listed; you
            just add each item's drop chance. As you do, this panel shows whether the guild has been
            lucky or unlucky with drops (actual vs. expected). {luck?.coverage.total} items are ready
            to fill in.
          </p>
        </div>
      </section>
    );
  }

  const o = luck.overall;
  const pct = Math.round(o.index * 100);
  const verdict = pct >= 108 ? "lucky" : pct <= 92 ? "unlucky" : "about average";
  const tone = pct >= 108 ? "good" : pct <= 92 ? "bad" : "neutral";

  const List = ({ title, items }) => (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <span className="muted">got / expected</span>
      </div>
      <ol className="ranked-list">
        {items.map((it) => (
          <li key={it.itemId}>
            <RaidBadge raid={it.raid} size="sm" />
            <WowheadLink id={it.itemId} name={it.item} className="item-name" />
            <span className="ranked-metric">
              {it.actual} / {it.expected.toFixed(1)}
              <span className="muted"> · {Math.round(it.index * 100)}%</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>Guild luck</h2>
          <span className="muted">
            based on {luck.coverage.withRates} of {luck.coverage.total} items · drop rates are
            approximate
          </span>
        </div>
        <div className="luck-hero">
          <div className={`luck-index luck-${tone}`}>{pct}%</div>
          <div className="luck-text">
            The guild has seen <strong>{o.actual}</strong> of ~
            <strong>{Math.round(o.expected)}</strong> expected drops, <strong>{verdict}</strong>.
          </div>
        </div>
      </section>
      <div className="grid-2">
        <List title="Luckiest drops" items={luck.luckiest} />
        <List title="Unluckiest drops" items={luck.unluckiest} />
      </div>
    </>
  );
}

function HallOfFame({ superlatives: s, isMe }) {
  const awards = [
    { key: "mostWins", emoji: "🏆", title: "Loot goblin", sub: "most items won" },
    { key: "luckiest", emoji: "🍀", title: "Luckiest", sub: "best wins-per-SR" },
    { key: "unluckiest", emoji: "🐍", title: "Unluckiest", sub: "worst wins-per-SR" },
    { key: "biggestStockpile", emoji: "💰", title: "Biggest stockpile", sub: "most points banked" },
    { key: "mostSRs", emoji: "🎯", title: "Most dedicated", sub: "most soft-reserves" },
    { key: "mostContested", emoji: "⚔️", title: "Most contested", sub: "most-fought-over item" },
  ];
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Hall of fame</h2>
        <span className="muted">guild superlatives · luck = wins vs SRs</span>
      </div>
      <div className="hof-grid">
        {awards.map((a) => {
          const v = s[a.key];
          if (!v) return null;
          const mine = v.name && isMe(v.name);
          return (
            <div key={a.key} className={`hof-card${mine ? " me" : ""}`}>
              <div className="hof-emoji">{a.emoji}</div>
              <div className="hof-title">{a.title}</div>
              <div className="hof-name">
                {v.itemId ? (
                  <WowheadLink id={v.itemId} name={v.name} className="item-name" />
                ) : (
                  <PlayerLink name={v.name} className="item-name" />
                )}
                {mine && <span className="you-tag">you</span>}
              </div>
              <div className="hof-value muted">{v.value}</div>
              <div className="hof-sub muted small">{a.sub}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Sparkline({ data, peak }) {
  const w = 100;
  const h = 34;
  const n = data.length;
  const pts = data.map((d, i) => {
    const x = n === 1 ? 0 : (i / (n - 1)) * w;
    const y = h - (d.srs / peak) * (h - 4) - 2;
    return [x, y];
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const totalRecent = data.slice(-4).reduce((a, d) => a + d.srs, 0);
  return (
    <div>
      <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path d={area} className="spark-area" />
        <path d={line} className="spark-line" />
      </svg>
      <div className="spark-foot">
        <span>{data[0]?.week}</span>
        <span className="muted">{totalRecent} SRs in the last 4 weeks</span>
        <span>{data[data.length - 1]?.week}</span>
      </div>
    </div>
  );
}

function monthsBetween(a, b) {
  if (!a || !b) return "?";
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24 * 30)));
}

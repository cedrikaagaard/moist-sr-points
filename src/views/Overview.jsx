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
          Every soft-reserve earns points toward the roll — miss the drop, keep the points.
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
    </div>
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
  if (!a || !b) return "—";
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24 * 30)));
}

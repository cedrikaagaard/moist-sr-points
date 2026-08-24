// Data loading + derived selectors. The raw shape comes from the SQLite
// database, read in the browser - see src/lib/loadDb.js + src/lib/shapeData.js.

export const RAID_ORDER = ["MC", "BWL", "AQ40", "Naxx"];

export const RAID_META = {
  MC: { name: "Molten Core", short: "MC", srValue: 10, color: "var(--raid-mc)" },
  BWL: { name: "Blackwing Lair", short: "BWL", srValue: 10, color: "var(--raid-bwl)" },
  AQ40: { name: "Temple of Ahn'Qiraj", short: "AQ40", srValue: 10, color: "var(--raid-aq40)" },
  Naxx: { name: "Naxxramas", short: "Naxx", srValue: 5, color: "var(--raid-naxx)" },
};

import { loadFromDb } from "./lib/loadDb.js";
import { DROP_RATES } from "./data/dropRates.js";
import { evaluateAchievements } from "./lib/achievements.js";

// A cheap fingerprint of a dataset, to skip pointless re-renders when the
// background refresh returns the same data we already showed.
const sigOf = (raw) => `${raw?.dataThrough}|${raw?.srHistory?.length}|${raw?.wins?.length}`;

export async function loadData({ onProgress, onFresh } = {}) {
  // Reads the SQLite database live, in the browser (sql.js). The source is
  // chosen in src/lib/loadDb.js (override → local file → remote). For the remote
  // source it shows a cached copy immediately, then calls onFresh with the
  // latest version if a newer one exists.
  let initialSig = null;
  const handleFresh =
    onFresh &&
    ((freshRaw) => {
      if (sigOf(freshRaw) === initialSig) return; // unchanged; nothing to do
      onFresh(buildIndex(freshRaw));
    });

  const raw = await loadFromDb({ onProgress, onFresh: handleFresh });
  initialSig = sigOf(raw);
  onProgress?.("crunch");
  return buildIndex(raw);
}

// Turn the raw data into fast lookups the UI leans on.
function buildIndex(raw) {
  const { pointsByRaid, srHistory, updated, dataThrough, source, dbUpdated } = raw;
  const wins = raw.wins || [];
  const clears = raw.clears || {};

  // Flatten point entries: one row per (item, character).
  const pointRows = [];
  for (const raid of RAID_ORDER) {
    for (const item of pointsByRaid[raid] || []) {
      for (const e of item.entries) {
        pointRows.push({
          raid,
          item: item.item,
          itemId: item.itemId,
          character: e.character,
          points: e.points,
        });
      }
    }
  }

  // Per-player aggregation.
  const players = new Map();
  const ensure = (name) => {
    if (!players.has(name)) {
      players.set(name, {
        name,
        totalPoints: 0,
        srCount: 0,
        points: [], // {raid,item,itemId,points}
        history: [], // sr records
        raids: new Set(),
      });
    }
    return players.get(name);
  };

  for (const r of pointRows) {
    const p = ensure(r.character);
    p.totalPoints += r.points;
    p.points.push(r);
    p.raids.add(r.raid);
  }
  for (const h of srHistory) {
    const p = ensure(h.character);
    p.srCount += h.quantity;
    p.history.push(h);
    p.raids.add(h.raid);
  }

  // Wins per player (items actually awarded), plus their most recent win.
  const winsByPlayer = new Map();
  for (const w of wins) {
    const cur = winsByPlayer.get(w.character) || { count: 0, last: null };
    cur.count += 1;
    if (w.date && (!cur.last || w.date > cur.last)) cur.last = w.date;
    winsByPlayer.set(w.character, cur);
  }

  const playerList = [...players.values()].map((p) => ({
    ...p,
    wins: winsByPlayer.get(p.name)?.count || 0,
    lastWin: winsByPlayer.get(p.name)?.last || null,
    raids: [...p.raids].sort((a, b) => RAID_ORDER.indexOf(a) - RAID_ORDER.indexOf(b)),
    points: p.points.sort((a, b) => b.points - a.points),
    history: p.history.sort((a, b) => (a.date < b.date ? 1 : -1)),
  }));
  playerList.sort((a, b) => b.totalPoints - a.totalPoints);

  // Context for achievements: leaderboard rank, and how many items each player
  // leads (is #1 in points on).
  const rankByName = new Map(playerList.map((p, i) => [p.name, i + 1]));
  const itemsLedByName = new Map();
  for (const raid of RAID_ORDER) {
    for (const it of pointsByRaid[raid] || []) {
      const leader = it.entries[0]?.character;
      if (leader) itemsLedByName.set(leader, (itemsLedByName.get(leader) || 0) + 1);
    }
  }
  for (const p of playerList) {
    const perItem = new Map();
    for (const h of p.history) perItem.set(h.item, (perItem.get(h.item) || 0) + h.quantity);
    const d = {
      rank: rankByName.get(p.name),
      itemsLed: itemsLedByName.get(p.name) || 0,
      itemsWithPoints: p.points.length,
      maxItemSRs: perItem.size ? Math.max(...perItem.values()) : 0,
      raidsWithPoints: new Set(p.points.map((x) => x.raid)).size,
      winRate: p.srCount ? p.wins / p.srCount : 0,
    };
    const { earned, locked } = evaluateAchievements(p, d);
    p.achievements = earned;
    p.nextAchievements = locked.slice(0, 4); // closest to earning
  }

  // Most decorated raiders (by achievement count) for the Statistics page.
  const mostDecorated = [...playerList]
    .filter((p) => p.achievements.length)
    .sort((a, b) => b.achievements.length - a.achievements.length)
    .slice(0, 8);

  // SRs per raid.
  const srByRaid = Object.fromEntries(RAID_ORDER.map((r) => [r, 0]));
  for (const h of srHistory) srByRaid[h.raid] += h.quantity;

  // Most contested items = most total SRs placed (from history).
  const contestedMap = new Map();
  for (const h of srHistory) {
    const key = h.item;
    const cur = contestedMap.get(key) || { item: h.item, itemId: h.itemId, raid: h.raid, srs: 0, players: new Set() };
    cur.srs += h.quantity;
    cur.players.add(h.character);
    contestedMap.set(key, cur);
  }
  const contested = [...contestedMap.values()]
    .map((c) => ({ ...c, players: c.players.size }))
    .sort((a, b) => b.srs - a.srs);

  // SR activity per week (for the overview timeline).
  const byWeek = new Map();
  for (const h of srHistory) {
    const wk = weekStart(h.date);
    byWeek.set(wk, (byWeek.get(wk) || 0) + h.quantity);
  }
  const activity = [...byWeek.entries()]
    .map(([week, srs]) => ({ week, srs }))
    .sort((a, b) => (a.week < b.week ? -1 : 1));

  const dates = srHistory.map((h) => h.date).sort();

  // Loot feed: most recent items actually won (with a real date).
  const lootFeed = wins.filter((w) => w.date).slice(0, 40);

  // Wins per item (for future item pages / luck).
  const winsByItem = new Map();
  for (const w of wins) winsByItem.set(w.itemId, (winsByItem.get(w.itemId) || 0) + 1);

  const superlatives = computeSuperlatives(playerList, contested);

  // Item metadata (name + raid) for every tracked item, for the luck calc.
  const itemMeta = new Map();
  for (const raid of RAID_ORDER) {
    for (const it of pointsByRaid[raid] || []) itemMeta.set(it.itemId, { item: it.item, raid });
  }
  const luck = computeLuck(itemMeta, winsByItem, clears);

  return {
    updated,
    dataThrough,
    dbUpdated,
    source,
    lootFeed,
    superlatives,
    mostDecorated,
    winsByItem,
    clears,
    luck,
    pointsByRaid,
    srHistory,
    pointRows,
    players: playerList,
    playerByName: new Map(playerList.map((p) => [p.name.toLowerCase(), p])),
    // Look up an item's full contender field by "raid|itemId" (used for odds).
    itemByKey: new Map(
      RAID_ORDER.flatMap((raid) =>
        (pointsByRaid[raid] || []).map((it) => [`${raid}|${it.itemId}`, it])
      )
    ),
    stats: {
      playerCount: playerList.length,
      itemCount: Object.values(pointsByRaid).reduce((a, v) => a + v.length, 0),
      srCount: srHistory.reduce((a, h) => a + h.quantity, 0),
      recordCount: srHistory.length,
      firstDate: dates[0],
      lastDate: dates[dates.length - 1],
      srByRaid,
    },
    contested,
    activity,
  };
}

// Guild "drop luck": did items drop more or less often than their drop rate
// predicts, given how many times we've cleared each raid? Only considers items
// that have a drop rate filled in (src/data/dropRates.js).
function computeLuck(itemMeta, winsByItem, clears) {
  const items = [];
  let sumActual = 0;
  let sumExpected = 0;

  for (const [itemId, meta] of itemMeta) {
    const rate = DROP_RATES[itemId];
    if (rate == null || rate <= 0) continue;
    const raidClears = clears[meta.raid] || 0;
    if (!raidClears) continue;
    const expected = raidClears * rate;
    const actual = winsByItem.get(itemId) || 0;
    sumActual += actual;
    sumExpected += expected;
    items.push({
      itemId,
      item: meta.item,
      raid: meta.raid,
      rate,
      expected,
      actual,
      index: expected > 0 ? actual / expected : null, // >1 lucky, <1 unlucky
    });
  }

  items.sort((a, b) => b.index - a.index);
  // Only surface items with a meaningful sample (expected >= ~1 drop).
  const meaningful = items.filter((i) => i.expected >= 1);

  return {
    coverage: { withRates: items.length, total: itemMeta.size },
    overall:
      sumExpected > 0
        ? { actual: sumActual, expected: sumExpected, index: sumActual / sumExpected }
        : null,
    luckiest: meaningful.slice(0, 6),
    unluckiest: meaningful.slice(-6).reverse(),
  };
}

// "Hall of fame" - fun, defensible awards from the data we have. Luck here is
// roll-luck (wins vs how much you soft-reserve), which needs no drop rates.
function computeSuperlatives(players, contested) {
  const withSR = players.filter((p) => p.srCount >= 15); // enough SRs to be fair
  const maxBy = (arr, f) => arr.reduce((best, p) => (f(p) > f(best) ? p : best), arr[0]);
  const minBy = (arr, f) => arr.reduce((best, p) => (f(p) < f(best) ? p : best), arr[0]);
  const winRate = (p) => p.wins / p.srCount;

  const mk = (p, value) => (p ? { name: p.name, value } : null);

  return {
    mostWins: players.some((p) => p.wins)
      ? mk(maxBy(players, (p) => p.wins), `${maxBy(players, (p) => p.wins).wins} items won`)
      : null,
    mostSRs: mk(maxBy(players, (p) => p.srCount), `${maxBy(players, (p) => p.srCount).srCount} soft-reserves`),
    biggestStockpile: mk(
      players[0],
      `${players[0]?.totalPoints.toLocaleString()} points banked`
    ),
    luckiest: withSR.length
      ? mk(
          maxBy(withSR, winRate),
          `${maxBy(withSR, winRate).wins} wins / ${maxBy(withSR, winRate).srCount} SRs`
        )
      : null,
    unluckiest: withSR.length
      ? mk(
          minBy(withSR, winRate),
          `${minBy(withSR, winRate).wins} wins / ${minBy(withSR, winRate).srCount} SRs`
        )
      : null,
    mostContested: contested[0]
      ? { name: contested[0].item, itemId: contested[0].itemId, raid: contested[0].raid, value: `${contested[0].srs} SRs` }
      : null,
  };
}

function weekStart(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export function wowheadUrl(id) {
  return `https://wow.wowhead.com/classic/item=${id}`;
}

// Data loading + derived selectors. The raw shape comes from the SQLite
// database, read in the browser — see src/lib/loadDb.js + src/lib/shapeData.js.

export const RAID_ORDER = ["MC", "BWL", "AQ40", "Naxx"];

export const RAID_META = {
  MC: { name: "Molten Core", short: "MC", srValue: 10, color: "var(--raid-mc)" },
  BWL: { name: "Blackwing Lair", short: "BWL", srValue: 10, color: "var(--raid-bwl)" },
  AQ40: { name: "Temple of Ahn'Qiraj", short: "AQ40", srValue: 10, color: "var(--raid-aq40)" },
  Naxx: { name: "Naxxramas", short: "Naxx", srValue: 5, color: "var(--raid-naxx)" },
};

import { loadFromDb } from "./lib/loadDb.js";

export async function loadData() {
  // Reads the SQLite database live, in the browser (sql.js). The source is
  // chosen in src/lib/loadDb.js (override → local file → remote).
  const raw = await loadFromDb();
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

  return {
    updated,
    dataThrough,
    dbUpdated,
    source,
    lootFeed,
    superlatives,
    winsByItem,
    clears,
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

// "Hall of fame" — fun, defensible awards from the data we have. Luck here is
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

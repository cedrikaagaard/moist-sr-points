// Turns the guild SQLite database into the plain data object the app renders.
// This is pure logic: pass in a `query(sql) -> rows[]` function and it works
// anywhere. The app runs it in the browser (sql.js WASM); it could equally run
// in Node. All the SR-points rules live in the database's own views
// (v_SRPoints / v_SRData), so we just read them - nothing is reimplemented here.
//
// Handy fact about the schema: Items.item_id IS the Wowhead item id, so item
// links and icons work straight from the data.

const RAID_ORDER = ["MC", "BWL", "AQ40", "Naxx"];

export function shapeData(query) {
  // Raids: short/long name + points per SR (10 for MC/BWL/AQ40, 5 for Naxx).
  const raids = query(`
    SELECT r.short_name AS key, r.long_name AS name,
           (SELECT MAX(points_per_sr) FROM SRPages s WHERE s.raid_id = r.raid_id) AS srValue
    FROM Raids r
    ORDER BY r.raid_id
  `);

  // Points, straight from the standings view, grouped by raid then item.
  const pointRows = query(`
    SELECT r.short_name AS raid, p.item_id AS itemId, p.item_name AS item,
           p.character_name AS character, p.Points AS points
    FROM v_SRPoints p
    JOIN Items i ON i.item_id = p.item_id
    JOIN Raids r ON r.raid_id = i.raid_id
    ORDER BY r.raid_id, p.item_name, p.Points DESC, p.character_name
  `);

  const pointsByRaid = Object.fromEntries(RAID_ORDER.map((r) => [r, []]));
  const itemIndex = new Map(); // raid|itemId -> item object
  for (const row of pointRows) {
    const key = `${row.raid}|${row.itemId}`;
    let item = itemIndex.get(key);
    if (!item) {
      item = { itemId: row.itemId, item: row.item, raid: row.raid, entries: [] };
      itemIndex.set(key, item);
      (pointsByRaid[row.raid] ||= []).push(item);
    }
    item.entries.push({ character: row.character, points: row.points });
  }

  // Full SR history (with item_id so history rows link to Wowhead too).
  const srHistory = query(`
    SELECT i.item_name AS item, i.item_id AS itemId, c.character_name AS character,
           pg.raid_date AS date, rd.short_name AS raid, d.quantity AS quantity
    FROM SRData d
    JOIN Characters c ON c.character_id = d.character_id
    JOIN Items i      ON i.item_id      = d.item_id
    JOIN SRPages pg   ON pg.page_id     = d.page_id
    JOIN Raids rd     ON rd.raid_id     = pg.raid_id
    ORDER BY pg.raid_date DESC, rd.raid_id, c.character_name
  `);

  // Items actually awarded (won) - powers the loot feed, superlatives, and luck.
  const wins = query(`
    SELECT i.item_name AS item, i.item_id AS itemId, c.character_name AS character,
           r.date_rewarded AS date, rd.short_name AS raid
    FROM RewardedItems r
    JOIN Items i      ON i.item_id      = r.item_id
    JOIN Characters c ON c.character_id = r.character_id
    JOIN Raids rd     ON rd.raid_id     = i.raid_id
    ORDER BY r.date_rewarded DESC
  `);

  // Number of raid nights per raid (one SR page per raid per date) - the
  // denominator for "expected drops" in the luck calc.
  const clearsRows = query(`
    SELECT rd.short_name AS raid, COUNT(*) AS clears
    FROM SRPages pg JOIN Raids rd ON rd.raid_id = pg.raid_id
    GROUP BY rd.raid_id
  `);
  const clears = Object.fromEntries(clearsRows.map((r) => [r.raid, r.clears]));

  const dataThrough = query(`SELECT MAX(raid_date) AS d FROM SRPages`)[0]?.d ?? null;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const updated =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return { updated, dataThrough, raids, pointsByRaid, srHistory, wins, clears };
}

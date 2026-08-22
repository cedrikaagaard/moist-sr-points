// Generates public/data/data.json from the guild's SQLite database.
//
// Reads moistdb.sqlite using sql.js — a pure-WASM SQLite engine, so there is
// NOTHING to compile and this runs identically on any machine or CI runner
// (no Python, no sqlite3 CLI, no native modules).
//
// The heavy lifting already lives in the database as views:
//   v_SRPoints — current standings (excludes rewarded items, inactive chars,
//                and SRs placed before an item was available). Do not
//                reimplement this logic here; just read the view.
//   Items.item_id happens to be the Wowhead item id, so item links/icons work.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import initSqlJs from "sql.js";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = join(root, "moistdb.sqlite");
const OUT_PATH = join(root, "public", "data", "data.json");

const RAID_ORDER = ["MC", "BWL", "AQ40", "Naxx"];

const SQL = await initSqlJs({
  locateFile: () => require.resolve("sql.js/dist/sql-wasm.wasm"),
});
const db = new SQL.Database(readFileSync(DB_PATH));

// Run a query and return an array of plain row objects.
function query(sql) {
  const res = db.exec(sql);
  if (!res.length) return [];
  const { columns, values } = res[0];
  return values.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
}

// --- Raids (short/long name + points per SR) --------------------------------
const raids = query(`
  SELECT r.short_name AS key, r.long_name AS name,
         (SELECT MAX(points_per_sr) FROM SRPages s WHERE s.raid_id = r.raid_id) AS srValue
  FROM Raids r
  ORDER BY r.raid_id
`);

// --- Points, grouped by raid then item (straight from the view) -------------
const pointRows = query(`
  SELECT r.short_name AS raid, p.item_id AS itemId, p.item_name AS item,
         p.character_name AS character, p.Points AS points
  FROM v_SRPoints p
  JOIN Items i ON i.item_id = p.item_id
  JOIN Raids r ON r.raid_id = i.raid_id
  ORDER BY r.raid_id, p.item_name, p.Points DESC, p.character_name
`);

const pointsByRaid = Object.fromEntries(RAID_ORDER.map((r) => [r, []]));
const itemIndex = new Map(); // raid|item -> item object
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

// --- Full SR history (with item_id so history links to Wowhead too) ---------
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

const dataThrough = query(`SELECT MAX(raid_date) AS d FROM SRPages`)[0]?.d ?? null;

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const updated =
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
  `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

const data = { updated, dataThrough, raids, pointsByRaid, srHistory };

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
db.close();

const itemCount = Object.values(pointsByRaid).reduce((a, v) => a + v.length, 0);
console.log(`✓ Generated ${OUT_PATH}`);
console.log(`  data through ${dataThrough}`);
console.log(`  ${itemCount} point-tracked items across ${raids.length} raids`);
console.log(`  ${srHistory.length} SR history records`);

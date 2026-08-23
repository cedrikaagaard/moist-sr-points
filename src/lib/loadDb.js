// Loads the SQLite database in the browser and shapes it into the app's data.
// Uses sql.js (SQLite compiled to WebAssembly). The .wasm is bundled locally
// (via Vite's ?url) so nothing is fetched from a third-party CDN except the
// database file itself.
import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { shapeData } from "./shapeData.js";
import { REMOTE_DB_URL, LOCAL_DB_URL, DB_OVERRIDE } from "../config.js";

let sqlPromise; // initialise the WASM engine once
function getSql() {
  return (sqlPromise ||= initSqlJs({ locateFile: () => wasmUrl }));
}

// Every SQLite file begins with the text "SQLite format 3" (then a null byte).
// We check it so that a static host answering a missing /moistdb.sqlite with its
// index.html (a 200 of HTML) isn't mistaken for a real local database.
const SQLITE_HEADER = "SQLite format 3";

async function fetchDb(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = await res.arrayBuffer();
  const head = new TextDecoder().decode(new Uint8Array(buffer, 0, SQLITE_HEADER.length));
  if (head !== SQLITE_HEADER) throw new Error("not a SQLite database");
  return buffer;
}

// Pick the database source: explicit override → local file (if present) → remote.
async function resolveDb() {
  if (DB_OVERRIDE) {
    return { source: "override", url: DB_OVERRIDE, buffer: await fetchDb(DB_OVERRIDE) };
  }
  try {
    return { source: "local", url: LOCAL_DB_URL, buffer: await fetchDb(LOCAL_DB_URL) };
  } catch {
    // No usable local copy — fall through to the live remote database.
  }
  return { source: "remote", url: REMOTE_DB_URL, buffer: await fetchDb(REMOTE_DB_URL) };
}

// Errors here are shown to the user, so keep the messages plain and useful.
export async function loadFromDb() {
  let SQL, picked;
  try {
    [SQL, picked] = await Promise.all([getSql(), resolveDb()]);
  } catch (err) {
    throw new Error(
      `Couldn't load the database (${err.message}). ` +
        `Check your connection and the source URL in src/config.js.`
    );
  }

  const { source, url, buffer } = picked;
  console.info(
    `%c[Moist]%c database source: %c${source}%c → ${url}`,
    "color:#d4af5a;font-weight:bold",
    "color:inherit",
    "color:#7cc0f5;font-weight:bold",
    "color:inherit"
  );

  let db;
  try {
    db = new SQL.Database(new Uint8Array(buffer));
  } catch {
    throw new Error("The database file couldn't be read (corrupted or wrong file).");
  }

  const query = (sql) => {
    const res = db.exec(sql);
    if (!res.length) return [];
    const { columns, values } = res[0];
    return values.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
  };

  try {
    return { ...shapeData(query), source, sourceUrl: url };
  } catch (err) {
    if (/no such (table|view|column)/i.test(err.message)) {
      throw new Error(
        "This database is missing the expected views (v_SRPoints / v_SRData). " +
          "Make sure it's the database your normal tool produces."
      );
    }
    throw err;
  } finally {
    db.close();
  }
}

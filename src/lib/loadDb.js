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

async function fetchDb(url, { noStore = false } = {}) {
  // By default we let the browser's HTTP cache serve the file (jsDelivr sends a
  // long cache-control), so repeat visits are instant. `noStore` is for the
  // local/override sources where you want the freshest bytes while testing.
  const res = await fetch(url, noStore ? { cache: "no-store" } : {});
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = await res.arrayBuffer();
  const head = new TextDecoder().decode(new Uint8Array(buffer, 0, SQLITE_HEADER.length));
  if (head !== SQLITE_HEADER) throw new Error("not a SQLite database");
  return { buffer, lastModified: res.headers.get("last-modified") };
}

// We ask the GitHub API for the last commit that touched the database file. It
// gives us two things: the commit DATE (shown as "database updated …"), and the
// commit HASH - which we pin the CDN request to, so a push shows up right away
// instead of waiting out jsDelivr's ~12h branch cache. Best-effort and
// unauthenticated (rate-limited); on any failure we fall back to the branch.
function githubCommitsApi(jsdelivrUrl) {
  const m = jsdelivrUrl.match(/cdn\.jsdelivr\.net\/gh\/([^/]+)\/([^@/]+)@([^/]+)\/(.+)$/);
  if (!m) return null;
  const [, owner, repo, branch, path] = m;
  return `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&path=${encodeURIComponent(path)}&per_page=1`;
}

async function fetchLatestCommit(jsdelivrUrl) {
  const api = githubCommitsApi(jsdelivrUrl);
  if (!api) return null;
  try {
    const res = await fetch(api);
    if (!res.ok) return null;
    const commits = await res.json();
    const c = commits[0];
    return c ? { sha: c.sha, date: c.commit?.committer?.date || null } : null;
  } catch {
    return null;
  }
}

// Swap the branch (…@main/…) for a specific commit hash (…@<sha>/…).
function pinToCommit(jsdelivrUrl, sha) {
  return jsdelivrUrl.replace(/(@)[^/]+(\/)/, `$1${sha}$2`);
}

function logSource(source, url) {
  console.info(
    `%c[Moist]%c database source: %c${source}%c → ${url}`,
    "color:#d4af5a;font-weight:bold",
    "color:inherit",
    "color:#7cc0f5;font-weight:bold",
    "color:inherit"
  );
}

// Open a database buffer and shape it. Throws friendly, user-facing errors.
function openAndShape(SQL, { source, url, buffer, dbUpdated }) {
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
    return { ...shapeData(query), source, sourceUrl: url, dbUpdated: dbUpdated || null };
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

// Background: find the newest commit, fetch that exact version, and hand the
// fresh data back. Runs after first paint so it never slows the initial load.
async function revalidate(SQL, onFresh) {
  const commit = await fetchLatestCommit(REMOTE_DB_URL);
  if (!commit?.sha) return; // can't check right now; keep what we showed
  const url = pinToCommit(REMOTE_DB_URL, commit.sha);
  let buffer;
  try {
    ({ buffer } = await fetchDb(url)); // pinned commit is immutable → cacheable
  } catch {
    return; // fall back to the copy already shown
  }
  const fresh = openAndShape(SQL, { source: "remote", url, buffer, dbUpdated: commit.date });
  console.info(
    `%c[Moist]%c refreshed to latest commit ${commit.sha.slice(0, 7)}`,
    "color:#d4af5a;font-weight:bold",
    "color:inherit"
  );
  onFresh(fresh);
}

// Load strategy:
//   • override / local file → use directly (for testing), no revalidate.
//   • remote → show the fast, browser/CDN-cached copy immediately, then check
//     for a newer commit in the background and swap it in via onFresh.
// onProgress(step) drives the loading animation: "engine" → "download".
export async function loadFromDb({ onProgress, onFresh } = {}) {
  onProgress?.("engine");
  const SQL = await getSql();

  onProgress?.("download");
  if (DB_OVERRIDE) {
    const { buffer, lastModified } = await fetchDb(DB_OVERRIDE, { noStore: true });
    logSource("override", DB_OVERRIDE);
    return openAndShape(SQL, { source: "override", url: DB_OVERRIDE, buffer, dbUpdated: lastModified });
  }
  try {
    const { buffer, lastModified } = await fetchDb(LOCAL_DB_URL, { noStore: true });
    logSource("local", LOCAL_DB_URL);
    return openAndShape(SQL, { source: "local", url: LOCAL_DB_URL, buffer, dbUpdated: lastModified });
  } catch {
    // No usable local copy - fall through to the live remote database.
  }

  let fast;
  try {
    fast = await fetchDb(REMOTE_DB_URL);
  } catch (err) {
    throw new Error(
      `Couldn't load the database (${err.message}). ` +
        `Check your connection and the source URL in src/config.js.`
    );
  }
  logSource("remote", REMOTE_DB_URL);
  const initial = openAndShape(SQL, {
    source: "remote",
    url: REMOTE_DB_URL,
    buffer: fast.buffer,
    dbUpdated: fast.lastModified,
  });

  if (onFresh) revalidate(SQL, onFresh).catch(() => {});
  return initial;
}

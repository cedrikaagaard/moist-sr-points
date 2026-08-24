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
  // When the database was last changed (from the CDN / server response), used to
  // show how recent the data is.
  return { buffer, lastModified: res.headers.get("last-modified") };
}

// We ask the GitHub API for the last commit that touched the database file. It
// gives us two things: the commit DATE (shown as "database updated …"), and the
// commit HASH — which we pin the CDN request to, so a push shows up right away
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

// Pick the database source: explicit override → local file (if present) →
// remote. `remoteUrl` is the (commit-pinned) URL for the remote source, with a
// fall back to the plain branch URL if that specific commit can't be fetched.
async function resolveDb(remoteUrl) {
  if (DB_OVERRIDE) {
    return { source: "override", url: DB_OVERRIDE, ...(await fetchDb(DB_OVERRIDE)) };
  }
  try {
    return { source: "local", url: LOCAL_DB_URL, ...(await fetchDb(LOCAL_DB_URL)) };
  } catch {
    // No usable local copy — fall through to the live remote database.
  }
  try {
    return { source: "remote", url: remoteUrl, ...(await fetchDb(remoteUrl)) };
  } catch {
    if (remoteUrl !== REMOTE_DB_URL) {
      return { source: "remote", url: REMOTE_DB_URL, ...(await fetchDb(REMOTE_DB_URL)) };
    }
    throw new Error("couldn't fetch the remote database");
  }
}

// Errors here are shown to the user, so keep the messages plain and useful.
export async function loadFromDb() {
  // Look up the latest commit (for freshness + the "updated" time) in parallel
  // with spinning up the WASM engine, so it doesn't add latency.
  const [SQL, commit] = await Promise.all([getSql(), fetchLatestCommit(REMOTE_DB_URL)]);
  const remoteUrl = commit?.sha ? pinToCommit(REMOTE_DB_URL, commit.sha) : REMOTE_DB_URL;

  let picked;
  try {
    picked = await resolveDb(remoteUrl);
  } catch (err) {
    throw new Error(
      `Couldn't load the database (${err.message}). ` +
        `Check your connection and the source URL in src/config.js.`
    );
  }

  const { source, url, buffer, lastModified } = picked;
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

  // Prefer the git commit date (remote); fall back to a Last-Modified header
  // (e.g. the local dev server), else nothing.
  const dbUpdated = (source === "remote" ? commit?.date : null) || lastModified || null;

  try {
    return { ...shapeData(query), source, sourceUrl: url, dbUpdated };
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

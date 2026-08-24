// Where the app reads the guild database from, at runtime, in the browser.
//
// Resolution order (see src/lib/loadDb.js):
//   1. ?db=<url> in the page URL, or a VITE_DB_URL set at build time  (override)
//   2. a local moistdb.sqlite served next to the app                  (if present)
//   3. the live remote copy - Yulefuel's moistdb repo via jsDelivr    (default)
//
// So dropping a moistdb.sqlite next to the app (or `npm run dev`, which copies
// one into public/) lets you test against a specific database; otherwise the
// site tracks the live remote one. For the remote, loadDb.js pins the request to
// the latest commit hash (via the GitHub API) so pushes appear within a minute
// instead of waiting on jsDelivr's ~12h branch cache; it falls back to this
// @main URL if that lookup fails.

export const REMOTE_DB_URL =
  "https://cdn.jsdelivr.net/gh/yulefuel-moist/moistdb@main/moistdb.sqlite";

// A local copy served alongside the app (relative to wherever it's hosted).
export const LOCAL_DB_URL = `${import.meta.env.BASE_URL}moistdb.sqlite`;

// Explicit override for quick testing.
export const DB_OVERRIDE =
  new URLSearchParams(window.location.search).get("db") ||
  import.meta.env.VITE_DB_URL ||
  null;

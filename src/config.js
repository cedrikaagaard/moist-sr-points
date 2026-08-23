// Where the app reads the guild database from, at runtime, in the browser.
//
// Resolution order (see src/lib/loadDb.js):
//   1. ?db=<url> in the page URL, or a VITE_DB_URL set at build time  (override)
//   2. a local moistdb.sqlite served next to the app                  (if present)
//   3. the live remote copy — Yulefuel's moistdb repo via jsDelivr    (default)
//
// So dropping a moistdb.sqlite next to the app (or `npm run dev`, which copies
// one into public/) lets you test against a specific database; otherwise the
// site tracks the live remote one. jsDelivr caches the remote for a while
// (~12h); force it with:
//   https://purge.jsdelivr.net/gh/yulefuel-moist/moistdb@main/moistdb.sqlite

export const REMOTE_DB_URL =
  "https://cdn.jsdelivr.net/gh/yulefuel-moist/moistdb@main/moistdb.sqlite";

// A local copy served alongside the app (relative to wherever it's hosted).
export const LOCAL_DB_URL = `${import.meta.env.BASE_URL}moistdb.sqlite`;

// Explicit override for quick testing.
export const DB_OVERRIDE =
  new URLSearchParams(window.location.search).get("db") ||
  import.meta.env.VITE_DB_URL ||
  null;

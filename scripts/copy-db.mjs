// Dev helper: copy moistdb.sqlite into public/ so `npm run dev` can load it
// locally (offline) at /moistdb.sqlite. Production doesn't use this — the live
// site reads the database from its configured URL (see src/config.js).
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "moistdb.sqlite");
const dest = join(root, "public", "moistdb.sqlite");

if (!existsSync(src)) {
  console.warn(
    "⚠ moistdb.sqlite not found in the project root — `npm run dev` will fall " +
      "back to the remote database. Drop a moistdb.sqlite here to work offline."
  );
} else {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log("✓ copied moistdb.sqlite → public/ (for local dev)");
}

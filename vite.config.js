import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative base so the built `dist/` works no matter where it's hosted —
  // root domain, a subpath (e.g. GitHub Pages project sites), or a local file.
  base: "./",
  plugins: [react()],
});

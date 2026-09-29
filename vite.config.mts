import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "path";
import { execSync } from "node:child_process";

// Cache-busting query param for /style.css + /js/*.js (src/lib/assets.ts) —
// falls back to a timestamp if git isn't available (e.g. a source-only deploy artifact).
function resolveAssetVersion(): string {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: __dirname }).toString().trim();
  } catch {
    return Date.now().toString(36);
  }
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@generated": path.resolve(__dirname, "generated"),
    },
  },
  define: {
    __ASSET_VERSION__: JSON.stringify(resolveAssetVersion()),
  },
  plugins: [
    cloudflare({
      viteEnvironment: { name: "worker" },
    }),
  ],
});

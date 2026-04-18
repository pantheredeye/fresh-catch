import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@generated": path.resolve(__dirname, "generated"),
    },
  },
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: "./dist/worker/wrangler.json",
      },
      miniflare: {
        bindings: {
          NODE_ENV: "test",
        },
      },
    }),
  ],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});

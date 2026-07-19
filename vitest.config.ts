import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import path from "path";

// Read migrations at config time (Node side); the setup file applies them to
// the isolated test D1 before any test runs.
const migrations = await readD1Migrations(path.resolve(__dirname, "migrations"));

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
          TEST_MIGRATIONS: migrations,
        },
      },
    }),
  ],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
  },
});

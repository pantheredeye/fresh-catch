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
      // Workers AI (and other remote-only bindings) have no local emulation, so
      // the pool would open a remote proxy session that needs wrangler auth.
      // CI has no Cloudflare credentials — keep everything local. Tests that
      // exercise the catch pipeline pass a stub `AI` object as the env
      // override on `app.request(path, init, { ...env, AI: fake })` rather
      // than calling the real binding.
      remoteBindings: false,
      wrangler: {
        configPath: "./wrangler.jsonc",
      },
      miniflare: {
        bindings: {
          NODE_ENV: "test",
          SESSION_SECRET: "test-session-secret-deterministic-for-ci",
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

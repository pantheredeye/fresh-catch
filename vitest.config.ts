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
      // Workers AI (and other remote-only bindings) have no local emulation, so
      // the pool would open a remote proxy session that needs wrangler auth.
      // CI has no Cloudflare credentials — keep everything local. No test uses AI.
      remoteBindings: false,
      wrangler: {
        configPath: "./dist/worker/wrangler.json",
      },
      miniflare: {
        bindings: {
          NODE_ENV: "test",
          // CI has no .dev.vars. Without AUTH_SECRET_KEY the session store tries
          // to generate a random key at global scope, which workerd forbids —
          // that throw wedges the pool and hangs the run. Provide dummy secrets.
          AUTH_SECRET_KEY: "test-auth-secret-key-deterministic-for-ci",
          RESEND_API_KEY: "test-resend-key",
          DEV_MCP_SECRET: "test-mcp-secret",
        },
      },
    }),
  ],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});

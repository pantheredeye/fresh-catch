import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@generated": path.resolve(__dirname, "generated"),
    },
  },
  plugins: [
    cloudflare({
      viteEnvironment: { name: "worker" },
    }),
  ],
});

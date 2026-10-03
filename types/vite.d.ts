declare module "*?url" {
  const result: string;
  export default result;
}

/** Injected by Vite's `define` (vite.config.mts / vitest.config.ts) — see src/lib/assets.ts. */
declare const __ASSET_VERSION__: string;

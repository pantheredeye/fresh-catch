/**
 * `__ASSET_VERSION__` is a build-time `define` (git short sha in
 * vite.config.mts, the fixed string "test" in vitest.config.ts) — see
 * types/vite.d.ts for the ambient declaration. Busts the cache on
 * `/style.css` and `/js/*.js` on every deploy without a content-hashing
 * pipeline; `/fonts/*` gets a separate immutable Cache-Control instead
 * (public/_headers) since those filenames don't change.
 */
export function assetUrl(path: string): string {
  return `${path}?v=${__ASSET_VERSION__}`;
}

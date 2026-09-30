import type { FC, PropsWithChildren } from "hono/jsx";
import { assetUrl } from "@/lib/assets";

/**
 * `deviceToken` (optional) is rendered into `<body data-device-token>` so
 * client islands — the favorites island (#58), keyed to the device cookie
 * per its shape in `useFavorites.ts` on `main` — can read it without the
 * cookie itself being readable (it's httpOnly).
 */
export const Document: FC<PropsWithChildren<{ title?: string; deviceToken?: string }>> = ({
  title = "2 Fishes Seafood",
  deviceToken,
  children,
}) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      {/* Light-only per Tideline (docs/redesign/fresh-catch-handoff.md §3) — not
          a mismatch bug like the old app's light-only meta; here the content
          theme itself is light-only, so native controls should match. */}
      <meta name="color-scheme" content="light" />
      <title>{title}</title>
      <link rel="preload" as="font" type="font/woff2" href="/fonts/fraunces-var.woff2" crossorigin="anonymous" />
      <link
        rel="preload"
        as="font"
        type="font/woff2"
        href="/fonts/hanken-grotesk-var.woff2"
        crossorigin="anonymous"
      />
      <link rel="stylesheet" href={assetUrl("/style.css")} />
    </head>
    <body data-device-token={deviceToken}>
      <a href="#main" class="skip-link">
        Skip to content
      </a>
      {children}
    </body>
  </html>
);

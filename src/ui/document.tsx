import type { FC, PropsWithChildren } from "hono/jsx";

/**
 * `deviceToken` (optional) is rendered into `<body data-device-token>` so
 * client islands — the favorites island (#58), keyed to the device cookie
 * per its shape in `useFavorites.ts` on `main` — can read it without the
 * cookie itself being readable (it's httpOnly).
 */
export const Document: FC<PropsWithChildren<{ title?: string; deviceToken?: string }>> = ({
  title = "Fresh Catch",
  deviceToken,
  children,
}) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      {/* light dark, not light — audit flagged the old app for forcing light mode here */}
      <meta name="color-scheme" content="light dark" />
      <title>{title}</title>
      <link rel="stylesheet" href="/style.css" />
    </head>
    <body data-device-token={deviceToken}>
      <a href="#main" class="skip-link">
        Skip to content
      </a>
      {children}
    </body>
  </html>
);

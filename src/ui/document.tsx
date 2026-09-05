import type { FC, PropsWithChildren } from "hono/jsx";

export const Document: FC<PropsWithChildren<{ title?: string }>> = ({
  title = "Fresh Catch",
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
    <body>{children}</body>
  </html>
);

export const Document: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="color-scheme" content="light" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <title>@redwoodjs/starter-standard</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="/src/design-system/tokens.css" />
      <link rel="stylesheet" href="/src/layouts/CustomerLayout.css" />
      <link rel="stylesheet" href="/src/layouts/AuthLayout.css" />
      <link rel="stylesheet" href="/src/components/Header.css" />
      <link rel="stylesheet" href="/src/components/UserMenu.css" />
      <link rel="modulepreload" href="/src/client.tsx" />
    </head>
    <body style={{
      fontFamily: 'var(--font-modern)',
      background: 'var(--color-surface-warm)',
      color: 'var(--color-text-primary)',
      lineHeight: 1.6,
      margin: 0,
      padding: 0
    }}>
      <div id="root">{children}</div>
      <script>import("/src/client.tsx")</script>
    </body>
  </html>
);

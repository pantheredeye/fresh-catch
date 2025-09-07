export const Document: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>@redwoodjs/starter-standard</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
      <link rel="modulepreload" href="/src/client.tsx" />
      <link rel="stylesheet" href="/src/design-system/tokens.css" />
    </head>
    <body style={{
      fontFamily: 'var(--font-modern)',
      background: 'var(--warm-white)',
      color: 'var(--dark)',
      lineHeight: 1.6,
      margin: 0,
      padding: 0,
      paddingBottom: '80px'
    }}>
      <div id="root">{children}</div>
      <script>import("/src/client.tsx")</script>
    </body>
  </html>
);

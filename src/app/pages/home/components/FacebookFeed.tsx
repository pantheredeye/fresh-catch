"use client";

import { useState } from "react";

/**
 * FacebookFeed - Embeds a Facebook Page Plugin iframe.
 * Uses Facebook's Page Plugin (no API keys or OAuth needed).
 * Lazy-loads the iframe and degrades gracefully if blocked.
 */
export function FacebookFeed({ pageUrl }: { pageUrl: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return null;
  }

  const pluginSrc = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(pageUrl)}&tabs=timeline&width=340&height=500&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=true`;

  return (
    <div
      style={{
        padding: "var(--space-lg) var(--space-md)",
        maxWidth: "500px",
        margin: "0 auto",
      }}
    >
      <h2 className="heading-2xl m-0" style={{ marginBottom: "var(--space-md)" }}>
        Latest Updates
      </h2>
      <div
        style={{
          background: "var(--color-surface-primary)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
          border: "1px solid var(--color-border-subtle)",
          overflow: "hidden",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <iframe
          src={pluginSrc}
          width="340"
          height="500"
          style={{
            border: "none",
            overflow: "hidden",
            maxWidth: "100%",
          }}
          loading="lazy"
          allow="encrypted-media"
          onError={() => setFailed(true)}
          title="Facebook Page Feed"
        />
      </div>
    </div>
  );
}

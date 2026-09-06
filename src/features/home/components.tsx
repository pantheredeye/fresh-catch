import type { FC } from "hono/jsx";
import type { CatchContent } from "@/features/catch/pipeline";

/** Live catch-of-the-week hero (#58) — `content` is already null'd out by the 7-day staleness cutoff upstream. */
export const CatchHero: FC<{ content: CatchContent | null }> = ({ content }) => {
  if (!content) {
    return (
      <div class="card stack">
        <h2 style="margin: 0;">This week's catch</h2>
        <p>Check back soon — nothing posted yet this week.</p>
      </div>
    );
  }
  return (
    <div class="card stack">
      <span class="badge badge-live">Fresh this week</span>
      <h2 style="margin: 0;">{content.headline}</h2>
      <ul>
        {content.items.map((item) => (
          <li>
            <strong>{item.name}</strong>
            {item.note ? ` — ${item.note}` : ""}{" "}
            <a href={`/requests/new?species=${encodeURIComponent(item.name)}`}>Request this</a>
          </li>
        ))}
      </ul>
      <p>{content.summary}</p>
    </div>
  );
};

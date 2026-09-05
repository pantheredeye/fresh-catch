import type { FC } from "hono/jsx";
import type { SessionPayload } from "@/features/auth/session";
import type { CatchContent } from "@/features/catch/pipeline";

export const HomeNav: FC<{ session: SessionPayload | null }> = ({ session }) => (
  <p style="display: flex; justify-content: flex-end; align-items: center; gap: 12px;">
    {session ? (
      <>
        <span class="field-helper">
          {session.email}
          {session.isAdmin ? " (admin)" : ""}
        </span>
        <form method="post" action="/logout" style="display: inline">
          <input type="hidden" name="csrfToken" value={session.csrfToken} />
          <button type="submit" class="btn btn-ghost">
            Log out
          </button>
        </form>
        {session.isAdmin ? <a href="/admin">Admin</a> : null}
      </>
    ) : (
      <a href="/login">Log in</a>
    )}
  </p>
);

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
            {item.note ? ` — ${item.note}` : ""}
          </li>
        ))}
      </ul>
      <p>{content.summary}</p>
    </div>
  );
};

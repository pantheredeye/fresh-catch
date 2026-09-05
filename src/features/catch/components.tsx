import type { FC } from "hono/jsx";
import type { CatchUpdate } from "@/lib/db";
import { Textarea } from "@/ui/textarea";
import type { CatchContent } from "./pipeline";

function parseFormattedContent(json: string): CatchContent | null {
  try {
    return JSON.parse(json) as CatchContent;
  } catch {
    return null;
  }
}

const LiveCatch: FC<{ live: CatchUpdate | null }> = ({ live }) => {
  if (!live) return <p>No live catch update yet.</p>;
  const content = parseFormattedContent(live.formattedContent);
  if (!content) return <p>Live catch update has unreadable content.</p>;

  return (
    <div class="card stack">
      <h3>{content.headline}</h3>
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

/**
 * One admin page, one mic, one concept (#57). Recording a draft is
 * client-driven (`/js/catch-record.js` hits `POST /admin/catch/record` and
 * fills the hidden fields below); publishing is a boring server-rendered
 * form POST, same pattern as the markets admin routes.
 */
export const CatchPage: FC<{ live: CatchUpdate | null; csrfToken: string }> = ({ live, csrfToken }) => (
  <main class="page">
    <h1>Catch of the week</h1>

    <section>
      <h2>Currently live</h2>
      <LiveCatch live={live} />
    </section>

    <section>
      <h2>Record a new catch</h2>
      <p id="catch-record-status" role="status"></p>

      <p>
        <button type="button" class="btn btn-primary" id="catch-mic-button">
          Start recording
        </button>
      </p>

      <Textarea id="catch-text-input" name="catchText" label="Or type it instead" rows={4} />
      <p>
        <button type="button" class="btn btn-secondary" id="catch-text-submit">
          Format from text
        </button>
      </p>

      <div class="card stack" id="catch-draft-preview" hidden>
        <h3 id="catch-draft-headline"></h3>
        <ul id="catch-draft-items"></ul>
        <p id="catch-draft-summary"></p>
      </div>

      <form method="post" action="/admin/catch/publish" id="catch-publish-form">
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <input type="hidden" name="headline" id="catch-publish-headline" />
        <input type="hidden" name="summary" id="catch-publish-summary" />
        <input type="hidden" name="itemsJson" id="catch-publish-items" />
        <input type="hidden" name="rawTranscript" id="catch-publish-transcript" />
        <button type="submit" class="btn btn-primary" id="catch-publish-submit" disabled>
          Publish
        </button>
      </form>
    </section>

    <script type="module" src="/js/catch-record.js"></script>
  </main>
);

import type { FC } from "hono/jsx";
import type { CatchUpdate } from "@/lib/db";
import { Textarea } from "@/ui/textarea";
import { Input } from "@/ui/input";
import { Page } from "@/ui/page";
import { Button } from "@/ui/button";
import { SectionHeading } from "@/ui/section-heading";
import { CardHeader } from "@/ui/card-header";
import { BackLink } from "@/ui/back-link";
import { assetUrl } from "@/lib/assets";
import { parseCatchContent, type CatchContent } from "./pipeline";

const LiveCatch: FC<{ content: CatchContent }> = ({ content }) => (
  <div class="card stack">
    <CardHeader level={3} title={content.headline} />
    <ul>
      {content.items.map((item) => (
        <li>
          <strong>{item.name}</strong>
          {item.note ? ` — ${item.note}` : ""}
          {item.priceCents !== undefined ? ` — $${(item.priceCents / 100).toFixed(2)}` : ""}
          {item.soldOut ? " (Sold out)" : ""}
        </li>
      ))}
    </ul>
    <p>{content.summary}</p>
  </div>
);

/** Per-item price ($, optional) + sold-out checkbox → `POST /admin/catch/prices` rewrites `formattedContent` (issue #71's correction path — always available regardless of what the LLM extracted). */
const PricesForm: FC<{ content: CatchContent; csrfToken: string; errorText?: string }> = ({
  content,
  csrfToken,
  errorText,
}) => (
  <form method="post" action="/admin/catch/prices" class="stack">
    <input type="hidden" name="csrfToken" value={csrfToken} />
    {errorText ? (
      <p class="field-error" role="alert">
        {errorText}
      </p>
    ) : null}
    {content.items.map((item, i) => (
      <div class="cluster">
        <Input
          id={`price_${i}`}
          name={`price_${i}`}
          label={`${item.name} — price ($)`}
          inputMode="decimal"
          value={item.priceCents !== undefined ? (item.priceCents / 100).toFixed(2) : ""}
        />
        <label class="field-label" for={`soldOut_${i}`}>
          <input type="checkbox" id={`soldOut_${i}`} name={`soldOut_${i}`} checked={item.soldOut === true} /> Sold out
        </label>
      </div>
    ))}
    <Button type="submit">Update prices</Button>
  </form>
);

/**
 * One admin page, one mic, one concept (#57). Recording a draft is
 * client-driven (`/js/catch-record.js` hits `POST /admin/catch/record` and
 * fills the hidden fields below); publishing is a boring server-rendered
 * form POST, same pattern as the markets admin routes.
 */
export const CatchPage: FC<{ live: CatchUpdate | null; csrfToken: string; pricesError?: string }> = ({
  live,
  csrfToken,
  pricesError,
}) => {
  const content = live ? parseCatchContent(live.formattedContent) : null;
  return (
    <Page>
      <BackLink href="/admin">Admin</BackLink>
      <SectionHeading title="Catch of the week" level={1} />

      <section>
        <SectionHeading title="Currently live" level={2} size="sm" />
        {!live ? (
          <p>No live catch update yet.</p>
        ) : !content ? (
          <p>Live catch update has unreadable content.</p>
        ) : (
          <>
            <LiveCatch content={content} />
            <SectionHeading title="Prices & availability" level={3} size="sm" />
            <PricesForm content={content} csrfToken={csrfToken} errorText={pricesError} />
          </>
        )}
      </section>

      <section>
        <SectionHeading title="Record a new catch" level={2} size="sm" />
        <p id="catch-record-status" role="status"></p>

        <Button type="button" id="catch-mic-button" ariaPressed={false}>
          Start recording
        </Button>

        <Textarea id="catch-text-input" name="catchText" label="Or type it instead" rows={4} />
        <Button type="button" variant="secondary" id="catch-text-submit">
          Format from text
        </Button>

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
          <Button type="submit" id="catch-publish-submit" disabled>
            Publish
          </Button>
        </form>
      </section>

      <script type="module" src={assetUrl("/js/catch-record.js")}></script>
    </Page>
  );
};

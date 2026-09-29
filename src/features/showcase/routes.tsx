import { Hono } from "hono";
import type { Bindings } from "../../types";
import { Document } from "../../ui/document";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Select } from "../../ui/select";
import { Card } from "../../ui/card";
import { Sheet } from "../../ui/sheet";
import { Page } from "../../ui/page";
import { SectionHeading } from "../../ui/section-heading";
import { SplitControl } from "../../ui/split-control";
import { BackLink } from "../../ui/back-link";
import { Band } from "../../ui/band";
import { CardHeader } from "../../ui/card-header";

export const showcaseRoutes = new Hono<{ Bindings: Bindings }>();

// Palette pairs actually used by public/style.css's semantic layer — kept in
// sync with the contrast comments there (docs/redesign/fresh-catch-handoff.md
// §3's 7:1 body/small-text floor, 3:1 non-text/control-border floor).
const CONTRAST_PAIRS = [
  { fg: "deep", bg: "paper", ratio: "15.55:1", use: "body text" },
  { fg: "deep", bg: "sand", ratio: "13.60:1", use: "body text on page bg" },
  { fg: "muted", bg: "paper", ratio: "8.84:1", use: "secondary text" },
  { fg: "sea", bg: "paper", ratio: "9.20:1", use: "links, secondary-button border" },
  { fg: "paper", bg: "sea", ratio: "9.20:1", use: "primary-button text" },
  { fg: "deep", bg: "coral-fill", ratio: "7.32:1", use: "badge-live text on fill" },
  { fg: "coral", bg: "shallow", ratio: "7.75:1", use: "badge-open text on fill" },
  { fg: "coral", bg: "sand", ratio: "7.56:1", use: "badge-declined text on fill" },
  { fg: "sand", bg: "deep", ratio: "13.60:1", use: "text on deep band" },
  { fg: "on-sea-muted", bg: "sea", ratio: "7.50:1", use: "secondary text on sea band" },
  { fg: "sea", bg: "paper", ratio: "9.20:1", use: "input border (>=3:1 non-text floor)" },
] as const;

// `import.meta.env.DEV` is resolved statically by Vite: `false` on a production
// build, so `vite build` dead-code-eliminates this whole block — the route
// does not exist in the shipped Worker. Unlike the old app's `/design-test`,
// there's no runtime flag to misconfigure.
if (import.meta.env.DEV) {
  showcaseRoutes.get("/dev/showcase", (c) => {
    return c.html(
      <Document title="Design showcase (dev only)">
        <Page bleed>
          <div class="wrap stack">
            <h1>Design showcase</h1>
            <p>Dev-only route — not present in production builds. Light-only; there is no dark-mode pair to toggle.</p>

            <section>
              <SectionHeading title="Buttons" />
              <p class="cluster">
                <Button variant="primary" inline>
                  Primary
                </Button>
                <Button variant="secondary" inline>
                  Secondary
                </Button>
                <Button variant="ghost" inline>
                  Ghost
                </Button>
                <Button variant="primary" inline disabled>
                  Disabled
                </Button>
                <Button variant="primary" href="#showcase" inline>
                  Link button
                </Button>
              </p>
            </section>
          </div>

          <Band tone="deep">
            <SectionHeading title="Buttons on a deep band" />
            <p class="cluster">
              <Button variant="primary" inline>
                Primary
              </Button>
              <Button variant="secondary" inline>
                Secondary
              </Button>
              <Button variant="ghost" inline>
                Ghost
              </Button>
            </p>
          </Band>

          <div class="wrap stack">
          <section>
            <SectionHeading title="Inputs" />
            <Input id="name" name="name" label="Name" placeholder="Ada Lovelace" />
            <Input
              id="email"
              name="email"
              label="Email"
              type="email"
              helperText="We'll only use this to send order updates."
            />
            <Input id="phone" name="phone" label="Phone" errorText="Enter a 10-digit phone number." />
          </section>

          <section>
            <SectionHeading title="Textarea" size="sm" level={3} />
            <Textarea
              id="notes"
              name="notes"
              label="Notes"
              placeholder="Vendor-facing notes"
              helperText="Plain text, no markdown."
            />
            <Textarea id="notes-error" name="notesError" label="Notes" errorText="Must be 1000 characters or less." />
          </section>

          <section>
            <SectionHeading title="Select" size="sm" level={3} />
            <Select
              id="expiresHour"
              name="expiresHour"
              label="Expires hour (UTC)"
              value="18"
              options={Array.from({ length: 24 }, (_, hour) => ({
                value: String(hour),
                label: String(hour).padStart(2, "0") + ":00",
              }))}
            />
          </section>

          <section>
            <SectionHeading title="Card + CardHeader" meta="1 example" />
            <Card>
              <CardHeader title="Card title" level={3} meta={<span class="badge badge-live">Live</span>} />
              <p>Card body content sits on --color-surface-primary with a 1px --color-border-light border.</p>
            </Card>
          </section>

          <section>
            <SectionHeading title="Badges" meta="6 states" />
            <p class="cluster">
              <span class="badge badge-live">Live</span>
              <span class="badge badge-past">Past</span>
              <span class="badge badge-open">Open</span>
              <span class="badge badge-confirmed">Confirmed</span>
              <span class="badge badge-fulfilled">Fulfilled</span>
              <span class="badge badge-declined">Declined</span>
            </p>
          </section>

          <section>
            <SectionHeading title="Notices" size="sm" level={3} />
            <div class="stack">
              <p class="notice notice-success">Payment received — thanks!</p>
              <p class="notice notice-info">Checkout was cancelled. No charge was made.</p>
            </div>
          </section>

          <section>
            <SectionHeading title="Market row" size="sm" level={3} />
            <div class="market-row">
              <span>
                <strong>Saturday Farmers Market</strong> — Sat 8-2
              </span>
              <span class="badge badge-live">Active</span>
            </div>
          </section>

          <section>
            <SectionHeading title="Inbox row" size="sm" level={3} />
            <a class="inbox-row" href="#showcase">
              <span>Ada Lovelace — 2 lbs salmon</span>
              <span class="badge badge-open">Open</span>
            </a>
          </section>

          <section>
            <SectionHeading title="Thread" size="sm" level={3} />
            <div class="stack thread">
              <div class="msg msg-customer">
                <p>Do you have any rockfish this week?</p>
                <p class="msg-meta">Ada — 9:02am</p>
              </div>
              <div class="msg msg-vendor">
                <p>Yep, just brought some in — want me to set some aside?</p>
                <p class="msg-meta">Evan — 9:14am</p>
              </div>
            </div>
          </section>

          <section>
            <SectionHeading title="BackLink" size="sm" level={3} />
            <BackLink href="#showcase">Back to Fresh Catch</BackLink>
          </section>

          <section>
            <SectionHeading title="SplitControl" size="sm" level={3} />
            <SplitControl
              items={[
                { href: "#showcase", label: "Directions", ariaLabel: "Directions to Mesa View" },
                { href: "#showcase", label: "Call", ariaLabel: "Call Fresh Catch" },
              ]}
            />
          </section>

          <section>
            <SectionHeading title="Page / stack" size="sm" level={3} />
            <p>
              This showcase page is itself a <code>Page</code> (<code>.page.stack</code>) — every route wraps its
              content the same way, so there's nothing further to demo in isolation.
            </p>
          </section>

          <section>
            <SectionHeading title="Sheet" size="sm" level={3} />
            <p>
              Rendered open here for visual review. Real usage opens it via
              <code>dialog.showModal()</code> from a client island.
            </p>
            <Sheet id="showcase-sheet" title="Bottom sheet" open>
              <p>Sheet body content.</p>
              <Button variant="primary">Confirm</Button>
            </Sheet>
          </section>

          <section>
            <SectionHeading title="Palette contrast" meta={`${CONTRAST_PAIRS.length} pairs`} />
            <table class="stack">
              <thead>
                <tr>
                  <th>Foreground</th>
                  <th>Background</th>
                  <th>Ratio</th>
                  <th>Use</th>
                </tr>
              </thead>
              <tbody>
                {CONTRAST_PAIRS.map((pair) => (
                  <tr>
                    <td>{pair.fg}</td>
                    <td>{pair.bg}</td>
                    <td>{pair.ratio}</td>
                    <td>{pair.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          </div>
        </Page>
      </Document>,
    );
  });
}

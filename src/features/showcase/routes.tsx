import { Hono } from "hono";
import type { Bindings } from "../../types";
import { Document } from "../../ui/document";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Select } from "../../ui/select";
import { Card } from "../../ui/card";
import { Sheet } from "../../ui/sheet";

export const showcaseRoutes = new Hono<{ Bindings: Bindings }>();

// `import.meta.env.DEV` is resolved statically by Vite: `false` on a production
// build, so `vite build` dead-code-eliminates this whole block — the route
// does not exist in the shipped Worker. Unlike the old app's `/design-test`,
// there's no runtime flag to misconfigure.
if (import.meta.env.DEV) {
  showcaseRoutes.get("/dev/showcase", (c) => {
    return c.html(
      <Document title="Design showcase (dev only)">
        <main>
          <h1>Design showcase</h1>
          <p>
            Dev-only route — not present in production builds. Toggle your OS color
            scheme to preview the dark-mode token pairs.
          </p>

          <section>
            <h2>Buttons</h2>
            <p style="display: flex; gap: 12px; flex-wrap: wrap;">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
              <Button variant="primary" href="#showcase">
                Link button
              </Button>
            </p>
          </section>

          <section>
            <h2>Inputs</h2>
            <Input id="name" name="name" label="Name" placeholder="Ada Lovelace" />
            <Input
              id="email"
              name="email"
              label="Email"
              type="email"
              helperText="We'll only use this to send order updates."
            />
            <Input
              id="phone"
              name="phone"
              label="Phone"
              errorText="Enter a 10-digit phone number."
            />
          </section>

          <section>
            <h2>Textarea</h2>
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
            <h2>Select</h2>
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
            <h2>Card</h2>
            <Card>
              <h3>Card title</h3>
              <p>Card body content sits on --color-surface-primary with a subtle border.</p>
            </Card>
          </section>

          <section>
            <h2>Sheet</h2>
            <p>
              Rendered open here for visual review. Real usage opens it via
              <code>dialog.showModal()</code> from a client island.
            </p>
            <Sheet id="showcase-sheet" title="Bottom sheet" open>
              <p>Sheet body content.</p>
              <Button variant="primary">Confirm</Button>
            </Sheet>
          </section>
        </main>
      </Document>,
    );
  });
}

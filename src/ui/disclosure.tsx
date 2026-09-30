import type { FC } from "hono/jsx";

type DisclosureProps = { summary: string; open?: boolean; children?: unknown };

/** Native `<details>` — no JS. Pass `open` when the content holds values or errors so nothing is hidden. */
export const Disclosure: FC<DisclosureProps> = ({ summary, open, children }) => (
  <details class="disclosure" open={open}>
    <summary class="disclosure-summary">{summary}</summary>
    <div class="disclosure-body">{children}</div>
  </details>
);

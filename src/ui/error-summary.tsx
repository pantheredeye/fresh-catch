import type { FC } from "hono/jsx";

export type ErrorSummaryItem = { id: string; message: string };

/** Top-of-form list of everything that failed, each linking to its field. */
export const ErrorSummary: FC<{ items: ErrorSummaryItem[] }> = ({ items }) =>
  items.length === 0 ? null : (
    <div class="error-summary" role="alert">
      <h2 class="error-summary-title">Couldn't save — fix {items.length === 1 ? "this" : "these"}:</h2>
      <ul class="error-summary-list">
        {items.map((item) => (
          <li>
            <a href={`#${item.id}`}>{item.message}</a>
          </li>
        ))}
      </ul>
    </div>
  );

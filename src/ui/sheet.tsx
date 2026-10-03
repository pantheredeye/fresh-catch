import type { FC, PropsWithChildren } from "hono/jsx";

type SheetProps = PropsWithChildren<{
  id: string;
  title: string;
  /** Static open state for SSR/demo purposes — real usage opens via dialog.showModal() from a client island. */
  open?: boolean;
}>;

/** Bottom sheet built on native <dialog>: Esc + backdrop dismissal, focus trap, all for free. */
export const Sheet: FC<SheetProps> = ({ id, title, open, children }) => (
  <dialog id={id} class="sheet" open={open}>
    <form method="dialog" class="sheet-header">
      <h2 class="sheet-title">{title}</h2>
      <button type="submit" class="sheet-close" aria-label="Close">
        &times;
      </button>
    </form>
    <div class="sheet-body">{children}</div>
  </dialog>
);

import type { FC } from "hono/jsx";

/** Footer — © Digital Glue line only. Login/"My requests"/Admin live in the header and `/requests`. `note` carries page-specific copy. */
export const Footer: FC<{ note?: string; container?: boolean }> = ({ note, container }) => (
  <footer>
    <div class={container ? "container stack-tight" : "wrap stack-tight"}>
      <p>
        © {new Date().getFullYear()} <a href="https://www.digitalglue.dev">Digital Glue</a>
      </p>
      {note ? <p>{note}</p> : null}
    </div>
  </footer>
);

import type { FC, PropsWithChildren } from "hono/jsx";

/** 58px quiet link with a leading arrow, for "back to X" navigation. */
export const BackLink: FC<PropsWithChildren<{ href: string }>> = ({ href, children }) => (
  <a href={href} class="back-link">
    <span aria-hidden="true">←</span> {children}
  </a>
);

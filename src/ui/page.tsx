import type { FC, PropsWithChildren } from "hono/jsx";

/** Every route's top-level landmark: `id="main"` is the skip link's target (see document.tsx). */
export const Page: FC<PropsWithChildren<{ class?: string }>> = ({ class: extra, children }) => (
  <main id="main" class={extra ? `page stack ${extra}` : "page stack"}>
    {children}
  </main>
);

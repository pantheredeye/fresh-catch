import type { FC, PropsWithChildren } from "hono/jsx";

type PageProps = PropsWithChildren<{
  class?: string;
  /** Renders children directly inside <main>, no .wrap div — for pages built from full-bleed Bands. */
  bleed?: boolean;
  /** Wider .wrap, for admin tables that don't fit the 35rem content column. */
  wide?: boolean;
}>;

/** Every route's top-level landmark: `id="main"` is the skip link's target (see document.tsx). */
export const Page: FC<PageProps> = ({ class: extra, bleed, wide, children }) => {
  if (bleed) {
    return <main id="main">{children}</main>;
  }
  const wrapClass = ["page", "stack", wide ? "page-wide" : "", extra].filter(Boolean).join(" ");
  return (
    <main id="main" class={wrapClass}>
      {children}
    </main>
  );
};

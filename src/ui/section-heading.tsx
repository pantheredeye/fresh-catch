import type { FC } from "hono/jsx";

type SectionHeadingProps = {
  title: string;
  meta?: string;
  level?: 1 | 2 | 3;
  size?: "lg" | "sm";
};

/** The signature device (handoff §5): a heavy rule under the heading (plus a hairline below it on the page title, `level` 1 only), and the section's meta right-aligned on the heading's baseline. */
export const SectionHeading: FC<SectionHeadingProps> = ({ title, meta, level = 2, size = "lg" }) => {
  const Heading = `h${level}` as "h1" | "h2" | "h3";
  const rowClass = ["hdrow", size === "sm" ? "hdrow-sm" : "", level === 1 ? "hdrow-title" : ""].filter(Boolean).join(" ");
  const headingClass = size === "sm" ? "hd hd-sm" : "hd";
  return (
    <div class={rowClass}>
      <Heading class={headingClass}>{title}</Heading>
      {meta ? <span class="hd-meta">{meta}</span> : null}
    </div>
  );
};

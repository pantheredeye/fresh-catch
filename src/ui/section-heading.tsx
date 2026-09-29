import type { FC } from "hono/jsx";

type SectionHeadingProps = {
  title: string;
  meta?: string;
  level?: 1 | 2 | 3;
  size?: "lg" | "sm";
};

/** The signature device (handoff §5): a heavy rule under the heading, a hairline below it, and the section's meta right-aligned on the heading's baseline. */
export const SectionHeading: FC<SectionHeadingProps> = ({ title, meta, level = 2, size = "lg" }) => {
  const Heading = `h${level}` as "h1" | "h2" | "h3";
  const rowClass = size === "sm" ? "hdrow hdrow-sm" : "hdrow";
  const headingClass = size === "sm" ? "hd hd-sm" : "hd";
  return (
    <div class={rowClass}>
      <Heading class={headingClass}>{title}</Heading>
      {meta ? <span class="hd-meta">{meta}</span> : null}
    </div>
  );
};

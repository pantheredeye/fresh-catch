import type { Child, FC } from "hono/jsx";

type CardHeaderProps = {
  title: string;
  level?: 1 | 2 | 3;
  /** Right-aligned content — usually a status badge. */
  meta?: Child;
};

/** Title + right-aligned meta (usually a badge) — replaces the copy-pasted flex-row header markup in requests/orders/markets cards. */
export const CardHeader: FC<CardHeaderProps> = ({ title, level = 2, meta }) => {
  const Heading = `h${level}` as "h1" | "h2" | "h3";
  return (
    <div class="card-header">
      <Heading>{title}</Heading>
      {meta}
    </div>
  );
};

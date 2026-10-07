import type { FC, PropsWithChildren } from "hono/jsx";

type ButtonProps = PropsWithChildren<{
  variant?: "primary" | "secondary" | "ghost";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  href?: string;
  /** Rare inline usage (e.g. a button gallery) — default is a full-width 58px block, per §3. */
  inline?: boolean;
  id?: string;
  /** Submitted name/value pair — lets one form carry secondary no-JS actions (e.g. the order builder's add/remove row). */
  name?: string;
  value?: string;
  /** Skip native validation for secondary submits that just re-render the form. */
  formNoValidate?: boolean;
  /** Rendered but inert/invisible — for buttons a JS island shows later (e.g. the order builder's at-cap "Add another fish"). */
  hidden?: boolean;
  /** Extra class(es), appended after the variant classes. */
  class?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
  data?: Record<string, string>;
}>;

function dataAttrs(data?: Record<string, string>): Record<string, string> {
  if (!data) return {};
  const attrs: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    attrs[`data-${key}`] = value;
  }
  return attrs;
}

/** Full-width 58px block by default (§3), visible :focus-visible ring, no motion. */
export const Button: FC<ButtonProps> = ({
  variant = "primary",
  type = "button",
  disabled,
  href,
  inline,
  id,
  name,
  value,
  formNoValidate,
  hidden,
  class: extraClass,
  ariaLabel,
  ariaPressed,
  data,
  children,
}) => {
  const className = [`btn`, `btn-${variant}`, inline ? "btn-inline" : "", extraClass]
    .filter(Boolean)
    .join(" ");
  const shared = {
    id,
    class: className,
    hidden,
    "aria-label": ariaLabel,
    "aria-pressed": ariaPressed === undefined ? undefined : String(ariaPressed),
    ...dataAttrs(data),
  };
  if (href) {
    return (
      <a href={href} {...shared}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} disabled={disabled} name={name} value={value} formnovalidate={formNoValidate} {...shared}>
      {children}
    </button>
  );
};

import type { FC, PropsWithChildren } from "hono/jsx";

type ButtonProps = PropsWithChildren<{
  variant?: "primary" | "secondary" | "ghost";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  href?: string;
}>;

/** 48px min touch target, visible :focus-visible ring, gated press feedback (prefers-reduced-motion). */
export const Button: FC<ButtonProps> = ({
  variant = "primary",
  type = "button",
  disabled,
  href,
  children,
}) => {
  const className = `btn btn-${variant}`;
  if (href) {
    return (
      <a href={href} class={className}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} class={className} disabled={disabled}>
      {children}
    </button>
  );
};

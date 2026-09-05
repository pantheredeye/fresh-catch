import type { FC } from "hono/jsx";

type InputProps = {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  helperText?: string;
  errorText?: string;
};

/** 48px min-height, 16px floor text, 14px floor label/helper/error (never 12px). */
export const Input: FC<InputProps> = ({
  id,
  name,
  label,
  type = "text",
  placeholder,
  required,
  value,
  helperText,
  errorText,
}) => {
  const describedBy = errorText ? `${id}-error` : helperText ? `${id}-helper` : undefined;
  return (
    <div class="field">
      <label class="field-label" for={id}>
        {label}
      </label>
      <input
        class={`field-input${errorText ? " field-input-error" : ""}`}
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        value={value}
        aria-describedby={describedBy}
        aria-invalid={errorText ? "true" : undefined}
      />
      {errorText ? (
        <p class="field-error" id={`${id}-error`} role="alert">
          {errorText}
        </p>
      ) : helperText ? (
        <p class="field-helper" id={`${id}-helper`}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

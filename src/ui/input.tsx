import type { FC } from "hono/jsx";

type InputProps = {
  id: string;
  name: string;
  label: string;
  type?: string;
  inputMode?: "text" | "numeric" | "decimal" | "email" | "tel" | "url" | "search";
  placeholder?: string;
  required?: boolean;
  autofocus?: boolean;
  value?: string;
  min?: string;
  helperText?: string;
  errorText?: string;
};

/** 48px min-height, 16px floor text, 14px floor label/helper/error (never 12px). */
export const Input: FC<InputProps> = ({
  id,
  name,
  label,
  type = "text",
  inputMode,
  placeholder,
  required,
  autofocus,
  value,
  min,
  helperText,
  errorText,
}) => {
  const describedBy = errorText ? `${id}-error` : helperText ? `${id}-helper` : undefined;
  return (
    <div class="field">
      <label class="field-label" for={id}>
        {label}
        {required ? <span class="field-required"> (required)</span> : null}
      </label>
      <input
        class={`field-input${errorText ? " field-input-error" : ""}`}
        id={id}
        name={name}
        type={type}
        inputmode={inputMode}
        placeholder={placeholder}
        required={required}
        autofocus={autofocus}
        value={value}
        min={min}
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

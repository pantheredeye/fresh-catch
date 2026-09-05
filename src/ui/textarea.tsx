import type { FC } from "hono/jsx";

type TextareaProps = {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  rows?: number;
  helperText?: string;
  errorText?: string;
};

/** 48px min-height, 16px floor text, 14px floor label/helper/error (never 12px). */
export const Textarea: FC<TextareaProps> = ({
  id,
  name,
  label,
  placeholder,
  required,
  value,
  rows = 4,
  helperText,
  errorText,
}) => {
  const describedBy = errorText ? `${id}-error` : helperText ? `${id}-helper` : undefined;
  return (
    <div class="field">
      <label class="field-label" for={id}>
        {label}
      </label>
      <textarea
        class={`field-textarea${errorText ? " field-input-error" : ""}`}
        id={id}
        name={name}
        placeholder={placeholder}
        required={required}
        rows={rows}
        aria-describedby={describedBy}
        aria-invalid={errorText ? "true" : undefined}
      >
        {value ?? ""}
      </textarea>
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

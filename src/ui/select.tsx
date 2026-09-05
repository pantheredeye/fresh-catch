import type { FC } from "hono/jsx";

export type SelectOption = { value: string; label: string };

type SelectProps = {
  id: string;
  name: string;
  label: string;
  options: SelectOption[];
  value?: string;
  required?: boolean;
  helperText?: string;
  errorText?: string;
};

/** 48px min-height, 16px floor text, 14px floor label/helper/error (never 12px). */
export const Select: FC<SelectProps> = ({
  id,
  name,
  label,
  options,
  value,
  required,
  helperText,
  errorText,
}) => {
  const describedBy = errorText ? `${id}-error` : helperText ? `${id}-helper` : undefined;
  return (
    <div class="field">
      <label class="field-label" for={id}>
        {label}
      </label>
      <select
        class={`field-select${errorText ? " field-input-error" : ""}`}
        id={id}
        name={name}
        required={required}
        aria-describedby={describedBy}
        aria-invalid={errorText ? "true" : undefined}
      >
        {options.map((opt) => (
          <option value={opt.value} selected={opt.value === value}>
            {opt.label}
          </option>
        ))}
      </select>
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

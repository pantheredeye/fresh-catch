import type { FC } from "hono/jsx";

type FieldsetProps = { legend: string; helperText?: string; children?: unknown };

/** A labelled group of fields — legend styled like `SectionHeading` sm. */
export const Fieldset: FC<FieldsetProps> = ({ legend, helperText, children }) => (
  <fieldset class="fieldset">
    <legend class="fieldset-legend">{legend}</legend>
    {helperText ? <p class="field-helper fieldset-helper">{helperText}</p> : null}
    {children}
  </fieldset>
);

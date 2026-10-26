import type { InputHTMLAttributes } from "react";
import { useId } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({ label, hint, error, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="ds-field">
      <label className="ds-field__label" htmlFor={fieldId}>
        {label}
      </label>
      <input
        id={fieldId}
        className="ds-field__control"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <p id={errorId} className="ds-field__error">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="ds-field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

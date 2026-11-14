import { useId } from "react";

export default function TextArea({ label, hint, error, id, className = "", ...props }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;

  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-[13px] font-semibold text-ink">
        {label}
        {props.required && <span aria-hidden="true" className="ml-1 text-danger">*</span>}
      </label>
      <textarea
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? descriptionId : undefined}
        className={`min-h-28 w-full resize-y rounded border bg-surface px-3 py-2.5 text-sm leading-5 text-ink placeholder:text-muted ${error ? "border-danger" : "border-line"} disabled:cursor-not-allowed disabled:bg-surface-subtle`}
        {...props}
      />
      {(hint || error) && (
        <p id={descriptionId} className={`text-xs ${error ? "text-danger" : "text-muted"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
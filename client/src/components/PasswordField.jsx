import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordField({ label, value, onChange, error, autoComplete, required = true }) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const errorId = `${inputId}-error`;

  return (
    <div className="grid gap-1.5">
      <label htmlFor={inputId} className="text-[13px] font-semibold text-ink">
        {label}{required && <span aria-hidden="true" className="ml-1 text-danger">*</span>}
      </label>
      <div className={`flex min-h-10 items-center rounded border bg-surface ${error ? "border-danger" : "border-line"}`}>
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-ink outline-none focus-visible:outline-none"
        />
        <button
          type="button"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded text-muted hover:bg-surface-subtle hover:text-ink"
        >
          {visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>
      {error && <p id={errorId} className="text-xs text-danger">{error}</p>}
    </div>
  );
}
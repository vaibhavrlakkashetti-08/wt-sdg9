import { Search, X } from "lucide-react";
import { useId } from "react";
import IconButton from "./IconButton.jsx";

export default function SearchField({ label = "Search", value = "", onValueChange, className = "", ...props }) {
  const inputId = useId();
  const hasValue = Boolean(value);

  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-[13px] font-semibold text-ink">{label}</label>
      <div className="flex min-h-10 items-center gap-2 rounded border border-line bg-surface px-3 focus-within:border-accent">
        <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
        <input
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => onValueChange?.(event.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-none"
          {...props}
        />
        {hasValue && (
          <IconButton
            icon={X}
            label="Clear search"
            className="h-8 w-8 !min-h-8"
            onClick={() => onValueChange?.("")}
          />
        )}
      </div>
    </div>
  );
}
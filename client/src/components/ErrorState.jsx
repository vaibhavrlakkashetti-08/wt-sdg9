import { AlertCircle, RefreshCw } from "lucide-react";
import Button from "./Button.jsx";

export default function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <section role="alert" className="flex items-start gap-3 border border-danger/30 bg-surface p-4">
      <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {message && <p className="mt-1 text-sm leading-5 text-copy">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" startIcon={<RefreshCw aria-hidden="true" className="h-4 w-4" />} onClick={onRetry}>
          Retry
        </Button>
      )}
    </section>
  );
}
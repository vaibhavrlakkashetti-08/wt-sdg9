export default function LoadingState({ label = "Loading", rows = 3 }) {
  return (
    <div role="status" aria-label={label} className="animate-pulse space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
          <div className="h-9 w-9 shrink-0 rounded bg-surface-subtle" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-2/5 rounded bg-surface-subtle" />
            <div className="h-3 w-4/5 rounded bg-surface-subtle" />
          </div>
        </div>
      ))}
    </div>
  );
}
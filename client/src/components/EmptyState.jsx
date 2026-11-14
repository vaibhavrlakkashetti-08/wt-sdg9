export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <section className="flex min-h-56 flex-col items-center justify-center border border-dashed border-line bg-surface px-6 py-10 text-center">
      {Icon && (
        <span className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-surface-subtle text-copy">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      )}
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm leading-5 text-copy">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}
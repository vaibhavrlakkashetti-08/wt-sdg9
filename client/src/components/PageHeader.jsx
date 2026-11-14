export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase text-muted">{eyebrow}</p>}
        <h1 className="text-[26px] font-semibold leading-9 text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-5 text-copy">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
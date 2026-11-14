import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import ApiStatus from "../components/ApiStatus.jsx";
import { navigationItems } from "../utils/navigation.js";

export default function OverviewPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
      <section className="py-1 sm:py-2">
        <h2 className="text-base font-semibold text-ink">Workspace</h2>
        <p className="mt-1 text-sm text-copy">Choose a section to continue.</p>
        <nav aria-label="Workspace sections" className="mt-5 divide-y divide-line border-y border-line">
          {navigationItems.slice(1).map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="group flex min-h-14 items-center gap-3 py-3 text-sm font-medium text-copy no-underline hover:text-accent">
              <span className="grid h-8 w-8 place-items-center rounded bg-surface-subtle text-copy group-hover:text-accent">
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="flex-1">{label}</span>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-muted group-hover:text-accent" />
            </Link>
          ))}
        </nav>
      </section>
      <ApiStatus />
    </div>
  );
}
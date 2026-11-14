import { NavLink } from "react-router-dom";
import { navigationItems } from "../utils/navigation.js";

export default function Sidebar({ onNavigate, mobile = false }) {
  return (
    <nav aria-label="Workspace navigation" className={mobile ? "w-full" : "sticky top-16 w-60 shrink-0 self-start py-6 pr-5"}>
      <p className="mb-3 px-3 text-xs font-semibold uppercase text-muted">Workspace</p>
      <div className="grid gap-1">
        {navigationItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) => `flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium no-underline transition-colors ${isActive ? "bg-accent-soft text-accent" : "text-copy hover:bg-surface-subtle hover:text-ink"}`}
          >
            <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
      <div className="mt-7 border-t border-line pt-5">
        <p className="px-3 text-xs leading-5 text-muted">Campus Open Source</p>
      </div>
    </nav>
  );
}
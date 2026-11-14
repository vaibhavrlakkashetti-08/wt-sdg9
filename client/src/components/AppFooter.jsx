import { Link } from "react-router-dom";

export default function AppFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link to="/" className="font-semibold text-copy no-underline hover:text-ink">Campus Open Source</Link>
        <span>Campus projects, built together</span>
      </div>
    </footer>
  );
}
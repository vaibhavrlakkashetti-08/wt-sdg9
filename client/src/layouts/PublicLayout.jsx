import { Outlet } from "react-router-dom";
import AppFooter from "../components/AppFooter.jsx";
import AppHeader from "../components/AppHeader.jsx";

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <a href="#main-content" className="sr-only z-50 rounded bg-surface px-4 py-2 text-accent focus:not-sr-only focus:absolute focus:left-4 focus:top-4">Skip to content</a>
      <AppHeader />
      <main id="main-content" className="mx-auto flex w-full max-w-[1440px] flex-1 items-start justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}
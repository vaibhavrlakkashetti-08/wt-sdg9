import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppFooter from "../components/AppFooter.jsx";
import AppHeader from "../components/AppHeader.jsx";
import Modal from "../components/Modal.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { routeTitles } from "../utils/navigation.js";

export default function AppShell() {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { pathname } = useLocation();
  const pageTitle = routeTitles[pathname];

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <a href="#main-content" className="sr-only z-50 rounded bg-surface px-4 py-2 text-accent focus:not-sr-only focus:absolute focus:left-4 focus:top-4">
        Skip to content
      </a>
      <AppHeader onMenuClick={() => setNavigationOpen(true)} />
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 px-4 sm:px-6 lg:px-8">
        <aside className="hidden lg:block">
          <Sidebar />
        </aside>
        <main id="main-content" className="min-w-0 flex-1 py-6 sm:py-8 lg:pl-8">
          {pageTitle && <PageHeader eyebrow="Workspace" title={pageTitle} />}
          <Outlet />
        </main>
      </div>
      <AppFooter />
      <Modal open={navigationOpen} onClose={() => setNavigationOpen(false)} title="Navigation" className="lg:hidden">
        <Sidebar mobile onNavigate={() => setNavigationOpen(false)} />
      </Modal>
    </div>
  );
}
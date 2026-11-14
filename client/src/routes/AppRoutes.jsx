import { Route, Routes } from "react-router-dom";
import AppShell from "../layouts/AppShell.jsx";
import PublicLayout from "../layouts/PublicLayout.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import IssueDetailPage from "../features/issues/IssueDetailPage.jsx";
import IssueFormPage from "../features/issues/IssueFormPage.jsx";
import IssueListPage from "../features/issues/IssueListPage.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import OverviewPage from "../pages/OverviewPage.jsx";
import PlaceholderPage from "../pages/PlaceholderPage.jsx";
import RegisterPage from "../pages/RegisterPage.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>
      <Route element={<AppShell />}>
        <Route element={<ProtectedRoute />}>
          <Route index element={<OverviewPage />} />
          <Route path="projects" element={<PlaceholderPage title="Project discovery" />} />
          <Route path="my-projects" element={<PlaceholderPage title="My projects" />} />
          <Route path="contributions" element={<PlaceholderPage title="Contributions" />} />
          <Route element={<ProtectedRoute allowedRoles={["student", "admin"]} />}>
            <Route path="issues" element={<IssueListPage />} />
            <Route path="issues/new" element={<IssueFormPage />} />
            <Route path="issues/:issueId/edit" element={<IssueFormPage mode="edit" />} />
            <Route path="issues/:issueId" element={<IssueDetailPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
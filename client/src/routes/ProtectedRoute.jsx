import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import Button from "../components/Button.jsx";
import ErrorState from "../components/ErrorState.jsx";
import LoadingState from "../components/LoadingState.jsx";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, status, refresh } = useAuth();
  const location = useLocation();

  if (status === "loading") return <main className="mx-auto max-w-3xl px-5 py-12"><LoadingState label="Checking session" /></main>;
  if (status === "error") {
    return <main className="mx-auto max-w-3xl px-5 py-12"><ErrorState title="Session unavailable" message="Your session could not be verified." onRetry={refresh} /></main>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-12">
        <ErrorState title="Access denied" message="Your account does not have permission to access this area." />
        <div className="mt-4"><Button as={Link} to="/">Return to overview</Button></div>
      </main>
    );
  }
  return <Outlet />;
}
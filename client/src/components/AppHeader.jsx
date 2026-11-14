import { Link } from "react-router-dom";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Code2, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme.js";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";
import Button from "./Button.jsx";
import IconButton from "./IconButton.jsx";

export default function AppHeader({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const { user, status, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      notify("Signed out.", { tone: "success" });
      navigate("/login", { replace: true });
    } catch {
      notify("Could not sign out. Check your connection and try again.", { tone: "error" });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        {onMenuClick && <IconButton icon={Menu} label="Open navigation" onClick={onMenuClick} className="lg:hidden" />}
        <Link to="/" className="flex min-w-0 items-center gap-3 rounded-sm text-ink no-underline">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent text-white">
            <Code2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold leading-5">Campus Open Source</span>
            <span className="hidden text-xs leading-4 text-muted sm:block">Student workspace</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden border-l border-line pl-4 text-sm text-copy md:block">Campus projects</span>
          {user ? (
            <>
              <span className="hidden max-w-36 truncate text-sm font-medium text-copy sm:block">{user.name}</span>
              <Button variant="quiet" size="sm" loading={loggingOut} startIcon={<LogOut aria-hidden="true" className="h-4 w-4" />} onClick={handleLogout}>
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : status === "anonymous" || status === "error" ? (
            <>
              <Button as={Link} to="/login" variant="secondary" size="sm">Sign in</Button>
              <Button as={Link} to="/register" size="sm" className="hidden sm:inline-flex">Create account</Button>
            </>
          ) : null}
          <IconButton icon={ThemeIcon} label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} onClick={toggleTheme} />
        </div>
      </div>
    </header>
  );
}
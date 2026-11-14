import { Compass, GitPullRequest, LayoutDashboard, ListChecks, PanelsTopLeft } from "lucide-react";

export const navigationItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/projects", label: "Explore projects", icon: Compass },
  { to: "/my-projects", label: "My projects", icon: PanelsTopLeft },
  { to: "/issues", label: "Issues", icon: ListChecks },
  { to: "/contributions", label: "Contributions", icon: GitPullRequest },
];

export const routeTitles = Object.fromEntries(navigationItems.map(({ to, label }) => [to, label]));
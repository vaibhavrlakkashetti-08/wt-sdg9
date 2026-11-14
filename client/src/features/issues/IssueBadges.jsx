import { Bug, Lightbulb } from "lucide-react";
import { issuePriorityLabel, issueStatusLabel, issueTypeLabel } from "./issueFormatters.js";

const statusStyles = {
  open: "bg-surface-subtle text-copy",
  triaged: "bg-surface-subtle text-copy",
  in_progress: "bg-accent-soft text-accent",
  resolved: "bg-success/10 text-success",
  closed: "bg-surface-subtle text-muted",
  rejected: "bg-danger/10 text-danger",
};

const priorityStyles = {
  low: "text-copy",
  medium: "text-warning",
  high: "text-danger",
  urgent: "text-danger",
};

export function IssueStatusBadge({ status }) {
  return (
    <span className={`inline-flex min-h-6 items-center rounded px-2 text-xs font-semibold ${statusStyles[status] ?? statusStyles.open}`}>
      {issueStatusLabel(status)}
    </span>
  );
}

export function IssueTypeLabel({ type }) {
  const Icon = type === "feature" ? Lightbulb : Bug;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-copy">
      <Icon aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
      {issueTypeLabel(type)}
    </span>
  );
}

export function IssuePriorityLabel({ priority }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold ${priorityStyles[priority] ?? "text-copy"}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${priority === "urgent" || priority === "high" ? "bg-danger" : priority === "medium" ? "bg-warning" : "bg-muted"}`} />
      {issuePriorityLabel(priority)}
    </span>
  );
}
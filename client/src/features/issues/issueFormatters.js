export const issueStatusOptions = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export const issuePriorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function issueStatusLabel(status) {
  if (status === "triaged") return "Open";
  if (status === "rejected") return "Closed";
  return issueStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function editableIssueStatus(status) {
  if (status === "triaged") return "open";
  if (status === "rejected") return "closed";
  return status;
}

export function issuePriorityLabel(priority) {
  return priority === "urgent" ? "High" : `${priority.charAt(0).toUpperCase()}${priority.slice(1)}`;
}

export function issueTypeLabel(type) {
  return type === "feature" ? "Feature request" : "Bug";
}

export function displayName(person) {
  if (!person) return "Unassigned";
  return person.name ?? "Unknown user";
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}
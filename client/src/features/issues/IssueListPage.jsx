import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Button from "../../components/Button.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import SearchField from "../../components/SearchField.jsx";
import SelectField from "../../components/SelectField.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { getApiErrorMessage } from "../../services/platformApi.js";
import { listIssues } from "../../services/issueApi.js";
import { displayName, formatDate } from "./issueFormatters.js";
import { IssuePriorityLabel, IssueStatusBadge, IssueTypeLabel } from "./IssueBadges.jsx";

const pageSize = 20;

function AuthNotice({ status }) {
  const message = status === "error" ? "Your session could not be checked. Try reloading the page." : "Sign in to browse campus issues.";
  return <ErrorState title="Authentication required" message={message} />;
}

function IssueTable({ issues }) {
  return (
    <div className="hidden overflow-x-auto border-y border-line md:block">
      <table className="w-full min-w-[850px] border-collapse text-left">
        <thead className="bg-surface-subtle text-xs font-semibold uppercase text-muted">
          <tr>
            <th scope="col" className="px-3 py-3">Issue</th>
            <th scope="col" className="px-3 py-3">Type</th>
            <th scope="col" className="px-3 py-3">Priority</th>
            <th scope="col" className="px-3 py-3">Status</th>
            <th scope="col" className="px-3 py-3">Reporter</th>
            <th scope="col" className="px-3 py-3">Assignee</th>
            <th scope="col" className="px-3 py-3">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-surface">
          {issues.map((issue) => (
            <tr key={issue._id} className="hover:bg-surface-subtle/70">
              <td className="max-w-[320px] px-3 py-3">
                <Link to={`/issues/${issue._id}`} className="block truncate text-sm font-semibold text-ink no-underline hover:text-accent">
                  {issue.title}
                </Link>
                <span className="mt-0.5 block truncate text-xs text-muted">{issue.project?.title ?? "Project"}</span>
              </td>
              <td className="px-3 py-3"><IssueTypeLabel type={issue.type} /></td>
              <td className="px-3 py-3"><IssuePriorityLabel priority={issue.priority} /></td>
              <td className="px-3 py-3"><IssueStatusBadge status={issue.status} /></td>
              <td className="px-3 py-3 text-sm text-copy">{displayName(issue.reporter)}</td>
              <td className="px-3 py-3 text-sm text-copy">{displayName(issue.assignee)}</td>
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted">{formatDate(issue.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IssueCards({ issues }) {
  return (
    <ul className="grid list-none gap-3 p-0 md:hidden">
      {issues.map((issue) => (
        <li key={issue._id} className="border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <IssueTypeLabel type={issue.type} />
            <IssueStatusBadge status={issue.status} />
          </div>
          <Link to={`/issues/${issue._id}`} className="mt-3 block text-base font-semibold leading-6 text-ink no-underline hover:text-accent">
            {issue.title}
          </Link>
          <p className="mt-1 text-xs text-muted">{issue.project?.title ?? "Project"} · {formatDate(issue.createdAt)}</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-3">
            <IssuePriorityLabel priority={issue.priority} />
            <span className="text-xs text-copy">Reporter: {displayName(issue.reporter)}</span>
            <span className="text-xs text-copy">Assignee: {displayName(issue.assignee)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function IssueListPage() {
  const { user, status: authStatus } = useAuth();
  const [issues, setIssues] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 0 });
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadState, setLoadState] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (authStatus === "loading") return undefined;
    if (!user) {
      setLoadState("anonymous");
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadState("loading");
      setErrorMessage("");
      const params = { page, limit: pageSize, sort: "newest" };
      if (status) params.status = status;
      if (type) params.type = type;
      if (priority) params.priority = priority;
      if (assignee) params.assignee = assignee;
      if (search.trim()) params.search = search.trim();

      try {
        const result = await listIssues(params, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setIssues(result.data.issues);
        setMeta(result.meta);
        setLoadState("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorMessage(getApiErrorMessage(error, "Issues could not be loaded."));
        setLoadState("error");
      }
    }, search ? 250 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [authStatus, user, status, type, priority, assignee, search, page, reloadKey]);

  const resetFilters = () => {
    setStatus("");
    setType("");
    setPriority("");
    setAssignee("");
    setSearch("");
    setPage(1);
  };

  if (authStatus === "loading" || loadState === "loading" && !user) return <LoadingState label="Checking session" />;
  if (!user) return <AuthNotice status={authStatus} />;
  if (loadState === "loading") return <LoadingState label="Loading issues" rows={6} />;
  if (loadState === "error") return <ErrorState title="Issues could not be loaded" message={errorMessage} onRetry={() => setReloadKey((key) => key + 1)} />;

  const assignees = [...new Map(issues.filter((issue) => issue.assignee).map((issue) => [issue.assignee._id, issue.assignee])).values()];
  const hasFilters = Boolean(status || type || priority || assignee || search);

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <Button as={Link} to="/issues/new" startIcon={<Plus aria-hidden="true" className="h-4 w-4" />}>Create issue</Button>
      </div>
      <section aria-label="Issue filters" className="mb-5 grid gap-3 border-y border-line py-4 sm:grid-cols-2 xl:grid-cols-5">
        <SearchField label="Search issues" value={search} onValueChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search titles and descriptions" className="sm:col-span-2 xl:col-span-1" />
        <SelectField label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </SelectField>
        <SelectField label="Type" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}>
          <option value="">All types</option>
          <option value="bug">Bug</option>
          <option value="feature">Feature request</option>
        </SelectField>
        <SelectField label="Priority" value={priority} onChange={(event) => { setPriority(event.target.value); setPage(1); }}>
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </SelectField>
        <SelectField label="Assignee" value={assignee} onChange={(event) => { setAssignee(event.target.value); setPage(1); }}>
          <option value="">All assignees</option>
          {assignees.map((person) => <option key={person._id} value={person._id}>{displayName(person)}</option>)}
        </SelectField>
      </section>

      {issues.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No matching issues" : "No issues found"}
          description={hasFilters ? "Try changing or clearing the filters." : "Issues from projects you can access will appear here."}
          action={hasFilters ? <Button variant="secondary" onClick={resetFilters}>Clear filters</Button> : undefined}
        />
      ) : (
        <>
          <IssueTable issues={issues} />
          <IssueCards issues={issues} />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">{meta.total} {meta.total === 1 ? "issue" : "issues"}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} startIcon={<ChevronLeft aria-hidden="true" className="h-4 w-4" />} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
              <span className="min-w-16 text-center text-xs text-copy">{page} / {Math.max(meta.totalPages, 1)}</span>
              <Button variant="secondary" size="sm" disabled={page >= meta.totalPages} endIcon={<ChevronRight aria-hidden="true" className="h-4 w-4" />} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
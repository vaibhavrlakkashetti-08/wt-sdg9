import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit3, MessageSquare, Trash2 } from "lucide-react";
import Button from "../../components/Button.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import Modal from "../../components/Modal.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import TextArea from "../../components/TextArea.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";
import { createIssueComment, getIssue, getProject, listIssueActivity, listIssueComments } from "../../services/issueApi.js";
import { getApiErrorMessage, platformApi } from "../../services/platformApi.js";
import { displayName, formatDate } from "./issueFormatters.js";
import { IssuePriorityLabel, IssueStatusBadge, IssueTypeLabel } from "./IssueBadges.jsx";

function referenceId(reference) {
  return reference?._id ?? reference?.id ?? reference ?? "";
}

function ownsProject(project, user) {
  return user?.role === "admin" || referenceId(project?.owner) === user?.id;
}

function isMember(project, user) {
  return (project?.members ?? []).some((membership) => referenceId(membership.student) === user?.id);
}

function AuthRequired() {
  return <ErrorState title="Sign in required" message="Sign in with your campus account to view issue details." />;
}

function ActivityList({ events }) {
  if (!events.length) return <p className="text-sm text-muted">No activity recorded.</p>;

  return (
    <ol className="relative ml-2 grid list-none gap-5 border-l border-line p-0">
      {events.map((event) => (
        <li key={event.id} className="relative pl-5">
          <span aria-hidden="true" className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />
          <p className="text-sm leading-5 text-ink">{event.summary}</p>
          <p className="mt-1 text-xs text-muted">
            {event.actor?.name ? `${event.actor.name} · ` : ""}{formatDate(event.createdAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}

export default function IssueDetailPage() {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const { user, status: authStatus } = useAuth();
  const { notify } = useToast();
  const [issue, setIssue] = useState(null);
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [commentsAllowed, setCommentsAllowed] = useState(true);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [loadState, setLoadState] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (authStatus === "loading") return undefined;
    if (!user) {
      setLoadState("anonymous");
      return undefined;
    }

    const controller = new AbortController();
    setLoadState("loading");
    setErrorMessage("");

    async function loadIssue() {
      try {
        const issueData = await getIssue(issueId, { signal: controller.signal });
        const projectId = referenceId(issueData.project);
        const [projectData, activityResult, commentResult] = await Promise.all([
          getProject(projectId, { signal: controller.signal }),
          listIssueActivity(issueId, { signal: controller.signal }),
          listIssueComments(issueId, { signal: controller.signal }).catch((error) => {
            if (error.response?.status === 403) return null;
            throw error;
          }),
        ]);
        if (controller.signal.aborted) return;
        setIssue(issueData);
        setProject(projectData);
        setActivity(activityResult.data.activity);
        setCommentsAllowed(Boolean(commentResult));
        setComments(commentResult?.data.comments ?? []);
        setLoadState("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorMessage(getApiErrorMessage(error, "Issue details could not be loaded."));
        setLoadState("error");
      }
    }

    loadIssue();
    return () => controller.abort();
  }, [authStatus, user, issueId]);

  async function submitComment(event) {
    event.preventDefault();
    if (!comment.trim()) {
      setCommentError("Enter a comment before posting.");
      return;
    }
    setCommentSaving(true);
    setCommentError("");
    try {
      const created = await createIssueComment(issueId, comment.trim());
      const author = { id: user.id, name: user.name, profileImage: user.profileImage };
      setComments((current) => [...current, { ...created, author }]);
      setComment("");
      notify("Comment added.", { tone: "success" });
    } catch (error) {
      setCommentError(getApiErrorMessage(error, "Comment could not be added."));
    } finally {
      setCommentSaving(false);
    }
  }

  async function confirmDeleteComment() {
    if (!commentToDelete) return;
    setDeletingComment(true);
    try {
      await platformApi.delete(`/comments/${commentToDelete._id}`);
      setComments((current) => current.filter((item) => item._id !== commentToDelete._id));
      notify("Comment deleted.", { tone: "success" });
      setCommentToDelete(null);
    } catch (error) {
      setCommentError(getApiErrorMessage(error, "Comment could not be deleted."));
      setCommentToDelete(null);
    } finally {
      setDeletingComment(false);
    }
  }

  if (authStatus === "loading" || loadState === "loading") return <LoadingState label="Loading issue details" rows={6} />;
  if (!user || loadState === "anonymous") return <AuthRequired />;
  if (loadState === "error") return <ErrorState title="Issue unavailable" message={errorMessage} onRetry={() => navigate(0)} />;
  if (!issue || !project) return null;

  const manager = ownsProject(project, user);
  const reporterCanEdit = referenceId(issue.reporter) === user.id && issue.status === "open";
  const canEdit = manager || reporterCanEdit;
  const canComment = manager || isMember(project, user);
  const commentsEnabled = !["closed", "rejected"].includes(issue.status);
  const projectOwnerName = project.owner?.name ?? "Project owner";

  return (
    <div>
      <PageHeader
        eyebrow={`Issue · ${issue._id.slice(-6)}`}
        title={issue.title}
        description={`${project.title} · Reported ${formatDate(issue.createdAt)}`}
        actions={(
          <>
            <Button as={Link} to="/issues" variant="secondary" startIcon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}>Issues</Button>
            {canEdit && <Button as={Link} to={`/issues/${issueId}/edit`} startIcon={<Edit3 aria-hidden="true" className="h-4 w-4" />}>Edit issue</Button>}
          </>
        )}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <section aria-label="Issue description" className="border-b border-line pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <IssueTypeLabel type={issue.type} />
              <IssuePriorityLabel priority={issue.priority} />
              <IssueStatusBadge status={issue.status} />
            </div>
            <h2 className="mt-5 text-base font-semibold text-ink">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-copy">{issue.description}</p>
          </section>

          <section aria-labelledby="comments-title" className="mt-7">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare aria-hidden="true" className="h-4 w-4 text-muted" />
              <h2 id="comments-title" className="text-base font-semibold text-ink">Comments</h2>
              <span className="text-xs text-muted">{comments.length}</span>
            </div>
            {!commentsAllowed ? (
              <p className="border-l-2 border-line py-1 pl-3 text-sm text-copy">Comments are limited to project members.</p>
            ) : (
              <>
                {comments.length === 0 ? (
                  <EmptyState title="No comments yet" description="Discussion will appear here." />
                ) : (
                  <ul className="grid list-none divide-y divide-line border-y border-line p-0">
                    {comments.map((item) => {
                      const authorId = referenceId(item.author);
                      const canDelete = manager || authorId === user.id;
                      return (
                        <li key={item._id} className="flex gap-3 py-4">
                          <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-subtle text-xs font-semibold text-copy">
                            {(item.author?.name ?? "?").slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <span className="text-sm font-semibold text-ink">{displayName(item.author)}</span>
                              <time className="text-xs text-muted" dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-copy">{item.content}</p>
                          </div>
                          {canDelete && (
                            <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded text-muted hover:bg-danger/10 hover:text-danger" aria-label={`Delete comment by ${displayName(item.author)}`} onClick={() => setCommentToDelete(item)}>
                              <Trash2 aria-hidden="true" className="h-4 w-4" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {commentsEnabled ? (
                  <form onSubmit={submitComment} className="mt-5 grid gap-3">
                    {commentError && <p role="alert" className="text-sm text-danger">{commentError}</p>}
                    <TextArea label="Add a comment" value={comment} onChange={(event) => { setComment(event.target.value); setCommentError(""); }} rows={3} maxLength={10000} placeholder="Share a useful update or question." error={commentError && commentError.startsWith("Enter") ? commentError : undefined} />
                    <div className="flex justify-end">
                      <Button type="submit" loading={commentSaving} startIcon={<MessageSquare aria-hidden="true" className="h-4 w-4" />}>Comment</Button>
                    </div>
                  </form>
                ) : <p className="mt-4 text-sm text-muted">Comments are closed for this issue.</p>}
              </>
            )}
          </section>
        </div>

        <aside className="grid gap-6 xl:border-l xl:border-line xl:pl-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink">Details</h2>
            <dl className="grid gap-3 text-sm">
              <div className="flex items-start justify-between gap-4"><dt className="text-muted">Reporter</dt><dd className="m-0 text-right font-medium text-copy">{displayName(issue.reporter)}</dd></div>
              <div className="flex items-start justify-between gap-4"><dt className="text-muted">Assignee</dt><dd className="m-0 text-right font-medium text-copy">{displayName(issue.assignee)}</dd></div>
              <div className="flex items-start justify-between gap-4"><dt className="text-muted">Created</dt><dd className="m-0 text-right text-copy">{formatDate(issue.createdAt)}</dd></div>
              <div className="flex items-start justify-between gap-4"><dt className="text-muted">Updated</dt><dd className="m-0 text-right text-copy">{formatDate(issue.updatedAt)}</dd></div>
              <div className="flex items-start justify-between gap-4"><dt className="text-muted">Owner</dt><dd className="m-0 text-right text-copy">{projectOwnerName}</dd></div>
            </dl>
            {canEdit && <Link to={`/issues/${issueId}/edit`} className="mt-4 inline-flex text-sm font-semibold text-accent no-underline hover:underline">Manage issue</Link>}
          </section>

          <section className="border-t border-line pt-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">Activity</h2>
            {activity.length === 0 ? <p className="text-sm text-muted">No activity recorded.</p> : (
              <ol className="relative ml-2 grid list-none gap-5 border-l border-line p-0">
                {activity.map((event) => (
                  <li key={event.id} className="relative pl-5">
                    <span aria-hidden="true" className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-accent" />
                    <p className="text-sm leading-5 text-copy">{event.summary}</p>
                    <p className="mt-1 text-xs text-muted">{event.actor?.name ? `${event.actor.name} · ` : ""}{formatDate(event.createdAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>

      <Modal
        open={Boolean(commentToDelete)}
        onClose={() => !deletingComment && setCommentToDelete(null)}
        title="Delete comment?"
        description="This comment will be permanently removed."
        actions={(
          <>
            <Button variant="secondary" disabled={deletingComment} onClick={() => setCommentToDelete(null)}>Cancel</Button>
            <Button variant="danger" loading={deletingComment} onClick={confirmDeleteComment}>Delete comment</Button>
          </>
        )}
      >
        {commentToDelete && <p className="text-sm text-copy">Comment by {displayName(commentToDelete.author)} will be deleted.</p>}
      </Modal>
    </div>
  );
}

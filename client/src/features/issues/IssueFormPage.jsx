import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bug, Lightbulb, Save } from "lucide-react";
import Button from "../../components/Button.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SelectField from "../../components/SelectField.jsx";
import TextArea from "../../components/TextArea.jsx";
import TextField from "../../components/TextField.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";
import { createIssue, getIssue, getProject, listProjects, updateIssue } from "../../services/issueApi.js";
import { getApiErrorMessage } from "../../services/platformApi.js";
import { editableIssueStatus } from "./issueFormatters.js";

const initialValues = {
  projectId: "",
  title: "",
  description: "",
  type: "bug",
  priority: "medium",
  status: "open",
  assignee: "",
};

function referenceId(reference) {
  return reference?._id ?? reference?.id ?? reference ?? "";
}

function hasManagementAccess(user, issue, project) {
  return user?.role === "admin" || referenceId(project?.owner) === user?.id;
}

function AuthRequired() {
  return <ErrorState title="Sign in required" message="Sign in with your campus account to create or edit issues." />;
}

function IssueTypePicker({ value, onChange }) {
  const types = [
    { value: "bug", label: "Bug", description: "Report something that is not working.", icon: Bug },
    { value: "feature", label: "Feature request", description: "Suggest a new capability.", icon: Lightbulb },
  ];

  return (
    <fieldset className="grid gap-2 border-0 p-0">
      <legend className="text-[13px] font-semibold text-ink">Issue type</legend>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Issue type">
        {types.map(({ value: type, label, description, icon: Icon }) => (
          <label key={type} className={`flex min-h-[76px] cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${value === type ? "border-accent bg-accent-soft" : "border-line bg-surface hover:bg-surface-subtle"}`}>
            <input
              type="radio"
              name="issue-type"
              value={type}
              checked={value === type}
              onChange={() => onChange(type)}
              className="mt-1 accent-accent"
            />
            <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${value === type ? "text-accent" : "text-muted"}`} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{label}</span>
              <span className="mt-0.5 block text-xs leading-4 text-copy">{description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function IssueFormPage({ mode = "create" }) {
  const isCreate = mode === "create";
  const { issueId } = useParams();
  const [searchParams] = useSearchParams();
  const preselectedProjectId = searchParams.get("projectId") ?? "";
  const navigate = useNavigate();
  const { user, status: authStatus } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState(initialValues);
  const [original, setOriginal] = useState(initialValues);
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [issue, setIssue] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (authStatus === "loading") return undefined;
    if (!user) {
      setLoadState("anonymous");
      return undefined;
    }

    const controller = new AbortController();
    setLoadState("loading");
    setLoadError("");

    async function loadFormData() {
      try {
        if (isCreate) {
          const response = await listProjects({ limit: 100 }, { signal: controller.signal });
          let availableProjects = response.data.projects;
          if (preselectedProjectId && !availableProjects.some((item) => referenceId(item) === preselectedProjectId)) {
            try {
              const selectedProject = await getProject(preselectedProjectId, { signal: controller.signal });
              availableProjects = [...availableProjects, selectedProject];
            } catch {
              // The project selector stays limited to projects returned by the API.
            }
          }
          const selectedProjectId = preselectedProjectId || (availableProjects.length === 1 ? referenceId(availableProjects[0]) : "");
          setProjects(availableProjects);
          setForm((current) => ({ ...current, projectId: selectedProjectId }));
          setLoadState("ready");
          return;
        }

        const issueData = await getIssue(issueId, { signal: controller.signal });
        const projectId = referenceId(issueData.project);
        const projectData = await getProject(projectId, { signal: controller.signal });
        const values = {
          projectId,
          title: issueData.title ?? "",
          description: issueData.description ?? "",
          type: issueData.type ?? "bug",
          priority: issueData.priority === "urgent" ? "high" : issueData.priority ?? "medium",
          status: editableIssueStatus(issueData.status),
          assignee: referenceId(issueData.assignee),
        };
        setIssue(issueData);
        setProject(projectData);
        setForm(values);
        setOriginal(values);
        setLoadState("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(getApiErrorMessage(error, "Issue form data could not be loaded."));
        setLoadState("error");
      }
    }

    loadFormData();
    return () => controller.abort();
  }, [authStatus, user, isCreate, issueId, preselectedProjectId]);

  const manager = !isCreate && hasManagementAccess(user, issue, project);
  const reporterCanEdit = !isCreate && referenceId(issue?.reporter) === user?.id && issue?.status === "open";
  const canEdit = isCreate || manager || reporterCanEdit;
  const members = (project?.members ?? []).map((membership) => membership.student).filter(Boolean);
  const people = [project?.owner, ...members].filter((person) => person && referenceId(person));
  const assigneeOptions = [...new Map(people.map((person) => [referenceId(person), person])).values()];

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError("");
  }

  function applyValidationErrors(error) {
    const details = error?.response?.data?.error?.details ?? [];
    const nextErrors = Object.fromEntries(details.filter((detail) => detail.location === "body").map((detail) => [detail.field, detail.message]));
    setFieldErrors(nextErrors);
    setFormError(getApiErrorMessage(error, "Please review the form and try again."));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setFieldErrors({});

    if (!form.title.trim() || !form.description.trim() || (isCreate && !form.projectId)) {
      setFormError("Complete the required fields before saving.");
      return;
    }
    if (!canEdit) {
      setFormError("You do not have permission to edit this issue.");
      return;
    }

    setSaving(true);
    try {
      if (isCreate) {
        const created = await createIssue({
          projectId: form.projectId,
          title: form.title.trim(),
          description: form.description.trim(),
          type: form.type,
          priority: form.priority,
        });
        notify("Issue created.", { tone: "success" });
        navigate(`/issues/${created._id ?? created.id}`);
        return;
      }

      const changes = {};
      for (const field of ["title", "description"]) {
        if (form[field] !== original[field]) changes[field] = form[field].trim();
      }
      if (manager) {
        for (const field of ["priority", "status", "assignee"]) {
          if (form[field] !== original[field]) changes[field] = field === "assignee" && !form[field] ? null : form[field];
        }
      }
      if (Object.keys(changes).length === 0) {
        setFormError("There are no changes to save.");
        setSaving(false);
        return;
      }

      await updateIssue(issueId, changes);
      notify("Issue updated.", { tone: "success" });
      navigate(`/issues/${issueId}`);
    } catch (error) {
      applyValidationErrors(error);
    } finally {
      setSaving(false);
    }
  }

  if (authStatus === "loading" || loadState === "loading") return <LoadingState label={isCreate ? "Loading projects" : "Loading issue"} rows={4} />;
  if (!user || loadState === "anonymous") return <AuthRequired />;
  if (loadState === "error") return <ErrorState title="Issue form unavailable" message={loadError} />;
  if (!isCreate && !canEdit) return <ErrorState title="You cannot edit this issue" message="Only the issue reporter can edit an open issue. Project owners and administrators can manage issue fields." />;
  if (isCreate && projects.length === 0) {
    return <EmptyState title="No accessible projects" description="An approved project must be available to create an issue." action={<Button as={Link} to="/issues" variant="secondary">Back to issues</Button>} />;
  }

  return (
    <div className="max-w-[760px]">
      <PageHeader
        eyebrow={isCreate ? "New issue" : `Issue · ${issueId.slice(-6)}`}
        title={isCreate ? "Create issue" : "Edit issue"}
        description={isCreate ? "Report a bug or request a feature in an approved project." : `Project: ${project?.title ?? "Project"}`}
        actions={<Button as={Link} to={isCreate ? "/issues" : `/issues/${issueId}`} variant="secondary" startIcon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}>Cancel</Button>}
      />
      <form onSubmit={handleSubmit} noValidate className="grid gap-5">
        {formError && <ErrorState title="Unable to save issue" message={formError} />}
        {isCreate && (
          <SelectField label="Project" value={form.projectId} onChange={(event) => updateField("projectId", event.target.value)} required error={fieldErrors.projectId}>
            <option value="">Select a project</option>
            {projects.map((item) => <option key={referenceId(item)} value={referenceId(item)}>{item.title}</option>)}
          </SelectField>
        )}
        {isCreate && <IssueTypePicker value={form.type} onChange={(value) => updateField("type", value)} />}
        <TextField
          label="Title"
          value={form.title}
          onChange={(event) => updateField("title", event.target.value)}
          placeholder="Summarize the issue"
          minLength={3}
          maxLength={200}
          required
          error={fieldErrors.title}
        />
        <TextArea
          label="Description"
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="Include the context needed to understand the issue."
          minLength={10}
          maxLength={20000}
          rows={7}
          required
          error={fieldErrors.description}
        />
        {(isCreate || manager) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Priority" value={form.priority} onChange={(event) => updateField("priority", event.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </SelectField>
            {!isCreate && manager && (
              <SelectField label="Status" value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </SelectField>
            )}
          </div>
        )}
        {!isCreate && manager && (
          <SelectField label="Assignee" value={form.assignee} onChange={(event) => updateField("assignee", event.target.value)}>
            <option value="">Unassigned</option>
            {assigneeOptions.map((person) => <option key={referenceId(person)} value={referenceId(person)}>{person.name}</option>)}
          </SelectField>
        )}
        <div className="flex justify-end border-t border-line pt-4">
          <Button type="submit" loading={saving} startIcon={<Save aria-hidden="true" className="h-4 w-4" />}>
            {isCreate ? "Create issue" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

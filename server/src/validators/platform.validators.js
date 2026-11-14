import mongoose from "mongoose";

const PROJECT_STATUSES = ["pending", "approved", "rejected", "archived"];
const ISSUE_STATUSES = ["open", "triaged", "in_progress", "resolved", "closed", "rejected"];
const ISSUE_TYPES = ["bug", "feature"];
const ISSUE_PRIORITIES = ["low", "medium", "high", "urgent"];
const CONTRIBUTION_TYPES = ["bug_fix", "feature", "documentation", "testing", "design", "other"];

function objectErrors(value, allowedFields, label = "body") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [{ field: label, message: "Must be an object." }];
  }
  return Object.keys(value)
    .filter((key) => !allowedFields.includes(key))
    .map((key) => ({ field: key, message: "Unknown field." }));
}

function stringError(value, field, { required = false, min = 0, max = 10000 } = {}) {
  if (value === undefined || value === null) {
    return required ? { field, message: "This field is required." } : undefined;
  }
  if (typeof value !== "string") return { field, message: "Must be a string." };
  const trimmed = value.trim();
  if (required && trimmed.length === 0) return { field, message: "This field is required." };
  if (trimmed.length < min) return { field, message: `Must contain at least ${min} characters.` };
  if (trimmed.length > max) return { field, message: `Must contain no more than ${max} characters.` };
}

function enumError(value, field, choices, required = false) {
  if (value === undefined || value === null) {
    return required ? { field, message: "This field is required." } : undefined;
  }
  if (!choices.includes(value)) return { field, message: `Must be one of: ${choices.join(", ")}.` };
}

function urlError(value, field, required = false) {
  const textError = stringError(value, field, { required, max: 2048 });
  if (textError) return textError;
  if (value === undefined || value === null || value === "") return;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported protocol");
  } catch {
    return { field, message: "Must be a valid HTTP or HTTPS URL." };
  }
}

function paginationErrors(query) {
  const errors = [];
  for (const field of ["page", "limit"]) {
    if (query[field] === undefined) continue;
    const value = Number(query[field]);
    const max = field === "limit" ? 100 : Number.MAX_SAFE_INTEGER;
    if (!Number.isInteger(value) || value < 1 || value > max) {
      errors.push({ field, message: field === "limit" ? "Must be an integer from 1 to 100." : "Must be a positive integer." });
    }
  }
  return errors;
}

function add(errors, error) {
  if (error) errors.push(error);
}

export function validateProjectCreateBody(body) {
  const errors = objectErrors(body, ["title", "description", "repositoryUrl", "technologies", "visibility"]);
  add(errors, stringError(body?.title, "title", { required: true, min: 3, max: 120 }));
  add(errors, stringError(body?.description, "description", { required: true, min: 20 }));
  add(errors, urlError(body?.repositoryUrl, "repositoryUrl", true));
  add(errors, enumError(body?.visibility, "visibility", ["public", "private"]));
  if (body?.technologies !== undefined && (!Array.isArray(body.technologies) || body.technologies.length > 30 || body.technologies.some((item) => typeof item !== "string" || item.trim().length === 0 || item.trim().length > 40))) {
    errors.push({ field: "technologies", message: "Must be an array of up to 30 non-empty strings, each no longer than 40 characters." });
  }
  return errors;
}

export function validateProjectUpdateBody(body) {
  const errors = objectErrors(body, ["title", "description", "repositoryUrl", "technologies", "visibility", "status", "moderationNote"]);
  if (!Object.keys(body ?? {}).length) errors.push({ field: "body", message: "At least one field is required." });
  if (body?.title !== undefined) add(errors, stringError(body.title, "title", { required: true, min: 3, max: 120 }));
  if (body?.description !== undefined) add(errors, stringError(body.description, "description", { required: true, min: 20 }));
  if (body?.repositoryUrl !== undefined) add(errors, urlError(body.repositoryUrl, "repositoryUrl", true));
  if (body?.visibility !== undefined) add(errors, enumError(body.visibility, "visibility", ["public", "private"]));
  if (body?.status !== undefined) add(errors, enumError(body.status, "status", PROJECT_STATUSES));
  if (body?.moderationNote !== undefined) add(errors, stringError(body.moderationNote, "moderationNote", { max: 1000 }));
  if (body?.technologies !== undefined && (!Array.isArray(body.technologies) || body.technologies.length > 30 || body.technologies.some((item) => typeof item !== "string" || item.trim().length === 0 || item.trim().length > 40))) {
    errors.push({ field: "technologies", message: "Must be an array of up to 30 non-empty strings, each no longer than 40 characters." });
  }
  return errors;
}

export function validateProjectListQuery(query) {
  const errors = objectErrors(query, ["search", "technology", "status", "mine", "page", "limit", "sort"], "query");
  errors.push(...paginationErrors(query));
  if (query.search !== undefined) add(errors, stringError(query.search, "search", { max: 100 }));
  if (query.technology !== undefined) add(errors, stringError(query.technology, "technology", { max: 40 }));
  if (query.status !== undefined) add(errors, enumError(query.status, "status", PROJECT_STATUSES));
  if (query.mine !== undefined) add(errors, enumError(query.mine, "mine", ["true", "false"]));
  if (query.sort !== undefined) add(errors, enumError(query.sort, "sort", ["newest", "updated", "title"]));
  return errors;
}

export function validateJoinBody(body) {
  const errors = objectErrors(body, ["message"]);
  add(errors, stringError(body?.message, "message", { max: 1000 }));
  return errors;
}

export function validateJoinDecisionBody(body) {
  const errors = objectErrors(body, ["status", "decisionNote"]);
  add(errors, enumError(body?.status, "status", ["approved", "rejected"], true));
  add(errors, stringError(body?.decisionNote, "decisionNote", { max: 1000 }));
  return errors;
}

export function validateJoinRequestListQuery(query) {
  const errors = objectErrors(query, ["status", "page", "limit"], "query");
  errors.push(...paginationErrors(query));
  if (query.status !== undefined) add(errors, enumError(query.status, "status", ["pending", "approved", "rejected", "cancelled"]));
  return errors;
}

export function validateIssueCreateBody(body) {
  const errors = objectErrors(body, ["projectId", "title", "description", "type", "priority"]);
  if (!mongoose.isObjectIdOrHexString(body?.projectId)) errors.push({ field: "projectId", message: "Must be a valid ObjectId." });
  add(errors, stringError(body?.title, "title", { required: true, min: 3, max: 200 }));
  add(errors, stringError(body?.description, "description", { required: true, min: 10, max: 20000 }));
  add(errors, enumError(body?.type, "type", ISSUE_TYPES, true));
  add(errors, enumError(body?.priority, "priority", ISSUE_PRIORITIES));
  return errors;
}

export function validateIssueUpdateBody(body) {
  const errors = objectErrors(body, ["title", "description", "priority", "status", "assignee"]);
  if (!Object.keys(body ?? {}).length) errors.push({ field: "body", message: "At least one field is required." });
  if (body?.title !== undefined) add(errors, stringError(body.title, "title", { required: true, min: 3, max: 200 }));
  if (body?.description !== undefined) add(errors, stringError(body.description, "description", { required: true, min: 10, max: 20000 }));
  if (body?.priority !== undefined) add(errors, enumError(body.priority, "priority", ISSUE_PRIORITIES));
  if (body?.status !== undefined) add(errors, enumError(body.status, "status", ISSUE_STATUSES));
  if (body?.assignee !== undefined && body.assignee !== null && !mongoose.isObjectIdOrHexString(body.assignee)) {
    errors.push({ field: "assignee", message: "Must be null or a valid ObjectId." });
  }
  return errors;
}

export function validateIssueListQuery(query) {
  const errors = objectErrors(query, ["projectId", "search", "type", "priority", "status", "assignee", "reporter", "page", "limit", "sort"], "query");
  errors.push(...paginationErrors(query));
  for (const field of ["projectId", "assignee", "reporter"]) {
    if (query[field] !== undefined && !mongoose.isObjectIdOrHexString(query[field])) errors.push({ field, message: "Must be a valid ObjectId." });
  }
  if (query.search !== undefined) add(errors, stringError(query.search, "search", { max: 100 }));
  if (query.type !== undefined) add(errors, enumError(query.type, "type", ISSUE_TYPES));
  if (query.priority !== undefined) add(errors, enumError(query.priority, "priority", ISSUE_PRIORITIES));
  if (query.status !== undefined) add(errors, enumError(query.status, "status", ISSUE_STATUSES));
  if (query.sort !== undefined) add(errors, enumError(query.sort, "sort", ["newest", "updated", "priority"]));
  return errors;
}

export function validateCommentBody(body) {
  const errors = objectErrors(body, ["content"]);
  add(errors, stringError(body?.content, "content", { required: true, min: 1, max: 10000 }));
  return errors;
}

export function validateContributionBody(body) {
  const errors = objectErrors(body, ["contributionType", "summary", "evidenceUrl"]);
  add(errors, enumError(body?.contributionType, "contributionType", CONTRIBUTION_TYPES, true));
  add(errors, stringError(body?.summary, "summary", { required: true, min: 10, max: 2000 }));
  add(errors, urlError(body?.evidenceUrl, "evidenceUrl"));
  return errors;
}

export function validateContributionDecisionBody(body) {
  const errors = objectErrors(body, ["contributionId", "verificationStatus", "decisionNote"]);
  if (!mongoose.isObjectIdOrHexString(body?.contributionId)) errors.push({ field: "contributionId", message: "Must be a valid ObjectId." });
  add(errors, enumError(body?.verificationStatus, "verificationStatus", ["verified", "rejected"], true));
  add(errors, stringError(body?.decisionNote, "decisionNote", { max: 1000 }));
  return errors;
}

export function validateContributionListQuery(query) {
  const errors = objectErrors(query, ["status", "page", "limit"], "query");
  errors.push(...paginationErrors(query));
  if (query.status !== undefined) add(errors, enumError(query.status, "status", ["submitted", "verified", "rejected"]));
  return errors;
}

export function validatePageQuery(query) {
  const errors = objectErrors(query, ["page", "limit"], "query");
  errors.push(...paginationErrors(query));
  return errors;
}
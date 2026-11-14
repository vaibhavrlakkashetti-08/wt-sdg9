import { platformApi } from "./platformApi.js";

export async function listIssues(params, { signal } = {}) {
  const response = await platformApi.get("/issues", { params, signal });
  return response.data;
}

export async function getIssue(issueId, { signal } = {}) {
  const response = await platformApi.get(`/issues/${issueId}`, { signal });
  return response.data.data.issue;
}

export async function createIssue(issue) {
  const response = await platformApi.post("/issues", issue);
  return response.data.data.issue;
}

export async function updateIssue(issueId, changes) {
  const response = await platformApi.put(`/issues/${issueId}`, changes);
  return response.data.data.issue;
}

export async function listIssueComments(issueId, { signal, page = 1, limit = 50 } = {}) {
  const response = await platformApi.get(`/issues/${issueId}/comments`, { params: { page, limit }, signal });
  return response.data;
}

export async function createIssueComment(issueId, content) {
  const response = await platformApi.post(`/issues/${issueId}/comments`, { content });
  return response.data.data.comment;
}

export async function listIssueActivity(issueId, { signal, page = 1, limit = 50 } = {}) {
  const response = await platformApi.get(`/issues/${issueId}/activity`, { params: { page, limit }, signal });
  return response.data;
}

export async function listProjects(params, { signal } = {}) {
  const response = await platformApi.get("/projects", { params, signal });
  return response.data;
}

export async function getProject(projectId, { signal } = {}) {
  const response = await platformApi.get(`/projects/${projectId}`, { signal });
  return response.data.data.project;
}
import { createIssue as createIssueService, deleteIssue as deleteIssueService, getIssue as getIssueService, listIssueActivity, listIssues, updateIssue as updateIssueService } from "../services/issue.service.js";
import { createContribution as createContributionService, verifyIssueContribution as verifyIssueContributionService } from "./contribution.controller.js";
import { getPaginationMeta } from "../utils/pagination.js";
import { sendSuccess } from "../utils/api-response.js";

export async function createIssue(request, response) {
  const issue = await createIssueService(request.body, request.auth);
  return sendSuccess(response, { issue }, { statusCode: 201 });
}

export async function getIssues(request, response) {
  const result = await listIssues(request.query, request.auth);
  return sendSuccess(response, { issues: result.items }, { meta: getPaginationMeta(result.total, result.page, result.limit) });
}

export async function getIssue(request, response) {
  const issue = await getIssueService(request.params.issueId, request.auth);
  return sendSuccess(response, { issue });
}

export async function updateIssue(request, response) {
  const issue = await updateIssueService(request.params.issueId, request.body, request.auth);
  return sendSuccess(response, { issue });
}

export async function deleteIssue(request, response) {
  await deleteIssueService(request.params.issueId, request.auth);
  return response.status(204).end();
}

export async function createIssueContribution(request, response) {
  return createContributionService(request, response);
}

export async function verifyContribution(request, response) {
  return verifyIssueContributionService(request, response);
}

export async function getIssueActivity(request, response) {
  const result = await listIssueActivity(request.params.issueId, request.query, request.auth);
  return sendSuccess(response, { activity: result.items }, { meta: getPaginationMeta(result.total, result.page, result.limit) });
}
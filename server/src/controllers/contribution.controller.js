import { listUserContributions, submitContribution, verifyContribution } from "../services/contribution.service.js";
import { getPaginationMeta } from "../utils/pagination.js";
import { sendSuccess } from "../utils/api-response.js";

export async function createContribution(request, response) {
  const contribution = await submitContribution(request.params.issueId, request.body, request.auth);
  return sendSuccess(response, { contribution }, { statusCode: 201 });
}

export async function verifyIssueContribution(request, response) {
  const contribution = await verifyContribution(request.params.issueId, request.body, request.auth);
  return sendSuccess(response, { contribution });
}

export async function getUserContributions(request, response) {
  const result = await listUserContributions(request.params.userId, request.query, request.auth);
  return sendSuccess(response, { contributions: result.items }, { meta: getPaginationMeta(result.total, result.page, result.limit) });
}
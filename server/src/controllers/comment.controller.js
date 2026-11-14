import { createIssueComment, deleteIssueComment, listIssueComments } from "../services/issue.service.js";
import { getPaginationMeta } from "../utils/pagination.js";
import { sendSuccess } from "../utils/api-response.js";

export async function getComments(request, response) {
  const result = await listIssueComments(request.params.issueId, request.query, request.auth);
  return sendSuccess(response, { comments: result.items }, { meta: getPaginationMeta(result.total, result.page, result.limit) });
}

export async function createComment(request, response) {
  const comment = await createIssueComment(request.params.issueId, request.body.content, request.auth);
  return sendSuccess(response, { comment }, { statusCode: 201 });
}

export async function deleteComment(request, response) {
  await deleteIssueComment(request.params.commentId, request.auth);
  return response.status(204).end();
}
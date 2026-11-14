import {
  archiveProject,
  createProject as createProjectService,
  decideJoinRequest,
  getProject as getProjectService,
  listJoinRequests,
  listProjects,
  removeProjectMember,
  requestToJoin,
  updateProject as updateProjectService,
} from "../services/project.service.js";
import { getPaginationMeta } from "../utils/pagination.js";
import { sendSuccess } from "../utils/api-response.js";

export async function createProject(request, response) {
  const project = await createProjectService(request.body, request.auth);
  return sendSuccess(response, { project }, { statusCode: 201 });
}

export async function getProjects(request, response) {
  const result = await listProjects(request.query, request.auth);
  return sendSuccess(response, { projects: result.items }, { meta: getPaginationMeta(result.total, result.page, result.limit) });
}

export async function getProject(request, response) {
  const project = await getProjectService(request.params.projectId, request.auth);
  return sendSuccess(response, { project });
}

export async function updateProject(request, response) {
  const project = await updateProjectService(request.params.projectId, request.body, request.auth);
  return sendSuccess(response, { project });
}

export async function deleteProject(request, response) {
  const project = await archiveProject(request.params.projectId, request.auth);
  return sendSuccess(response, { project, archived: true });
}

export async function joinProject(request, response) {
  const joinRequest = await requestToJoin(request.params.projectId, request.auth.userId, request.auth.role, request.body.message);
  return sendSuccess(response, { joinRequest }, { statusCode: 201 });
}

export async function getJoinRequests(request, response) {
  const result = await listJoinRequests(request.params.projectId, request.query);
  return sendSuccess(response, { requests: result.items }, { meta: getPaginationMeta(result.total, result.page, result.limit) });
}

export async function patchJoinRequest(request, response) {
  const joinRequest = await decideJoinRequest(request.params.projectId, request.params.requestId, request.body, request.auth);
  return sendSuccess(response, { joinRequest });
}

export async function deleteProjectMember(request, response) {
  const membership = await removeProjectMember(request.params.projectId, request.params.userId, request.auth);
  return sendSuccess(response, { membership });
}
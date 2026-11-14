import JoinRequest from "../models/join-request.model.js";
import { AppError } from "../utils/app-error.js";

export function isProjectManager(project, auth) {
  const ownerId = project.owner?._id?.toString() ?? project.owner?.toString();
  return Boolean(auth && (auth.role === "admin" || ownerId === auth.userId));
}

export async function isProjectParticipant(project, auth) {
  if (!auth) return false;
  if (isProjectManager(project, auth)) return true;
  return Boolean(await JoinRequest.exists({ project: project._id, student: auth.userId, status: "approved" }));
}

export async function assertProjectVisible(project, auth) {
  if (project.status === "approved" && project.visibility === "public") return;
  if (await isProjectParticipant(project, auth)) return;
  throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found.");
}

export async function assertProjectParticipantAccess(project, auth) {
  if (await isProjectParticipant(project, auth)) return;
  throw new AppError(403, "PROJECT_MEMBERSHIP_REQUIRED", "Project membership is required for this action.");
}
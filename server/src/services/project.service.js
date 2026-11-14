import mongoose from "mongoose";
import JoinRequest from "../models/join-request.model.js";
import Project from "../models/project.model.js";
import { AppError } from "../utils/app-error.js";
import { getPagination } from "../utils/pagination.js";
import { assertProjectVisible, isProjectManager } from "./project-access.service.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function duplicateJoinError() {
  return new AppError(409, "JOIN_REQUEST_EXISTS", "A pending join request or membership already exists.");
}

export async function createProject(input, auth) {
  return Project.create({
    title: input.title,
    description: input.description,
    repositoryUrl: input.repositoryUrl,
    technologies: input.technologies ?? [],
    visibility: input.visibility ?? "public",
    owner: auth.userId,
    status: "pending",
  });
}

export async function listProjects(query, auth) {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (auth?.role === "admin") {
    if (query.status) filter.status = query.status;
  } else if (query.mine === "true") {
    if (!auth) throw new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication is required to list your projects.");
    filter.owner = auth.userId;
    filter.status = query.status ?? { $ne: "archived" };
  } else {
    if (query.status && query.status !== "approved") {
      throw new AppError(403, "FORBIDDEN", "Only administrators or project owners can list non-approved projects.");
    }
    filter.status = "approved";
    filter.visibility = "public";
  }

  if (query.technology) filter.technologies = new RegExp(`^${escapeRegex(query.technology.trim())}$`, "i");
  if (query.search) {
    const expression = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [{ title: expression }, { description: expression }, { technologies: expression }];
  }

  const sort = query.sort === "title" ? { title: 1 } : query.sort === "updated" ? { updatedAt: -1 } : { createdAt: -1 };
  const [items, total] = await Promise.all([
    Project.find(filter).sort(sort).skip(skip).limit(limit).populate("owner", "name profileImage").lean(),
    Project.countDocuments(filter),
  ]);

  return { items, total, page, limit };
}

export async function getProject(projectId, auth) {
  const project = await Project.findById(projectId).populate("owner", "name profileImage").populate({
    path: "members",
    populate: { path: "student", select: "name profileImage" },
  });
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found.");
  await assertProjectVisible(project, auth);
  return project;
}

export async function updateProject(projectId, input, auth) {
  const project = await Project.findById(projectId);
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found.");
  if (!isProjectManager(project, auth)) throw new AppError(403, "FORBIDDEN", "You do not manage this project.");

  const allowedFields = ["title", "description", "repositoryUrl", "technologies", "visibility"];
  for (const field of allowedFields) {
    if (input[field] !== undefined) project[field] = input[field];
  }

  if (input.status !== undefined) {
    if (auth.role !== "admin") throw new AppError(403, "ADMIN_REQUIRED", "Only an administrator can moderate project status.");
    project.status = input.status;
    project.moderatedBy = auth.userId;
    project.moderatedAt = new Date();
    project.moderationNote = input.moderationNote ?? "";
  }

  await project.save();
  return project;
}

export async function archiveProject(projectId, auth) {
  const project = await Project.findById(projectId);
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found.");
  if (!isProjectManager(project, auth)) throw new AppError(403, "FORBIDDEN", "You do not manage this project.");
  if (project.status === "archived") throw new AppError(409, "PROJECT_ALREADY_ARCHIVED", "Project is already archived.");
  project.status = "archived";
  await project.save();
  return project;
}

export async function requestToJoin(projectId, studentId, role, message = "") {
  if (role !== "student") throw new AppError(403, "STUDENT_REQUIRED", "Only students can request project membership.");
  const project = await Project.findById(projectId);
  if (!project || project.status !== "approved" || project.visibility !== "public") {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project is not open for membership requests.");
  }
  if (project.owner.toString() === studentId) throw duplicateJoinError();
  if (await JoinRequest.exists({ project: projectId, student: studentId, status: { $in: ["pending", "approved"] } })) {
    throw duplicateJoinError();
  }

  try {
    return await JoinRequest.create({ project: projectId, student: studentId, message, status: "pending" });
  } catch (error) {
    if (error.code === 11000) throw duplicateJoinError();
    throw error;
  }
}

export async function listJoinRequests(projectId, query) {
  const { page, limit, skip } = getPagination(query);
  const filter = { project: projectId, status: query.status ?? "pending" };
  const [items, total] = await Promise.all([
    JoinRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("student", "name profileImage skills").lean(),
    JoinRequest.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function decideJoinRequest(projectId, requestId, input, auth) {
  if (!mongoose.isObjectIdOrHexString(requestId)) throw new AppError(400, "VALIDATION_ERROR", "Request ID must be a valid ObjectId.");
  const update = {
    status: input.status,
    decidedBy: auth.userId,
    decidedAt: new Date(),
    decisionNote: input.decisionNote ?? "",
  };

  try {
    const request = await JoinRequest.findOneAndUpdate(
      { _id: requestId, project: projectId, status: "pending" },
      { $set: update },
      { returnDocument: "after", runValidators: true },
    ).populate("student", "name profileImage");
    if (request) return request;

    const exists = await JoinRequest.exists({ _id: requestId, project: projectId });
    if (!exists) throw new AppError(404, "JOIN_REQUEST_NOT_FOUND", "Join request was not found.");
    throw new AppError(409, "JOIN_REQUEST_ALREADY_DECIDED", "Join request is no longer pending.");
  } catch (error) {
    if (error.code === 11000) throw duplicateJoinError();
    throw error;
  }
}

export async function removeProjectMember(projectId, userId, auth) {
  if (!mongoose.isObjectIdOrHexString(userId)) throw new AppError(400, "VALIDATION_ERROR", "User ID must be a valid ObjectId.");
  const project = await Project.findById(projectId).select("owner");
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found.");
  if (project.owner.toString() === userId) throw new AppError(409, "CANNOT_REMOVE_OWNER", "Project ownership cannot be removed as membership.");

  const membership = await JoinRequest.findOneAndUpdate(
    { project: projectId, student: userId, status: "approved" },
    { $set: { status: "cancelled", decidedBy: auth.userId, decidedAt: new Date() } },
    { returnDocument: "after", runValidators: true },
  );
  if (!membership) throw new AppError(404, "MEMBERSHIP_NOT_FOUND", "Approved project membership was not found.");
  return membership;
}
import mongoose from "mongoose";
import Project from "../models/project.model.js";
import { AppError } from "../utils/app-error.js";

export function requireRole(...allowedRoles) {
  return (request, _response, next) => {
    if (!request.auth) {
      return next(new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication is required."));
    }

    if (!allowedRoles.includes(request.auth.role)) {
      return next(new AppError(403, "FORBIDDEN", "You do not have permission to perform this action."));
    }

    return next();
  };
}

export async function requireProjectOwner(request, _response, next) {
  if (!request.auth) {
    return next(new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication is required."));
  }

  const { projectId } = request.params;
  if (!mongoose.isObjectIdOrHexString(projectId)) {
    return next(new AppError(400, "VALIDATION_ERROR", "Project ID must be a valid ObjectId."));
  }

  const project = await Project.findById(projectId).select("owner");
  if (!project) return next(new AppError(404, "PROJECT_NOT_FOUND", "Project was not found."));

  if (request.auth.role !== "admin" && project.owner.toString() !== request.auth.userId) {
    return next(new AppError(403, "FORBIDDEN", "You do not own this project."));
  }

  request.project = project;
  return next();
}
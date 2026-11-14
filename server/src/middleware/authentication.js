import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import User from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";

function getToken(request) {
  const authorization = request.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7);
  return request.cookies?.access_token;
}

export function optionalAuthenticate(request, response, next) {
  if (!getToken(request)) return next();
  return authenticate(request, response, next);
}

export async function authenticate(request, _response, next) {
  const token = getToken(request);
  if (!token) return next(new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication is required."));
  if (!env.jwtAccessSecret) {
    return next(new AppError(503, "AUTHENTICATION_NOT_CONFIGURED", "Authentication is not configured."));
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtAccessSecret, {
      algorithms: ["HS256"],
      issuer: env.jwtIssuer,
    });
  } catch {
    return next(new AppError(401, "INVALID_TOKEN", "Authentication token is invalid or expired."));
  }

  if (!payload.sub || !mongoose.isObjectIdOrHexString(payload.sub)) {
    return next(new AppError(401, "INVALID_TOKEN", "Authentication token is invalid."));
  }

  const user = await User.findById(payload.sub).select("name email role accountStatus bio skills profileImage createdAt updatedAt");
  if (!user || user.accountStatus !== "active") {
    return next(new AppError(401, "ACCOUNT_UNAVAILABLE", "This account is unavailable."));
  }

  request.user = user;
  request.auth = { userId: user.id, role: user.role };
  return next();
}
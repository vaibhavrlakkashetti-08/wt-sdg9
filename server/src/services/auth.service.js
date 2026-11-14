import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

function ensureAuthenticationConfigured() {
  if (!env.jwtAccessSecret || env.jwtAccessSecret.length < 32) {
    throw new AppError(503, "AUTHENTICATION_NOT_CONFIGURED", "Authentication is not configured.");
  }
}

function createAccessToken(user) {
  return jwt.sign(
    { role: user.role },
    env.jwtAccessSecret,
    {
      algorithm: "HS256",
      subject: user.id,
      issuer: env.jwtIssuer,
      expiresIn: env.jwtAccessTtlSeconds,
    },
  );
}

export function toPublicUser(user) {
  return {
    id: user.id ?? user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    bio: user.bio,
    skills: user.skills,
    profileImage: user.profileImage,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function createAuthResult(user) {
  return { user: toPublicUser(user), token: createAccessToken(user) };
}

export async function registerStudent({ name, email, password }) {
  ensureAuthenticationConfigured();
  const normalizedEmail = email.trim().toLowerCase();

  if (await User.exists({ email: normalizedEmail })) {
    throw new AppError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);

  try {
    const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash, role: "student" });
    return createAuthResult(user);
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
    }
    throw error;
  }
}

export async function loginUser({ email, password }) {
  ensureAuthenticationConfigured();
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  if (user.accountStatus !== "active") {
    throw new AppError(403, "ACCOUNT_UNAVAILABLE", "This account is unavailable.");
  }

  return createAuthResult(user);
}
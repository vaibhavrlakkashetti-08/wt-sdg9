import { env } from "../config/env.js";
import { loginUser, registerStudent, toPublicUser } from "../services/auth.service.js";
import { sendSuccess } from "../utils/api-response.js";

function setAuthCookie(response, token) {
  response.cookie(env.authCookieName, token, {
    httpOnly: true,
    secure: env.authCookieSecure,
    sameSite: env.authCookieSameSite,
    path: env.authCookiePath,
    maxAge: env.jwtAccessTtlSeconds * 1000,
  });
}

function clearAuthCookie(response) {
  response.clearCookie(env.authCookieName, {
    httpOnly: true,
    secure: env.authCookieSecure,
    sameSite: env.authCookieSameSite,
    path: env.authCookiePath,
  });
}

export async function register(request, response) {
  const result = await registerStudent(request.body);
  setAuthCookie(response, result.token);
  return sendSuccess(response, { user: result.user }, { statusCode: 201 });
}

export async function login(request, response) {
  const result = await loginUser(request.body);
  setAuthCookie(response, result.token);
  return sendSuccess(response, { user: result.user });
}

export function logout(_request, response) {
  clearAuthCookie(response);
  return sendSuccess(response, { message: "Logged out." });
}

export function currentUser(request, response) {
  return sendSuccess(response, { user: toPublicUser(request.user) });
}
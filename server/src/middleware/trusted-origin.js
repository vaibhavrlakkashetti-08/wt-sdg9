import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

export function requireTrustedOrigin(request, _response, next) {
  const origin = request.get("origin");
  if (origin && origin !== env.clientUrl) {
    return next(new AppError(403, "UNTRUSTED_ORIGIN", "Request origin is not allowed."));
  }

  return next();
}
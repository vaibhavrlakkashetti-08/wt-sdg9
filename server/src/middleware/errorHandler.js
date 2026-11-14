import { env } from "../config/env.js";

export function errorHandler(error, _request, response, _next) {
  if (response.headersSent) return;

  let statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  let code = error.code ?? "INTERNAL_SERVER_ERROR";
  let message = error.message ?? "An unexpected error occurred.";
  let details = error.details;

  if (error.type === "entity.parse.failed") {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "Request body contains invalid JSON.";
  } else if (error.type === "entity.too.large") {
    statusCode = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "Request body is too large.";
  } else if (error.name === "ValidationError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Request validation failed.";
    details = Object.values(error.errors).map(({ path, message: fieldMessage }) => ({ path, message: fieldMessage }));
  } else if (error.name === "CastError") {
    statusCode = 400;
    code = "INVALID_VALUE";
    message = `Invalid value for ${error.path}.`;
  } else if (error.code === 11000) {
    statusCode = 409;
    code = "DUPLICATE_RESOURCE";
    message = "A resource with these values already exists.";
  } else if (
    error.name === "MongoServerSelectionError"
    || error.name === "MongooseServerSelectionError"
    || error.name === "MongoNetworkError"
    || (error.name === "MongooseError" && /buffering timed out/i.test(error.message))
  ) {
    statusCode = 503;
    code = "DATABASE_UNAVAILABLE";
    message = "The database is temporarily unavailable.";
  }

  if (statusCode >= 500 && env.nodeEnv === "production") {
    message = "An unexpected error occurred.";
    details = undefined;
  }

  if (statusCode >= 500) {
    console.error(`API error: ${code}`);
  }

  response.status(statusCode).json({ error: { code, message, ...(details ? { details } : {}) } });
}
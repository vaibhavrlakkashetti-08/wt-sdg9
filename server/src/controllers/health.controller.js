import { readHealth, readReadiness } from "../services/health.service.js";
import { sendSuccess } from "../utils/api-response.js";

export function getHealth(_request, response) {
  return sendSuccess(response, readHealth());
}

export function getReadiness(_request, response) {
  if (!readReadiness()) {
    return response.status(503).json({
      error: { code: "SERVICE_NOT_READY", message: "Database connection is unavailable." },
    });
  }

  return sendSuccess(response, { status: "ready" });
}
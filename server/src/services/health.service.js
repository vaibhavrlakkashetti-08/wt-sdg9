import { env } from "../config/env.js";
import { isDatabaseConnected } from "../config/database.js";

export function readHealth() {
  return {
    status: "ok",
    service: "campus-issue-tracker-api",
    database: {
      configured: Boolean(env.mongoUri),
      connected: isDatabaseConnected(),
    },
  };
}

export function readReadiness() {
  return isDatabaseConnected();
}
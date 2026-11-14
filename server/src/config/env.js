import "dotenv/config";

const port = Number(process.env.PORT ?? 5000);
const nodeEnv = process.env.NODE_ENV ?? "development";
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
const bcryptRounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
const authCookieSameSite = (process.env.AUTH_COOKIE_SAME_SITE ?? "lax").toLowerCase();

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

try {
  new URL(clientUrl);
} catch {
  throw new Error("CLIENT_URL must be a valid absolute URL.");
}

if (nodeEnv === "production" && (!jwtAccessSecret || jwtAccessSecret.length < 32)) {
  throw new Error("JWT_ACCESS_SECRET must contain at least 32 characters in production.");
}

if (!Number.isInteger(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 15) {
  throw new Error("BCRYPT_ROUNDS must be an integer between 10 and 15.");
}

if (!["strict", "lax", "none"].includes(authCookieSameSite)) {
  throw new Error("AUTH_COOKIE_SAME_SITE must be strict, lax, or none.");
}

export const env = {
  nodeEnv,
  port,
  clientUrl,
  mongoUri: process.env.MONGODB_URI,
  databaseRequired: nodeEnv === "production" || process.env.REQUIRE_DATABASE === "true",
  jwtAccessSecret,
  jwtIssuer: "campus-issue-tracker",
  jwtAccessTtlSeconds: 900,
  bcryptRounds,
  authCookieName: "access_token",
  authCookiePath: "/api",
  authCookieSameSite,
  authCookieSecure: nodeEnv === "production" || authCookieSameSite === "none",
};
import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.BCRYPT_ROUNDS = "10";
process.env.JWT_ACCESS_SECRET = "test-only-auth-secret-never-use-in-production";
process.env.AUTH_COOKIE_SAME_SITE = "lax";

const clientOrigin = "http://localhost:5173";
let mongoServer;
let apiServer;
let adminTestServer;
let ownerTestServer;
let baseUrl;
let adminTestUrl;
let ownerTestUrl;
let User;
let Project;
let studentId;

async function listen(app) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server;
}

async function close(server) {
  if (server?.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function send(path, { method = "GET", body, token, origin = clientOrigin } = {}) {
  const headers = { Origin: origin };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri("campus-auth-tests");

  const [{ default: app }, { connectToDatabase }, { authenticate }, { requireRole, requireProjectOwner }, { errorHandler }, userModel, projectModel] = await Promise.all([
    import("../src/app.js"),
    import("../src/config/database.js"),
    import("../src/middleware/authentication.js"),
    import("../src/middleware/authorization.js"),
    import("../src/middleware/errorHandler.js"),
    import("../src/models/user.model.js"),
    import("../src/models/project.model.js"),
  ]);
  User = userModel.default;
  Project = projectModel.default;

  await connectToDatabase();
  await User.init();
  apiServer = await listen(app);
  baseUrl = `http://127.0.0.1:${apiServer.address().port}/api/v1/auth`;

  const adminOnlyApp = express();
  adminOnlyApp.get("/admin", authenticate, requireRole("admin"), (_request, response) => response.json({ data: { allowed: true } }));
  adminOnlyApp.use(errorHandler);
  adminTestServer = await listen(adminOnlyApp);
  adminTestUrl = `http://127.0.0.1:${adminTestServer.address().port}/admin`;

  const ownerOnlyApp = express();
  ownerOnlyApp.get("/projects/:projectId/manage", authenticate, requireProjectOwner, (_request, response) => response.json({ data: { allowed: true } }));
  ownerOnlyApp.use(errorHandler);
  ownerTestServer = await listen(ownerOnlyApp);
  ownerTestUrl = `http://127.0.0.1:${ownerTestServer.address().port}/projects`;
});

after(async () => {
  await close(ownerTestServer);
  await close(adminTestServer);
  await close(apiServer);
  await mongoose.disconnect();
  await mongoServer?.stop();
  delete process.env.MONGODB_URI;
});

test("registration creates a student, normalizes email, and keeps passwordHash private", async () => {
  const response = await send("/register", {
    method: "POST",
    body: {
      name: "  Campus Student  ",
      email: "STUDENT@CAMPUS.EDU",
      password: "secure-campus-password-01",
      confirmPassword: "secure-campus-password-01",
    },
  });
  const responseBody = await response.json();
  const setCookie = response.headers.get("set-cookie");

  assert.equal(response.status, 201);
  assert.equal(responseBody.data.user.email, "student@campus.edu");
  assert.equal(responseBody.data.user.name, "Campus Student");
  assert.equal(responseBody.data.user.role, "student");
  assert.equal(responseBody.data.user.passwordHash, undefined);
  assert.equal(responseBody.data.token, undefined);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.match(setCookie, /Path=\/api/i);
  assert.doesNotMatch(setCookie, /Secure/i);

  const storedUser = await User.findById(responseBody.data.user.id).select("+passwordHash");
  studentId = storedUser.id;
  assert.ok(storedUser.passwordHash.startsWith("$2"));
  assert.notEqual(storedUser.passwordHash, "secure-campus-password-01");
});

test("registration validates input, rejects duplicate email, and ignores role escalation attempts", async () => {
  const untrustedOriginResponse = await send("/register", {
    method: "POST",
    origin: "https://attacker.example",
    body: { name: "Another Student", email: "another@campus.edu", password: "secure-campus-password-02" },
  });
  assert.equal(untrustedOriginResponse.status, 403);
  assert.equal((await untrustedOriginResponse.json()).error.code, "UNTRUSTED_ORIGIN");

  const mismatchResponse = await send("/register", {
    method: "POST",
    body: { name: "Another Student", email: "another@campus.edu", password: "secure-campus-password-02", confirmPassword: "different-password" },
  });
  assert.equal(mismatchResponse.status, 400);
  assert.equal((await mismatchResponse.json()).error.code, "VALIDATION_ERROR");

  const roleEscalationResponse = await send("/register", {
    method: "POST",
    body: { name: "Another Student", email: "another@campus.edu", password: "secure-campus-password-02", role: "admin" },
  });
  assert.equal(roleEscalationResponse.status, 400);

  const duplicateResponse = await send("/register", {
    method: "POST",
    body: { name: "Duplicate Student", email: "student@CAMPUS.edu", password: "secure-campus-password-03" },
  });
  assert.equal(duplicateResponse.status, 409);
  assert.equal((await duplicateResponse.json()).error.code, "EMAIL_ALREADY_REGISTERED");

  const concurrentResults = await Promise.all([
    send("/register", { method: "POST", body: { name: "Race Student", email: "race@campus.edu", password: "secure-campus-password-race" } }),
    send("/register", { method: "POST", body: { name: "Race Student", email: "RACE@CAMPUS.EDU", password: "secure-campus-password-race" } }),
  ]);
  assert.deepEqual(concurrentResults.map((result) => result.status).sort(), [201, 409]);
  assert.equal(await User.countDocuments({ email: "race@campus.edu" }), 1);
});

test("login rejects invalid credentials and returns a short-lived HttpOnly cookie for valid credentials", async () => {
  const invalidResponse = await send("/login", {
    method: "POST",
    body: { email: "student@campus.edu", password: "incorrect-campus-password" },
  });
  assert.equal(invalidResponse.status, 401);
  assert.equal((await invalidResponse.json()).error.code, "INVALID_CREDENTIALS");

  const loginResponse = await send("/login", {
    method: "POST",
    body: { email: "STUDENT@CAMPUS.EDU", password: "secure-campus-password-01" },
  });
  const body = await loginResponse.json();
  const setCookie = loginResponse.headers.get("set-cookie");
  assert.equal(loginResponse.status, 200);
  assert.equal(body.data.user.id, studentId);
  assert.equal(body.data.user.passwordHash, undefined);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Max-Age=900/i);

  const cookie = setCookie.split(";")[0];
  const currentResponse = await fetch(`${baseUrl}/me`, { headers: { Cookie: cookie } });
  const currentBody = await currentResponse.json();
  assert.equal(currentResponse.status, 200);
  assert.equal(currentBody.data.user.id, studentId);
  assert.equal(currentBody.data.user.passwordHash, undefined);

  const logoutResponse = await send("/logout", { method: "POST" });
  assert.equal(logoutResponse.status, 200);
  assert.match(logoutResponse.headers.get("set-cookie"), /Expires=/i);
});

test("current-user endpoint rejects missing, invalid, and expired tokens", async () => {
  const missingResponse = await send("/me");
  assert.equal(missingResponse.status, 401);
  assert.equal((await missingResponse.json()).error.code, "AUTHENTICATION_REQUIRED");

  const invalidResponse = await send("/me", { token: "not.a.jwt" });
  assert.equal(invalidResponse.status, 401);
  assert.equal((await invalidResponse.json()).error.code, "INVALID_TOKEN");

  const expiredToken = jwt.sign({ role: "student" }, process.env.JWT_ACCESS_SECRET, {
    subject: studentId,
    issuer: "campus-issue-tracker",
    algorithm: "HS256",
    expiresIn: -1,
  });
  const expiredResponse = await send("/me", { token: expiredToken });
  assert.equal(expiredResponse.status, 401);
  assert.equal((await expiredResponse.json()).error.code, "INVALID_TOKEN");
});

test("authorization uses the database role, not a forged JWT role claim", async () => {
  const forgedAdminToken = jwt.sign({ role: "admin" }, process.env.JWT_ACCESS_SECRET, {
    subject: studentId,
    issuer: "campus-issue-tracker",
    algorithm: "HS256",
    expiresIn: "1m",
  });
  const response = await fetch(adminTestUrl, { headers: { Authorization: `Bearer ${forgedAdminToken}` } });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, "FORBIDDEN");
});

test("project-owner middleware prevents students from managing another user's project", async () => {
  const otherRegistration = await send("/register", {
    method: "POST",
    body: { name: "Other Student", email: "other@campus.edu", password: "secure-campus-password-other" },
  });
  assert.equal(otherRegistration.status, 201);
  const otherUserId = (await otherRegistration.json()).data.user.id;

  const project = await Project.create({
    title: "Owner access test",
    description: "A temporary project for ownership authorization tests.",
    repositoryUrl: "https://github.com/campus/owner-test",
    owner: studentId,
  });
  const ownerToken = jwt.sign({}, process.env.JWT_ACCESS_SECRET, { subject: studentId, issuer: "campus-issue-tracker", expiresIn: "1m" });
  const otherUserToken = jwt.sign({}, process.env.JWT_ACCESS_SECRET, { subject: otherUserId, issuer: "campus-issue-tracker", expiresIn: "1m" });

  const ownerResponse = await fetch(`${ownerTestUrl}/${project.id}/manage`, { headers: { Authorization: `Bearer ${ownerToken}` } });
  assert.equal(ownerResponse.status, 200);

  const otherUserResponse = await fetch(`${ownerTestUrl}/${project.id}/manage`, { headers: { Authorization: `Bearer ${otherUserToken}` } });
  assert.equal(otherUserResponse.status, 403);
  assert.equal((await otherUserResponse.json()).error.code, "FORBIDDEN");
});

test("suspended accounts cannot use an otherwise valid token", async () => {
  await User.findByIdAndUpdate(studentId, { accountStatus: "suspended" });
  const token = jwt.sign({ role: "student" }, process.env.JWT_ACCESS_SECRET, {
    subject: studentId,
    issuer: "campus-issue-tracker",
    algorithm: "HS256",
    expiresIn: "1m",
  });
  const response = await send("/me", { token });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "ACCOUNT_UNAVAILABLE");
});

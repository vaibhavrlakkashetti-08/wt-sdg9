import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

process.env.JWT_ACCESS_SECRET = "test-only-secret-that-is-never-used-outside-tests";

const [{ default: app }, { requireRole }, { validateObjectIdParams }] = await Promise.all([
  import("../src/app.js"),
  import("../src/middleware/authorization.js"),
  import("../src/validators/object-id.js"),
]);

test("health, readiness, not-found, invalid JSON, and CORS use API conventions", async (context) => {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

  const healthResponse = await fetch(`${baseUrl}/health`, { headers: { Origin: "http://localhost:5173" } });
  assert.equal(healthResponse.status, 200);
  assert.equal(healthResponse.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.equal((await healthResponse.json()).data.service, "campus-issue-tracker-api");

  const readinessResponse = await fetch(`${baseUrl}/ready`);
  assert.equal(readinessResponse.status, 503);
  assert.equal((await readinessResponse.json()).error.code, "SERVICE_NOT_READY");

  const notFoundResponse = await fetch(`${baseUrl}/missing`);
  assert.equal(notFoundResponse.status, 404);
  assert.equal((await notFoundResponse.json()).error.code, "NOT_FOUND");

  const invalidJsonResponse = await fetch(`${baseUrl}/health`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{invalid",
  });
  assert.equal(invalidJsonResponse.status, 400);
  assert.equal((await invalidJsonResponse.json()).error.code, "INVALID_JSON");
});

test("role middleware rejects unauthenticated and unauthorized users", () => {
  let authError;
  requireRole("admin")({ auth: undefined }, {}, (error) => { authError = error; });
  assert.equal(authError.statusCode, 401);

  let roleError;
  requireRole("admin")({ auth: { role: "student" } }, {}, (error) => { roleError = error; });
  assert.equal(roleError.statusCode, 403);
});

test("ObjectId validator rejects malformed path identifiers", () => {
  let validationError;
  validateObjectIdParams("projectId")({ params: { projectId: "not-an-object-id" } }, {}, (error) => {
    validationError = error;
  });
  assert.equal(validationError.statusCode, 400);
  assert.equal(validationError.code, "VALIDATION_ERROR");
});
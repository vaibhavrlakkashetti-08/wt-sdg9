import assert from "node:assert/strict";
import test from "node:test";
import {
  validateContributionBody,
  validateIssueCreateBody,
  validateProjectCreateBody,
  validateProjectListQuery,
} from "../src/validators/platform.validators.js";

test("project validators accept a valid project and reject privileged fields", () => {
  const valid = {
    title: "Campus map",
    description: "A student-maintained map of campus resources.",
    repositoryUrl: "https://github.com/campus/map",
    technologies: ["React", "Node.js"],
  };
  assert.deepEqual(validateProjectCreateBody(valid), []);
  assert.ok(validateProjectCreateBody({ ...valid, owner: "507f1f77bcf86cd799439011" }).some((error) => error.field === "owner"));
});

test("list validators bound pagination and validate filters", () => {
  assert.deepEqual(validateProjectListQuery({ page: "2", limit: "50", technology: "React" }), []);
  assert.ok(validateProjectListQuery({ page: "0", limit: "101", status: "pending" }).length >= 2);
});

test("issue and contribution validators reject invalid enums and identifiers", () => {
  assert.ok(validateIssueCreateBody({ projectId: "bad-id", title: "Bug", description: "A sufficiently long issue description.", type: "task" }).length >= 2);
  assert.ok(validateContributionBody({ contributionType: "unknown", summary: "A useful contribution summary." }).some((error) => error.field === "contributionType"));
});
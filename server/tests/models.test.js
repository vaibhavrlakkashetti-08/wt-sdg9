import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import AuditLog from "../src/models/audit-log.model.js";
import Comment from "../src/models/comment.model.js";
import Contribution from "../src/models/contribution.model.js";
import Issue from "../src/models/issue.model.js";
import JoinRequest from "../src/models/join-request.model.js";
import Project from "../src/models/project.model.js";
import User from "../src/models/user.model.js";

const validBcryptHash = `$2b$12$${"a".repeat(53)}`;

async function getValidationError(document) {
  try {
    await document.validate();
  } catch (error) {
    return error;
  }

  assert.fail("Expected document validation to fail.");
}

test("models register expected collections with timestamps", () => {
  assert.deepEqual(
    [User, Project, Issue, Comment, Contribution, JoinRequest, AuditLog].map((model) => model.collection.collectionName),
    ["users", "projects", "issues", "comments", "contributions", "joinrequests", "auditlogs"],
  );

  for (const model of [User, Project, Issue, Comment, Contribution, JoinRequest]) {
    assert.ok(model.schema.path("createdAt"), `${model.modelName} should have createdAt`);
    assert.ok(model.schema.path("updatedAt"), `${model.modelName} should have updatedAt`);
  }
});

test("user normalizes email and rejects invalid roles and password hashes", async () => {
  const user = new User({ name: "Ada Lovelace", email: "ADA@CAMPUS.EDU", passwordHash: validBcryptHash });
  assert.equal(user.email, "ada@campus.edu");
  assert.equal(user.role, "student");
  await user.validate();

  const invalid = new User({ name: "A", email: "not-an-email", passwordHash: "plain-text", role: "owner" });
  const error = await getValidationError(invalid);
  assert.ok(error.errors.name);
  assert.ok(error.errors.email);
  assert.ok(error.errors.passwordHash);
  assert.ok(error.errors.role);
  assert.equal(User.schema.path("passwordHash").options.select, false);
  assert.equal(user.toJSON().passwordHash, undefined);
  assert.equal(user.toObject().passwordHash, undefined);
});

test("project and issue enforce required references and enum values", async () => {
  const owner = new mongoose.Types.ObjectId();
  const project = new Project({
    title: "Campus map",
    description: "A student-maintained map for campus resources.",
    repositoryUrl: "https://github.com/campus/map",
    owner,
  });
  await project.validate();
  assert.ok(Project.schema.virtuals.members);

  const invalidIssue = new Issue({ title: "x", description: "short", type: "task", project: owner, reporter: owner, priority: "critical" });
  const issueError = await getValidationError(invalidIssue);
  assert.ok(issueError.errors.title);
  assert.ok(issueError.errors.description);
  assert.ok(issueError.errors.type);
  assert.ok(issueError.errors.priority);
});

test("references are ObjectIds and issue comments require their parent and author", async () => {
  assert.equal(Issue.schema.path("project").instance, "ObjectId");
  assert.equal(Issue.schema.path("reporter").instance, "ObjectId");
  assert.equal(Issue.schema.path("assignee").options.ref, "User");

  const invalidComment = new Comment({ content: " ", issue: "not-an-object-id", author: new mongoose.Types.ObjectId() });
  const error = await getValidationError(invalidComment);
  assert.ok(error.errors.content);
  assert.ok(error.errors.issue);
});

test("join requests uniquely index pending requests and approved memberships", async () => {
  const uniqueIndexes = JoinRequest.schema.indexes().filter(([, options]) => options.unique);
  assert.equal(uniqueIndexes.length, 2);
  assert.deepEqual(uniqueIndexes.map(([, options]) => options.partialFilterExpression.status).sort(), ["approved", "pending"]);

  const request = new JoinRequest({ project: new mongoose.Types.ObjectId(), student: new mongoose.Types.ObjectId() });
  assert.equal(request.status, "pending");
  await request.validate();
});

test("a contribution requires reviewer data and disallows self-verification", async () => {
  const contributor = new mongoose.Types.ObjectId();
  const invalid = new Contribution({
    user: contributor,
    issue: new mongoose.Types.ObjectId(),
    project: new mongoose.Types.ObjectId(),
    contributionType: "bug_fix",
    summary: "Fixed a reported navigation issue.",
    verificationStatus: "verified",
    verifiedBy: contributor,
    verifiedAt: new Date(),
  });
  const error = await getValidationError(invalid);
  assert.match(error.errors.verifiedBy.message, /cannot verify their own/);

  const verified = new Contribution({
    user: contributor,
    issue: new mongoose.Types.ObjectId(),
    project: new mongoose.Types.ObjectId(),
    contributionType: "bug_fix",
    summary: "Fixed a reported navigation issue.",
    verificationStatus: "verified",
    verifiedBy: new mongoose.Types.ObjectId(),
    verifiedAt: new Date(),
    evidenceUrl: "javascript:alert(1)",
  });
  const verifiedError = await getValidationError(verified);
  assert.ok(verifiedError.errors.evidenceUrl);
});

test("audit log constrains actions and target references", async () => {
  const valid = new AuditLog({ actor: new mongoose.Types.ObjectId(), action: "project.approved", targetType: "project", targetId: new mongoose.Types.ObjectId() });
  await valid.validate();

  const invalid = new AuditLog({ actor: new mongoose.Types.ObjectId(), action: "made.up", targetType: "unknown", targetId: new mongoose.Types.ObjectId() });
  const error = await getValidationError(invalid);
  assert.ok(error.errors.action);
  assert.ok(error.errors.targetType);
});

test("contributions uniquely index one pending submission per user and issue", () => {
  const pendingIndex = Contribution.schema.indexes().find(([, options]) => options.name === "uniq_pending_contribution_per_user_issue");
  assert.ok(pendingIndex);
  assert.equal(pendingIndex[1].unique, true);
  assert.deepEqual(pendingIndex[1].partialFilterExpression, { verificationStatus: "submitted" });
});
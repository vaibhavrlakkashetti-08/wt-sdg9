import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.BCRYPT_ROUNDS = "10";
process.env.JWT_ACCESS_SECRET = "test-only-platform-secret-never-use-in-production";
process.env.AUTH_COOKIE_SAME_SITE = "lax";

const clientOrigin = "http://localhost:5173";
let mongoServer;
let apiServer;
let baseUrl;
let User;
let Project;
let Issue;
let JoinRequest;
let Comment;
let Contribution;
let owner;
let member;
let outsider;
let admin;
let project;
let privateProject;
let tokens;
let issueForWorkflow;
let contributionId;

async function listen(app) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server;
}

async function close(server) {
  if (server?.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

function signToken(user) {
  return jwt.sign({ role: user.role }, process.env.JWT_ACCESS_SECRET, {
    subject: user.id,
    issuer: "campus-issue-tracker",
    expiresIn: "10m",
  });
}

async function api(path, { method = "GET", token, cookie, body, origin = clientOrigin } = {}) {
  const headers = { Origin: origin };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function createProject(title, ownerId, options = {}) {
  return Project.create({
    title,
    description: `A test project used to exercise ${title.toLowerCase()} API behavior.`,
    repositoryUrl: `https://github.com/campus/${title.toLowerCase().replace(/\s+/g, "-")}`,
    technologies: ["React", "Node.js"],
    owner: ownerId,
    status: options.status ?? "approved",
    visibility: options.visibility ?? "public",
  });
}

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri("campus-platform-tests");

  const [{ default: app }, { connectToDatabase }, userModel, projectModel, issueModel, joinModel, commentModel, contributionModel] = await Promise.all([
    import("../src/app.js"),
    import("../src/config/database.js"),
    import("../src/models/user.model.js"),
    import("../src/models/project.model.js"),
    import("../src/models/issue.model.js"),
    import("../src/models/join-request.model.js"),
    import("../src/models/comment.model.js"),
    import("../src/models/contribution.model.js"),
  ]);
  User = userModel.default;
  Project = projectModel.default;
  Issue = issueModel.default;
  JoinRequest = joinModel.default;
  Comment = commentModel.default;
  Contribution = contributionModel.default;

  await connectToDatabase();
  await Promise.all([User.init(), Project.init(), Issue.init(), JoinRequest.init(), Comment.init(), Contribution.init()]);

  const passwordHash = await bcrypt.hash("platform-test-password", 10);
  [owner, member, outsider, admin] = await User.create([
    { name: "Project Owner", email: "owner@campus.edu", passwordHash, role: "student" },
    { name: "Project Member", email: "member@campus.edu", passwordHash, role: "student" },
    { name: "Other Student", email: "outsider@campus.edu", passwordHash, role: "student" },
    { name: "Platform Admin", email: "admin@campus.edu", passwordHash, role: "admin" },
  ]);
  tokens = { owner: signToken(owner), member: signToken(member), outsider: signToken(outsider), admin: signToken(admin) };

  project = await createProject("Campus Tracker", owner.id);
  privateProject = await createProject("Private Research", owner.id, { visibility: "private" });
  await JoinRequest.create({
    project: project.id,
    student: member.id,
    status: "approved",
    decidedBy: owner.id,
    decidedAt: new Date(),
  });

  apiServer = await listen(app);
  baseUrl = `http://127.0.0.1:${apiServer.address().port}`;
});

after(async () => {
  await close(apiServer);
  await mongoose.disconnect();
  await mongoServer?.stop();
  delete process.env.MONGODB_URI;
});

test("project endpoints create, discover, filter, update, inspect, and archive", async () => {
  const unauthorizedCreate = await api("/api/projects", {
    method: "POST",
    body: { title: "Missing Auth", description: "This should not create a project.", repositoryUrl: "https://example.com" },
  });
  assert.equal(unauthorizedCreate.status, 401);

  const invalidCreate = await api("/api/projects", {
    method: "POST",
    token: tokens.owner,
    body: { title: "x", description: "short", repositoryUrl: "javascript:alert(1)", owner: admin.id },
  });
  assert.equal(invalidCreate.status, 400);

  const createdResponse = await api("/api/projects", {
    method: "POST",
    token: tokens.owner,
    body: {
      title: "Student Garden",
      description: "A campus gardening project for student volunteers.",
      repositoryUrl: "https://github.com/campus/garden",
      technologies: ["React", "Node.js"],
    },
  });
  const created = (await createdResponse.json()).data.project;
  assert.equal(createdResponse.status, 201);
  assert.equal(created.status, "pending");
  assert.equal(created.owner.toString(), owner.id);

  const hiddenPending = await api(`/api/projects/${created.id}`);
  assert.equal(hiddenPending.status, 404);
  const ownerPending = await api(`/api/projects/${created.id}`, { token: tokens.owner });
  assert.equal(ownerPending.status, 200);

  const ownerUpdate = await api(`/api/projects/${created.id}`, {
    method: "PUT",
    token: tokens.owner,
    body: { title: "Student Garden Project" },
  });
  assert.equal(ownerUpdate.status, 200);
  assert.equal((await ownerUpdate.json()).data.project.title, "Student Garden Project");

  const forbiddenUpdate = await api(`/api/projects/${created.id}`, {
    method: "PUT",
    token: tokens.outsider,
    body: { title: "Unauthorized edit" },
  });
  assert.equal(forbiddenUpdate.status, 403);

  const adminApproval = await api(`/api/projects/${created.id}`, {
    method: "PUT",
    token: tokens.admin,
    body: { status: "approved", moderationNote: "Reviewed for the test." },
  });
  assert.equal(adminApproval.status, 200);
  assert.equal((await adminApproval.json()).data.project.status, "approved");

  const filteredList = await api("/api/projects?search=garden&technology=react&page=1&limit=1");
  const filteredBody = await filteredList.json();
  assert.equal(filteredList.status, 200);
  assert.equal(filteredBody.data.projects.length, 1);
  assert.equal(filteredBody.meta.limit, 1);
  assert.ok(filteredBody.meta.total >= 1);

  const publicProject = await api(`/api/projects/${project.id}`);
  assert.equal(publicProject.status, 200);
  const privateProjectForOutsider = await api(`/api/projects/${privateProject.id}`, { token: tokens.outsider });
  assert.equal(privateProjectForOutsider.status, 404);
  const privateProjectForOwner = await api(`/api/projects/${privateProject.id}`, { token: tokens.owner });
  assert.equal(privateProjectForOwner.status, 200);

  const archived = await api(`/api/projects/${created.id}`, { method: "DELETE", token: tokens.owner });
  assert.equal(archived.status, 200);
  assert.equal((await archived.json()).data.project.status, "archived");
  const archivedAgain = await api(`/api/projects/${created.id}`, { method: "DELETE", token: tokens.owner });
  assert.equal(archivedAgain.status, 409);

  const invalidId = await api("/api/projects/not-an-object-id");
  assert.equal(invalidId.status, 400);
  const missingProject = await api(`/api/projects/${new mongoose.Types.ObjectId()}`);
  assert.equal(missingProject.status, 404);
});

test("membership endpoints prevent duplicate joins and restrict request decisions", async () => {
  const joinResponse = await api(`/api/projects/${project.id}/join`, {
    method: "POST",
    token: tokens.outsider,
    body: { message: "I would like to help." },
  });
  const joinRequest = (await joinResponse.json()).data.joinRequest;
  assert.equal(joinResponse.status, 201);
  assert.equal(joinRequest.status, "pending");

  const duplicateJoin = await api(`/api/projects/${project.id}/join`, { method: "POST", token: tokens.outsider, body: {} });
  assert.equal(duplicateJoin.status, 409);

  const forbiddenRequests = await api(`/api/projects/${project.id}/requests`, { token: tokens.outsider });
  assert.equal(forbiddenRequests.status, 403);
  const ownerRequests = await api(`/api/projects/${project.id}/requests?page=1&limit=10`, { token: tokens.owner });
  const requestsBody = await ownerRequests.json();
  assert.equal(ownerRequests.status, 200);
  assert.equal(requestsBody.data.requests.length, 1);
  assert.equal(requestsBody.data.requests[0].student.email, undefined);

  const decision = await api(`/api/projects/${project.id}/requests/${joinRequest._id}`, {
    method: "PATCH",
    token: tokens.owner,
    body: { status: "approved", decisionNote: "Welcome aboard." },
  });
  assert.equal(decision.status, 200);
  assert.equal((await decision.json()).data.joinRequest.status, "approved");

  const repeatDecision = await api(`/api/projects/${project.id}/requests/${joinRequest._id}`, {
    method: "PATCH",
    token: tokens.owner,
    body: { status: "approved" },
  });
  assert.equal(repeatDecision.status, 409);
  const joinedAgain = await api(`/api/projects/${project.id}/join`, { method: "POST", token: tokens.outsider, body: {} });
  assert.equal(joinedAgain.status, 409);

  const removed = await api(`/api/projects/${project.id}/members/${outsider.id}`, { method: "DELETE", token: tokens.owner });
  assert.equal(removed.status, 200);
  assert.equal((await removed.json()).data.membership.status, "cancelled");
  const missingMember = await api(`/api/projects/${project.id}/members/${outsider.id}`, { method: "DELETE", token: tokens.owner });
  assert.equal(missingMember.status, 404);
  const removeOwner = await api(`/api/projects/${project.id}/members/${owner.id}`, { method: "DELETE", token: tokens.owner });
  assert.equal(removeOwner.status, 409);

  const adminJoin = await api(`/api/projects/${project.id}/join`, { method: "POST", token: tokens.admin, body: {} });
  assert.equal(adminJoin.status, 403);
  const invalidListFilter = await api(`/api/projects/${project.id}/requests?status=unknown`, { token: tokens.owner });
  assert.equal(invalidListFilter.status, 400);
});

test("issue and comment endpoints enforce membership, filters, ownership, and history", async () => {
  const missingAuth = await api("/api/issues", {
    method: "POST",
    body: { projectId: project.id, title: "Unauth issue", description: "This should fail without authentication.", type: "bug" },
  });
  assert.equal(missingAuth.status, 401);

  const invalidIssue = await api("/api/issues", {
    method: "POST",
    token: tokens.member,
    body: { projectId: project.id, title: "x", description: "short", type: "task" },
  });
  assert.equal(invalidIssue.status, 400);

  const outsiderIssue = await api("/api/issues", {
    method: "POST",
    token: tokens.outsider,
    body: { projectId: project.id, title: "Unauthorized issue", description: "A sufficiently long issue description.", type: "bug" },
  });
  assert.equal(outsiderIssue.status, 403);

  const issueResponse = await api("/api/issues", {
    method: "POST",
    token: tokens.member,
    body: { projectId: project.id, title: "Map markers overlap", description: "Markers overlap on narrow mobile screens.", type: "bug" },
  });
  issueForWorkflow = (await issueResponse.json()).data.issue;
  assert.equal(issueResponse.status, 201);
  assert.equal(issueForWorkflow.status, "open");
  assert.equal(issueForWorkflow.priority, "medium");

  const urgentIssueResponse = await api("/api/issues", {
    method: "POST",
    token: tokens.owner,
    body: { projectId: project.id, title: "Urgent campus outage", description: "A high impact campus service outage.", type: "feature", priority: "urgent" },
  });
  assert.equal(urgentIssueResponse.status, 201);
  const prioritizedIssues = await api(`/api/issues?projectId=${project.id}&sort=priority`, { token: tokens.member });
  assert.equal((await prioritizedIssues.json()).data.issues[0].priority, "urgent");

  const listResponse = await api(`/api/issues?projectId=${project.id}&type=bug&status=open&search=markers&page=1&limit=5`, { token: tokens.member });
  const listBody = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(listBody.data.issues.length, 1);
  assert.equal(listBody.meta.total, 1);

  const cookieAuthenticatedList = await api(`/api/issues?projectId=${project.id}`, { cookie: `access_token=${tokens.member}` });
  assert.equal(cookieAuthenticatedList.status, 200);

  const privateIssue = await Issue.create({
    project: privateProject.id,
    reporter: owner.id,
    title: "Private issue",
    description: "This issue belongs to a private project.",
    type: "feature",
  });
  const privateIssueList = await api(`/api/issues?projectId=${privateProject.id}`, { token: tokens.outsider });
  assert.equal(privateIssueList.status, 404);
  const privateIssueRead = await api(`/api/issues/${privateIssue.id}`, { token: tokens.outsider });
  assert.equal(privateIssueRead.status, 404);

  const reporterEdit = await api(`/api/issues/${issueForWorkflow._id}`, {
    method: "PUT",
    token: tokens.member,
    body: { title: "Map markers overlap on mobile" },
  });
  assert.equal(reporterEdit.status, 200);

  const forbiddenEdit = await api(`/api/issues/${issueForWorkflow._id}`, {
    method: "PUT",
    token: tokens.outsider,
    body: { priority: "high" },
  });
  assert.equal(forbiddenEdit.status, 403);

  const ownerUpdate = await api(`/api/issues/${issueForWorkflow._id}`, {
    method: "PUT",
    token: tokens.owner,
    body: { priority: "high", status: "triaged", assignee: member.id },
  });
  assert.equal(ownerUpdate.status, 200);
  const updatedIssue = (await ownerUpdate.json()).data.issue;
  assert.equal(updatedIssue.priority, "high");
  assert.equal(updatedIssue.status, "triaged");
  assert.equal(updatedIssue.assignee, member.id);

  const assigneeFilter = await api(`/api/issues?projectId=${project.id}&assignee=${member.id}&status=open&priority=high`, { token: tokens.member });
  const assigneeFilterBody = await assigneeFilter.json();
  assert.equal(assigneeFilter.status, 200);
  assert.ok(assigneeFilterBody.data.issues.some((issue) => issue._id === issueForWorkflow._id));

  const invalidAssignee = await api(`/api/issues/${issueForWorkflow._id}`, {
    method: "PUT",
    token: tokens.owner,
    body: { assignee: outsider.id },
  });
  assert.equal(invalidAssignee.status, 400);

  const invalidTransition = await api(`/api/issues/${issueForWorkflow._id}`, {
    method: "PUT",
    token: tokens.owner,
    body: { status: "resolved" },
  });
  assert.equal(invalidTransition.status, 409);

  const issueRead = await api(`/api/issues/${issueForWorkflow._id}`, { token: tokens.member });
  assert.equal(issueRead.status, 200);
  assert.equal((await issueRead.json()).data.issue._id, issueForWorkflow._id);

  const activityResponse = await api(`/api/issues/${issueForWorkflow._id}/activity`, { token: tokens.member });
  const activity = (await activityResponse.json()).data.activity;
  assert.equal(activityResponse.status, 200);
  assert.ok(activity.some((event) => event.action === "issue.created"));
  assert.ok(activity.some((event) => event.action === "issue.status_changed"));

  const commentResponse = await api(`/api/issues/${issueForWorkflow._id}/comments`, {
    method: "POST",
    token: tokens.member,
    body: { content: "I can reproduce this on a narrow viewport." },
  });
  const comment = (await commentResponse.json()).data.comment;
  assert.equal(commentResponse.status, 201);

  const comments = await api(`/api/issues/${issueForWorkflow._id}/comments?page=1&limit=10`, { token: tokens.member });
  assert.equal((await comments.json()).data.comments.length, 1);
  const outsiderComments = await api(`/api/issues/${issueForWorkflow._id}/comments`, { token: tokens.outsider });
  assert.equal(outsiderComments.status, 403);

  const deleteBlocked = await api(`/api/issues/${issueForWorkflow._id}`, { method: "DELETE", token: tokens.owner });
  assert.equal(deleteBlocked.status, 409);

  const forbiddenCommentDelete = await api(`/api/comments/${comment._id}`, { method: "DELETE", token: tokens.outsider });
  assert.equal(forbiddenCommentDelete.status, 403);
  const commentDelete = await api(`/api/comments/${comment._id}`, { method: "DELETE", token: tokens.member });
  assert.equal(commentDelete.status, 204);

  const disposableIssueResponse = await api("/api/issues", {
    method: "POST",
    token: tokens.owner,
    body: { projectId: project.id, title: "Disposable issue", description: "This issue has no dependent records.", type: "feature" },
  });
  const disposableIssue = (await disposableIssueResponse.json()).data.issue;
  const issueDelete = await api(`/api/issues/${disposableIssue._id}`, { method: "DELETE", token: tokens.owner });
  assert.equal(issueDelete.status, 204);
  const deletedIssueRead = await api(`/api/issues/${disposableIssue._id}`, { token: tokens.owner });
  assert.equal(deletedIssueRead.status, 404);
});

test("contribution endpoints submit, protect private history, and verify once", async () => {
  const submitResponse = await api(`/api/issues/${issueForWorkflow._id}/contributions`, {
    method: "POST",
    token: tokens.member,
    body: {
      contributionType: "bug_fix",
      summary: "Fixed overlapping markers on narrow screens.",
      evidenceUrl: "https://github.com/campus/tracker/pull/42",
    },
  });
  const submission = (await submitResponse.json()).data.contribution;
  contributionId = submission._id;
  assert.equal(submitResponse.status, 201);
  assert.equal(submission.verificationStatus, "submitted");

  const duplicateSubmission = await api(`/api/issues/${issueForWorkflow._id}/contributions`, {
    method: "POST",
    token: tokens.member,
    body: { contributionType: "bug_fix", summary: "Another pending contribution for this issue." },
  });
  assert.equal(duplicateSubmission.status, 409);

  const raceIssueResponse = await api("/api/issues", {
    method: "POST",
    token: tokens.member,
    body: { projectId: project.id, title: "Concurrent contribution", description: "A separate issue for the duplicate race test.", type: "bug" },
  });
  const raceIssue = (await raceIssueResponse.json()).data.issue;
  const raceSubmissions = await Promise.all([
    api(`/api/issues/${raceIssue._id}/contributions`, { method: "POST", token: tokens.member, body: { contributionType: "testing", summary: "First concurrent contribution submission." } }),
    api(`/api/issues/${raceIssue._id}/contributions`, { method: "POST", token: tokens.member, body: { contributionType: "testing", summary: "Second concurrent contribution submission." } }),
  ]);
  assert.deepEqual(raceSubmissions.map((result) => result.status).sort(), [201, 409]);

  const publicPendingHistory = await api(`/api/users/${member.id}/contributions`);
  assert.equal((await publicPendingHistory.json()).data.contributions.length, 0);
  const privatePendingHistory = await api(`/api/users/${member.id}/contributions?status=submitted`, { token: tokens.member });
  assert.equal((await privatePendingHistory.json()).data.contributions.length, 2);
  const forbiddenPendingHistory = await api(`/api/users/${member.id}/contributions?status=submitted`, { token: tokens.outsider });
  assert.equal(forbiddenPendingHistory.status, 403);

  const forbiddenVerification = await api(`/api/issues/${issueForWorkflow._id}/verify-contribution`, {
    method: "POST",
    token: tokens.member,
    body: { contributionId, verificationStatus: "verified" },
  });
  assert.equal(forbiddenVerification.status, 403);

  const verified = await api(`/api/issues/${issueForWorkflow._id}/verify-contribution`, {
    method: "POST",
    token: tokens.owner,
    body: { contributionId, verificationStatus: "verified", decisionNote: "Reviewed the linked change." },
  });
  assert.equal(verified.status, 200);
  assert.equal((await verified.json()).data.contribution.verificationStatus, "verified");

  const repeatedVerification = await api(`/api/issues/${issueForWorkflow._id}/verify-contribution`, {
    method: "POST",
    token: tokens.owner,
    body: { contributionId, verificationStatus: "verified" },
  });
  assert.equal(repeatedVerification.status, 409);

  const publicVerifiedHistory = await api(`/api/users/${member.id}/contributions?page=1&limit=10`);
  const publicBody = await publicVerifiedHistory.json();
  assert.equal(publicBody.data.contributions.length, 1);
  assert.equal(publicBody.data.contributions[0].verificationStatus, "verified");
  assert.equal(publicBody.meta.total, 1);

  const ownerSubmission = await api(`/api/issues/${issueForWorkflow._id}/contributions`, {
    method: "POST",
    token: tokens.owner,
    body: { contributionType: "documentation", summary: "Updated the project setup instructions." },
  });
  const selfContribution = (await ownerSubmission.json()).data.contribution;
  assert.equal(ownerSubmission.status, 201);
  const selfVerify = await api(`/api/issues/${issueForWorkflow._id}/verify-contribution`, {
    method: "POST",
    token: tokens.owner,
    body: { contributionId: selfContribution._id, verificationStatus: "verified" },
  });
  assert.equal(selfVerify.status, 403);

  const mismatchedIssue = await api(`/api/issues/${privateProject.id}/verify-contribution`, {
    method: "POST",
    token: tokens.admin,
    body: { contributionId, verificationStatus: "verified" },
  });
  assert.equal(mismatchedIssue.status, 404);

  const invalidUserId = await api("/api/users/not-an-object-id/contributions");
  assert.equal(invalidUserId.status, 400);
});

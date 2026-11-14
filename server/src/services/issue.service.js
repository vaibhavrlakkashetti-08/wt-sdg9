import mongoose from "mongoose";
import Issue from "../models/issue.model.js";
import Comment from "../models/comment.model.js";
import Contribution from "../models/contribution.model.js";
import JoinRequest from "../models/join-request.model.js";
import Project from "../models/project.model.js";
import User from "../models/user.model.js";
import AuditLog from "../models/audit-log.model.js";
import { AppError } from "../utils/app-error.js";
import { getPagination } from "../utils/pagination.js";
import { assertProjectParticipantAccess, assertProjectVisible, isProjectManager } from "./project-access.service.js";

const STATUS_TRANSITIONS = {
  open: ["triaged", "in_progress", "closed", "rejected"],
  triaged: ["open", "in_progress", "closed", "rejected"],
  in_progress: ["open", "resolved", "closed"],
  resolved: ["in_progress", "closed"],
  closed: ["open"],
  rejected: ["open"],
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findIssueOr404(issueId) {
  const issue = await Issue.findById(issueId);
  if (!issue) throw new AppError(404, "ISSUE_NOT_FOUND", "Issue was not found.");
  return issue;
}

async function getIssueProject(issue) {
  const project = await Project.findById(issue.project);
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Issue project was not found.");
  return project;
}

async function getVisibleProjectIds(auth) {
  if (auth.role === "admin") return Project.find({}).distinct("_id");
  const memberships = await JoinRequest.distinct("project", { student: auth.userId, status: "approved" });
  return Project.find({
    $or: [
      { status: "approved", visibility: "public" },
      { owner: auth.userId },
      { _id: { $in: memberships }, status: "approved" },
    ],
  }).distinct("_id");
}

export async function createIssue(input, auth) {
  const project = await Project.findById(input.projectId);
  if (!project || project.status !== "approved") throw new AppError(404, "PROJECT_NOT_FOUND", "Approved project was not found.");
  await assertProjectParticipantAccess(project, auth);

  return Issue.create({
    project: project._id,
    reporter: auth.userId,
    title: input.title,
    description: input.description,
    type: input.type,
    priority: input.priority ?? "medium",
    status: "open",
  });
}

export async function listIssues(query, auth) {
  const { page, limit, skip } = getPagination(query);
  const visibleProjectIds = await getVisibleProjectIds(auth);
  const filter = { project: { $in: visibleProjectIds } };

  if (query.projectId) {
    const project = await Project.findById(query.projectId);
    if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found.");
    await assertProjectVisible(project, auth);
    filter.project = project._id;
  }
  if (query.type) filter.type = query.type;
  if (query.priority === "high") filter.priority = { $in: ["high", "urgent"] };
  else if (query.priority) filter.priority = query.priority;
  if (query.status === "open") filter.status = { $in: ["open", "triaged"] };
  else if (query.status === "closed") filter.status = { $in: ["closed", "rejected"] };
  else if (query.status) filter.status = query.status;
  if (query.assignee) filter.assignee = new mongoose.Types.ObjectId(query.assignee);
  if (query.reporter) filter.reporter = new mongoose.Types.ObjectId(query.reporter);
  if (query.search) {
    const expression = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [{ title: expression }, { description: expression }];
  }

  let items;
  let total;
  if (query.sort === "priority") {
    [items, total] = await Promise.all([
      Issue.aggregate([
        { $match: filter },
        {
          $addFields: {
            priorityRank: {
              $switch: {
                branches: [
                  { case: { $eq: ["$priority", "urgent"] }, then: 4 },
                  { case: { $eq: ["$priority", "high"] }, then: 3 },
                  { case: { $eq: ["$priority", "medium"] }, then: 2 },
                  { case: { $eq: ["$priority", "low"] }, then: 1 },
                ],
                default: 0,
              },
            },
          },
        },
        { $sort: { priorityRank: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $unset: "priorityRank" },
      ]),
      Issue.countDocuments(filter),
    ]);
    items = await Issue.populate(items, [
      { path: "reporter", select: "name profileImage" },
      { path: "assignee", select: "name profileImage" },
      { path: "project", select: "title" },
    ]);
  } else {
    const sort = query.sort === "updated" ? { updatedAt: -1 } : { createdAt: -1 };
    [items, total] = await Promise.all([
      Issue.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("reporter", "name profileImage")
        .populate("assignee", "name profileImage")
        .populate("project", "title")
        .lean(),
      Issue.countDocuments(filter),
    ]);
  }
  return { items, total, page, limit };
}

export async function getIssue(issueId, auth) {
  const issue = await Issue.findById(issueId)
    .populate("reporter", "name profileImage")
    .populate("assignee", "name profileImage")
    .populate("project", "title status visibility owner");
  if (!issue) throw new AppError(404, "ISSUE_NOT_FOUND", "Issue was not found.");
  await assertProjectVisible(issue.project, auth);
  return issue;
}

export async function listIssueActivity(issueId, query, auth) {
  const issue = await findIssueOr404(issueId);
  const project = await getIssueProject(issue);
  await assertProjectVisible(project, auth);

  const { page, limit, skip } = getPagination(query);
  const totalLogs = await AuditLog.countDocuments({ targetType: "issue", targetId: issueId });
  const total = totalLogs + 1;
  const logCount = Math.max(0, Math.min(limit, totalLogs - skip));
  const logs = logCount > 0
    ? await AuditLog.find({ targetType: "issue", targetId: issueId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(logCount)
      .populate("actor", "name profileImage")
      .lean()
    : [];

  const events = logs.map((log) => ({
    id: log._id.toString(),
    action: log.action,
    summary: log.reason || log.action,
    actor: log.actor ? { id: log.actor._id.toString(), name: log.actor.name, profileImage: log.actor.profileImage } : null,
    createdAt: log.createdAt,
  }));

  if (skip <= totalLogs && skip + limit > totalLogs) {
    const reporter = await User.findById(issue.reporter).select("name profileImage").lean();
    events.push({
      id: `${issue._id.toString()}-created`,
      action: "issue.created",
      summary: "Issue created",
      actor: reporter ? { id: reporter._id.toString(), name: reporter.name, profileImage: reporter.profileImage } : null,
      createdAt: issue.createdAt,
    });
  }

  return { items: events, total, page, limit };
}

export async function updateIssue(issueId, input, auth) {
  const issue = await findIssueOr404(issueId);
  const project = await getIssueProject(issue);
  if (project.status !== "approved") throw new AppError(409, "PROJECT_NOT_ACTIVE", "Issues in this project cannot be changed.");

  const manager = isProjectManager(project, auth);
  if (!manager) await assertProjectParticipantAccess(project, auth);
  const reporterCanEdit = issue.reporter.toString() === auth.userId && issue.status === "open";
  const managerFields = ["priority", "status", "assignee"];
  if (!manager && (!reporterCanEdit || managerFields.some((field) => input[field] !== undefined))) {
    throw new AppError(403, "FORBIDDEN", "You cannot modify this issue.");
  }

  const previousStatus = issue.status;
  if (input.status !== undefined && input.status !== previousStatus && !STATUS_TRANSITIONS[previousStatus].includes(input.status)) {
    throw new AppError(409, "INVALID_STATUS_TRANSITION", `Issue cannot transition from ${previousStatus} to ${input.status}.`);
  }

  if (input.assignee) {
    const assignee = await User.findById(input.assignee).select("_id accountStatus");
    const isOwner = project.owner.toString() === input.assignee;
    const isMember = await JoinRequest.exists({ project: project._id, student: input.assignee, status: "approved" });
    if (!assignee || assignee.accountStatus !== "active" || (!isOwner && !isMember)) {
      throw new AppError(400, "INVALID_ASSIGNEE", "Assignee must be an active project member or the project owner.");
    }
  }

  for (const field of ["title", "description", "priority", "status", "assignee"]) {
    if (input[field] !== undefined) issue[field] = input[field];
  }
  await issue.save();

  if (issue.status !== previousStatus) {
    await AuditLog.create({
      actor: auth.userId,
      action: "issue.status_changed",
      targetType: "issue",
      targetId: issue._id,
      reason: `Status changed from ${previousStatus} to ${issue.status}.`,
    });
  }

  return issue;
}

export async function deleteIssue(issueId, auth) {
  const issue = await findIssueOr404(issueId);
  const project = await getIssueProject(issue);
  if (!isProjectManager(project, auth)) throw new AppError(403, "FORBIDDEN", "Only a project owner or administrator can delete an issue.");

  const [hasComments, hasContributions] = await Promise.all([
    Comment.exists({ issue: issueId }),
    Contribution.exists({ issue: issueId }),
  ]);
  if (hasComments || hasContributions) {
    throw new AppError(409, "ISSUE_HAS_HISTORY", "Issue cannot be deleted while comments or contributions reference it.");
  }

  await Issue.deleteOne({ _id: issueId });
}

export async function listIssueComments(issueId, query, auth) {
  const issue = await findIssueOr404(issueId);
  const project = await getIssueProject(issue);
  await assertProjectParticipantAccess(project, auth);
  const { page, limit, skip } = getPagination(query);
  const [items, total] = await Promise.all([
    Comment.find({ issue: issueId }).sort({ createdAt: 1 }).skip(skip).limit(limit).populate("author", "name profileImage").lean(),
    Comment.countDocuments({ issue: issueId }),
  ]);
  return { items, total, page, limit };
}

export async function createIssueComment(issueId, content, auth) {
  const issue = await findIssueOr404(issueId);
  const project = await getIssueProject(issue);
  await assertProjectParticipantAccess(project, auth);
  if (["closed", "rejected"].includes(issue.status)) throw new AppError(409, "ISSUE_CLOSED", "Comments are disabled for this issue.");
  return Comment.create({ issue: issueId, author: auth.userId, content });
}

export async function deleteIssueComment(commentId, auth) {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment was not found.");
  const issue = await findIssueOr404(comment.issue);
  const project = await getIssueProject(issue);
  const canDelete = comment.author.toString() === auth.userId || isProjectManager(project, auth);
  if (!canDelete) throw new AppError(403, "FORBIDDEN", "You cannot delete this comment.");
  await comment.deleteOne();
}
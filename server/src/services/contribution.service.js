import AuditLog from "../models/audit-log.model.js";
import Contribution from "../models/contribution.model.js";
import Issue from "../models/issue.model.js";
import Project from "../models/project.model.js";
import User from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";
import { getPagination } from "../utils/pagination.js";
import { assertProjectParticipantAccess, isProjectManager } from "./project-access.service.js";

export async function submitContribution(issueId, input, auth) {
  const issue = await Issue.findById(issueId);
  if (!issue) throw new AppError(404, "ISSUE_NOT_FOUND", "Issue was not found.");
  if (["closed", "rejected"].includes(issue.status)) throw new AppError(409, "ISSUE_CLOSED", "Contributions cannot be submitted for this issue.");

  const project = await Project.findById(issue.project);
  if (!project || project.status !== "approved") throw new AppError(404, "PROJECT_NOT_FOUND", "Approved project was not found.");
  await assertProjectParticipantAccess(project, auth);

  if (await Contribution.exists({ issue: issueId, user: auth.userId, verificationStatus: "submitted" })) {
    throw new AppError(409, "CONTRIBUTION_ALREADY_SUBMITTED", "A pending contribution already exists for this issue.");
  }

  try {
    return await Contribution.create({
      issue: issueId,
      project: project._id,
      user: auth.userId,
      contributionType: input.contributionType,
      summary: input.summary,
      evidenceUrl: input.evidenceUrl,
      verificationStatus: "submitted",
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError(409, "CONTRIBUTION_ALREADY_SUBMITTED", "A pending contribution already exists for this issue.");
    }
    throw error;
  }
}

export async function verifyContribution(issueId, input, auth) {
  const issue = await Issue.findById(issueId);
  if (!issue) throw new AppError(404, "ISSUE_NOT_FOUND", "Issue was not found.");
  const project = await Project.findById(issue.project);
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found.");
  if (!isProjectManager(project, auth)) throw new AppError(403, "FORBIDDEN", "Only the project owner or an administrator can verify contributions.");

  const contribution = await Contribution.findOne({ _id: input.contributionId, issue: issueId });
  if (!contribution) throw new AppError(404, "CONTRIBUTION_NOT_FOUND", "Contribution was not found for this issue.");
  if (contribution.verificationStatus !== "submitted") {
    throw new AppError(409, "CONTRIBUTION_ALREADY_REVIEWED", "Contribution has already been reviewed.");
  }
  if (contribution.user.toString() === auth.userId) {
    throw new AppError(403, "SELF_VERIFICATION_FORBIDDEN", "You cannot verify your own contribution.");
  }

  const reviewedAt = new Date();
  contribution.verificationStatus = input.verificationStatus;
  contribution.decisionNote = input.decisionNote ?? "";
  if (input.verificationStatus === "verified") {
    contribution.verifiedBy = auth.userId;
    contribution.verifiedAt = reviewedAt;
    contribution.reviewedBy = undefined;
    contribution.reviewedAt = undefined;
  } else {
    contribution.verifiedBy = undefined;
    contribution.verifiedAt = undefined;
    contribution.reviewedBy = auth.userId;
    contribution.reviewedAt = reviewedAt;
  }

  await contribution.validate();
  const decisionFields = input.verificationStatus === "verified"
    ? { verificationStatus: input.verificationStatus, verifiedBy: auth.userId, verifiedAt: reviewedAt, decisionNote: contribution.decisionNote }
    : { verificationStatus: input.verificationStatus, reviewedBy: auth.userId, reviewedAt, decisionNote: contribution.decisionNote };
  const unsetFields = input.verificationStatus === "verified"
    ? { reviewedBy: 1, reviewedAt: 1 }
    : { verifiedBy: 1, verifiedAt: 1 };

  const updated = await Contribution.findOneAndUpdate(
    { _id: contribution._id, verificationStatus: "submitted" },
    { $set: decisionFields, $unset: unsetFields },
    { returnDocument: "after", runValidators: false },
  );
  if (!updated) throw new AppError(409, "CONTRIBUTION_ALREADY_REVIEWED", "Contribution has already been reviewed.");

  await AuditLog.create({
    actor: auth.userId,
    action: input.verificationStatus === "verified" ? "contribution.verified" : "contribution.rejected",
    targetType: "contribution",
    targetId: contribution._id,
    reason: contribution.decisionNote,
  });
  return updated;
}

export async function listUserContributions(userId, query, auth) {
  const user = await User.findById(userId).select("_id");
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "User was not found.");

  const canSeePrivate = Boolean(auth && (auth.userId === userId || auth.role === "admin"));
  if (query.status && query.status !== "verified" && !canSeePrivate) {
    throw new AppError(403, "FORBIDDEN", "Only the contributor or an administrator can view unverified contributions.");
  }

  const { page, limit, skip } = getPagination(query);
  const filter = { user: userId };
  if (query.status) filter.verificationStatus = query.status;
  else if (!canSeePrivate) filter.verificationStatus = "verified";

  const [items, total] = await Promise.all([
    Contribution.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("project", "title")
      .populate("issue", "title")
      .populate("verifiedBy", "name")
      .populate("reviewedBy", "name")
      .lean(),
    Contribution.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}
import mongoose from "mongoose";
import { isHttpUrl } from "./model-validators.js";

const contributionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    issue: { type: mongoose.Schema.Types.ObjectId, ref: "Issue", required: true },
    contributionType: {
      type: String,
      enum: ["bug_fix", "feature", "documentation", "testing", "design", "other"],
      required: true,
    },
    summary: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    evidenceUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      validate: {
        validator: (value) => value == null || value === "" || isHttpUrl(value),
        message: "Evidence URL must use HTTP or HTTPS.",
      },
    },
    verificationStatus: { type: String, enum: ["submitted", "verified", "rejected"], default: "submitted", required: true },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required() { return this.verificationStatus === "verified"; },
      validate: {
        validator(value) { return !value || !value.equals(this.user); },
        message: "A contributor cannot verify their own contribution.",
      },
    },
    verifiedAt: { type: Date, required() { return this.verificationStatus === "verified"; } },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required() { return this.verificationStatus === "rejected"; },
    },
    reviewedAt: { type: Date, required() { return this.verificationStatus === "rejected"; } },
    decisionNote: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: true, versionKey: false },
);

contributionSchema.index({ user: 1, verificationStatus: 1, createdAt: -1 });
contributionSchema.index({ project: 1, verificationStatus: 1, createdAt: -1 });
contributionSchema.index({ issue: 1, createdAt: -1 });
contributionSchema.index(
  { issue: 1, user: 1 },
  {
    unique: true,
    partialFilterExpression: { verificationStatus: "submitted" },
    name: "uniq_pending_contribution_per_user_issue",
  },
);

export default mongoose.models.Contribution || mongoose.model("Contribution", contributionSchema);
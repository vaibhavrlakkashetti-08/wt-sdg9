import mongoose from "mongoose";

const joinRequestSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, trim: true, maxlength: 1000, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected", "cancelled"], default: "pending", required: true },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required() { return this.status !== "pending"; },
    },
    decidedAt: { type: Date, required() { return this.status !== "pending"; } },
    decisionNote: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: true, versionKey: false },
);

joinRequestSchema.index(
  { project: 1, student: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
    name: "uniq_pending_join_request_per_student_project",
  },
);
joinRequestSchema.index(
  { project: 1, student: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "approved" },
    name: "uniq_approved_membership_per_student_project",
  },
);
joinRequestSchema.index({ project: 1, status: 1, createdAt: -1 });
joinRequestSchema.index({ student: 1, status: 1, createdAt: -1 });

export default mongoose.models.JoinRequest || mongoose.model("JoinRequest", joinRequestSchema);
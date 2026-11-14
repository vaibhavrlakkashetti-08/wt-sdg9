import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: [
        "project.approved",
        "project.rejected",
        "project.archived",
        "join_request.approved",
        "join_request.rejected",
        "issue.status_changed",
        "contribution.verified",
        "contribution.rejected",
        "user.suspended",
        "user.restored",
        "content.hidden",
      ],
      required: true,
    },
    targetType: { type: String, enum: ["user", "project", "issue", "comment", "contribution", "joinRequest"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
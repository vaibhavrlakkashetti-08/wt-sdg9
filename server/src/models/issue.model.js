import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 20000 },
    type: { type: String, enum: ["bug", "feature"], required: true },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium", required: true },
    status: {
      type: String,
      enum: ["open", "triaged", "in_progress", "resolved", "closed", "rejected"],
      default: "open",
      required: true,
    },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, versionKey: false },
);

issueSchema.index({ project: 1, status: 1, updatedAt: -1 });
issueSchema.index({ project: 1, type: 1, status: 1, createdAt: -1 });
issueSchema.index({ assignee: 1, status: 1, updatedAt: -1 });
issueSchema.index({ reporter: 1, createdAt: -1 });

export default mongoose.models.Issue || mongoose.model("Issue", issueSchema);
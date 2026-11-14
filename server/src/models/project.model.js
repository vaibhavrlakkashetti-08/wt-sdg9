import mongoose from "mongoose";
import { hasUniqueNormalizedValues, isHttpUrl } from "./model-validators.js";

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 10000 },
    repositoryUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      validate: { validator: isHttpUrl, message: "Repository URL must use HTTP or HTTPS." },
    },
    technologies: {
      type: [{ type: String, trim: true, maxlength: 40 }],
      default: [],
      validate: [
        { validator: (values) => values.length <= 30, message: "A maximum of 30 technologies is allowed." },
        { validator: hasUniqueNormalizedValues, message: "Technologies must be unique." },
      ],
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "approved", "rejected", "archived"], default: "pending", required: true },
    visibility: { type: String, enum: ["public", "private"], default: "public", required: true },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    moderatedAt: { type: Date, default: null },
    moderationNote: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

projectSchema.virtual("members", {
  ref: "JoinRequest",
  localField: "_id",
  foreignField: "project",
  match: { status: "approved" },
});

projectSchema.index({ status: 1, visibility: 1, updatedAt: -1 });
projectSchema.index({ owner: 1, status: 1, updatedAt: -1 });
projectSchema.index({ title: "text", description: "text", technologies: "text" });

export default mongoose.models.Project || mongoose.model("Project", projectSchema);
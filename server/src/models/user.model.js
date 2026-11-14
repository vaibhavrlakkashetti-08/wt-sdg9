import mongoose from "mongoose";
import { hasUniqueNormalizedValues, isHttpUrl } from "./model-validators.js";

function removePasswordHash(_document, returnedObject) {
  delete returnedObject.passwordHash;
  return returnedObject;
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
      match: [/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/, "passwordHash must contain a bcrypt hash."],
    },
    role: { type: String, enum: ["student", "admin"], default: "student", required: true },
    accountStatus: { type: String, enum: ["active", "suspended"], default: "active", required: true },
    bio: { type: String, trim: true, maxlength: 500, default: "" },
    skills: {
      type: [{ type: String, trim: true, maxlength: 40 }],
      default: [],
      validate: [
        { validator: (values) => values.length <= 30, message: "A maximum of 30 skills is allowed." },
        { validator: hasUniqueNormalizedValues, message: "Skills must be unique." },
      ],
    },
    profileImage: {
      type: String,
      trim: true,
      maxlength: 2048,
      validate: { validator: (value) => value == null || value === "" || isHttpUrl(value), message: "Profile image must be an HTTP(S) URL." },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { transform: removePasswordHash },
    toObject: { transform: removePasswordHash },
  },
);

userSchema.index({ role: 1, createdAt: -1 });

export default mongoose.models.User || mongoose.model("User", userSchema);
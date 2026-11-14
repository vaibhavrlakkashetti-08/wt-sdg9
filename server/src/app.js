import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import authRoutes from "./routes/auth.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import healthRoutes from "./routes/health.routes.js";
import issueRoutes from "./routes/issue.routes.js";
import projectRoutes from "./routes/project.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: [env.clientUrl], credentials: true }));
app.use(express.json({ limit: "1mb", strict: true }));
app.use(cookieParser());
app.use("/api/v1", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/users", userRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
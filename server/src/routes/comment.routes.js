import { Router } from "express";
import { deleteComment } from "../controllers/comment.controller.js";
import { authenticate } from "../middleware/authentication.js";
import { validateObjectIdParams } from "../validators/object-id.js";

const router = Router();

router.delete("/:commentId", authenticate, validateObjectIdParams("commentId"), deleteComment);

export default router;
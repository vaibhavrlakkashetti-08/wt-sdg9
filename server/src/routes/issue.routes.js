import { Router } from "express";
import { createComment, getComments } from "../controllers/comment.controller.js";
import { createIssue, createIssueContribution, deleteIssue, getIssue, getIssueActivity, getIssues, updateIssue, verifyContribution } from "../controllers/issue.controller.js";
import { authenticate } from "../middleware/authentication.js";
import { validateObjectIdParams } from "../validators/object-id.js";
import {
  validateCommentBody,
  validateContributionBody,
  validateContributionDecisionBody,
  validateIssueCreateBody,
  validateIssueListQuery,
  validateIssueUpdateBody,
  validatePageQuery,
} from "../validators/platform.validators.js";
import { validateRequest } from "../validators/validate-request.js";

const router = Router();

router.use(authenticate);
router.get("/", validateRequest({ query: validateIssueListQuery }), getIssues);
router.post("/", validateRequest({ body: validateIssueCreateBody }), createIssue);
router.get("/:issueId", validateObjectIdParams("issueId"), getIssue);
router.get("/:issueId/activity", validateObjectIdParams("issueId"), validateRequest({ query: validatePageQuery }), getIssueActivity);
router.put("/:issueId", validateObjectIdParams("issueId"), validateRequest({ body: validateIssueUpdateBody }), updateIssue);
router.delete("/:issueId", validateObjectIdParams("issueId"), deleteIssue);
router.get("/:issueId/comments", validateObjectIdParams("issueId"), validateRequest({ query: validatePageQuery }), getComments);
router.post("/:issueId/comments", validateObjectIdParams("issueId"), validateRequest({ body: validateCommentBody }), createComment);
router.post("/:issueId/contributions", validateObjectIdParams("issueId"), validateRequest({ body: validateContributionBody }), createIssueContribution);
router.post("/:issueId/verify-contribution", validateObjectIdParams("issueId"), validateRequest({ body: validateContributionDecisionBody }), verifyContribution);

export default router;
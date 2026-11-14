import { Router } from "express";
import {
  createProject,
  deleteProject,
  deleteProjectMember,
  getJoinRequests,
  getProject,
  getProjects,
  joinProject,
  patchJoinRequest,
  updateProject,
} from "../controllers/project.controller.js";
import { authenticate, optionalAuthenticate } from "../middleware/authentication.js";
import { requireProjectOwner } from "../middleware/authorization.js";
import { validateObjectIdParams } from "../validators/object-id.js";
import {
  validateJoinBody,
  validateJoinDecisionBody,
  validateJoinRequestListQuery,
  validateProjectCreateBody,
  validateProjectListQuery,
  validateProjectUpdateBody,
} from "../validators/platform.validators.js";
import { validateRequest } from "../validators/validate-request.js";

const router = Router();

router.get("/", optionalAuthenticate, validateRequest({ query: validateProjectListQuery }), getProjects);
router.post("/", authenticate, validateRequest({ body: validateProjectCreateBody }), createProject);
router.get("/:projectId", optionalAuthenticate, validateObjectIdParams("projectId"), getProject);
router.put("/:projectId", authenticate, validateObjectIdParams("projectId"), requireProjectOwner, validateRequest({ body: validateProjectUpdateBody }), updateProject);
router.delete("/:projectId", authenticate, validateObjectIdParams("projectId"), requireProjectOwner, deleteProject);

router.post("/:projectId/join", authenticate, validateObjectIdParams("projectId"), validateRequest({ body: validateJoinBody }), joinProject);
router.get("/:projectId/requests", authenticate, validateObjectIdParams("projectId"), requireProjectOwner, validateRequest({ query: validateJoinRequestListQuery }), getJoinRequests);
router.patch("/:projectId/requests/:requestId", authenticate, validateObjectIdParams("projectId", "requestId"), requireProjectOwner, validateRequest({ body: validateJoinDecisionBody }), patchJoinRequest);
router.delete("/:projectId/members/:userId", authenticate, validateObjectIdParams("projectId", "userId"), requireProjectOwner, deleteProjectMember);

export default router;
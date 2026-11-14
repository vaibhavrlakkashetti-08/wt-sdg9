import { Router } from "express";
import { getUserContributions } from "../controllers/contribution.controller.js";
import { optionalAuthenticate } from "../middleware/authentication.js";
import { validateObjectIdParams } from "../validators/object-id.js";
import { validateContributionListQuery } from "../validators/platform.validators.js";
import { validateRequest } from "../validators/validate-request.js";

const router = Router();

router.get("/:userId/contributions", optionalAuthenticate, validateObjectIdParams("userId"), validateRequest({ query: validateContributionListQuery }), getUserContributions);

export default router;
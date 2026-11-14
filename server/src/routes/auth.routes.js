import { Router } from "express";
import { currentUser, login, logout, register } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authentication.js";
import { requireTrustedOrigin } from "../middleware/trusted-origin.js";
import { validateRequest } from "../validators/validate-request.js";
import { validateLoginBody, validateRegistrationBody } from "../validators/auth.validators.js";

const router = Router();

router.post("/register", requireTrustedOrigin, validateRequest({ body: validateRegistrationBody }), register);
router.post("/login", requireTrustedOrigin, validateRequest({ body: validateLoginBody }), login);
router.post("/logout", requireTrustedOrigin, logout);
router.get("/me", authenticate, currentUser);

export default router;
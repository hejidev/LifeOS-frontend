// src/routes/security.routes.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/roles.middleware";
import * as securityController from "../controllers/security.controller";

const router = Router();
router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

router.get("/overview", securityController.getOverview);
router.get("/flagged-accounts", securityController.getFlagged);
router.get("/login-attempts", securityController.getLoginAttempts);
router.post("/users/:id/force-logout", securityController.forceLogout);

export default router;
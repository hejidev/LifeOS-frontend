import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.middleware";
import { requireStaffSession } from "../middlewares/staff-session.middleware";
import * as staffAuthController from "../controllers/staff-auth.controller";

const staffLoginSchema = z.object({
  body: z.object({
    storeCode: z.string().trim().min(1),
    name: z.string().trim().min(1),
    pin: z.string().regex(/^\d{4,6}$/),
  }),
});

const router = Router();

router.post("/staff-session/login", validate(staffLoginSchema), staffAuthController.login);
router.get("/staff-session/me", requireStaffSession, staffAuthController.me);
router.post("/staff-session/logout", requireStaffSession, staffAuthController.logout);

export default router;
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/roles.middleware";

const router = Router();

router.get(
  "/dashboard",
  requireAuth,
  requireRole("admin", "super_admin"),
  (req, res) => {
    res.json({ message: "Admin dashboard data" });
  }
);

export default router;
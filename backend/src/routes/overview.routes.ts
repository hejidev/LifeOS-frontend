import express from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as overviewController from "../controllers/overview.controller";

const router = express.Router();

router.use(requireAuth);
router.get("/overview/today", overviewController.getTodayOverview);

export default router;
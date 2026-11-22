import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { rateLimitUser } from "../lib/rate-limit";
import * as controller from "../controllers/discover.controller";

const router = Router();
router.use(requireAuth);

router.get("/search", rateLimitUser("search", 90, 60, "You're searching too quickly."), controller.search);
router.get("/setup", controller.setup);

export default router;
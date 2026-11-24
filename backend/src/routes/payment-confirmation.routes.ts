import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireMerchant } from "../middlewares/merchant.middleware";
import { validate } from "../middlewares/validate.middleware";
import * as controller from "../controllers/payment-confirmation.controller";

const confirmSchema = z.object({ body: z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }) });
const disputeSchema = z.object({ body: z.object({ reason: z.string().trim().min(3).max(200) }) });

const router = Router();
router.use(requireAuth, requireMerchant);

router.get("/summary", controller.summary);
router.get("/pending", controller.pending);
router.post("/confirm", validate(confirmSchema), controller.confirm);
router.post("/:id/dispute", validate(disputeSchema), controller.dispute);

export default router;
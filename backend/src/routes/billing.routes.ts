import { Router } from "express";
import express from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { checkoutSchema } from "../validators/billing.validator";
import * as billingController from "../controllers/billing.controller";

const router = Router();

// Stripe needs the RAW body to verify the signature — must NOT go through express.json()
// router.post("/billing/webhook", express.raw({ type: "application/json" }), billingController.webhook);

router.use(requireAuth);
router.get("/billing/summary", billingController.getSummary);
router.post("/billing/checkout", validate(checkoutSchema), billingController.checkout);
router.post("/billing/portal", billingController.portal);

export default router;
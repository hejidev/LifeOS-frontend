import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { rateLimitUser } from "../lib/rate-limit";
import { createVaultItemSchema, updateVaultItemSchema } from "../validators/vault.validator";
import * as vaultController from "../controllers/vault.controller";

const router = Router();

router.use("/vault", (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

const revealLimit = rateLimitUser("vault-reveal", 30, 60, "You're revealing passwords too quickly.");

router.get("/vault/dashboard", requireAuth, vaultController.getDashboard);
router.post("/vault/items/:id/reveal", requireAuth, revealLimit, vaultController.revealItem);
// router.get("/vault/items/:id/reveal", requireAuth, revealLimit, vaultController.revealItem);
router.post("/vault/items", requireAuth, validate(createVaultItemSchema), vaultController.createItem);
router.patch("/vault/items/:id", requireAuth, validate(updateVaultItemSchema), vaultController.updateItem);
router.delete("/vault/items/:id", requireAuth, vaultController.deleteItem);

export default router;
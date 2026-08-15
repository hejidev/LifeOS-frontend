import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createVaultItemSchema, updateVaultItemSchema } from "../validators/vault.validator";
import * as vaultController from "../controllers/vault.controller";

const router = Router();
router.use(requireAuth);

router.get("/vault/dashboard", vaultController.getDashboard);
router.get("/vault/items/:id/reveal", vaultController.revealItem);
router.post("/vault/items", validate(createVaultItemSchema), vaultController.createItem);
router.patch("/vault/items/:id", validate(updateVaultItemSchema), vaultController.updateItem);
router.delete("/vault/items/:id", vaultController.deleteItem);

export default router;
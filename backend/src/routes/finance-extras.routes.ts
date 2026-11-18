import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { transferSchema, updateAccountSchema } from "../validators/finance.validator";
import * as controller from "../controllers/finance-extras.controller";

const router = Router();
router.use(requireAuth);

router.post("/transfers", validate(transferSchema), controller.createTransfer);
router.patch("/accounts/:id", validate(updateAccountSchema), controller.updateAccount);
router.delete("/accounts/:id", controller.deleteAccount);
router.delete("/categories/:id", controller.deleteCategory);

export default router;
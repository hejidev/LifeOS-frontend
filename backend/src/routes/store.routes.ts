import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireMerchant } from "../middlewares/merchant.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createStoreSchema, updateStoreSchema } from "../validators/store.validator";
import * as storeController from "../controllers/store.controller";

const router = Router();
router.use(requireAuth);
router.use(requireMerchant);

router.get("/", storeController.listStores);
router.post("/", validate(createStoreSchema), storeController.createStore);
router.patch("/:id", validate(updateStoreSchema), storeController.updateStore);
router.post("/:id/set-default", storeController.setDefaultStore);

export default router;
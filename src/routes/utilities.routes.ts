import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as utilitiesController from "../controllers/utilities.controller";
import { validate } from "../middlewares/validate.middleware";
import { translateSchema } from "../validators/utilities.validator";

const router = Router();
router.use(requireAuth);
router.get("/utilities/exchange-rates", utilitiesController.getExchangeRates);


router.post("/utilities/translate", validate(translateSchema), utilitiesController.translateText);

export default router;
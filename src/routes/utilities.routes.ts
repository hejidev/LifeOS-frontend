import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";

import * as utilitiesController from "../controllers/utilities.controller";

import { translateSchema } from "../validators/utilities.validator";
import { createSocialProfileSchema, 
  updateSocialProfileSchema, } from "../validators/social-profile.validator";

const router = Router();

router.use(requireAuth);

router.get("/utilities/exchange-rates", utilitiesController.getExchangeRates);

router.post(
  "/utilities/translate",
  validate(translateSchema),
  utilitiesController.translateText
);

router.get("/social-profile/me", utilitiesController.getMySocialProfile);

router.post(
  "/utilities/social-profile",
  validate(createSocialProfileSchema),
  utilitiesController.createSocialProfile
);

router.patch(
  "/utilities/social-profile",
  validate(updateSocialProfileSchema),
  utilitiesController.updateSocialProfile
);

router.delete(
  "/utilities/social-profile",
  utilitiesController.deleteSocialProfile
);

export default router;
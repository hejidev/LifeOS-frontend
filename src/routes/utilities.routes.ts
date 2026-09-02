import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";

import * as utilitiesController from "../controllers/utilities.controller";

import { translateSchema } from "../validators/utilities.validator";
import {
  createSocialProfileSchema,
} from "../validators/social-profile.validator";

const router = Router();

// Protected utilities
router.use(requireAuth);

router.get(
  "/utilities/exchange-rates",
  utilitiesController.getExchangeRates
);

router.post(
  "/utilities/translate",
  validate(translateSchema),
  utilitiesController.translateText
);

router.get(
  "/social-profile/me",
  utilitiesController.getMySocialProfile
);

// Protected social profile creation
router.post(
  "/utilities/social-profile",
  validate(createSocialProfileSchema),
  utilitiesController.createSocialProfile
);

router.get(
  "/public/social-profile/:slug",
  (req, res, next) => utilitiesController.getPublicSocialProfile(req.params.slug).then(data => res.json(data)).catch(next)
);

export default router;
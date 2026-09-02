import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";

import * as utilitiesController from "../controllers/utilities.controller";

import { translateSchema } from "../validators/utilities.validator";
import { createSocialProfileSchema } from "../validators/social-profile.validator";

const router = Router();

router.get(
  "/public/social-profile/:slug",
  (req, res, next) =>
    utilitiesController
      .getPublicSocialProfile(req.params.slug, {
        userAgent: req.get("user-agent") ?? undefined,
        referrer: req.get("referer") ?? undefined,
      })
      .then((data) => res.json(data))
      .catch((err) => {
        if (err.message === "Social profile not found") {
          return res.status(404).json({ message: err.message });
        }
        return next(err);
      })
);

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

export default router;
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { rateLimitUser } from "../lib/rate-limit";
import * as utilitiesController from "../controllers/utilities.controller";
import { translateSchema } from "../validators/utilities.validator";
import { createSocialProfileSchema, updateSocialProfileSchema } from "../validators/social-profile.validator";

const router = Router();

router.get("/utilities/exchange-rates", requireAuth, rateLimitUser("fx", 60, 60, "You're checking rates too quickly."), utilitiesController.getExchangeRates);

router.post(
  "/utilities/translate",
  requireAuth,
  validate(translateSchema),
  rateLimitUser("translate", 15, 60, "You're translating too quickly."),
  rateLimitUser("translate-day", 200, 86_400, "You've reached today's translation limit."),
  utilitiesController.translateText
);

router.get("/social-profile/me", requireAuth, utilitiesController.getMySocialProfile);
router.post("/utilities/social-profile", requireAuth, validate(createSocialProfileSchema), utilitiesController.createSocialProfile);
router.patch("/utilities/social-profile", requireAuth, validate(updateSocialProfileSchema), utilitiesController.updateSocialProfile);
router.delete("/utilities/social-profile", requireAuth, utilitiesController.deleteSocialProfile);

export default router;
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { updateProfileSchema, changePasswordSchema } from "../validators/user.validator";
import * as userController from "../controllers/user.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image files are allowed"));
    cb(null, true);
  },
});

const router = Router();

router.get("/users/me", requireAuth, userController.getMe);
router.patch("/users/me", requireAuth, validate(updateProfileSchema), userController.updateMe);
router.post("/users/me/password", requireAuth, validate(changePasswordSchema), userController.changePassword);
router.post("/users/me/avatar", requireAuth, upload.single("avatar"), userController.uploadAvatar);

export default router;
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { textConvertSchema, fileConvertSchema } from "../validators/converter.validator";
import * as converterController from "../controllers/converter.controller";
import { requireUsageOrSubscription } from "../middlewares/usage.middleware";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const router = Router();
router.use(requireAuth);

router.post("/converter/text", validate(textConvertSchema), converterController.convertText);
router.post("/converter/pdf-text", upload.single("file"), converterController.extractPdfText);
router.post("/converter/docx-text", upload.single("file"), converterController.extractDocxText);
router.post("/converter/file", requireUsageOrSubscription("FILE_CONVERTER"), upload.single("file"), validate(fileConvertSchema), converterController.convertFile);

export default router;
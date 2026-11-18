import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { requireUsageOrSubscription } from "../middlewares/usage.middleware";
import { rateLimitUser } from "../lib/rate-limit";
import { singleUpload } from "../lib/upload";
import { fileConvertSchema, textConvertSchema } from "../validators/converter.validator";
import { isSupportedInput } from "../services/converter.service";
import * as converterController from "../controllers/converter.controller";

const MAX_BYTES = 25 * 1024 * 1024;

const pdfUpload = singleUpload("file", { maxBytes: MAX_BYTES, allow: (file) => /\.pdf$/i.test(file.originalname), rejectMessage: "Upload a PDF file." });
const docxUpload = singleUpload("file", { maxBytes: MAX_BYTES, allow: (file) => /\.docx$/i.test(file.originalname), rejectMessage: "Upload a DOCX file." });
const anyUpload = singleUpload("file", { maxBytes: MAX_BYTES, allow: (file) => isSupportedInput(file.originalname), rejectMessage: "That file type isn't supported for conversion." });

const extractLimit = rateLimitUser("converter-extract", 20, 60, "You're converting too quickly.");

const router = Router();
router.use(requireAuth);

router.post("/converter/text", validate(textConvertSchema), extractLimit, converterController.convertText);
router.post("/converter/pdf-text", extractLimit, pdfUpload, converterController.extractPdfText);
router.post("/converter/docx-text", extractLimit, docxUpload, converterController.extractDocxText);
router.post(
  "/converter/file",
  rateLimitUser("converter-file", 5, 60, "You're converting too quickly."),
  anyUpload,
  validate(fileConvertSchema),
  rateLimitUser("converter-file-day", 40, 86_400, "You've reached today's conversion limit."),
  requireUsageOrSubscription("FILE_CONVERTER"),
  converterController.convertFile
);

export default router;
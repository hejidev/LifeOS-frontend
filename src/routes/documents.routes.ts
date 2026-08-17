import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createFolderSchema,
  updateFolderSchema,
  createDocumentSchema,
  updateDocumentSchema,
  documentsDashboardQuerySchema,
} from "../validators/documents.validator";
import * as documentsController from "../controllers/documents.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Unsupported file type"));
    }
    cb(null, true);
  },
});

const router = Router();

router.get(
  "/documents/dashboard",
  requireAuth,
  validate(documentsDashboardQuerySchema),
  documentsController.getDashboard,
);

router.post("/documents/folders", requireAuth, validate(createFolderSchema), documentsController.createFolder);
router.patch("/documents/folders/:id", requireAuth, validate(updateFolderSchema), documentsController.updateFolder);
router.delete("/documents/folders/:id", requireAuth, documentsController.deleteFolder);

router.post("/documents", requireAuth, validate(createDocumentSchema), documentsController.createDocument);
router.patch("/documents/:id", requireAuth, validate(updateDocumentSchema), documentsController.updateDocument);
router.post("/documents/upload", requireAuth, upload.single("file"), documentsController.uploadDocumentFile);
router.delete("/documents/:id", requireAuth, documentsController.deleteDocument);

export default router;
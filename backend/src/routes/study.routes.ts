import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createSubjectSchema, updateSubjectSchema, createStudyMaterialSchema,
  updateStudyMaterialSchema, createStudySessionSchema, endStudySessionSchema,
  dashboardStudyQuerySchema,
} from "../validators/study.validator";
import * as studyController from "../controllers/study.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Unsupported file type"));
    }
    cb(null, true);
  },
});

const router = Router();
router.use(requireAuth);

router.get("/study/dashboard", validate(dashboardStudyQuerySchema), studyController.getDashboard);
router.get("/study/subjects", studyController.getSubjects);
router.post("/study/subjects", validate(createSubjectSchema), studyController.createSubject);
router.patch("/study/subjects/:id", validate(updateSubjectSchema), studyController.updateSubject);
router.get("/study/materials", studyController.getMaterials);
router.post("/study/materials", validate(createStudyMaterialSchema), studyController.createMaterial);
router.patch("/study/materials/:id", validate(updateStudyMaterialSchema), studyController.updateMaterial);
router.post("/study/materials/upload", upload.single("file"), studyController.uploadMaterialFile);
router.post("/study/sessions", validate(createStudySessionSchema), studyController.createSession);
router.patch("/study/sessions/:id/end", validate(endStudySessionSchema), studyController.endSession);
router.delete("/study/materials/:id", studyController.deleteMaterial);

export default router;
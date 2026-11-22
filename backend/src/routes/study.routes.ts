import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { rateLimitUser } from "../lib/rate-limit";
import { singleUpload } from "../lib/upload";
import {
  createSubjectSchema, updateSubjectSchema, createStudyMaterialSchema,
  updateStudyMaterialSchema, createStudySessionSchema, endStudySessionSchema,
  dashboardStudyQuerySchema,
} from "../validators/study.validator";
import * as studyController from "../controllers/study.controller";

const ALLOWED = [
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

const materialUpload = singleUpload("file", {
  maxBytes: 20 * 1024 * 1024,
  allow: (file) => ALLOWED.includes(file.mimetype),
  rejectMessage: "Use an image, PDF, Word, PowerPoint or text file.",
});

const router = Router();
router.use(requireAuth);

router.get("/study/dashboard", validate(dashboardStudyQuerySchema), studyController.getDashboard);
router.get("/study/subjects", studyController.getSubjects);
router.post("/study/subjects", validate(createSubjectSchema), studyController.createSubject);
router.patch("/study/subjects/:id", validate(updateSubjectSchema), studyController.updateSubject);
router.get("/study/materials", studyController.getMaterials);
router.get("/study/materials/:id/file", studyController.getMaterialFile);
router.post("/study/materials", validate(createStudyMaterialSchema), studyController.createMaterial);
router.patch("/study/materials/:id", validate(updateStudyMaterialSchema), studyController.updateMaterial);
router.post("/study/materials/upload", rateLimitUser("study-upload", 30, 3600, "You've uploaded a lot of files."), materialUpload, studyController.uploadMaterialFile);
router.delete("/study/materials/:id", studyController.deleteMaterial);
router.post("/study/sessions", validate(createStudySessionSchema), studyController.createSession);
router.patch("/study/sessions/:id/end", validate(endStudySessionSchema), studyController.endSession);
router.delete("/study/subjects/:id", studyController.deleteSubject);

export default router;
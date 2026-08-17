import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createNoteSchema, updateNoteSchema } from "../validators/note.validator";
import * as noteController from "../controllers/note.controller";

const router = Router();

router.use(requireAuth);

router.get("/notes", noteController.getNotes);
router.post("/notes", validate(createNoteSchema), noteController.createNote);
router.get("/notes/:id", noteController.getNote);
router.patch("/notes/:id", validate(updateNoteSchema), noteController.updateNote);
router.delete("/notes/:id", noteController.deleteNote);
router.post("/notes/:id/convert-to-task", noteController.convertToTask);

export default router;
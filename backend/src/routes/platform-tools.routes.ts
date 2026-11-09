import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/roles.middleware";
import { validate } from "../middlewares/validate.middleware";
import * as tools from "../controllers/platform-tools.controller";
import { merchantActionSchema, noteSchema, startLoadTestSchema } from "../validators/platform-tools.validator";

const router = Router();
router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

router.get("/traffic", tools.getTraffic);
router.get("/instances", tools.getInstances);
router.post("/balance-probe", tools.probe);

router.get("/fixtures", tools.fixtures);
router.post("/fixtures/seed", tools.seed);
router.delete("/fixtures", tools.removeFixtures);
router.get("/load-tests", tools.listRuns);
router.post("/load-tests", validate(startLoadTestSchema), tools.startRun);
router.get("/load-tests/:id", tools.getRun);
router.post("/load-tests/:id/stop", tools.stopRun);

router.get("/support/queues", tools.queues);
router.get("/support/search", tools.search);
router.get("/support/accounts/:id", tools.account);
router.post("/support/accounts/:id/notes", validate(noteSchema), tools.addNote);
router.delete("/support/notes/:noteId", tools.deleteNote);
router.post("/support/accounts/:id/merchant-action", validate(merchantActionSchema), tools.merchantAction);

export default router;
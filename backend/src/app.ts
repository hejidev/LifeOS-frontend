import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import hpp from "hpp";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import oauthRoutes from "./routes/oauth.routes";
import staffAuthRoutes from "./routes/staff-auth.routes";
import userRoutes from "./routes/user.routes";
import overviewRoutes from "./routes/overview.routes";
import taskRoutes from "./routes/task.routes";
import noteRoutes from "./routes/note.routes";
import habitRoutes from "./routes/habit.routes";
import healthRoutes from "./routes/health.routes";
import financeRoutes from "./routes/finance.routes";
import studyRoutes from "./routes/study.routes";
import documentsRoutes from "./routes/documents.routes";
import careerRoutes from "./routes/career.routes";
import vaultRoutes from "./routes/vault.routes";
import familyRoutes from "./routes/family.routes";
import merchantRoutes from "./routes/merchant.routes";
import staffRoutes from "./routes/staff.routes";
import staffPortalRoutes from "./routes/staff-portal.routes";
import staffPosRoutes from "./routes/staff-pos.routes";

import businessRoutes from "./routes/business.routes";
import settingsRoutes from "./routes/settings.routes";
import billingRoutes from "./routes/billing.routes";
import * as billingController from "./controllers/billing.controller";
import aiWritingRoutes from "./routes/ai-writing.routes";
import aiImageRoutes from "./routes/ai-image.routes";
import calendarRoutes from "./routes/calendar.routes";
import goalRoutes from "./routes/goal.routes";
import aiAssistantRoutes from "./routes/ai-assistant.routes";
import converterRoutes from "./routes/converter.routes";
import utilitiesRoutes from "./routes/utilities.routes";
import emergencyRoutes from "./routes/emergency.routes";
import notificationRoutes from "./routes/notification.routes";
import platformAdminRoutes from "./routes/platform-admin.routes";
import adminManagementRoutes from "./routes/admin-management.routes";
import broadcastRoutes from "./routes/broadcast.routes";
import cmsRoutes from "./routes/cms.routes";
import dmRoutes from "./routes/dm.routes";
import twoFactorRoutes from "./routes/two-factor.routes";
import securityRoutes from "./routes/security.routes";
import contactSubmissionRoutes from "./routes/contact-submission.routes";
import siteContentRoutes from "./routes/site-content.routes";

import { errorHandler } from "./middlewares/errorHandler.middleware";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));

app.post("/api/billing/webhook", express.raw({ type: "application/json" }), billingController.webhook);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(hpp());
app.use(compression());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Auth-layer routers — no evidence these shadow anything, left in place
app.use("/api", authRoutes);
app.use("/api", oauthRoutes);
app.use("/api", staffAuthRoutes);
app.use("/api", userRoutes);

// Every router with its OWN specific prefix — must be tried before the
// generic "/api" block below, or Express's prefix-matching lets the
// generic block's blanket requireAuth intercept these requests first.
app.use("/api/merchant", merchantRoutes);
app.use("/api/merchant/staff", staffRoutes);
app.use("/api/staff-portal", staffPortalRoutes);
app.use("/api/staff-pos", staffPosRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/platform-admin", platformAdminRoutes);
app.use("/api/admin-management", adminManagementRoutes);
app.use("/api/broadcast", broadcastRoutes);
app.use("/api/cms", cmsRoutes);
app.use("/api/messages", dmRoutes);
app.use("/api/2fa", twoFactorRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/contact-submissions", contactSubmissionRoutes);
app.use("/api/site-content", siteContentRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/ai-assistant", aiAssistantRoutes);
app.use("/api", habitRoutes);

// Generic "/api" block — anything landing here didn't match a more
// specific prefix above, so it's safe for these to apply blanket auth.
app.use("/api", overviewRoutes);
app.use("/api", taskRoutes);
app.use("/api", noteRoutes);
app.use("/api", healthRoutes);
app.use("/api", financeRoutes);
app.use("/api", studyRoutes);
app.use("/api", documentsRoutes);
app.use("/api", careerRoutes);
app.use("/api", vaultRoutes);
app.use("/api", familyRoutes);
app.use("/api", billingRoutes);
app.use("/api", aiWritingRoutes);
app.use("/api", aiImageRoutes);
app.use("/api", converterRoutes);
app.use("/api", utilitiesRoutes);
app.use("/api", emergencyRoutes);
app.use("/api", notificationRoutes);

app.use(errorHandler);

export default app;
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const hpp_1 = __importDefault(require("hpp"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const oauth_routes_1 = __importDefault(require("./routes/oauth.routes"));
const staff_auth_routes_1 = __importDefault(require("./routes/staff-auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const overview_routes_1 = __importDefault(require("./routes/overview.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const note_routes_1 = __importDefault(require("./routes/note.routes"));
const habit_routes_1 = __importDefault(require("./routes/habit.routes"));
const health_routes_1 = __importDefault(require("./routes/health.routes"));
const finance_routes_1 = __importDefault(require("./routes/finance.routes"));
const study_routes_1 = __importDefault(require("./routes/study.routes"));
const documents_routes_1 = __importDefault(require("./routes/documents.routes"));
const career_routes_1 = __importDefault(require("./routes/career.routes"));
const vault_routes_1 = __importDefault(require("./routes/vault.routes"));
const family_routes_1 = __importDefault(require("./routes/family.routes"));
const merchant_routes_1 = __importDefault(require("./routes/merchant.routes"));
const staff_routes_1 = __importDefault(require("./routes/staff.routes"));
const staff_portal_routes_1 = __importDefault(require("./routes/staff-portal.routes"));
const staff_pos_routes_1 = __importDefault(require("./routes/staff-pos.routes"));
const business_routes_1 = __importDefault(require("./routes/business.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const billing_routes_1 = __importDefault(require("./routes/billing.routes"));
const billingController = __importStar(require("./controllers/billing.controller"));
const ai_writing_routes_1 = __importDefault(require("./routes/ai-writing.routes"));
const ai_image_routes_1 = __importDefault(require("./routes/ai-image.routes"));
const calendar_routes_1 = __importDefault(require("./routes/calendar.routes"));
const goal_routes_1 = __importDefault(require("./routes/goal.routes"));
const ai_assistant_routes_1 = __importDefault(require("./routes/ai-assistant.routes"));
const converter_routes_1 = __importDefault(require("./routes/converter.routes"));
const utilities_routes_1 = __importDefault(require("./routes/utilities.routes"));
const emergency_routes_1 = __importDefault(require("./routes/emergency.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const platform_admin_routes_1 = __importDefault(require("./routes/platform-admin.routes"));
const admin_management_routes_1 = __importDefault(require("./routes/admin-management.routes"));
const broadcast_routes_1 = __importDefault(require("./routes/broadcast.routes"));
const cms_routes_1 = __importDefault(require("./routes/cms.routes"));
const dm_routes_1 = __importDefault(require("./routes/dm.routes"));
const two_factor_routes_1 = __importDefault(require("./routes/two-factor.routes"));
const security_routes_1 = __importDefault(require("./routes/security.routes"));
const contact_submission_routes_1 = __importDefault(require("./routes/contact-submission.routes"));
const site_content_routes_1 = __importDefault(require("./routes/site-content.routes"));
const errorHandler_middleware_1 = require("./middlewares/errorHandler.middleware");
const app = (0, express_1.default)();
app.set("trust proxy", 1);
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: env_1.env.FRONTEND_URL, credentials: true }));
app.post("/api/billing/webhook", express_1.default.raw({ type: "application/json" }), billingController.webhook);
app.use(express_1.default.json({ limit: "1mb" }));
app.use((0, cookie_parser_1.default)());
app.use((0, hpp_1.default)());
app.use((0, compression_1.default)());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
// Auth-layer routers — no evidence these shadow anything, left in place
app.use("/api", auth_routes_1.default);
app.use("/api", oauth_routes_1.default);
app.use("/api", staff_auth_routes_1.default);
app.use("/api", user_routes_1.default);
// Every router with its OWN specific prefix — must be tried before the
// generic "/api" block below, or Express's prefix-matching lets the
// generic block's blanket requireAuth intercept these requests first.
app.use("/api/merchant", merchant_routes_1.default);
app.use("/api/merchant/staff", staff_routes_1.default);
app.use("/api/staff-portal", staff_portal_routes_1.default);
app.use("/api/staff-pos", staff_pos_routes_1.default);
app.use("/api/business", business_routes_1.default);
app.use("/api/settings", settings_routes_1.default);
app.use("/api/platform-admin", platform_admin_routes_1.default);
app.use("/api/admin-management", admin_management_routes_1.default);
app.use("/api/broadcast", broadcast_routes_1.default);
app.use("/api/cms", cms_routes_1.default);
app.use("/api/messages", dm_routes_1.default);
app.use("/api/2fa", two_factor_routes_1.default);
app.use("/api/security", security_routes_1.default);
app.use("/api/contact-submissions", contact_submission_routes_1.default);
app.use("/api/site-content", site_content_routes_1.default);
app.use("/api/calendar", calendar_routes_1.default);
app.use("/api/goals", goal_routes_1.default);
app.use("/api/ai-assistant", ai_assistant_routes_1.default);
app.use("/api", habit_routes_1.default);
// Generic "/api" block — anything landing here didn't match a more
// specific prefix above, so it's safe for these to apply blanket auth.
app.use("/api", overview_routes_1.default);
app.use("/api", task_routes_1.default);
app.use("/api", note_routes_1.default);
app.use("/api", health_routes_1.default);
app.use("/api", finance_routes_1.default);
app.use("/api", study_routes_1.default);
app.use("/api", documents_routes_1.default);
app.use("/api", career_routes_1.default);
app.use("/api", vault_routes_1.default);
app.use("/api", family_routes_1.default);
app.use("/api", billing_routes_1.default);
app.use("/api", ai_writing_routes_1.default);
app.use("/api", ai_image_routes_1.default);
app.use("/api", converter_routes_1.default);
app.use("/api", utilities_routes_1.default);
app.use("/api", emergency_routes_1.default);
app.use("/api", notification_routes_1.default);
app.use(errorHandler_middleware_1.errorHandler);
exports.default = app;

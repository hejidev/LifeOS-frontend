"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const permission_middleware_1 = require("../middlewares/permission.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const errors_1 = require("../lib/errors");
const admin_management_validator_1 = require("../validators/admin-management.validator");
const admin_management_service_1 = require("../services/admin-management.service");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.use((0, permission_middleware_1.requirePermission)("SEND_BROADCASTS"));
router.post("/", (0, validate_middleware_1.validate)(admin_management_validator_1.broadcastSchema), (0, errors_1.asyncHandler)(async (req, res) => {
    const result = await (0, admin_management_service_1.sendBroadcast)(req.user.id, req.body);
    return res.json(result);
}));
exports.default = router;

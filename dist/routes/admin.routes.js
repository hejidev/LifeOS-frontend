"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const roles_middleware_1 = require("../middlewares/roles.middleware");
const router = (0, express_1.Router)();
router.get("/dashboard", auth_middleware_1.requireAuth, (0, roles_middleware_1.requireRole)("admin", "super_admin"), (req, res) => {
    res.json({ message: "Admin dashboard data" });
});
exports.default = router;

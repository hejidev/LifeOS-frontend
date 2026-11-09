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
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffRegister = exports.ownerRegister = void 0;
const errors_1 = require("../lib/errors");
const prisma_1 = require("../config/prisma");
const register = __importStar(require("../services/register.service"));
const storeService = __importStar(require("../services/store.service"));
async function ownerContext(req) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    if (!profile)
        throw new errors_1.AppError("Merchant profile not found", 404);
    const requested = (req.body?.storeId ?? req.query.storeId);
    const storeId = await storeService.resolveStoreId(req.user.id, requested);
    return {
        scope: { bizProfileId: profile.id, storeId },
        actor: { type: "OWNER", id: req.user.id, name: req.user.name ?? "Owner" },
    };
}
async function staffContext(req) {
    const member = await prisma_1.prisma.bizStaff.findFirst({
        where: { id: req.staff.staffId, bizProfileId: req.staff.bizProfileId },
        select: { name: true },
    });
    if (!member)
        throw new errors_1.AppError("Staff session not found", 404);
    const storeId = req.staff.storeId;
    if (!storeId)
        throw new errors_1.AppError("This staff account isn't linked to a location.", 400);
    return {
        scope: { bizProfileId: req.staff.bizProfileId, storeId },
        actor: { type: "STAFF", id: req.staff.staffId, name: member.name },
    };
}
function build(context) {
    return {
        current: (0, errors_1.asyncHandler)(async (req, res) => {
            const { scope } = await context(req);
            return res.json({ session: await register.getCurrent(scope) });
        }),
        open: (0, errors_1.asyncHandler)(async (req, res) => {
            const { scope, actor } = await context(req);
            return res.status(201).json({ session: await register.open(scope, actor, req.body.openingFloat) });
        }),
        movement: (0, errors_1.asyncHandler)(async (req, res) => {
            const { scope, actor } = await context(req);
            const { kind, amount, reason } = req.body;
            return res.json({ session: await register.addMovement(scope, actor, { kind, amount, reason }) });
        }),
        close: (0, errors_1.asyncHandler)(async (req, res) => {
            const { scope, actor } = await context(req);
            return res.json({ session: await register.close(scope, actor, { countedCash: req.body.countedCash, note: req.body.note }) });
        }),
        history: (0, errors_1.asyncHandler)(async (req, res) => {
            const { scope } = await context(req);
            return res.json({ sessions: await register.history(scope) });
        }),
    };
}
exports.ownerRegister = build(ownerContext);
exports.staffRegister = build(staffContext);

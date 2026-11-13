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
exports.read = exports.send = exports.messages = exports.threads = exports.clearOverride = exports.setOverride = exports.saveSchedules = exports.deleteChild = exports.resetPassword = exports.createChild = exports.members = exports.setup = exports.me = exports.messageSchema = exports.overrideSchema = exports.schedulesSchema = exports.passwordSchema = exports.createChildSchema = exports.setupSchema = void 0;
const zod_1 = require("zod");
const errors_1 = require("../lib/errors");
const family = __importStar(require("../services/family-space.service"));
exports.setupSchema = zod_1.z.object({ body: zod_1.z.object({ consent: zod_1.z.literal(true) }) });
exports.createChildSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2).max(40),
        password: zod_1.z.string().min(6).max(64),
    }),
});
exports.passwordSchema = zod_1.z.object({ body: zod_1.z.object({ password: zod_1.z.string().min(6).max(64) }) });
exports.schedulesSchema = zod_1.z.object({
    body: zod_1.z.object({
        schedules: zod_1.z
            .array(zod_1.z.object({
            label: zod_1.z.string().trim().max(40).optional(),
            days: zod_1.z.array(zod_1.z.number().int().min(0).max(6)).min(1).max(7),
            startMin: zod_1.z.number().int().min(0).max(1439),
            endMin: zod_1.z.number().int().min(0).max(1439),
            enabled: zod_1.z.boolean(),
        }))
            .max(5),
    }),
});
exports.overrideSchema = zod_1.z.object({
    body: zod_1.z.object({
        kind: zod_1.z.enum(["LOCK", "UNLOCK"]),
        minutes: zod_1.z.number().int().min(5).max(720),
    }),
});
exports.messageSchema = zod_1.z.object({ body: zod_1.z.object({ body: zod_1.z.string().trim().min(1).max(1000) }) });
exports.me = (0, errors_1.asyncHandler)(async (req, res) => res.json(await family.getMe(req.user.id)));
exports.setup = (0, errors_1.asyncHandler)(async (req, res) => res.status(201).json(await family.setupFamily(req.user.id)));
exports.members = (0, errors_1.asyncHandler)(async (req, res) => res.json({ members: await family.listMembers(req.user.id) }));
exports.createChild = (0, errors_1.asyncHandler)(async (req, res) => res.status(201).json({ child: await family.createChild(req.user.id, req.body) }));
exports.resetPassword = (0, errors_1.asyncHandler)(async (req, res) => {
    await family.resetChildPassword(req.user.id, req.params.memberId, req.body.password);
    return res.status(204).send();
});
exports.deleteChild = (0, errors_1.asyncHandler)(async (req, res) => {
    await family.deleteChild(req.user.id, req.params.memberId);
    return res.status(204).send();
});
exports.saveSchedules = (0, errors_1.asyncHandler)(async (req, res) => {
    await family.saveSchedules(req.user.id, req.params.memberId, req.body.schedules);
    return res.status(204).send();
});
exports.setOverride = (0, errors_1.asyncHandler)(async (req, res) => {
    await family.setOverride(req.user.id, req.params.memberId, req.body.kind, req.body.minutes);
    return res.status(204).send();
});
exports.clearOverride = (0, errors_1.asyncHandler)(async (req, res) => {
    await family.clearOverride(req.user.id, req.params.memberId);
    return res.status(204).send();
});
exports.threads = (0, errors_1.asyncHandler)(async (req, res) => res.json({ threads: await family.listThreads(req.user.id) }));
exports.messages = (0, errors_1.asyncHandler)(async (req, res) => res.json({ messages: await family.listMessages(req.user.id, req.params.key) }));
exports.send = (0, errors_1.asyncHandler)(async (req, res) => res.status(201).json({ message: await family.sendMessage(req.user.id, req.params.key, req.body.body) }));
exports.read = (0, errors_1.asyncHandler)(async (req, res) => {
    await family.markRead(req.user.id, req.params.key);
    return res.status(204).send();
});

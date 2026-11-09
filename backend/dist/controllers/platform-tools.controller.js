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
exports.merchantAction = exports.deleteNote = exports.addNote = exports.account = exports.search = exports.queues = exports.stopRun = exports.startRun = exports.getRun = exports.listRuns = exports.removeFixtures = exports.seed = exports.fixtures = exports.probe = exports.getInstances = exports.getTraffic = void 0;
const errors_1 = require("../lib/errors");
const prisma_1 = require("../config/prisma");
const loadTest = __importStar(require("../services/loadtest.service"));
const traffic = __importStar(require("../services/traffic.service"));
const workbench = __importStar(require("../services/workbench.service"));
async function actorOf(req) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
    return { id: req.user.id, name: user?.name ?? "Super admin" };
}
exports.getTraffic = (0, errors_1.asyncHandler)(async (req, res) => {
    const key = String(req.query.window ?? "1h");
    if (!(key in traffic.WINDOWS))
        throw new errors_1.AppError("Unknown time window", 400);
    return res.json(await traffic.getTraffic(key));
});
exports.getInstances = (0, errors_1.asyncHandler)(async (_req, res) => {
    return res.json({ instances: await traffic.getInstances() });
});
exports.probe = (0, errors_1.asyncHandler)(async (req, res) => {
    return res.json(await loadTest.probeBalance(loadTest.baseUrlOf(req)));
});
exports.fixtures = (0, errors_1.asyncHandler)(async (_req, res) => {
    return res.json(await loadTest.fixtureStatus());
});
exports.seed = (0, errors_1.asyncHandler)(async (_req, res) => {
    return res.json(await loadTest.seedFixtures());
});
exports.removeFixtures = (0, errors_1.asyncHandler)(async (_req, res) => {
    return res.json(await loadTest.removeFixtures());
});
exports.listRuns = (0, errors_1.asyncHandler)(async (_req, res) => {
    return res.json({ runs: await loadTest.listRuns() });
});
exports.getRun = (0, errors_1.asyncHandler)(async (req, res) => {
    return res.json(await loadTest.getRun(req.params.id));
});
exports.startRun = (0, errors_1.asyncHandler)(async (req, res) => {
    const callerToken = req.get("authorization")?.replace(/^Bearer\s+/i, "");
    const actor = await actorOf(req);
    const id = await loadTest.startRun({ config: req.body, actorName: actor.name, base: loadTest.baseUrlOf(req), callerToken });
    return res.status(202).json({ id });
});
exports.stopRun = (0, errors_1.asyncHandler)(async (req, res) => {
    await loadTest.stopRun(req.params.id);
    return res.status(204).send();
});
exports.queues = (0, errors_1.asyncHandler)(async (_req, res) => {
    return res.json(await workbench.queues());
});
exports.search = (0, errors_1.asyncHandler)(async (req, res) => {
    return res.json({ accounts: await workbench.search(String(req.query.q ?? "")) });
});
exports.account = (0, errors_1.asyncHandler)(async (req, res) => {
    return res.json(await workbench.getAccount(req.params.id));
});
exports.addNote = (0, errors_1.asyncHandler)(async (req, res) => {
    return res.status(201).json({ note: await workbench.addNote(await actorOf(req), req.params.id, req.body.body) });
});
exports.deleteNote = (0, errors_1.asyncHandler)(async (req, res) => {
    await workbench.deleteNote(req.params.noteId);
    return res.status(204).send();
});
exports.merchantAction = (0, errors_1.asyncHandler)(async (req, res) => {
    return res.json(await workbench.merchantAction(await actorOf(req), req.params.id, req.body.action, req.body.reason));
});

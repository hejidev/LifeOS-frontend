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
exports.toggleCompletion = exports.deleteHabit = exports.updateHabit = exports.createHabit = exports.getHabitSummary = exports.getHabits = void 0;
const errors_1 = require("../lib/errors");
const habitService = __importStar(require("../services/habit.service"));
exports.getHabits = (0, errors_1.asyncHandler)(async (req, res) => {
    const habits = await habitService.listHabits(req.user.id, req.query.archived === "true");
    return res.json({ habits });
});
exports.getHabitSummary = (0, errors_1.asyncHandler)(async (req, res) => {
    const summary = await habitService.getHabitSummary(req.user.id);
    return res.json(summary);
});
exports.createHabit = (0, errors_1.asyncHandler)(async (req, res) => {
    const habit = await habitService.createHabit(req.user.id, req.body);
    return res.status(201).json({ habit });
});
exports.updateHabit = (0, errors_1.asyncHandler)(async (req, res) => {
    const habit = await habitService.updateHabit(req.user.id, req.params.id, req.body);
    return res.json({ habit });
});
exports.deleteHabit = (0, errors_1.asyncHandler)(async (req, res) => {
    await habitService.deleteHabit(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.toggleCompletion = (0, errors_1.asyncHandler)(async (req, res) => {
    const habit = await habitService.toggleCompletion(req.user.id, req.params.id);
    return res.json({ habit });
});

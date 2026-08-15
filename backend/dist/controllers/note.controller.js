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
exports.convertToTask = exports.deleteNote = exports.updateNote = exports.createNote = exports.getNote = exports.getNotes = void 0;
const errors_1 = require("../lib/errors");
const noteService = __importStar(require("../services/note.service"));
exports.getNotes = (0, errors_1.asyncHandler)(async (req, res) => {
    const notes = await noteService.getNotes(req.user.id);
    return res.json({ notes });
});
exports.getNote = (0, errors_1.asyncHandler)(async (req, res) => {
    const note = await noteService.getNoteById(req.user.id, req.params.id);
    return res.json({ note });
});
exports.createNote = (0, errors_1.asyncHandler)(async (req, res) => {
    const note = await noteService.createNote(req.user.id, req.body);
    return res.status(201).json({ note });
});
exports.updateNote = (0, errors_1.asyncHandler)(async (req, res) => {
    const note = await noteService.updateNote(req.user.id, req.params.id, req.body);
    return res.json({ note });
});
exports.deleteNote = (0, errors_1.asyncHandler)(async (req, res) => {
    await noteService.deleteNote(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.convertToTask = (0, errors_1.asyncHandler)(async (req, res) => {
    const task = await noteService.convertNoteToTask(req.user.id, req.params.id);
    return res.status(201).json({ task });
});

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
exports.getPublic = exports.getAccessLog = exports.setPin = exports.disableShare = exports.enableShare = exports.reorderContacts = exports.deleteContact = exports.updateContact = exports.addContact = exports.updateProfile = exports.getProfile = void 0;
const errors_1 = require("../lib/errors");
const emergencyService = __importStar(require("../services/emergency.service"));
exports.getProfile = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await emergencyService.getProfile(req.user.id);
    return res.json({ profile });
});
exports.updateProfile = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await emergencyService.updateProfile(req.user.id, req.body);
    return res.json({ profile });
});
exports.addContact = (0, errors_1.asyncHandler)(async (req, res) => {
    const contact = await emergencyService.addContact(req.user.id, req.body);
    return res.status(201).json({ contact });
});
exports.updateContact = (0, errors_1.asyncHandler)(async (req, res) => {
    const contact = await emergencyService.updateContact(req.user.id, req.params.id, req.body);
    return res.json({ contact });
});
exports.deleteContact = (0, errors_1.asyncHandler)(async (req, res) => {
    await emergencyService.deleteContact(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.reorderContacts = (0, errors_1.asyncHandler)(async (req, res) => {
    await emergencyService.reorderContacts(req.user.id, req.body.orderedIds);
    return res.status(204).send();
});
exports.enableShare = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await emergencyService.enableShare(req.user.id, req.body.expiresInDays);
    return res.json({ profile });
});
exports.disableShare = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await emergencyService.disableShare(req.user.id);
    return res.json({ profile });
});
exports.setPin = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await emergencyService.setSharePin(req.user.id, req.body.pin);
    return res.json({ profile });
});
exports.getAccessLog = (0, errors_1.asyncHandler)(async (req, res) => {
    const log = await emergencyService.getAccessLog(req.user.id);
    return res.json({ log });
});
exports.getPublic = (0, errors_1.asyncHandler)(async (req, res) => {
    const pin = req.query.pin;
    const data = await emergencyService.getPublicByToken(req.params.token, pin, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
    });
    return res.json({ emergency: data });
});

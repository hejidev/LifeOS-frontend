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
exports.deleteSocialProfile = exports.updateSocialProfile = exports.getMySocialProfile = exports.createSocialProfile = exports.translateText = exports.getExchangeRates = void 0;
const errors_1 = require("../lib/errors");
const utilitiesService = __importStar(require("../services/utilities.service"));
const socialProfileService = __importStar(require("../services/social-profile.service"));
exports.getExchangeRates = (0, errors_1.asyncHandler)(async (req, res) => res.json(await utilitiesService.getExchangeRates(String(req.query.base ?? "USD"))));
exports.translateText = (0, errors_1.asyncHandler)(async (req, res) => {
    const { text, targetLanguage } = req.body;
    return res.json({ translated: await utilitiesService.translateText(text, targetLanguage) });
});
exports.createSocialProfile = (0, errors_1.asyncHandler)(async (req, res) => res.status(201).json(await socialProfileService.createSocialProfile({ userId: req.user.id, ...req.body })));
exports.getMySocialProfile = (0, errors_1.asyncHandler)(async (req, res) => res.json(await socialProfileService.getSocialProfileByUserId(req.user.id)));
exports.updateSocialProfile = (0, errors_1.asyncHandler)(async (req, res) => res.json(await socialProfileService.updateSocialProfile(req.user.id, req.body)));
exports.deleteSocialProfile = (0, errors_1.asyncHandler)(async (req, res) => {
    await socialProfileService.deleteSocialProfile(req.user.id);
    return res.status(204).send();
});

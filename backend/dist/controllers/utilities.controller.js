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
exports.getMySocialProfile = exports.createSocialProfile = exports.translateText = exports.getExchangeRates = void 0;
exports.getPublicSocialProfile = getPublicSocialProfile;
const errors_1 = require("../lib/errors");
const utilitiesService = __importStar(require("../services/utilities.service"));
const socialProfileService = __importStar(require("../services/social-profile.service"));
const socialProfileViewService = __importStar(require("../services/social-profile-view.service"));
const prisma_1 = require("../config/prisma");
exports.getExchangeRates = (0, errors_1.asyncHandler)(async (req, res) => {
    const base = req.query.base ?? "USD";
    const data = await utilitiesService.getExchangeRates(base);
    return res.json(data);
});
exports.translateText = (0, errors_1.asyncHandler)(async (req, res) => {
    const { text, targetLanguage } = req.body;
    const translated = await utilitiesService.translateText(text, targetLanguage);
    return res.json({ translated });
});
exports.createSocialProfile = (0, errors_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const profile = await socialProfileService.createSocialProfile({
        userId,
        ...req.body,
    });
    return res.status(201).json(profile);
});
async function getPublicSocialProfile(slug, viewData) {
    const profile = await prisma_1.prisma.socialProfile.findFirst({
        where: {
            slug: slug.toLowerCase(),
            isPublic: true,
        },
        include: {
            links: {
                where: {
                    enabled: true,
                },
                orderBy: {
                    sortOrder: "asc",
                },
            },
        },
    });
    if (!profile) {
        throw new Error("Social profile not found");
    }
    await socialProfileViewService.createProfileView({
        profileId: profile.id,
        ...viewData,
    });
    return profile;
}
exports.getMySocialProfile = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await socialProfileService.getSocialProfileByUserId(req.user.id);
    return res.json(profile); // null if the user hasn't created one yet — that's fine
});

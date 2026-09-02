"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProfileView = createProfileView;
const prisma_1 = require("../config/prisma");
async function createProfileView(data) {
    return prisma_1.prisma.socialProfileView.create({
        data: {
            profileId: data.profileId,
            userAgent: data.userAgent,
            referrer: data.referrer,
            country: data.country,
            device: data.device,
        },
    });
}

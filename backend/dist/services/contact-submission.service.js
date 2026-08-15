"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubmission = createSubmission;
exports.listSubmissions = listSubmissions;
exports.updateSubmissionStatus = updateSubmissionStatus;
const prisma_1 = require("../config/prisma");
const email_service_1 = require("./email.service");
async function getNotificationEmail() {
    const superAdmin = await prisma_1.prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, orderBy: { createdAt: "asc" } });
    return superAdmin?.email ?? null;
}
async function createSubmission(data) {
    const submission = await prisma_1.prisma.contactSubmission.create({ data });
    const notifyEmail = await getNotificationEmail();
    if (notifyEmail) {
        try {
            await (0, email_service_1.sendContactNotificationEmail)(notifyEmail, data);
        }
        catch (err) {
            console.error("[contact] failed to send notification email:", err);
        }
    }
    return submission;
}
async function listSubmissions(status) {
    return prisma_1.prisma.contactSubmission.findMany({
        where: status ? { status: status } : undefined,
        orderBy: { createdAt: "desc" },
    });
}
async function updateSubmissionStatus(id, status) {
    return prisma_1.prisma.contactSubmission.update({ where: { id }, data: { status: status } });
}

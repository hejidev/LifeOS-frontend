"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTeam = listTeam;
exports.createTeamMember = createTeamMember;
exports.updateTeamMember = updateTeamMember;
exports.deleteTeamMember = deleteTeamMember;
exports.listTestimonials = listTestimonials;
exports.createTestimonial = createTestimonial;
exports.updateTestimonial = updateTestimonial;
exports.deleteTestimonial = deleteTestimonial;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
async function listTeam() {
    return prisma_1.prisma.teamMember.findMany({ orderBy: { order: "asc" } });
}
async function createTeamMember(data) {
    return prisma_1.prisma.teamMember.create({ data });
}
async function updateTeamMember(id, data) {
    const m = await prisma_1.prisma.teamMember.findUnique({ where: { id } });
    if (!m)
        throw new errors_1.AppError("Team member not found", 404);
    return prisma_1.prisma.teamMember.update({ where: { id }, data });
}
async function deleteTeamMember(id) {
    await prisma_1.prisma.teamMember.delete({ where: { id } });
}
async function listTestimonials() {
    return prisma_1.prisma.testimonial.findMany({ orderBy: { order: "asc" } });
}
async function createTestimonial(data) {
    return prisma_1.prisma.testimonial.create({ data });
}
async function updateTestimonial(id, data) {
    const t = await prisma_1.prisma.testimonial.findUnique({ where: { id } });
    if (!t)
        throw new errors_1.AppError("Testimonial not found", 404);
    return prisma_1.prisma.testimonial.update({ where: { id }, data });
}
async function deleteTestimonial(id) {
    await prisma_1.prisma.testimonial.delete({ where: { id } });
}

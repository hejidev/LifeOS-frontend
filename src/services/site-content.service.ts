import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

export async function listTeam() {
  return prisma.teamMember.findMany({ orderBy: { order: "asc" } });
}
export async function createTeamMember(data: any) {
  return prisma.teamMember.create({ data });
}
export async function updateTeamMember(id: string, data: any) {
  const m = await prisma.teamMember.findUnique({ where: { id } });
  if (!m) throw new AppError("Team member not found", 404);
  return prisma.teamMember.update({ where: { id }, data });
}
export async function deleteTeamMember(id: string) {
  await prisma.teamMember.delete({ where: { id } });
}

export async function listTestimonials() {
  return prisma.testimonial.findMany({ orderBy: { order: "asc" } });
}
export async function createTestimonial(data: any) {
  return prisma.testimonial.create({ data });
}
export async function updateTestimonial(id: string, data: any) {
  const t = await prisma.testimonial.findUnique({ where: { id } });
  if (!t) throw new AppError("Testimonial not found", 404);
  return prisma.testimonial.update({ where: { id }, data });
}
export async function deleteTestimonial(id: string) {
  await prisma.testimonial.delete({ where: { id } });
}
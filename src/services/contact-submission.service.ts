import { prisma } from "../config/prisma";
import { sendContactNotificationEmail } from "./email.service";

async function getNotificationEmail() {
  const superAdmin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" as any }, orderBy: { createdAt: "asc" } });
  return superAdmin?.email ?? null;
}

export async function createSubmission(data: { name: string; email: string; subject?: string; message: string }) {
  const submission = await prisma.contactSubmission.create({ data });

  const notifyEmail = await getNotificationEmail();
  if (notifyEmail) {
    try {
      await sendContactNotificationEmail(notifyEmail, data);
    } catch (err) {
      console.error("[contact] failed to send notification email:", err);
    }
  }

  return submission;
}

export async function listSubmissions(status?: string) {
  return prisma.contactSubmission.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: { createdAt: "desc" },
  });
}

export async function updateSubmissionStatus(id: string, status: string) {
  return prisma.contactSubmission.update({ where: { id }, data: { status: status as any } });
}
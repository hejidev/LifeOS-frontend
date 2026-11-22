import { prisma } from "../config/prisma";

const CAP = 10_000;
const hasPrivateUrl = (url: string | null) => !!url && url.includes("/authenticated/");

export async function exportUserData(userId: string) {
  const where = { userId };
  const take = CAP;

  const [
    user, tasks, notes, habits, healthLogs, accounts, categories, budgets, transactions, subjects, materials, sessions,
    documents, folders, careerGoals, skills, achievements, goals, events, vault, family, conversations, writing, social,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true, avatarUrl: true, currency: true, timezone: true, location: true, weekStartsOn: true, darkMode: true, notifyTasks: true, notifyCalendar: true, notifyFinance: true },
    }),
    prisma.task.findMany({ where, take, include: { subtasks: true } }),
    prisma.note.findMany({ where, take }),
    prisma.habit.findMany({ where, take, include: { completions: { select: { date: true }, take: 2000 } } }),
    prisma.healthLog.findMany({ where, take }),
    prisma.financeAccount.findMany({ where, take }),
    prisma.financeCategory.findMany({ where, take }),
    prisma.financeBudget.findMany({ where, take, include: { items: true } }),
    prisma.transaction.findMany({ where, take }),
    prisma.studySubject.findMany({ where, take }),
    prisma.studyMaterial.findMany({ where, take }),
    prisma.studySession.findMany({ where, take }),
    prisma.document.findMany({ where, take }),
    prisma.documentFolder.findMany({ where, take }),
    prisma.careerGoal.findMany({ where, take }),
    prisma.skill.findMany({ where, take }),
    prisma.achievement.findMany({ where, take }),
    prisma.goal.findMany({ where, take }),
    prisma.calendarEvent.findMany({ where, take }),
    prisma.vaultItem.findMany({ where, take, select: { label: true, username: true, url: true, category: true, tags: true, favorite: true, createdAt: true } }),
    prisma.familyMember.findMany({ where, take, select: { name: true, role: true, createdAt: true } }),
    prisma.assistantConversation.findMany({ where, take: 500, include: { messages: { orderBy: { createdAt: "asc" }, take: 500 } } }),
    prisma.writingDocument.findMany({ where, take }),
    prisma.socialProfile.findUnique({ where: { userId }, include: { links: true } }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    notes: [
      "Passwords, secure notes and emergency medical details are encrypted and are not included in this file.",
      "Files you uploaded are private. This export lists them by name but doesn't include the files themselves.",
      "Merchant and staff data is exported from the merchant portal.",
    ],
    profile: user,
    tasks,
    notes_content: notes,
    habits,
    healthLogs,
    finance: { accounts, categories, budgets, transactions },
    study: { subjects, materials: materials.map((material) => ({ ...material, url: hasPrivateUrl(material.url) ? null : material.url })), sessions },
    documents: { folders, items: documents.map(({ fileUrl, ...rest }) => ({ ...rest, hasFile: !!fileUrl, link: hasPrivateUrl(fileUrl) ? null : fileUrl })) },
    career: { goals: careerGoals, skills, achievements },
    goals,
    calendar: events,
    passwordVault: vault,
    family,
    assistantConversations: conversations,
    writing,
    linkPage: social,
  };
}
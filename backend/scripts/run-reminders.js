const { prisma } = require("../dist/config/prisma");
const { runHourlyReminders } = require("../dist/services/reminders.service");

const arg = process.argv.find((item) => item.startsWith("--user="));
if (!arg) {
  console.error("Pass --user=<email>. This script only runs for one account.");
  process.exit(1);
}

async function main() {
  const email = arg.slice("--user=".length).toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    console.error("No user with that email in this database.");
    process.exit(1);
  }
  console.log(`database host: ${new URL(process.env.DATABASE_URL).host}`);
  await prisma.reminderLog.deleteMany({ where: { userId: user.id } });
  await runHourlyReminders({ onlyUserId: user.id, force: true });
  console.log("Done. Check the notification bell and your inbox.");
}

main().finally(() => prisma.$disconnect());
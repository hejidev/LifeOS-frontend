const { prisma } = require("../dist/config/prisma");
const { encryptSecret, decryptSecret, reuseFingerprint, scorePasswordStrength } = require("../dist/lib/crypto");

const PREFIX = "enc:v1:";
const apply = process.argv.includes("--yes");

async function main() {
  const host = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : "unknown";
  console.log(`database host: ${host}`);
  console.log(apply ? "mode: WRITE" : "mode: dry run (add --yes to write)");

  const items = await prisma.vaultItem.findMany({ select: { id: true, userId: true, passwordCipher: true, notes: true } });
  console.log(`items found: ${items.length}`);

  const probe = items.find((item) => item.passwordCipher);
  if (!probe) {
    console.log("No items with passwords, so the key can't be verified. Nothing to do.");
    return;
  }
  try {
    decryptSecret(probe.passwordCipher);
  } catch {
    console.error("ENCRYPTION_KEY does not match this database. Aborting without changes.");
    process.exit(1);
  }

  let changed = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const data = {};
      if (item.passwordCipher) {
        const password = decryptSecret(item.passwordCipher);
        data.passwordHash = reuseFingerprint(item.userId, password);
        data.strength = scorePasswordStrength(password);
      }
      if (item.notes && !item.notes.startsWith(PREFIX)) data.notes = PREFIX + encryptSecret(item.notes);
      if (Object.keys(data).length === 0) continue;

      if (apply) await prisma.vaultItem.update({ where: { id: item.id }, data });
      changed += 1;
    } catch (err) {
      failed += 1;
      console.error(`item ${item.id} skipped:`, err && err.message ? err.message : err);
    }
  }

  console.log(`${apply ? "updated" : "would update"} ${changed}, skipped ${failed}`);
}

main().finally(() => prisma.$disconnect());
import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const tables = await pool.query(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('Goal', 'User') ORDER BY tablename`
);
console.log("Tables:", tables.rows.map((r) => r.tablename).join(", ") || "(none)");

const enums = await pool.query(
  `SELECT typname FROM pg_type WHERE typname IN ('GoalModule', 'GoalStatus') ORDER BY typname`
);
console.log("Enums:", enums.rows.map((r) => r.typname).join(", ") || "(none)");

const migrations = await pool.query(
  `SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at DESC LIMIT 8`
);
console.log("Recent migrations:");
for (const row of migrations.rows) {
  console.log(`  ${row.migration_name} finished=${row.finished_at ? "yes" : "NO"} rolled_back=${row.rolled_back_at ? "yes" : "no"}`);
}

const users = await pool.query(
  `SELECT email, role, "isActive", ("passwordHash" IS NOT NULL) AS has_password FROM "User" ORDER BY "createdAt" DESC LIMIT 10`
);
console.log("Users:");
for (const row of users.rows) {
  console.log(`  ${row.email} role=${row.role} active=${row.isActive} hasPassword=${row.has_password}`);
}

await pool.end();

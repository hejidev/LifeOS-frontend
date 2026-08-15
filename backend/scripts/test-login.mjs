import "dotenv/config";
import bcrypt from "bcrypt";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const email = process.env.SUPER_ADMIN_EMAIL;
const password = process.env.SUPER_ADMIN_PASSWORD;

const res = await fetch("http://localhost:5000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});

console.log("Login status:", res.status);
const body = await res.json();
console.log("Login body keys:", Object.keys(body));
if (body.error) console.log("Error:", body.error);
if (body.accessToken) console.log("Login OK, role:", body.user?.role);

// Verify password hash directly
const userRes = await pool.query(`SELECT "passwordHash" FROM "User" WHERE email = $1`, [email]);
if (userRes.rows[0]?.passwordHash) {
  const match = await bcrypt.compare(password, userRes.rows[0].passwordHash);
  console.log("Direct bcrypt compare:", match);
}

await pool.end();

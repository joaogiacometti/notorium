import "dotenv/config";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run E2E tests.");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

async function getE2EUserId(email: string) {
  const result = await pool.query<{ id: string }>(
    'select id from "user" where email = $1 limit 1',
    [email],
  );

  return result.rows[0]?.id ?? null;
}

export async function resetE2EUser(email: string) {
  await pool.query('delete from "user" where email = $1', [email]);
}

export async function approveE2EUser(email: string) {
  await pool.query('update "user" set access_status = $1 where email = $2', [
    "approved",
    email,
  ]);
}

export async function setE2EUserAccessStatus(
  email: string,
  status: "pending" | "approved" | "blocked",
) {
  await pool.query('update "user" set access_status = $1 where email = $2', [
    status,
    email,
  ]);
}

export async function clearE2ESubjects(email: string) {
  const userId = await getE2EUserId(email);
  if (!userId) {
    return;
  }

  await pool.query("delete from subject where user_id = $1", [userId]);
}

export async function closeE2EDb() {
  await pool.end();
}

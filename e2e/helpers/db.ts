import "dotenv/config";
import { Pool } from "pg";
import { e2eUser } from "./constants";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run E2E tests.");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

async function getE2EUserId() {
  const result = await pool.query<{ id: string }>(
    'select id from "user" where email = $1 limit 1',
    [e2eUser.email],
  );

  return result.rows[0]?.id ?? null;
}

export async function resetE2EUser() {
  await pool.query('delete from "user" where email = $1', [e2eUser.email]);
}

export async function approveE2EUser() {
  await pool.query('update "user" set access_status = $1 where email = $2', [
    "approved",
    e2eUser.email,
  ]);
}

export async function clearE2ESubjects() {
  const userId = await getE2EUserId();
  if (!userId) {
    return;
  }

  await pool.query("delete from subject where user_id = $1", [userId]);
}

export async function closeE2EDb() {
  await pool.end();
}

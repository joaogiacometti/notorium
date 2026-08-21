import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getServerEnv } from "@/env";

function createPool() {
  const { DATABASE_URL } = getServerEnv();

  return new Pool({
    connectionString: DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    keepAlive: true,
  });
}

function createDb(pool: Pool) {
  return drizzle({ client: pool });
}

type Database = ReturnType<typeof createDb>;

let cachedPool: Pool | null = null;
let cachedDb: Database | null = null;

export function getDb(): Database {
  if (cachedDb) {
    return cachedDb;
  }

  cachedPool ??= createPool();
  cachedDb = createDb(cachedPool);
  return cachedDb;
}

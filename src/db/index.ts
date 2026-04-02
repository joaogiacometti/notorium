import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getServerEnv } from "@/env";

function createPool() {
  const { DATABASE_URL } = getServerEnv();
  const databaseUrl = new URL(DATABASE_URL);
  const isLocalDatabase =
    databaseUrl.hostname === "localhost" ||
    databaseUrl.hostname === "127.0.0.1";

  return new Pool({
    connectionString: DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    keepAlive: true,
    ssl: isLocalDatabase ? undefined : { rejectUnauthorized: false },
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

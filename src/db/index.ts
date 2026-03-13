import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseEnv } from "@/db/env";

const databaseUrl = new URL(databaseEnv.DATABASE_URL);
const isLocalDatabase =
  databaseUrl.hostname === "localhost" || databaseUrl.hostname === "127.0.0.1";

const pool = new Pool({
  connectionString: databaseEnv.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  keepAlive: true,
  ssl: isLocalDatabase ? undefined : { rejectUnauthorized: false },
});

export const db = drizzle({ client: pool });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseEnv } from "@/db/env";

const pool = new Pool({
  connectionString: databaseEnv.DATABASE_URL,
});

export const db = drizzle({ client: pool });

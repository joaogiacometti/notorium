import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { appEnv } from "@/env";

const pool = new Pool({
  connectionString: appEnv.DATABASE_URL,
});

export const db = drizzle({ client: pool });

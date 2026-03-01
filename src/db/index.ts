import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { appEnv } from "@/env";

export const db = drizzle({ client: neon(appEnv.DATABASE_URL) });

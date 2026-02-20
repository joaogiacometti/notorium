import { drizzle } from "drizzle-orm/node-postgres";
import { appEnv } from "@/env";

export const db = drizzle(appEnv.DATABASE_URL);

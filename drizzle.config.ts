import { defineConfig } from "drizzle-kit";
import { normalizeDatabaseConnectionString } from "./src/db/connection-string";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for drizzle-kit commands");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: normalizeDatabaseConnectionString(process.env.DATABASE_URL),
  },
});

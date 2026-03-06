import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z.url(),
});

const databaseEnvResult = process.env.SKIP_ENV_VALIDATION
  ? {
      success: true as const,
      data: {
        DATABASE_URL:
          process.env.DATABASE_URL ??
          "postgresql://postgres:postgres@localhost:5432/notorium",
      },
    }
  : databaseEnvSchema.safeParse(process.env);

if (!databaseEnvResult.success) {
  console.error("Invalid environment variables:");
  console.error(z.treeifyError(databaseEnvResult.error));
  throw new Error("Invalid environment variables");
}

export const databaseEnv = databaseEnvResult.data;

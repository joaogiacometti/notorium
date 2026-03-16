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
  const errorMessages = databaseEnvResult.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return `${path}: ${issue.message}`;
  });

  throw new Error(
    `Invalid database environment variables:\n${errorMessages.join("\n")}`,
  );
}

export const databaseEnv = databaseEnvResult.data;

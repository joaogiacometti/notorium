import { z } from "zod";

const serverEnvSchema = z
  .object({
    DATABASE_URL: z.url(),
  })
  .extend({
    BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
    BETTER_AUTH_SECRET: z.string().min(32),
    RATE_LIMIT_BACKEND: z.enum(["upstash", "redis"]).default("redis"),
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    REDIS_URL: z.url().optional(),
    BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
    OPENROUTER_API_KEY: z.string().min(1).optional(),
    OPENROUTER_MODEL: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().min(1).optional(),
    CRON_SECRET: z.string().min(32).optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .optional()
      .default("development"),
  })
  .superRefine((data, ctx) => {
    if (data.RATE_LIMIT_BACKEND === "upstash") {
      if (!data.UPSTASH_REDIS_REST_URL) {
        ctx.addIssue({
          code: "custom",
          path: ["UPSTASH_REDIS_REST_URL"],
          message:
            "UPSTASH_REDIS_REST_URL is required when using upstash backend",
        });
      }
      if (!data.UPSTASH_REDIS_REST_TOKEN) {
        ctx.addIssue({
          code: "custom",
          path: ["UPSTASH_REDIS_REST_TOKEN"],
          message:
            "UPSTASH_REDIS_REST_TOKEN is required when using upstash backend",
        });
      }
    }

    if (data.RATE_LIMIT_BACKEND === "redis" && !data.REDIS_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["REDIS_URL"],
        message: "REDIS_URL is required when using redis backend",
      });
    }
  });

type ServerEnv = z.output<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const serverEnvResult = process.env.SKIP_ENV_VALIDATION
    ? {
        success: true as const,
        data: process.env as unknown as ServerEnv,
      }
    : serverEnvSchema.safeParse(process.env);

  if (!serverEnvResult.success) {
    const errorMessages = serverEnvResult.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return `${path}: ${issue.message}`;
    });

    throw new Error(
      `Invalid environment variables:\n${errorMessages.join("\n")}`,
    );
  }

  cachedServerEnv = serverEnvResult.data;
  return cachedServerEnv;
}

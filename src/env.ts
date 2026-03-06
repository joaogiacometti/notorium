import { z } from "zod";

const appEnvSchema = z
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
    AUTH_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
    AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60),
    AUTH_RATE_LIMIT_PREFIX: z.string().min(1).default("ratelimit:auth"),
    MAX_IMPORT_BYTES: z.coerce.number().int().positive().default(1048576),
    TRUSTED_PROXY_COUNT: z.coerce.number().int().nonnegative().default(1),
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

const appEnvResult = process.env.SKIP_ENV_VALIDATION
  ? {
      success: true as const,
      data: process.env as unknown as z.output<typeof appEnvSchema>,
    }
  : appEnvSchema.safeParse(process.env);

if (!appEnvResult.success) {
  console.error("Invalid environment variables:");
  console.error(z.treeifyError(appEnvResult.error));
  throw new Error("Invalid environment variables");
}

export const appEnv = appEnvResult.data;

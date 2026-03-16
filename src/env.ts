import { z } from "zod";

function isBase64Length(length: number) {
  return (value: string) => {
    try {
      return Buffer.from(value, "base64").length === length;
    } catch {
      return false;
    }
  };
}

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
    USER_AI_SETTINGS_ENCRYPTION_KEY: z.string().refine(isBase64Length(32), {
      message:
        "USER_AI_SETTINGS_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
    }),
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
  const errorMessages = appEnvResult.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return `${path}: ${issue.message}`;
  });

  throw new Error(
    `Invalid environment variables:\n${errorMessages.join("\n")}`,
  );
}

export const appEnv = appEnvResult.data;

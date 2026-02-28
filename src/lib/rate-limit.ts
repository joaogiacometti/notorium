import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { appEnv } from "@/env";

const redis = new Redis({
  url: appEnv.UPSTASH_REDIS_REST_URL,
  token: appEnv.UPSTASH_REDIS_REST_TOKEN,
});

const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  prefix: "ratelimit:auth",
});

export async function checkAuthRateLimit(): Promise<
  { limited: false } | { limited: true; error: string }
> {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { success } = await authRateLimit.limit(ip);

  if (!success) {
    return {
      limited: true,
      error: "Too many attempts. Please try again later.",
    };
  }

  return { limited: false };
}

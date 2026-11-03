import "server-only";

import { type ResolvedAiSettings, resolveAiSettings } from "@/lib/ai/config";
import { consumeUserDailyRateLimit } from "@/lib/rate-limit/user-rate-limit";

interface UserAiDailyLimit {
  prefix: string;
  limit: number;
  errorCode: string;
}

type UserAiAccess =
  | { granted: true; settings: ResolvedAiSettings }
  | { granted: false };

/**
 * Gate one AI call for a user by consuming one unit of their daily limit.
 * Rate-limit backend failures throw.
 *
 * @example
 * const access = await acquireUserAiSettings("user-1", {
 *   prefix: LIMITS.aiAssistantRateLimitPrefix,
 *   limit: LIMITS.aiAssistantRateLimitPerDay,
 *   errorCode: "limits.aiAssistantPerDay",
 * });
 * if (!access.granted) return limited();
 */
export async function acquireUserAiSettings(
  userId: string,
  dailyLimit: UserAiDailyLimit,
): Promise<UserAiAccess> {
  const limitResult = await consumeUserDailyRateLimit({
    prefix: dailyLimit.prefix,
    userId,
    limit: dailyLimit.limit,
    errorCode: dailyLimit.errorCode,
  });

  if (limitResult.limited) {
    return { granted: false };
  }

  return { granted: true, settings: resolveAiSettings() };
}

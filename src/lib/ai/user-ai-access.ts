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
  | { granted: false; reason: "notConfigured" | "limited" };

/**
 * Gate one AI call for a user: resolve the instance AI settings, then consume
 * one unit of the user's daily limit. Settings resolve first so an unconfigured
 * instance never spends quota. Rate-limit backend failures throw.
 *
 * @example
 * const access = await acquireUserAiSettings("user-1", {
 *   prefix: LIMITS.aiAssistantRateLimitPrefix,
 *   limit: LIMITS.aiAssistantRateLimitPerDay,
 *   errorCode: "limits.aiAssistantPerDay",
 * });
 * if (!access.granted) return access.reason;
 */
export async function acquireUserAiSettings(
  userId: string,
  dailyLimit: UserAiDailyLimit,
): Promise<UserAiAccess> {
  const settings = resolveAiSettings();
  if (!settings) {
    return { granted: false, reason: "notConfigured" };
  }

  const limitResult = await consumeUserDailyRateLimit({
    prefix: dailyLimit.prefix,
    userId,
    limit: dailyLimit.limit,
    errorCode: dailyLimit.errorCode,
  });

  if (limitResult.limited) {
    return { granted: false, reason: "limited" };
  }

  return { granted: true, settings };
}

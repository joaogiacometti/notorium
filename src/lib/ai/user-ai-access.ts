import "server-only";

import { type ResolvedAiSettings, resolveAiSettings } from "@/lib/ai/config";
import { consumeUserDailyRateLimit } from "@/lib/rate-limit/user-rate-limit";
import { logServerFailure } from "@/lib/server/action-failure";

interface UserAiDailyLimit {
  prefix: string;
  limit: number;
  errorCode: string;
}

type UserAiAccess =
  | { granted: true; settings: ResolvedAiSettings }
  | { granted: false; reason: "notConfigured" | "limited" };

interface UserAiTaskErrorCodes<TErrorCode extends string> {
  notConfigured: TErrorCode;
  unavailable: TErrorCode;
  limited: TErrorCode;
}

interface RunUserAiTaskOptions<TResult, TErrorCode extends string> {
  userId: string;
  /** `<feature>.<task>` scope written to `ai_task_failed` logs. */
  logScope: string;
  dailyLimit: Omit<UserAiDailyLimit, "errorCode">;
  errorCodes: UserAiTaskErrorCodes<TErrorCode>;
  run: (settings: ResolvedAiSettings) => Promise<TResult>;
}

type UserAiTaskFailure<TErrorCode extends string> = {
  success: false;
  errorCode: TErrorCode;
};

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

/**
 * Run a rate-limited, non-streaming AI task and fold every failure into a
 * typed `{ success: false, errorCode }` result: unconfigured AI, an exhausted
 * daily limit, or any provider/limiter throw (`unavailable`, logged as
 * `ai_task_failed`).
 *
 * @example
 * return runUserAiTask({
 *   userId,
 *   logScope: "flashcards.improveBack",
 *   dailyLimit: { prefix: "ratelimit:ai:back", limit: 500 },
 *   errorCodes: {
 *     notConfigured: "flashcards.ai.notConfigured",
 *     unavailable: "flashcards.ai.unavailable",
 *     limited: "limits.aiBackGenerationPerDay",
 *   },
 *   run: async (settings) => ({ success: true, back: await generate(settings) }),
 * });
 */
export async function runUserAiTask<TResult, TErrorCode extends string>({
  userId,
  logScope,
  dailyLimit,
  errorCodes,
  run,
}: RunUserAiTaskOptions<TResult, TErrorCode>): Promise<
  TResult | UserAiTaskFailure<TErrorCode>
> {
  try {
    const access = await acquireUserAiSettings(userId, {
      ...dailyLimit,
      errorCode: errorCodes.limited,
    });
    if (!access.granted) {
      return { success: false, errorCode: errorCodes[access.reason] };
    }

    return await run(access.settings);
  } catch (error) {
    logServerFailure("ai_task_failed", logScope, error);
    return { success: false, errorCode: errorCodes.unavailable };
  }
}

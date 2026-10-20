import "server-only";

import {
  type ResolvedAiSettings,
  resolveRequiredAiSettings,
} from "@/lib/ai/config";
import { AiConfigurationError } from "@/lib/ai/errors";
import { consumeUserDailyRateLimit } from "@/lib/rate-limit/user-rate-limit";

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
  const settings = resolveSettingsOrNull();
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
 * daily limit, or any provider/limiter throw (`unavailable`).
 *
 * @example
 * return runUserAiTask({
 *   userId,
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
    const reason =
      error instanceof AiConfigurationError ? "notConfigured" : "unavailable";
    return { success: false, errorCode: errorCodes[reason] };
  }
}

function resolveSettingsOrNull(): ResolvedAiSettings | null {
  try {
    return resolveRequiredAiSettings();
  } catch (error) {
    if (error instanceof AiConfigurationError) {
      return null;
    }
    throw error;
  }
}

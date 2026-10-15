import type { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { runCatchingActionFailure } from "@/lib/server/action-failure";
import { parseActionInput } from "@/lib/server/action-input";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

export async function runValidatedAction<TSchema extends z.ZodType, TResult>(
  logScope: string,
  schema: TSchema,
  input: unknown,
  errorCode: string,
  action: (data: z.infer<TSchema>) => Promise<TResult> | TResult,
): Promise<TResult | ActionErrorResult> {
  const parsed = parseActionInput(schema, input, errorCode);

  if (!parsed.success) {
    return parsed.error;
  }

  return runCatchingActionFailure(logScope, () => action(parsed.data));
}

export async function runValidatedUserAction<
  TSchema extends z.ZodType,
  TResult,
>(
  logScope: string,
  schema: TSchema,
  input: unknown,
  errorCode: string,
  action: (
    userId: string,
    data: z.infer<TSchema>,
  ) => Promise<TResult> | TResult,
): Promise<TResult | ActionErrorResult> {
  const parsed = parseActionInput(schema, input, errorCode);

  if (!parsed.success) {
    return parsed.error;
  }

  return runCatchingActionFailure(logScope, async () => {
    const userId = await getAuthenticatedUserId();
    return action(userId, parsed.data);
  });
}

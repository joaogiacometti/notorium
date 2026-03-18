import type { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { parseActionInput } from "@/lib/server/action-input";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

export async function runValidatedAction<TSchema extends z.ZodType, TResult>(
  schema: TSchema,
  input: unknown,
  errorCode: string,
  action: (data: z.infer<TSchema>) => Promise<TResult> | TResult,
): Promise<TResult | ActionErrorResult> {
  const parsed = parseActionInput(schema, input, errorCode);

  if (!parsed.success) {
    return parsed.error;
  }

  return action(parsed.data);
}

export async function runValidatedUserAction<
  TSchema extends z.ZodType,
  TResult,
>(
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

  const userId = await getAuthenticatedUserId();

  return action(userId, parsed.data);
}

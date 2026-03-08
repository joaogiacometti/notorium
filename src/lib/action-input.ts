import type { z } from "zod";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server-action-errors";

type ActionParseSuccess<TData> = {
  success: true;
  data: TData;
};

type ActionParseFailure = {
  success: false;
  error: ActionErrorResult;
};

export function parseActionInput<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
  errorCode: string,
): ActionParseSuccess<z.infer<TSchema>> | ActionParseFailure {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: actionError(errorCode),
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}

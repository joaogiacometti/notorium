"use server";

import { askAiAboutTextForUser } from "@/features/library/ask-ai-service";
import {
  type AskAiAboutTextForm,
  askAiAboutTextSchema,
} from "@/features/library/ask-ai-validation";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

export async function askAiAboutText(
  data: AskAiAboutTextForm,
): Promise<{ success: true; answer: string } | ActionErrorResult> {
  return runValidatedUserAction(
    askAiAboutTextSchema,
    data,
    "library.ai.invalidData",
    (userId, parsedData) =>
      askAiAboutTextForUser({
        userId,
        sourceText: parsedData.sourceText,
        messages: parsedData.messages,
      }),
  );
}

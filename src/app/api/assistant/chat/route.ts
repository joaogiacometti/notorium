import { streamSelectionExplanationForUser } from "@/features/assistant/selection-explanation";
import { selectionExplanationRequestSchema } from "@/features/assistant/selection-explanation-contract";
import { streamAssistantReplyForUser } from "@/features/assistant/service";
import { assistantChatRequestSchema } from "@/features/assistant/validation";
import { getOptionalSession } from "@/lib/auth/auth";
import { logServerFailure } from "@/lib/server/action-failure";
import { actionError } from "@/lib/server/server-action-errors";

// The study assistant streams through this route handler rather than a Server
// Action: Server Actions run one at a time per client (a reply in flight would
// queue every other write behind it) and cannot stream a response body. It is
// the one sanctioned streaming AI endpoint; see AGENTS.md and
// docs/architecture.md. It writes nothing: authenticate, validate, delegate.
export async function POST(request: Request): Promise<Response> {
  const session = await getOptionalSession();
  if (!session) {
    return Response.json(actionError("auth.forbidden"), { status: 401 });
  }

  const body = await readJsonOrNull(request);
  const parsed =
    typeof body === "object" && body !== null && "intent" in body
      ? selectionExplanationRequestSchema.safeParse(body)
      : assistantChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(actionError("assistant.invalidData"), { status: 400 });
  }

  try {
    const input = parsed.data;
    const result =
      "intent" in input
        ? await streamSelectionExplanationForUser({
            userId: session.user.id,
            selection: input.selection,
            abortSignal: request.signal,
          })
        : await streamAssistantReplyForUser({
            userId: session.user.id,
            messages: input.messages,
            chatId: input.chatId,
            draft: input.draft,
            documentDraft: input.documentDraft,
            context: input.context,
            bypassLearning: input.bypassLearning,
            historyTruncated: input.historyTruncated,
            abortSignal: request.signal,
          });

    if (!result.success) {
      return Response.json(actionError(result.errorCode), {
        status: 429,
      });
    }

    return result.response;
  } catch (error) {
    logServerFailure("ai_chat_failed", "assistant.chat", error);
    return Response.json(actionError("assistant.unavailable"), { status: 500 });
  }
}

async function readJsonOrNull(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

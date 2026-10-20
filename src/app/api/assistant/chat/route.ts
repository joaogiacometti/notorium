import { streamAssistantReplyForUser } from "@/features/assistant/service";
import { assistantChatRequestSchema } from "@/features/assistant/validation";
import { getOptionalSession } from "@/lib/auth/auth";
import { logServerFailure } from "@/lib/server/action-failure";
import { actionError } from "@/lib/server/server-action-errors";

const FAILURE_STATUS = {
  "assistant.notConfigured": 503,
  "limits.aiAssistantPerDay": 429,
} as const;

// The study assistant streams through this route handler rather than a Server
// Action: Server Actions run one at a time per client (a reply in flight would
// queue every other write behind it) and cannot stream a response body. It is
// the one sanctioned streaming AI endpoint; see CLAUDE.md and
// docs/architecture.md. It writes nothing: authenticate, validate, delegate.
export async function POST(request: Request): Promise<Response> {
  const session = await getOptionalSession();
  if (!session) {
    return Response.json(actionError("auth.forbidden"), { status: 401 });
  }

  const parsed = assistantChatRequestSchema.safeParse(
    await readJsonOrNull(request),
  );
  if (!parsed.success) {
    return Response.json(actionError("assistant.invalidData"), { status: 400 });
  }

  try {
    const result = await streamAssistantReplyForUser({
      userId: session.user.id,
      messages: parsed.data.messages,
      chatId: parsed.data.chatId,
      abortSignal: request.signal,
    });

    if (!result.success) {
      return Response.json(actionError(result.errorCode), {
        status: FAILURE_STATUS[result.errorCode],
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

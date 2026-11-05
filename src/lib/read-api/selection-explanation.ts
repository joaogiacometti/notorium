import {
  DefaultChatTransport,
  readUIMessageStream,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import type {
  ExplanationSelection,
  SelectionExplanation,
} from "@/features/assistant/selection-explanation-contract";
import { actionError } from "@/lib/server/server-action-errors";

/** Read a transient explanation through the shared AI streaming endpoint. */
export async function fetchSelectionExplanation(
  selection: ExplanationSelection,
  signal?: AbortSignal,
): Promise<SelectionExplanation> {
  const transport = new DefaultChatTransport({
    api: "/api/assistant/chat",
    prepareSendMessagesRequest: () => ({
      body: { intent: "explain-selection", selection },
    }),
  });
  const stream = await transport.sendMessages({
    trigger: "submit-message",
    // The request body above replaces the chat fields; nothing reads this id.
    chatId: "selection-explanation",
    messageId: undefined,
    messages: [],
    abortSignal: signal,
  });
  let reply: UIMessage | undefined;
  let finished = false;
  const checkedStream = stream.pipeThrough(
    new TransformStream<UIMessageChunk, UIMessageChunk>({
      transform(chunk, controller) {
        if (chunk.type === "finish") finished = chunk.finishReason === "stop";
        controller.enqueue(chunk);
      },
    }),
  );
  for await (const message of readUIMessageStream({
    stream: checkedStream,
    terminateOnError: true,
  })) {
    reply = message;
  }
  const text = reply?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
  signal?.throwIfAborted();
  if (!finished || !text) {
    throw new Error(
      JSON.stringify(actionError("assistant.explanationUnavailable")),
    );
  }
  return { text };
}

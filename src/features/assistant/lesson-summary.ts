import type { AssistantChatRequest } from "@/features/assistant/validation";

/** Bind the button's summary request to an ended lesson, not the open material. */
export function readRequestedLessonSummary(
  messages: AssistantChatRequest["messages"],
) {
  const requested = messages.at(-1);
  const markerId =
    requested?.role === "user" ? requested.metadata?.lessonSummary : undefined;
  if (!markerId) return null;
  const markerIndex = messages.findIndex(
    (message) =>
      message.role === "assistant" &&
      message.parts.some(
        (part) =>
          part.type === "tool-startGuidedLesson" &&
          part.toolCallId === markerId &&
          part.output.endedByUser,
      ),
  );
  if (markerIndex < 0) return null;
  const marker = messages[markerIndex].parts.find(
    (part) =>
      part.type === "tool-startGuidedLesson" && part.toolCallId === markerId,
  );
  if (marker?.type !== "tool-startGuidedLesson") return null;
  const startIndex = messages
    .slice(0, markerIndex)
    .findLastIndex((message) => message.role === "user");
  if (startIndex < 0) return null;
  return { topic: marker.output.topic, messages: messages.slice(startIndex) };
}

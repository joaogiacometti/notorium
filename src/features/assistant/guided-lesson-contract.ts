import { z } from "zod";

const LESSON_TOPIC_MAX_CHARS = 120;

const lessonTopicSchema = z.string().trim().min(1).max(LESSON_TOPIC_MAX_CHARS);

/**
 * What the model sends when a guided lesson starts, from `/learn` or a
 * natural-language request to be taught. Only the user requests lesson exit.
 * @example guidedLessonInputSchema.parse({ topic: "Derivatives" });
 */
export const guidedLessonInputSchema = z.object({
  topic: lessonTopicSchema.describe("Short lesson topic."),
});

export const endGuidedLessonInputSchema = z.object({});

/**
 * The lesson the chat records. Exit is recorded locally from the indicator or
 * by the server-echoed end tool, independently of successful summary generation.
 * @example guidedLessonOutputSchema.parse({ topic, endedByUser: true });
 */
export const guidedLessonOutputSchema = z.object({
  topic: lessonTopicSchema,
  endedByUser: z.boolean().optional(),
});

export type GuidedLessonOutput = z.infer<typeof guidedLessonOutputSchema>;

/**
 * Tool result text the model reads in later turns.
 * @example formatGuidedLessonForModel({ topic: "Derivatives" });
 */
export function formatGuidedLessonForModel(output: GuidedLessonOutput): string {
  return output.endedByUser
    ? `The user ended the guided lesson on "${output.topic}". Answer directly unless they ask to be taught again.`
    : `Guided lesson on "${output.topic}" started. Write the reply now without repeating any text already written in it.`;
}

interface LessonMarkerPart {
  type: string;
  state?: string;
  output?: unknown;
}

/**
 * Topic of the lesson the chat leaves active, or null. A lesson stays active
 * from its start marker until the user ends it on that marker.
 * @example readActiveLessonTopic(request.messages); // "Derivatives"
 */
export function readActiveLessonTopic(
  messages: ReadonlyArray<{ parts: ReadonlyArray<LessonMarkerPart> }>,
): string | null {
  let topic: string | null = null;
  for (const part of messages.flatMap((message) => message.parts)) {
    if (
      (part.type !== "tool-startGuidedLesson" &&
        part.type !== "tool-endGuidedLesson") ||
      part.state !== "output-available"
    )
      continue;
    const output = guidedLessonOutputSchema.safeParse(part.output);
    if (!output.success) continue;
    if (output.data.endedByUser) topic = null;
    else topic ??= output.data.topic;
  }
  return topic;
}

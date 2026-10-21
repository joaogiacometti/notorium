import { z } from "zod";
import { ASSISTANT_CARD_SIDE_MAX_CHARS } from "@/features/assistant/edit-contract";
import { SUBJECT_PATH_MAX_CHARS } from "@/lib/config/limits";

export const STUDY_CONTEXT_MAX_CHARS = 12_000;
const documentFields = {
  title: z.string().max(200),
  subjectPath: z.string().max(SUBJECT_PATH_MAX_CHARS).optional(),
  content: z.string().max(STUDY_CONTEXT_MAX_CHARS),
  partial: z.boolean(),
};

/** Background material for the current study surface, never a write target.
 * @example studyContextSchema.parse({ kind: "note", title: "Cells", content: "ATP", partial: false });
 */
export const studyContextSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("note"), ...documentFields }),
  z.object({ kind: z.literal("mindmap"), ...documentFields }),
  z.object({
    kind: z.literal("review"),
    mode: z.enum(["review", "exam"]),
    subjectPath: z.string().max(SUBJECT_PATH_MAX_CHARS).optional(),
    front: z.string().max(ASSISTANT_CARD_SIDE_MAX_CHARS),
    back: z.string().max(ASSISTANT_CARD_SIDE_MAX_CHARS).optional(),
  }),
]);
export type StudyContext = z.infer<typeof studyContextSchema>;

/** Describe the exact material selected for the next message.
 * @example describeStudyContext({kind: "review", mode: "review", front: "Why?"});
 */
export function describeStudyContext(context: StudyContext): string {
  if (context.kind === "review")
    return `Using current ${context.mode === "exam" ? "exam" : "review"} card · ${context.back === undefined ? "front only" : "front and answer"}`;
  return `Using ${context.kind}: ${context.title || "Untitled"}${context.partial ? " · partial context" : ""}`;
}

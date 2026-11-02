import { z } from "zod";
import { ASSISTANT_CARD_SIDE_MAX_CHARS } from "@/features/assistant/edit-contract";
import { SUBJECT_PATH_MAX_CHARS } from "@/lib/config/limits";
import { idSchema } from "@/lib/validations/schemas";

export const STUDY_CONTEXT_MAX_CHARS = 12_000;
const documentFields = {
  documentId: idSchema.optional(),
  title: z.string().max(200),
  subjectPath: z.string().max(SUBJECT_PATH_MAX_CHARS).optional(),
  content: z.string().max(STUDY_CONTEXT_MAX_CHARS),
  partial: z.boolean(),
};

/** Background material for the current study surface, never a write target.
 * @example studyContextSchema.parse({ kind: "note", title, content, partial: false });
 */
export const studyContextSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("note"), ...documentFields }),
  // Text extracted from the user's selection or the visible page; empty when
  // that page has no text layer (scanned images).
  z.object({
    kind: z.literal("pdf"),
    ...documentFields,
    page: z.number().int().positive(),
    scope: z.enum(["selection", "page"]),
    selectionChanged: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("review"),
    mode: z.enum(["review", "exam"]),
    subjectPath: z.string().max(SUBJECT_PATH_MAX_CHARS).optional(),
    front: z.string().max(ASSISTANT_CARD_SIDE_MAX_CHARS),
    back: z.string().max(ASSISTANT_CARD_SIDE_MAX_CHARS).optional(),
    // Ground hints and feedback in the card's unrevealed answer. The prompt
    // forbids disclosing it unless requested.
    hiddenBack: z.string().max(ASSISTANT_CARD_SIDE_MAX_CHARS).optional(),
  }),
]);
export type StudyContext = z.infer<typeof studyContextSchema>;

/** Describe the exact material selected for the next message.
 * @example describeStudyContext({kind: "review", mode: "review", front: "Why?"});
 */
export function describeStudyContext(context: StudyContext): string {
  if (context.kind === "review")
    return `Using current ${context.mode === "exam" ? "exam" : "review"} card · ${context.back === undefined ? "answer hidden" : "front and answer"}`;
  if (context.kind === "pdf") return describePdfContext(context);
  return `Using ${context.kind}: ${context.title || "Untitled"}${context.partial ? " · partial context" : ""}`;
}

function describePdfContext(
  context: Extract<StudyContext, { kind: "pdf" }>,
): string {
  const source = `Using PDF: ${context.title || "Untitled"} · p. ${context.page}`;
  if (!context.content) return `${source} · no selectable text`;
  const scope = context.scope === "selection" ? " · selection" : "";
  return `${source}${scope}${context.partial ? " · partial context" : ""}`;
}

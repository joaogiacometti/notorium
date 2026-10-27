import type { StudyContext } from "@/features/assistant/study-context";
import { STUDY_CONTEXT_MAX_CHARS } from "@/features/assistant/study-context";
import { richTextToMarkdown } from "@/lib/clipboard/rich-text-markdown";
import {
  normalizeRichTextForStaticRendering,
  replaceImagesWithPlaceholders,
  richTextToPlainTextWithImagePlaceholders,
} from "@/lib/editor/rich-text";

/** Build a bounded, image-safe snapshot of an unsaved note.
 * @example buildDocumentContext("note", title, subjectPath, content);
 */
export function buildDocumentContext(
  kind: "note",
  title: string,
  subjectPath: string,
  content: string,
  documentId?: string,
): Exclude<StudyContext, { kind: "review" }> {
  const text = studyRichText(content);
  return {
    kind,
    ...(documentId ? { documentId } : {}),
    title,
    subjectPath,
    content: text.slice(0, STUDY_CONTEXT_MAX_CHARS),
    partial: text.length > STUDY_CONTEXT_MAX_CHARS,
  };
}

/** Snapshot the card, marking the answer hidden until the session reveals it.
 * @example buildReviewContext(card, subjectPath, false, "review");
 */
export function buildReviewContext(
  card: { front: string; back: string },
  subjectPath: string,
  revealed: boolean,
  mode: "review" | "exam",
): Extract<StudyContext, { kind: "review" }> {
  return {
    kind: "review",
    mode,
    subjectPath,
    front: studyRichText(card.front),
    ...(revealed
      ? { back: studyRichText(card.back) }
      : { hiddenBack: studyRichText(card.back) }),
  };
}

function studyRichText(content: string): string {
  // Normalization can turn unsupported image sources into URL text, so hide
  // explicit images first and hide newly recognized image paragraphs afterward.
  const withoutImages = replaceImagesWithPlaceholders(content).text;
  const renderedHtml = normalizeRichTextForStaticRendering(withoutImages);
  const safeHtml = replaceImagesWithPlaceholders(renderedHtml).text;
  return typeof DOMParser === "undefined"
    ? richTextToPlainTextWithImagePlaceholders(safeHtml)
    : richTextToMarkdown(safeHtml);
}

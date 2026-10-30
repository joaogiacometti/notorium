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
): Extract<StudyContext, { kind: "note" }> {
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

/** Where a PDF snapshot's text came from: a selection or the visible page. */
export interface PdfStudyText {
  page: number;
  scope: "selection" | "page";
  text: string;
}

/** Build a bounded snapshot of a PDF's selected or visible text.
 * @example buildPdfContext(pdf, subjectPath, { page: 3, scope: "page", text });
 */
export function buildPdfContext(
  pdf: { id: string; title: string },
  subjectPath: string,
  source: PdfStudyText,
): Extract<StudyContext, { kind: "pdf" }> {
  return {
    kind: "pdf",
    documentId: pdf.id,
    title: pdf.title,
    subjectPath,
    content: source.text.slice(0, STUDY_CONTEXT_MAX_CHARS),
    partial: source.text.length > STUDY_CONTEXT_MAX_CHARS,
    page: source.page,
    scope: source.scope,
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

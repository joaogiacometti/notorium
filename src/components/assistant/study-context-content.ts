import type { JSONContent } from "@tiptap/core";
import type { StudyContext } from "@/features/assistant/study-context";
import { STUDY_CONTEXT_MAX_CHARS } from "@/features/assistant/study-context";
import { richTextToMarkdown } from "@/lib/clipboard/rich-text-markdown";
import type { RichTextDocument } from "@/lib/editor/document";

/** Build a bounded, image-safe snapshot of an unsaved note.
 * @example buildDocumentContext("note", title, folderPath, content);
 */
export function buildDocumentContext(
  kind: "note",
  title: string,
  folderPath: string,
  content: RichTextDocument,
  documentId?: string,
): Extract<StudyContext, { kind: "note" }> {
  const text = studyRichText(content);
  return {
    kind,
    ...(documentId ? { documentId } : {}),
    title,
    folderPath,
    content: text.slice(0, STUDY_CONTEXT_MAX_CHARS),
    partial: text.length > STUDY_CONTEXT_MAX_CHARS,
  };
}

/** Snapshot the card, marking the answer hidden until the session reveals it.
 * @example buildReviewContext(card, folderPath, false, "review");
 */
export function buildReviewContext(
  card: { front: RichTextDocument; back: RichTextDocument },
  folderPath: string,
  revealed: boolean,
  mode: "review" | "exam",
): Extract<StudyContext, { kind: "review" }> {
  return {
    kind: "review",
    mode,
    folderPath,
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
 * @example buildPdfContext(pdf, folderPath, { page: 3, scope: "page", text });
 */
export function buildPdfContext(
  pdf: { id: string; title: string },
  folderPath: string,
  source: PdfStudyText,
): Extract<StudyContext, { kind: "pdf" }> {
  return {
    kind: "pdf",
    documentId: pdf.id,
    title: pdf.title,
    folderPath,
    content: source.text.slice(0, STUDY_CONTEXT_MAX_CHARS),
    partial: source.text.length > STUDY_CONTEXT_MAX_CHARS,
    page: source.page,
    scope: source.scope,
  };
}

function studyRichText(content: RichTextDocument): string {
  function hideImages(node: JSONContent): JSONContent {
    if (node.type === "image")
      return {
        type: "paragraph",
        content: [{ type: "text", text: "[Image]" }],
      };
    return node.content
      ? { ...node, content: node.content.map(hideImages) }
      : node;
  }
  return richTextToMarkdown({
    ...content,
    content: content.content.map(hideImages),
  });
}

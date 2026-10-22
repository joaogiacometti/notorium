import type { StudyContext } from "@/features/assistant/study-context";
import { STUDY_CONTEXT_MAX_CHARS } from "@/features/assistant/study-context";
import type { MindmapGraph } from "@/features/mindmaps/types";
import { richTextToMarkdown } from "@/lib/clipboard/rich-text-markdown";
import {
  normalizeRichTextForStaticRendering,
  replaceImagesWithPlaceholders,
  richTextToPlainTextWithImagePlaceholders,
} from "@/lib/editor/rich-text";

/** Build a bounded, image-safe snapshot of an unsaved note or mindmap.
 * @example buildDocumentContext("note", "Cells", "Biology", "<p>ATP</p>");
 */
export function buildDocumentContext(
  kind: "note" | "mindmap",
  title: string,
  subjectPath: string,
  content: string,
  documentId?: string,
): Exclude<StudyContext, { kind: "review" }> {
  const text = kind === "mindmap" ? content : studyRichText(content);
  return {
    kind,
    ...(documentId ? { documentId } : {}),
    title,
    subjectPath,
    content: text.slice(0, STUDY_CONTEXT_MAX_CHARS),
    partial: text.length > STUDY_CONTEXT_MAX_CHARS,
  };
}

/** Describe graph meaning in root-first order without canvas or attachment metadata.
 * @example describeMindmapGraph({ nodes: [], edges: [] });
 */
export function describeMindmapGraph(graph: MindmapGraph): string {
  return orderedMindmapLabels(graph)
    .concat(graph.edges.map(describeMindmapEdge))
    .join("\n");
}

function describeMindmapEdge(edge: MindmapGraph["edges"][number]): string {
  const arrows = { none: "--", backward: "<-", forward: "->", both: "<->" };
  return `${edge.source} ${arrows[edge.direction ?? "forward"]} ${edge.target}${edge.label ? ` (${edge.label})` : ""}`;
}

function orderedMindmapLabels(graph: MindmapGraph): string[] {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const stack = [
    ...graph.nodes.filter((node) => node.data.kind === "root"),
    ...graph.nodes,
  ].reverse();
  const visited = new Set<string>();
  const lines: string[] = [];
  while (stack.length) {
    const node = stack.pop();
    if (!node || visited.has(node.id)) continue;
    visited.add(node.id);
    lines.push(
      `${node.id}: ${node.data.kind === "image" ? "[Image]" : node.data.label}`,
    );
    const children = graph.edges.filter((edge) => edge.source === node.id);
    stack.push(
      ...children.flatMap((edge) => nodes.get(edge.target) ?? []).reverse(),
    );
  }
  return lines;
}

/** Snapshot the card, marking the answer hidden until the session reveals it.
 * @example buildReviewContext({front: "Q", back: "A"}, "Math", false, "review");
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

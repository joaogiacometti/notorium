import type { Node } from "@xyflow/react";
import { toEdge } from "@/features/mindmaps/canvas-graph";
import { serializeMindmapSelection } from "@/features/mindmaps/serialize";
import { isCrossEdge } from "@/features/mindmaps/sides";
import type { MindmapGraph } from "@/features/mindmaps/types";
import { parseMindmapGraph } from "@/features/mindmaps/utils";
import { LIMITS } from "@/lib/config/limits";

interface BuildMindmapFlashcardSourceInput {
  title: string;
  data?: string | null;
}

interface MindmapFlashcardSource {
  text: string;
  images: string[];
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function imageHtml(url: string): string {
  return `<img src="${escapeAttribute(url)}" alt="">`;
}

function isFencedCode(value: string): boolean {
  return value.trim().startsWith("```");
}

function codeFenceLanguage(value: string): string {
  if (/\b(class|interface|namespace|public|private|protected)\b/.test(value)) {
    return "csharp";
  }
  if (/\b(function|const|let|=>)\b/.test(value)) {
    return "ts";
  }
  return "text";
}

function looksLikeCode(value: string): boolean {
  return (
    value.includes("\n") &&
    /[{};]|\b(class|function|const|let|public|private|def)\b/.test(value)
  );
}

function formatNodeLabelForAi(value: string): string {
  const trimmed = value.trim();
  if (!looksLikeCode(trimmed) || isFencedCode(trimmed)) {
    return value;
  }
  return `\`\`\`${codeFenceLanguage(trimmed)}\n${trimmed}\n\`\`\``;
}

function withImagePlaceholders(graph: MindmapGraph): {
  nodes: Node[];
  images: string[];
} {
  const images: string[] = [];
  const nodes: Node[] = graph.nodes.map((node) => {
    const imageUrl =
      typeof node.data.imageUrl === "string" ? node.data.imageUrl : null;
    const placeholder = imageUrl ? `{{IMAGE_${images.length}}}` : "";
    if (imageUrl) {
      images.push(imageHtml(imageUrl));
    }
    const label =
      node.data.kind === "image"
        ? placeholder
        : [formatNodeLabelForAi(node.data.label), placeholder]
            .filter(Boolean)
            .join("\n");
    return {
      id: node.id,
      position: node.position,
      data: { label, kind: node.data.kind },
    };
  });
  return { nodes, images };
}

function nodeLabel(nodes: Node[], nodeId: string): string {
  const label = nodes.find((node) => node.id === nodeId)?.data.label;
  return typeof label === "string" && label.trim().length > 0
    ? label.trim()
    : "Untitled";
}

function crossConnectionLines(
  nodes: Node[],
  edges: ReturnType<typeof toEdge>[],
): string[] {
  return edges.filter(isCrossEdge).map((edge) => {
    const relation =
      typeof edge.label === "string" && edge.label.trim().length > 0
        ? ` -- ${edge.label.trim()} -- `
        : " -- ";
    return `- ${nodeLabel(nodes, edge.source)}${relation}${nodeLabel(nodes, edge.target)}`;
  });
}

/**
 * Builds bounded plain text from a mindmap for AI flashcard generation. The
 * graph is rendered as a nested markdown outline (node labels + edge-relation
 * labels) so the AI receives the hierarchy and relationships, not just a flat
 * list. Mirrors {@link buildNoteFlashcardSource} for the note generation path.
 *
 * @example
 * buildMindmapFlashcardSource({ title: "Cell biology", data: mindmap.data })
 */
export function buildMindmapFlashcardSource({
  title,
  data,
}: BuildMindmapFlashcardSourceInput): string {
  return buildMindmapFlashcardSourceWithImages({ title, data }).text;
}

/**
 * Builds AI source text plus the image HTML referenced by `{{IMAGE_N}}` tokens.
 *
 * @example
 * const { text, images } = buildMindmapFlashcardSourceWithImages({ title, data });
 */
export function buildMindmapFlashcardSourceWithImages({
  title,
  data,
}: BuildMindmapFlashcardSourceInput): MindmapFlashcardSource {
  const graph = parseMindmapGraph(data ?? null);
  // serializeMindmapSelection reads cross-edge state from `edge.data.cross`, so
  // persisted edges must pass through toEdge before the tree walk.
  const edges = graph.edges.map(toEdge);
  const { nodes, images } = withImagePlaceholders(graph);
  const outline = serializeMindmapSelection(
    nodes,
    edges,
    nodes.map((node) => node.id),
  );
  const crossLines = crossConnectionLines(nodes, edges);
  const related =
    crossLines.length > 0
      ? ["Related connections:", ...crossLines].join("\n")
      : "";

  const sourceText = [`Title: ${title}`, outline, related]
    .filter((part) => part.trim().length > 0)
    .join("\n\n");

  if (sourceText.length <= LIMITS.flashcardAiMaxInput) {
    return { text: sourceText, images };
  }

  return {
    text: sourceText.slice(0, LIMITS.flashcardAiMaxInput).trimEnd(),
    images,
  };
}

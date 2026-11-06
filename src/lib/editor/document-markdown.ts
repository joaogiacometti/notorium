import type { JSONContent } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import { documentFromJSON, type RichTextDocument } from "@/lib/editor/document";
import { buildDocumentExtensions } from "@/lib/editor/document-extensions";

let manager: MarkdownManager | undefined;
function markdownManager(): MarkdownManager {
  manager ??= new MarkdownManager({ extensions: buildDocumentExtensions() });
  return manager;
}

/**
 * Parse CommonMark with the document schema's own extensions. Markdown is an
 * exchange format (model text, clipboard); stored documents stay native JSON.
 * Blank lines are separators, not empty paragraphs, and soft line breaks are
 * spaces, as CommonMark renders them.
 *
 * @example
 * documentFromMarkdown("- a\n  $$x^2$$\n- b"); // bulletList with blockMath in the first item
 */
export function documentFromMarkdown(markdown: string): RichTextDocument {
  return documentFromJSON({
    type: "doc",
    content: normalizeBlocks(markdownManager().parse(markdown).content ?? []),
  });
}

// List items must start with a paragraph, even an empty one.
function normalizeBlocks(nodes: JSONContent[], item = false): JSONContent[] {
  const blocks = nodes
    .map(normalizeNode)
    .filter(
      (node, index) =>
        (item && index === 0) ||
        node.type !== "paragraph" ||
        node.content?.length,
    );
  return blocks.length ? blocks : [{ type: "paragraph" }];
}

function normalizeNode(node: JSONContent): JSONContent {
  if (node.type === "text")
    return { ...node, text: node.text?.replaceAll(/\s*\n\s*/g, " ") };
  if (!node.content || node.type === "codeBlock") return node;
  const blocks = node.content.some((child) => child.type === "paragraph");
  return {
    ...node,
    content: blocks
      ? normalizeBlocks(
          node.content,
          node.type === "listItem" || node.type === "taskItem",
        )
      : node.content.map(normalizeNode),
  };
}

// Tiptap escapes Markdown syntax and writes `&`, `<`, and `>` as entities.
// Text `$` must be escaped too, or literal dollars reparse as math; `&` stays
// readable unless it would read back as an entity.
const DOLLAR = "\uE000";
const AMPERSAND = "\uE001";

/**
 * Serialize with the schema's own Markdown renderers; math is `$...$` and
 * `$$...$$`, which `documentFromMarkdown` reads back. Callers redact images
 * whose sources must not leave the app.
 *
 * @example
 * documentToMarkdown(document); // "- a\n- b"
 */
export function documentToMarkdown(value: RichTextDocument): string {
  return markdownManager()
    .serialize({
      type: "doc",
      content: value.content.flatMap(flattenNestedTables).map(escapeText),
    })
    .replaceAll(DOLLAR, "\\$")
    .replaceAll(new RegExp(`${AMPERSAND}(?=#?\\w+;)`, "g"), "\\&")
    .replaceAll(AMPERSAND, "&")
    .trim();
}

function escapeText(node: JSONContent): JSONContent {
  if (node.type === "codeBlock") return node;
  if (node.type === "text")
    return node.marks?.some((mark) => mark.type === "code")
      ? node
      : {
          ...node,
          text: node.text?.replaceAll("$", DOLLAR).replaceAll("&", AMPERSAND),
        };
  return node.content
    ? { ...node, content: node.content.map(escapeText) }
    : node;
}

// Markdown tables cannot nest, so such a table becomes its cells' blocks.
function flattenNestedTables(node: JSONContent): JSONContent[] {
  if (node.type !== "table" || !hasNestedTable(node))
    return node.content
      ? [{ ...node, content: node.content.flatMap(flattenNestedTables) }]
      : [node];
  return (node.content ?? [])
    .flatMap((row) => row.content ?? [])
    .flatMap((cell) => cell.content ?? [])
    .flatMap(flattenNestedTables);
}

function hasNestedTable(table: JSONContent): boolean {
  return (table.content ?? []).some((row) =>
    row.content?.some((cell) =>
      cell.content?.some((child) => child.type === "table"),
    ),
  );
}

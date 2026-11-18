import type { JSONContent } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import {
  documentFromJSON,
  documentSchema,
  type RichTextDocument,
} from "@/lib/editor/document";
import {
  buildDocumentExtensions,
  HEADING_LEVELS,
} from "@/lib/editor/document-extensions";

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

// Blank lines are dropped, and list items must start with a paragraph.
function normalizeBlocks(nodes: JSONContent[], item = false): JSONContent[] {
  const blocks = splitBlocks(nodes)
    .map(normalizeNode)
    .filter(
      (node) =>
        node.type !== "paragraph" ||
        node.content?.some(
          (child) => child.type !== "text" || child.text?.trim(),
        ),
    );
  if (item ? blocks[0]?.type !== "paragraph" : !blocks.length)
    blocks.unshift({ type: "paragraph" });
  return blocks;
}

// Marked can leave inline content beside a block (`- $$x$$ tail`), and a
// mid-line `$$...$$` arrives as blockMath inside a paragraph or heading (see
// tiptap-math-extensions). Both become sibling blocks.
function splitBlocks(nodes: JSONContent[]): JSONContent[] {
  const blocks: JSONContent[] = [];
  let open: JSONContent[] | undefined;
  const add = (node: JSONContent, shell: JSONContent) => {
    if (!documentSchema().nodes[node.type ?? ""]?.isInline) {
      blocks.push(node);
      open = undefined;
      return;
    }
    if (!open) {
      open = [];
      blocks.push({ ...shell, content: open });
    }
    open.push(node);
  };
  for (const node of nodes) {
    if (node.type !== "paragraph" && node.type !== "heading") {
      add(node, { type: "paragraph" });
      continue;
    }
    open = undefined;
    if (!node.content?.length) blocks.push(node);
    for (const child of node.content ?? []) add(child, node);
    open = undefined;
  }
  return blocks;
}

function normalizeNode(node: JSONContent): JSONContent {
  // Markdown allows six heading levels; deeper ones read as paragraphs.
  if (
    node.type === "heading" &&
    !(HEADING_LEVELS as readonly unknown[]).includes(node.attrs?.level)
  )
    return normalizeNode({ type: "paragraph", content: node.content });
  if (node.type === "text")
    return { ...node, text: node.text?.replaceAll(/\s*\n\s*/g, " ") };
  if (!node.content || node.type === "codeBlock") return node;
  return {
    ...node,
    content: documentSchema().nodes[node.type ?? ""]?.isTextblock
      ? node.content.map(normalizeNode)
      : normalizeBlocks(
          node.content,
          node.type === "listItem" || node.type === "taskItem",
        ),
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

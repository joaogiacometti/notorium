import { getSchema, type JSONContent } from "@tiptap/core";
import { isAllowedUri } from "@tiptap/extension-link";
import { z } from "zod";
import { buildDocumentExtensions } from "@/lib/editor/document-extensions";

export interface RichTextDocument {
  version: 1;
  type: "doc";
  content: JSONContent[];
}

export function emptyDocument(): RichTextDocument {
  return { version: 1, type: "doc", content: [{ type: "paragraph" }] };
}

let schema: ReturnType<typeof getSchema> | undefined;
export function documentSchema() {
  schema ??= getSchema(buildDocumentExtensions());
  return schema;
}

/** Convert native editor JSON; transient editor document attributes are excluded. */
export function documentFromJSON(value: JSONContent): RichTextDocument {
  // ProseMirror attributes may have null prototypes. Server Actions require
  // ordinary JSON objects, so materialize the JSON representation at this edge.
  const content: JSONContent[] = JSON.parse(
    JSON.stringify(value.content ?? [{ type: "paragraph" }]),
  );
  return { version: 1, type: "doc", content };
}

function validateDocumentShape(value: unknown): value is RichTextDocument {
  if (!value || typeof value !== "object") return false;
  const root = value as RichTextDocument;
  if (root.version !== 1 || root.type !== "doc" || !Array.isArray(root.content))
    return false;
  if (
    Object.keys(root).some(
      (key) => !["version", "type", "content"].includes(key),
    )
  )
    return false;
  const model = documentSchema();
  const pending = root.content.map((node) => ({ node, depth: 1 }));
  let count = 0;
  while (pending.length) {
    const entry = pending.pop();
    if (!entry) break;
    const { node, depth } = entry;
    if (++count > 30_000 || depth > 50 || !node || typeof node !== "object")
      return false;
    const spec = node.type ? model.nodes[node.type]?.spec : undefined;
    if (!spec || node.type === "doc") return false;
    if (
      Object.keys(node).some(
        (key) => !["type", "attrs", "content", "marks", "text"].includes(key),
      )
    )
      return false;
    if (
      node.attrs &&
      Object.keys(node.attrs).some((key) => !(key in (spec.attrs ?? {})))
    )
      return false;
    if (!safeAttributes(node.attrs)) return false;
    for (const mark of node.marks ?? []) {
      const markSpec = model.marks[mark.type]?.spec;
      if (
        !markSpec ||
        Object.keys(mark).some((key) => !["type", "attrs"].includes(key))
      )
        return false;
      if (
        mark.attrs &&
        Object.keys(mark.attrs).some((key) => !(key in (markSpec.attrs ?? {})))
      )
        return false;
      if (!safeAttributes(mark.attrs)) return false;
      if (
        mark.type === "link" &&
        !(typeof mark.attrs?.href === "string" && isAllowedUri(mark.attrs.href))
      )
        return false;
    }
    if (
      ["inlineMath", "blockMath"].includes(node.type ?? "") &&
      typeof node.attrs?.latex !== "string"
    )
      return false;
    if (node.type === "noteLink" && typeof node.attrs?.label !== "string")
      return false;
    if (
      node.type === "taskItem" &&
      node.attrs?.checked !== undefined &&
      typeof node.attrs.checked !== "boolean"
    )
      return false;
    if (
      ["tableCell", "tableHeader"].includes(node.type ?? "") &&
      ["colspan", "rowspan"].some(
        (key) =>
          node.attrs?.[key] !== undefined &&
          (!Number.isInteger(node.attrs[key]) ||
            node.attrs[key] < 1 ||
            node.attrs[key] > 1000),
      )
    )
      return false;
    if (node.type === "image" && !safeUrl(node.attrs?.src)) return false;
    if (node.type === "heading" && ![1, 2, 3].includes(node.attrs?.level))
      return false;
    if (
      node.type === "noteLink" &&
      (typeof node.attrs?.noteId !== "string" || node.attrs.noteId.length > 100)
    )
      return false;
    pending.push(
      ...(node.content ?? []).map((child) => ({
        node: child,
        depth: depth + 1,
      })),
    );
  }
  try {
    model.nodeFromJSON(root).check();
    return JSON.stringify(root).length <= 2_000_000;
  } catch {
    return false;
  }
}

function safeAttributes(attrs: JSONContent["attrs"]): boolean {
  return (
    !attrs ||
    Object.entries(attrs).every(([key, value]) => {
      if (
        value === null ||
        typeof value === "string" ||
        typeof value === "boolean"
      )
        return true;
      if (typeof value === "number") return Number.isFinite(value);
      return (
        key === "colwidth" &&
        Array.isArray(value) &&
        value.length <= 1000 &&
        value.every((width) => Number.isFinite(width) && width >= 0)
      );
    })
  );
}

function safeUrl(value: unknown): boolean {
  return typeof value === "string" && /^(https?:\/\/|\/(?!\/))/i.test(value);
}

function validateDocument(value: unknown): value is RichTextDocument {
  try {
    return validateDocumentShape(value);
  } catch {
    return false;
  }
}

export const richTextDocumentSchema = z.custom<RichTextDocument>(
  validateDocument,
  {
    message: "Expected a valid version 1 rich-text document",
    abort: true,
  },
);

export function documentToNode(value: RichTextDocument) {
  return documentSchema().nodeFromJSON(value);
}

export function documentNodes(value: RichTextDocument): JSONContent[] {
  const result: JSONContent[] = [];
  const visit = (node: JSONContent) => {
    result.push(node);
    node.content?.forEach(visit);
  };
  value.content.forEach(visit);
  return result;
}

export function documentText(value: RichTextDocument): string {
  function text(node: JSONContent): string {
    if (node.type === "text") return node.text ?? "";
    if (node.type === "inlineMath" || node.type === "blockMath")
      return ` ${node.attrs?.latex ?? ""} `;
    if (node.type === "noteLink") return node.attrs?.label ?? "";
    if (node.type === "hardBreak") return " ";
    const result = (node.content ?? []).map(text).join("");
    return [
      "paragraph",
      "heading",
      "listItem",
      "taskItem",
      "tableCell",
      "tableHeader",
      "codeBlock",
    ].includes(node.type ?? "")
      ? `${result} `
      : result;
  }
  return value.content.map(text).join("").replaceAll(/\s+/g, " ").trim();
}

/** Count authored characters without markup overhead or whitespace collapsing. */
export function documentCharacterCount(value: RichTextDocument): number {
  return documentNodes(value).reduce(
    (count, node) =>
      count +
      (
        node.text ??
        (node.type === "noteLink"
          ? node.attrs?.label
          : node.type === "inlineMath" || node.type === "blockMath"
            ? node.attrs?.latex
            : "") ??
        ""
      ).length,
    0,
  );
}

export function documentHasContent(value: RichTextDocument): boolean {
  return (
    documentText(value).length > 0 ||
    documentNodes(value).some((node) => node.type === "image")
  );
}

export function documentsEqual(
  left: RichTextDocument,
  right: RichTextDocument,
): boolean {
  return documentSchema()
    .nodeFromJSON(left)
    .eq(documentSchema().nodeFromJSON(right));
}

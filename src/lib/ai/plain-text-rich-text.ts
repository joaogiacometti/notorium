import type { JSONContent } from "@tiptap/core";
import { documentFromJSON, type RichTextDocument } from "@/lib/editor/document";
import {
  normalizeOverEscapedLatex,
  splitDollarMath,
} from "@/lib/math/dollar-math";

export function normalizeLine(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim();
}

/** Parse the assistant's text directly into native editor nodes. */
export function plainTextToDocument(value: string): RichTextDocument {
  const nodes: JSONContent[] = [];
  let cursor = 0;
  const code = /```([A-Za-z0-9_-]*)\n([\s\S]*?)```/g;
  for (const match of value.matchAll(code)) {
    nodes.push(...textBlocks(value.slice(cursor, match.index)));
    nodes.push({
      type: "codeBlock",
      attrs: { language: match[1] || "plaintext" },
      content: match[2].trimEnd()
        ? [{ type: "text", text: match[2].trimEnd() }]
        : [],
    });
    cursor = match.index + match[0].length;
  }
  nodes.push(...textBlocks(value.slice(cursor)));
  return documentFromJSON({
    type: "doc",
    content: nodes.length ? nodes : [{ type: "paragraph" }],
  });
}

function textBlocks(value: string): JSONContent[] {
  return value
    .replaceAll("\r\n", "\n")
    .split(/\n\s*\n/)
    .flatMap((block) => {
      const lines = block.split("\n").map(normalizeLine).filter(Boolean);
      if (!lines.length) return [];
      const bullet = lines.every((line) => /^[-*]\s+/.test(line));
      const ordered = lines.every((line) => /^\d+\.\s+/.test(line));
      if (bullet || ordered)
        return [
          {
            type: bullet ? "bulletList" : "orderedList",
            content: lines.map((line) => ({
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: inlineNodes(
                    line.replace(bullet ? /^[-*]\s+/ : /^\d+\.\s+/, ""),
                  ),
                },
              ],
            })),
          },
        ];
      const text = lines.join(" ");
      const heading = /^(#{1,3})\s+([\s\S]+)$/.exec(text);
      if (heading)
        return [
          {
            type: "heading",
            attrs: { level: heading[1].length },
            content: inlineNodes(heading[2]),
          },
        ];
      const content = inlineNodes(text);
      const result: JSONContent[] = [];
      let paragraph: JSONContent[] = [];
      for (const node of content) {
        if (node.type === "blockMath") {
          if (paragraph.length)
            result.push({ type: "paragraph", content: paragraph });
          paragraph = [];
          result.push(node);
        } else paragraph.push(node);
      }
      if (paragraph.length)
        result.push({ type: "paragraph", content: paragraph });
      return result;
    });
}

/** Code is isolated before math, so literal backslashes and dollar signs survive. */
export function inlineNodes(value: string): JSONContent[] {
  const result: JSONContent[] = [];
  let cursor = 0;
  for (const match of value.matchAll(/`([^`\n]+)`|<code>([\s\S]*?)<\/code>/g)) {
    result.push(...mathNodes(value.slice(cursor, match.index)));
    result.push({
      type: "text",
      text: match[1] ?? match[2],
      marks: [{ type: "code" }],
    });
    cursor = match.index + match[0].length;
  }
  result.push(...mathNodes(value.slice(cursor)));
  return result;
}

function mathNodes(value: string): JSONContent[] {
  return splitDollarMath(normalizeOverEscapedLatex(value)).flatMap((part) => {
    if (part.kind !== "text")
      return [
        {
          type: part.display ? "blockMath" : "inlineMath",
          attrs: { latex: part.latex },
        },
      ];
    return markedText(part.text);
  });
}

function markedText(value: string): JSONContent[] {
  const result: JSONContent[] = [];
  let cursor = 0;
  for (const match of value.matchAll(
    /\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~/g,
  )) {
    if (match.index > cursor)
      result.push({ type: "text", text: value.slice(cursor, match.index) });
    result.push({
      type: "text",
      text: match[1] ?? match[2] ?? match[3],
      marks: [{ type: match[1] ? "bold" : match[2] ? "italic" : "strike" }],
    });
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length)
    result.push({ type: "text", text: value.slice(cursor) });
  return result;
}

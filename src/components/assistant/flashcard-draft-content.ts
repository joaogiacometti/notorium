import type { JSONContent } from "@tiptap/core";
import DOMPurify from "dompurify";
import {
  inlineNodes,
  plainTextToDocument,
} from "@/lib/ai/plain-text-rich-text";
import {
  documentFromJSON,
  documentNodes,
  documentSchema,
  type RichTextDocument,
  richTextDocumentSchema,
} from "@/lib/editor/document";
import { documentFromHtml } from "@/lib/editor/document-html";
import { normalizeOverEscapedLatex } from "@/lib/math/dollar-math";
import { MATH_NODE_SELECTOR, readMathNode } from "@/lib/math/math-nodes";

/** Import untrusted assistant HTML once; original images remain native nodes. */
export function restoreDraftReplacement(
  replacement: string,
  original: RichTextDocument,
): RichTextDocument {
  const images = documentNodes(original).filter(
    (node) => node.type === "image",
  );
  const latex = normalizeOverEscapedLatex(replacement);
  const parsed = /<\/?[a-z][^>]*>/i.test(latex)
    ? importAssistantHtml(latex)
    : plainTextToDocument(latex);
  const used = new Set<number>();
  function restore(node: JSONContent): JSONContent[] {
    if (node.type === "text") {
      const parts: JSONContent[] = [];
      let cursor = 0;
      for (const match of (node.text ?? "").matchAll(/\{\{IMAGE_(\d+)\}\}/g)) {
        if (match.index > cursor)
          parts.push({ ...node, text: node.text?.slice(cursor, match.index) });
        const index = Number(match[1]);
        if (!images[index] || used.has(index))
          throw new Error("Invalid or duplicate image placeholder");
        parts.push(images[index]);
        used.add(index);
        cursor = match.index + match[0].length;
      }
      if (cursor < (node.text?.length ?? 0))
        parts.push({ ...node, text: node.text?.slice(cursor) });
      return parts;
    }
    if (!node.content) return [node];
    const children = node.content.flatMap(restore);
    if (node.type !== "paragraph") return [{ ...node, content: children }];
    const result: JSONContent[] = [];
    let inline: JSONContent[] = [];
    for (const child of children) {
      if (child.type === "image" || child.type === "blockMath") {
        if (inline.length) result.push({ type: "paragraph", content: inline });
        inline = [];
        result.push(child);
      } else inline.push(child);
    }
    if (inline.length || !result.length)
      result.push({ type: "paragraph", content: inline });
    return result;
  }
  const content = parsed.content.flatMap(restore);
  content.push(...images.filter((_, index) => !used.has(index)));
  return richTextDocumentSchema.parse(
    documentFromJSON({ type: "doc", content }),
  );
}

function importAssistantHtml(html: string): RichTextDocument {
  const template = document.createElement("template");
  template.innerHTML = DOMPurify.sanitize(html, {
    FORBID_TAGS: ["img", "script", "style", "iframe", "object"],
  });
  for (const math of template.content.querySelectorAll(MATH_NODE_SELECTOR)) {
    const latex =
      readMathNode(math).latex.trim() ||
      (math.textContent ?? "")
        .trim()
        .replace(/^\$+|\$+$/g, "")
        .trim();
    if (!latex) {
      math.remove();
      continue;
    }
    math.setAttribute("data-latex", latex);
    math.replaceChildren();
  }
  const walker = document.createTreeWalker(
    template.content,
    NodeFilter.SHOW_TEXT,
  );
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  for (const text of texts) {
    if (
      !text.textContent?.includes("$") ||
      text.parentElement?.closest(`pre, code, ${MATH_NODE_SELECTOR}`)
    )
      continue;
    const nodes = inlineNodes(text.textContent);
    const fragment = document.createDocumentFragment();
    // The DOM exists only at this external HTML boundary.
    for (const json of nodes) {
      const node = documentSchema().nodeFromJSON(json);
      if (node.isText)
        fragment.append(document.createTextNode(node.text ?? ""));
      else {
        const math = document.createElement(
          node.type.name === "blockMath" ? "div" : "span",
        );
        math.dataset.type =
          node.type.name === "blockMath" ? "block-math" : "inline-math";
        math.dataset.latex = node.attrs.latex;
        fragment.append(math);
      }
    }
    const parent = text.parentElement;
    if (
      parent?.tagName === "P" &&
      parent.childNodes.length === 1 &&
      nodes.some((node) => node.type === "blockMath")
    )
      parent.replaceWith(fragment);
    else text.replaceWith(fragment);
  }
  return documentFromHtml(template.innerHTML);
}

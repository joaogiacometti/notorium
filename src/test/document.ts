import { createRequire } from "node:module";
import {
  documentHasContent,
  type RichTextDocument,
} from "@/lib/editor/document";
import { documentFromHtml, documentToHtml } from "@/lib/editor/document-html";

/** Legacy-looking fixtures enter tests through the same editor import boundary. */
export function testDocument(
  html: string | RichTextDocument,
): RichTextDocument {
  if (typeof html !== "string") return html;
  if (typeof window !== "undefined") return documentFromHtml(html);
  const { JSDOM } = createRequire(`${process.cwd()}/package.json`)(
    "jsdom",
  ) as typeof import("jsdom");
  const dom = new JSDOM("<!doctype html>");
  const previous = { window: globalThis.window, document: globalThis.document };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
  });
  try {
    return documentFromHtml(html);
  } finally {
    Object.assign(globalThis, previous);
    dom.window.close();
  }
}

export function testDocumentHtml(value: RichTextDocument): string {
  return documentHasContent(value) ? documentToHtml(value) : "";
}

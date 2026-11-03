import { generateJSON } from "@tiptap/core";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import { documentFromJSON, type RichTextDocument } from "@/lib/editor/document";
import { buildDocumentExtensions } from "@/lib/editor/document-extensions";

/** External HTML input only; persisted and internal values are native JSON. */
export function documentFromHtml(html: string): RichTextDocument {
  return documentFromJSON(generateJSON(html, buildDocumentExtensions()));
}

/** HTML output only, for clipboard exchange and model requests. */
export function documentToHtml(value: RichTextDocument): string {
  return renderToHTMLString({
    extensions: buildDocumentExtensions(),
    content: value,
  });
}

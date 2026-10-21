import { generateHTML, generateJSON, getSchema } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import { tiptapLowlight } from "@/lib/editor/tiptap-lowlight";
import { buildMathExtensions } from "@/lib/editor/tiptap-math-extensions";
import { buildTableExtensions } from "@/lib/editor/tiptap-table-extensions";

/** Read-only editor schema, also used to normalize proposed rich text.
 * @example const extensions = buildRichTextReviewExtensions();
 */
export function buildRichTextReviewExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
      trailingNode: false,
    }),
    CodeBlockLowlight.configure({
      defaultLanguage: "plaintext",
      lowlight: tiptapLowlight,
    }),
    Highlight,
    Image.configure({ allowBase64: false }),
    TaskList,
    TaskItem.configure({ nested: true }),
    ...buildTableExtensions(),
    ...buildMathExtensions(),
  ];
}

/** Parse through the supported schema so tool output cannot add arbitrary HTML.
 * @example normalizeReviewedRichText("<p>Hello</p>");
 */
export function normalizeReviewedRichText(html: string): string {
  const extensions = buildRichTextReviewExtensions();
  return generateHTML(generateJSON(html, extensions), extensions);
}

/** Parse rich text for structural comparison without flattening math or images.
 * @example parseReviewedRichText("<p>Hello</p>").textContent;
 */
export function parseReviewedRichText(html: string) {
  const extensions = buildRichTextReviewExtensions();
  return getSchema(extensions).nodeFromJSON(generateJSON(html, extensions));
}

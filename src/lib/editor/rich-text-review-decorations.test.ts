// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { documentToNode as parseDocument } from "@/lib/editor/document";
import { buildDocumentExtensions } from "@/lib/editor/document-extensions";
import {
  buildReviewDecorations,
  buildRichTextReviewExtension,
} from "@/lib/editor/rich-text-review-decorations";

import { testDocument } from "@/test/document";

const parseReviewedRichText = (html: string) =>
  parseDocument(testDocument(html));

describe("rich text review decorations", () => {
  it("leaves unchanged documents undecorated", () => {
    const document = parseReviewedRichText("<p>Same</p>");
    expect(buildReviewDecorations(document, document).find()).toHaveLength(0);
  });

  it("decorates replacement text while leaving serialized content clean", () => {
    const original = parseReviewedRichText("<p>The long answer.</p>");
    const editor = new Editor({
      extensions: [
        ...buildDocumentExtensions(),
        buildRichTextReviewExtension(original),
      ],
      content: "<p>The short answer.</p>",
      editable: false,
    });
    expect(editor.view.dom.textContent).toContain("long");
    expect(editor.view.dom.textContent).toContain("short");
    expect(editor.getHTML()).toBe("<p>The short answer.</p>");
    editor.destroy();
  });

  it.each([
    ["<p>Old</p><p>Removed</p>", "<p>New</p>"],
    ["<p></p>", "<ul><li><p>Added</p></li></ul>"],
    [
      '<p><span data-type="inline-math" data-latex="x"></span></p>',
      '<p><span data-type="inline-math" data-latex="y"></span></p>',
    ],
    ["<p><strong>Same</strong></p>", "<p>Same</p>"],
  ])(
    "handles structural changes without corrupting the document",
    (before, after) => {
      const editor = new Editor({
        extensions: [
          ...buildDocumentExtensions(),
          buildRichTextReviewExtension(parseReviewedRichText(before)),
        ],
        content: after,
        editable: false,
      });
      expect(editor.getJSON()).toEqual(parseReviewedRichText(after).toJSON());
      editor.destroy();
    },
  );
});

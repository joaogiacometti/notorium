import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { trimDisplayParagraphs } from "@/lib/editor/trim-display-paragraphs";

describe("trimDisplayParagraphs", () => {
  it("removes only trailing blank paragraphs without mutating the document", () => {
    const blank: JSONContent = { type: "paragraph" };
    const text: JSONContent = {
      type: "paragraph",
      content: [{ type: "text", text: "Content" }],
    };
    const document: JSONContent = {
      type: "doc",
      content: [blank, text, blank, text, blank],
    };
    expect(trimDisplayParagraphs(document).content).toEqual([
      blank,
      text,
      blank,
      text,
    ]);
    expect(document.content).toHaveLength(5);
  });

  it.each(["image", "inlineMath"])(
    "preserves meaningful trailing %s content",
    (type) => {
      const block: JSONContent = {
        type: type === "image" ? "image" : "paragraph",
        ...(type === "image"
          ? { attrs: { src: "https://example.com/image.png" } }
          : { content: [{ type, attrs: { latex: "x^2" } }] }),
      };
      const document: JSONContent = { type: "doc", content: [block] };
      expect(trimDisplayParagraphs(document).content).toEqual([block]);
    },
  );

  it("accepts empty documents and trims whitespace and line breaks", () => {
    expect(trimDisplayParagraphs({ type: "doc" }).content).toEqual([]);
    expect(
      trimDisplayParagraphs({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: " \u00a0\n" },
              { type: "hardBreak" },
            ],
          },
        ],
      }).content,
    ).toEqual([]);
  });
});

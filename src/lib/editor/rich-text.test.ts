import { describe, expect, it } from "vitest";
import {
  getRichTextExcerpt,
  hasRichTextContent,
  normalizeRichTextForRendering,
  richTextToPlainText,
} from "@/lib/editor/rich-text";

describe("richTextToPlainText", () => {
  it("removes html tags and normalizes whitespace", () => {
    expect(richTextToPlainText("<p>Hello <strong>world</strong></p>")).toBe(
      "Hello world",
    );
  });

  it("converts non-breaking spaces", () => {
    expect(richTextToPlainText("<p>Hello&nbsp;world</p>")).toBe("Hello world");
  });
});

describe("hasRichTextContent", () => {
  it("returns false for empty html", () => {
    expect(hasRichTextContent("<p> </p>")).toBe(false);
  });

  it("returns true for text content", () => {
    expect(hasRichTextContent("<p>Card front</p>")).toBe(true);
  });

  it("returns true for image content", () => {
    expect(
      hasRichTextContent('<p><img src="https://img.test/a.png"></p>'),
    ).toBe(true);
  });
});

describe("getRichTextExcerpt", () => {
  it("returns plain text when below max length", () => {
    expect(getRichTextExcerpt("<p>Card front</p>", 20)).toBe("Card front");
  });

  it("truncates and appends ellipsis", () => {
    expect(getRichTextExcerpt("<p>123456789</p>", 5)).toBe("12345...");
  });
});

describe("normalizeRichTextForRendering", () => {
  it("converts image URL paragraphs into image markup", async () => {
    const result = await normalizeRichTextForRendering(
      "<p>https://imgur.com/abc123</p>",
      async (value) =>
        value === "https://imgur.com/abc123"
          ? "https://i.imgur.com/abc123.png"
          : null,
    );

    expect(result).toBe('<img src="https://i.imgur.com/abc123.png" alt="">');
  });

  it("preserves existing image markup", async () => {
    const result = await normalizeRichTextForRendering(
      '<p><img src="https://img.test/a.png"></p>',
      async () => "https://i.imgur.com/abc123.png",
    );

    expect(result).toBe('<p><img src="https://img.test/a.png"></p>');
  });

  it("leaves mixed-content paragraphs unchanged", async () => {
    const result = await normalizeRichTextForRendering(
      "<p>See https://imgur.com/abc123 later</p>",
      async () => "https://i.imgur.com/abc123.png",
    );

    expect(result).toBe("<p>See https://imgur.com/abc123 later</p>");
  });
});

import { describe, expect, it } from "vitest";
import {
  getRichTextExcerpt,
  hasRichTextContent,
  richTextToPlainText,
} from "@/lib/rich-text";

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

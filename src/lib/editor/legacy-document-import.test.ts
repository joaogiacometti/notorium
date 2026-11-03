// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { documentText } from "@/lib/editor/document";
import { getInternalAttachmentPathnames } from "@/lib/editor/document-content";
import { importLegacyDocument } from "@/lib/editor/legacy-document-import";

const BLOB = "/api/attachments/blob?pathname=notorium/notes/u/a.png";
const PATHNAME = "notorium/notes/u/a.png";

describe("importLegacyDocument standalone image URLs", () => {
  it.each([
    ["an internal URL", `<p>${BLOB}</p>`, BLOB],
    ["an internal autolink", `<p><a href="${BLOB}">${BLOB}</a></p>`, BLOB],
    [
      "an escaped internal URL",
      "<p>/api/attachments/blob?a=1&amp;pathname=x.png</p>",
      "/api/attachments/blob?a=1&pathname=x.png",
    ],
    [
      "an external image URL",
      "<p>https://e.com/a.png</p>",
      "https://e.com/a.png",
    ],
  ])("converts %s to an image node", (_, html, src) => {
    const { content } = importLegacyDocument(html);

    expect(content).toHaveLength(1);
    expect(content[0]).toMatchObject({ type: "image", attrs: { src } });
  });

  it("keeps the attachment reference of a URL inside a list item", () => {
    const value = importLegacyDocument(`<ul><li><p>${BLOB}</p></li></ul>`);

    expect(getInternalAttachmentPathnames(value)).toEqual([PATHNAME]);
  });

  it.each([
    ["surrounding text", `<p>see ${BLOB}</p>`],
    ["a non-image external URL", "<p>https://e.com/page</p>"],
    ["a labelled link", '<p><a href="https://e.com/a.png">Diagram</a></p>'],
  ])("leaves a paragraph with %s as text", (_, html) => {
    const { content } = importLegacyDocument(html);

    expect(content[0]?.type).toBe("paragraph");
  });
});

describe("importLegacyDocument whitespace", () => {
  it("accepts indentation the parser strips after a line break", () => {
    const value = importLegacyDocument("<p>first<br>     - second</p>");

    expect(documentText(value)).toBe("first - second");
  });

  it("accepts a trailing space the parser strips from a block", () => {
    const value = importLegacyDocument(
      "<ul><li><p>first </p></li><li><p>second</p></li></ul>",
    );

    expect(documentText(value)).toBe("first second");
  });

  it("still refuses a conversion that loses text", () => {
    expect(() =>
      importLegacyDocument("<p>kept<custom>lost</custom></p>"),
    ).toThrow();
  });
});

describe("importLegacyDocument formatting", () => {
  it("accepts formatting that only wraps whitespace", () => {
    const value = importLegacyDocument(
      "<p>text<br><strong><em> </em></strong><br></p>",
    );

    expect(documentText(value)).toBe("text");
  });

  it("accepts adjacent formatted runs that merge", () => {
    const value = importLegacyDocument(
      "<p><strong>one</strong><strong>two</strong></p>",
    );

    expect(documentText(value)).toBe("onetwo");
  });

  it("keeps formatting on a line break followed by text", () => {
    const { content } = importLegacyDocument(
      "<p>a<strong><br>bold</strong></p>",
    );

    expect(content[0]?.content?.at(-1)).toMatchObject({
      text: "bold",
      marks: [{ type: "bold" }],
    });
  });

  it("still refuses a conversion that drops formatting from text", () => {
    expect(() =>
      importLegacyDocument("<p><code><strong>bold</strong></code></p>"),
    ).toThrow("formatting");
  });
});

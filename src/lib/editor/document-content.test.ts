import { describe, expect, it } from "vitest";
import { documentHasContent, documentText } from "@/lib/editor/document";
import {
  countInternalAttachmentImages,
  documentExcerpt,
  documentUniquenessText,
  getInternalAttachmentPathnames,
} from "@/lib/editor/document-content";
import { testDocument } from "@/test/document";

describe("native document operations", () => {
  it("extracts text, math and note titles without HTML round trips", () => {
    expect(
      documentText(
        testDocument(
          '<p>Area <span data-type="inline-math" data-latex="a &lt; b &gt; 0"></span> and <a data-note-link="" data-note-id="n">Related</a></p>',
        ),
      ),
    ).toBe("Area a < b > 0 and Related");
  });
  it("recognizes text and images, and excludes empty paragraphs", () => {
    expect(documentHasContent(testDocument(""))).toBe(false);
    expect(documentHasContent(testDocument("<p>text</p>"))).toBe(true);
    expect(
      documentHasContent(testDocument('<img src="https://example.com/a.png">')),
    ).toBe(true);
  });
  it("counts rendered attachment occurrences, ignoring mentions and external images", () => {
    const value = testDocument(
      '<img src="/api/attachments/blob?pathname=a.png"><img src="/api/attachments/blob?pathname=a.png"><img src="https://example.com/a.png"><p>/api/attachments/blob?pathname=b.png</p>',
    );
    expect(countInternalAttachmentImages(value)).toBe(2);
    expect(getInternalAttachmentPathnames(value)).toEqual(["a.png"]);
  });
  it("keeps equation content and image sources in duplicate detection", () => {
    expect(
      documentUniquenessText(testDocument("<p><strong>Question</strong></p>")),
    ).toBe(documentUniquenessText(testDocument("<p>Question</p>")));
    expect(
      documentUniquenessText(
        testDocument('<img src="https://example.com/a.png">'),
      ),
    ).toContain("image:https://example.com/a.png");
    expect(
      documentUniquenessText(
        testDocument(
          '<p><span data-type="inline-math" data-latex="a &lt; b"></span></p>',
        ),
      ),
    ).not.toBe(
      documentUniquenessText(
        testDocument(
          '<p><span data-type="inline-math" data-latex="a &lt; c"></span></p>',
        ),
      ),
    );
  });
  it("builds excerpts from native text", () => {
    expect(documentExcerpt(testDocument("<p>Hello world</p>"), 5)).toBe(
      "Hello...",
    );
  });
});

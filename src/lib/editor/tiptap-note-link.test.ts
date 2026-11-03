// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { documentText } from "@/lib/editor/document";
import { documentFromHtml, documentToHtml } from "@/lib/editor/document-html";
import { extractNoteLinkIds } from "@/lib/editor/note-links";

const normalizeReviewedRichText = (html: string) =>
  documentToHtml(documentFromHtml(html));

const LINKED_NOTE =
  '<p>See <a data-note-id="n1" data-note-link="" href="/notes/n1">Cell biology</a> next.</p>';

describe("note links", () => {
  it("survive normalization of reviewed rich text", () => {
    const normalized = normalizeReviewedRichText(LINKED_NOTE);

    expect(extractNoteLinkIds(documentFromHtml(normalized))).toEqual(["n1"]);
    expect(normalized).toContain("Cell biology");
    expect(normalized).toContain('href="/notes/n1"');
  });

  it("do not turn ordinary links into note links", () => {
    const normalized = normalizeReviewedRichText(
      '<p><a href="https://example.com">Site</a></p>',
    );

    expect(extractNoteLinkIds(documentFromHtml(normalized))).toEqual([]);
    expect(normalized).toContain("https://example.com");
  });

  it("read as their title in plain text", () => {
    expect(documentText(documentFromHtml(LINKED_NOTE))).toContain(
      "See Cell biology next",
    );
  });

  it("extract each linked note once", () => {
    const html = `${LINKED_NOTE}${LINKED_NOTE}<p><a data-note-id="n2" data-note-link="">B</a></p>`;

    expect(extractNoteLinkIds(documentFromHtml(html))).toEqual(["n1", "n2"]);
  });

  it("ignore text that only looks like a link attribute", () => {
    expect(
      extractNoteLinkIds(
        documentFromHtml("<p>data-note-id=&quot;n1&quot; in a sentence</p>"),
      ),
    ).toEqual([]);
  });
});

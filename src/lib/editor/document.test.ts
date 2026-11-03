// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  documentFromJSON,
  documentNodes,
  documentsEqual,
  documentText,
  emptyDocument,
  richTextDocumentSchema,
} from "@/lib/editor/document";
import { getInternalAttachmentPathnames } from "@/lib/editor/document-content";
import { documentFromHtml, documentToHtml } from "@/lib/editor/document-html";
import { extractNoteLinkIds } from "@/lib/editor/note-links";

const richHtml =
  '<h2>Study</h2><p><strong>Bold</strong> <em>italic</em> <u>underline</u> <mark>highlight</mark> <a href="https://example.com">source</a> <a data-note-link="" data-note-id="n1" href="/notes/n1">Linked note</a> <span data-type="inline-math" data-latex="a &lt; b"></span></p><div data-type="block-math" data-latex="x^2"></div><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Done</p></li></ul><table><tbody><tr><th><p>Term</p></th><td><p>Value</p></td></tr></tbody></table><pre><code class="language-js">const x = 1;</code></pre><img src="/api/attachments/blob?pathname=private.png" alt="diagram">';

describe("canonical rich-text documents", () => {
  it("imports and preserves supported structure, formatting and references", () => {
    const value = documentFromHtml(richHtml);
    expect(richTextDocumentSchema.safeParse(value).success).toBe(true);
    expect(value.version).toBe(1);
    expect(documentFromHtml(documentToHtml(value))).toEqual(value);
    expect(documentText(value)).toContain("Linked note a < b");
    expect(extractNoteLinkIds(value)).toEqual(["n1"]);
    expect(getInternalAttachmentPathnames(value)).toEqual(["private.png"]);
    expect(
      documentNodes(value).find((node) => node.type === "taskItem")?.attrs
        ?.checked,
    ).toBe(true);
  });

  it("accepts the safe protocols supported by pasted editor links", () => {
    for (const href of [
      "tel:+123",
      "sms:+123",
      "ftp://example.com/file",
      "mailto:mail@example.com",
      "/notes/n1",
    ]) {
      expect(
        richTextDocumentSchema.safeParse(
          documentFromHtml(`<p><a href="${href}">Link</a></p>`),
        ).success,
      ).toBe(true);
    }
  });

  it("rejects HTML writes, unknown versions, nodes, marks and attributes", () => {
    for (const value of [
      richHtml,
      { ...emptyDocument(), version: 2 },
      { ...emptyDocument(), content: [{ type: "unknown" }] },
      {
        ...emptyDocument(),
        content: [{ type: "paragraph", attrs: { onclick: "bad" } }],
      },
      {
        ...emptyDocument(),
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "x", marks: [{ type: "unknown" }] },
            ],
          },
        ],
      },
    ]) {
      expect(richTextDocumentSchema.safeParse(value).success).toBe(false);
    }
  });

  it("rejects unsafe URLs and invalid document structure", () => {
    const image = {
      ...emptyDocument(),
      content: [{ type: "image", attrs: { src: "javascript:alert(1)" } }],
    };
    const invalid = {
      ...emptyDocument(),
      content: [{ type: "text", text: "unwrapped" }],
    };
    expect(richTextDocumentSchema.safeParse(image).success).toBe(false);
    expect(richTextDocumentSchema.safeParse(invalid).success).toBe(false);
    expect(
      richTextDocumentSchema.safeParse({
        ...emptyDocument(),
        content: [{ type: "paragraph", content: "bad" }],
      }).success,
    ).toBe(false);
  });

  it("rejects structured attribute payloads instead of interpreting them as HTML", () => {
    const value = {
      ...emptyDocument(),
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "noteLink",
              attrs: { noteId: "n1", label: ["script", {}, "bad"] },
            },
          ],
        },
      ],
    };
    expect(richTextDocumentSchema.safeParse(value).success).toBe(false);
  });

  it("materializes native attributes as plain JSON for Server Actions", () => {
    const attrs = Object.assign(Object.create(null), {
      noteId: "n1",
      label: "Target",
    });
    const value = documentFromJSON({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "noteLink", attrs }] }],
    });
    const emitted = value.content[0].content?.[0].attrs;
    expect(Object.getPrototypeOf(emitted)).toBe(Object.prototype);
    expect(richTextDocumentSchema.safeParse(value).success).toBe(true);
  });

  it("compares document structure regardless of PostgreSQL JSONB key order", () => {
    const value = documentFromHtml(
      '<p><a data-note-link="" data-note-id="n1">Target</a></p>',
    );
    const reordered = {
      type: value.type,
      content: value.content,
      version: value.version,
    };
    expect(documentsEqual(value, reordered)).toBe(true);
  });

  it("excludes transient title-history attributes from native editor values", () => {
    expect(
      documentFromJSON({
        type: "doc",
        attrs: { documentTitle: "Draft" },
        content: [{ type: "paragraph" }],
      }),
    ).toEqual(emptyDocument());
  });
});

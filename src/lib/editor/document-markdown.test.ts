// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { documentsEqual, type RichTextDocument } from "@/lib/editor/document";
import {
  documentFromMarkdown,
  documentToMarkdown,
} from "@/lib/editor/document-markdown";
import { testDocument } from "@/test/document";

function paragraph(text: string): RichTextDocument {
  return {
    version: 1,
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

describe("document Markdown", () => {
  it("round-trips literal text that looks like Markdown, math, or HTML", () => {
    for (const text of [
      "Costs $5 or $10",
      "R&D and &amp; literally",
      "a < b > c <b>not bold</b>",
      "C:\\temp and \\$",
      "*not italic* _nor_ `code` [link](x) ~~no~~",
    ]) {
      expect(documentFromMarkdown(documentToMarkdown(paragraph(text)))).toEqual(
        paragraph(text),
      );
    }
    expect(documentToMarkdown(paragraph("R&D costs $5"))).toBe(
      "R&D costs \\$5",
    );
  });

  it("round-trips lists with block math, marks, code, tables, and tasks", () => {
    const value = testDocument(
      '<ul><li><p>When <strong>this</strong> holds:</p><div data-type="block-math" data-latex="f\'(a) = \\lim_{h\\to 0} \\frac{f(a+h)-f(a)}{h}"></div></li>' +
        '<li><p>Then <span data-type="inline-math" data-latex="x < y"></span></p><ol><li><p>Nested <code>$x$</code></p></li></ol></li></ul>' +
        '<pre><code class="language-ts">const a = "$x$";</code></pre>' +
        "<table><tbody><tr><th><p>Term</p></th><th><p>Meaning</p></th></tr><tr><td><p>a|b</p></td><td><p><em>Pipe</em></p></td></tr></tbody></table>" +
        '<ul data-type="taskList"><li data-checked="true" data-type="taskItem"><p>Done</p></li></ul>' +
        "<blockquote><p>Quote</p></blockquote><h2>Heading</h2><p>Line one<br>Line two</p>",
    );
    expect(
      documentsEqual(documentFromMarkdown(documentToMarkdown(value)), value),
    ).toBe(true);
  });

  it("writes note links as links to the note", () => {
    const value: RichTextDocument = {
      version: 1,
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "See " },
            { type: "noteLink", attrs: { noteId: "n1", label: "Cells [1]" } },
          ],
        },
      ],
    };
    expect(documentToMarkdown(value)).toMatch(
      /^See \[Cells \\\[1\\\]\]\(\/.+n1\)$/,
    );
  });

  it("flattens a table nested in a cell, which Markdown cannot express", () => {
    const value = testDocument(
      "<table><tbody><tr><th><p>Outer</p></th></tr><tr><td><table><tbody><tr><td><p>Inner</p></td></tr></tbody></table></td></tr></tbody></table>",
    );
    const markdown = documentToMarkdown(value);
    expect(markdown).not.toContain("<br>");
    expect(markdown).toMatch(/^Outer\n\n[\s\S]*\| Inner \|$/);
  });

  it("reads blank lines as separators and soft breaks as spaces", () => {
    expect(documentFromMarkdown("a\nb\n\n\n\n- c\n\n  d")).toEqual(
      testDocument("<p>a b</p><ul><li><p>c</p><p>d</p></li></ul>"),
    );
    expect(documentFromMarkdown("")).toEqual(testDocument("<p></p>"));
  });
});

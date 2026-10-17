// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { richTextToMarkdown } from "@/lib/clipboard/rich-text-markdown";

describe("richTextToMarkdown", () => {
  it("converts inline marks and keeps spaces outside the markers", () => {
    expect(
      richTextToMarkdown(
        "<p><strong>ATP </strong>stores <em>energy</em>, <s>not</s> <code>a`b</code></p>",
      ),
    ).toBe("**ATP** stores *energy*, ~~not~~ ``a`b``");
  });

  it("separates paragraphs, keeps hard breaks, and decodes entities", () => {
    expect(
      richTextToMarkdown(
        "<p>Line one<br>Line two</p><p>a &amp; b &lt;c&gt;</p>",
      ),
    ).toBe("Line one  \nLine two\n\na & b <c>");
  });

  it("converts headings, rules, and blockquotes", () => {
    expect(
      richTextToMarkdown(
        "<h2>Cells</h2><hr><blockquote><p>One</p><p>Two</p></blockquote>",
      ),
    ).toBe("## Cells\n\n---\n\n> One\n> \n> Two");
  });

  it("keeps Tiptap's paragraph-wrapped lists tight", () => {
    expect(
      richTextToMarkdown(
        "<ul><li><p>Parent</p><ul><li><p>Child</p></li></ul></li><li><p>Sibling</p></li></ul>" +
          '<ol start="3"><li><p>Third</p></li><li><p>Fourth</p></li></ol>',
      ),
    ).toBe("-   Parent\n    -   Child\n-   Sibling\n\n3.  Third\n4.  Fourth");
  });

  it("keeps a blank line between paragraphs of one list item", () => {
    expect(
      richTextToMarkdown(
        "<ol><li><p>First</p><p>Second</p><ul><li><p>Nested</p></li></ul></li></ol>",
      ),
    ).toBe("1.  First\n    \n    Second\n    \n    -   Nested");
  });

  it("converts task lists without the checkbox markup", () => {
    expect(
      richTextToMarkdown(
        '<ul data-type="taskList">' +
          '<li data-checked="true" data-type="taskItem"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Done</p></div></li>' +
          '<li data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Todo</p></div></li>' +
          "</ul>",
      ),
    ).toBe("-   [x] Done\n-   [ ] Todo");
  });

  it("converts list items whose text is not wrapped in paragraphs", () => {
    expect(
      richTextToMarkdown("<ul><li>Energy <strong>currency</strong></li></ul>"),
    ).toBe("-   Energy **currency**");
  });

  it("fences code blocks with their language and a safe fence length", () => {
    expect(
      richTextToMarkdown(
        '<pre><code class="language-ts">const a = 1;\n```\n</code></pre>',
      ),
    ).toBe("````ts\nconst a = 1;\n```\n````");
  });

  it("converts tables with the first row as header and escaped pipes", () => {
    expect(
      richTextToMarkdown(
        "<table><tbody>" +
          "<tr><th><p>Term</p></th><th><p>Meaning</p></th></tr>" +
          "<tr><td><p>a|b</p></td><td><p>Pipe</p></td></tr>" +
          "</tbody></table>",
      ),
    ).toBe("| Term | Meaning |\n| --- | --- |\n| a\\|b | Pipe |");
  });

  it("flattens a table nested in a cell instead of repeating its rows", () => {
    expect(
      richTextToMarkdown(
        "<table><tbody>" +
          "<tr><th><p>Outer</p></th></tr>" +
          "<tr><td><table><tbody><tr><td><p>Inner</p></td></tr></tbody></table></td></tr>" +
          "</tbody></table>",
      ),
    ).toBe("Outer\n\nInner");
  });

  it("surfaces inline and block math as LaTeX", () => {
    expect(
      richTextToMarkdown(
        '<p>Area <span data-type="inline-math" data-latex="A = \\pi r^2"></span> here</p>' +
          '<div data-type="block-math" data-latex="F = ma"></div>',
      ),
    ).toBe("Area $A = \\pi r^2$ here\n\n$$F = ma$$");
  });

  it("replaces private uploads with placeholders and keeps public images", () => {
    expect(
      richTextToMarkdown(
        '<img src="/api/attachments/blob?pathname=users%2Fu1%2Fa.webp" alt="">' +
          '<img src="https://example.com/cell.png" alt="Cell">' +
          "<p>https://example.com/atp.jpg</p>",
      ),
    ).toBe(
      "[Image]\n\n![Cell](https://example.com/cell.png)\n\n![](https://example.com/atp.jpg)",
    );
  });

  it("writes links as Markdown links", () => {
    expect(
      richTextToMarkdown(
        '<p><a href="https://example.com/a">Guide</a> and <a href="https://example.com/b">https://example.com/b</a></p>',
      ),
    ).toBe(
      "[Guide](https://example.com/a) and [https://example.com/b](https://example.com/b)",
    );
  });

  it("keeps loose text that is not wrapped in any tag", () => {
    expect(richTextToMarkdown("Plain answer")).toBe("Plain answer");
  });
});

// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { richTextToMarkdown as exportMarkdown } from "@/lib/clipboard/rich-text-markdown";
import { testDocument } from "@/test/document";

const richTextToMarkdown = (html: string) => exportMarkdown(testDocument(html));

describe("richTextToMarkdown", () => {
  it("converts inline marks, links, and math", () => {
    expect(
      richTextToMarkdown(
        '<p><strong>ATP</strong> stores <em>energy</em>, <s>not</s> <code>a`b</code> <a href="https://example.com/a">Guide</a> <span data-type="inline-math" data-latex="A = \\pi r^2"></span></p>',
      ),
    ).toBe(
      "**ATP** stores *energy*, ~~not~~ ``a`b`` [Guide](https://example.com/a) $A = \\pi r^2$",
    );
  });

  it("writes nested lists, code fences, and tables", () => {
    expect(
      richTextToMarkdown(
        "<ul><li><p>Parent</p><ul><li><p>Child</p></li></ul></li></ul>" +
          '<pre><code class="language-ts">const a = 1;</code></pre>' +
          "<table><tbody><tr><th><p>Term</p></th></tr><tr><td><p>a|b</p></td></tr></tbody></table>",
      ),
    ).toBe(
      "- Parent\n  - Child\n\n```ts\nconst a = 1;\n```\n\n\n| Term |\n| ---- |\n| a\\|b |",
    );
  });

  it("replaces private uploads with placeholders and keeps public images", () => {
    expect(
      richTextToMarkdown(
        '<img src="/api/attachments/blob?pathname=users%2Fu1%2Fa.webp" alt="">' +
          '<img src="https://example.com/cell.png" alt="Cell">',
      ),
    ).toBe("(image)\n\n![Cell](https://example.com/cell.png)");
  });
});

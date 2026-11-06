// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { modelMarkdownToDocument } from "@/lib/ai/model-markdown";
import {
  documentNodes,
  documentText,
  richTextDocumentSchema,
} from "@/lib/editor/document";

function mathLatex(markdown: string): string[] {
  return documentNodes(modelMarkdownToDocument(markdown))
    .filter((node) => node.type?.endsWith("Math"))
    .map((node) => node.attrs?.latex);
}

describe("model Markdown import", () => {
  it("builds native paragraphs, lists, headings and marks", () => {
    const value = modelMarkdownToDocument(
      "# Title\n\n**Bold** and *italic*\n\n- First\n- Second\n\n1. Step\n2. Next",
    );
    expect(value.content.map((node) => node.type)).toEqual([
      "heading",
      "paragraph",
      "bulletList",
      "orderedList",
    ]);
    expect(richTextDocumentSchema.safeParse(value).success).toBe(true);
    expect(
      documentNodes(value).find((node) => node.text === "Bold")?.marks,
    ).toEqual([{ type: "bold" }]);
  });

  it("keeps every bullet a list item when a block equation sits between them", () => {
    const value = modelMarkdownToDocument(
      "- When this limit exists:\n$$f'(a) = \\lim_{h\\to 0} \\frac{f(a+h)-f(a)}{h}$$\n- Both one-sided limits must agree\n- E.g. $f(x) = |x|$ at $a = 0$",
    );
    expect(value.content.map((node) => node.type)).toEqual(["bulletList"]);
    const items = value.content[0].content ?? [];
    expect(
      items.map((item) => documentText({ ...value, content: [item] })),
    ).toEqual([
      "When this limit exists: f'(a) = \\lim_{h\\to 0} \\frac{f(a+h)-f(a)}{h}",
      "Both one-sided limits must agree",
      "E.g. f(x) = |x| at a = 0",
    ]);
    expect(items[0].content?.map((node) => node.type)).toEqual([
      "paragraph",
      "blockMath",
    ]);
    expect(richTextDocumentSchema.safeParse(value).success).toBe(true);
  });

  it("reads only numeric ordered lists, with inline formatting in items", () => {
    expect(modelMarkdownToDocument("A. Lincoln was president").content).toEqual(
      [
        {
          type: "paragraph",
          content: [{ type: "text", text: "A. Lincoln was president" }],
        },
      ],
    );
    expect(
      modelMarkdownToDocument("B) $6$").content[0].content?.map(
        (node) => node.type,
      ),
    ).toEqual(["text", "inlineMath"]);
    const list = modelMarkdownToDocument("3. **Bold** `code`\n4. Next");
    expect(list.content[0]).toMatchObject({
      type: "orderedList",
      attrs: { start: 3 },
    });
    expect(
      documentNodes(list).find((node) => node.text === "Bold")?.marks,
    ).toEqual([{ type: "bold" }]);
  });

  it("splits a paragraph around an inline block equation", () => {
    const value = modelMarkdownToDocument("So $$x^2$$ follows");
    expect(value.content.map((node) => node.type)).toEqual([
      "paragraph",
      "blockMath",
      "paragraph",
    ]);
  });

  it("preserves equations with special characters and normalizes overescaping", () => {
    expect(mathLatex("Compare $a < b & c$\n\n$$x^2$$\n\n$\\\\hat y$")).toEqual([
      "a < b & c",
      "x^2",
      "\\hat y",
    ]);
    expect(mathLatex("$\nabla f$ and $\times$")).toEqual([
      "\\nabla f",
      "\\times",
    ]);
  });

  it("keeps code and escaped dollars literal", () => {
    const value = modelMarkdownToDocument(
      "Use `$x$`, pay \\$5 or \\$10\n\n```sh\necho '$x$'\n```",
    );
    expect(
      documentNodes(value).filter((node) => node.type?.endsWith("Math")),
    ).toEqual([]);
    expect(documentText(value)).toBe("Use $x$, pay $5 or $10 echo '$x$'");
    expect(value.content[1]).toEqual({
      type: "codeBlock",
      attrs: { language: "sh" },
      content: [{ type: "text", text: "echo '$x$'" }],
    });
  });

  it("joins soft line breaks and ignores spacer lines", () => {
    const value = modelMarkdownToDocument("Line one\nline two\n\n\n\nNext");
    expect(value.content).toEqual([
      {
        type: "paragraph",
        content: [{ type: "text", text: "Line one line two" }],
      },
      { type: "paragraph", content: [{ type: "text", text: "Next" }] },
    ]);
    expect(modelMarkdownToDocument("  ").content).toEqual([
      { type: "paragraph" },
    ]);
  });

  it("never accepts images, scripts, unsafe links, or unsupported headings", () => {
    const value = modelMarkdownToDocument(
      "![x](https://example.com/x.png)\n\n[safe](https://example.com) [bad](javascript:alert(1)) <img src=x onerror=alert(1)><script>alert(1)</script>\n\n#### Deep",
    );
    const nodes = documentNodes(value);
    expect(nodes.some((node) => node.type === "image")).toBe(false);
    expect(
      nodes.flatMap((node) => node.marks ?? []).map((mark) => mark.attrs?.href),
    ).toEqual(["https://example.com"]);
    expect(documentText(value)).not.toMatch(/alert|onerror/);
    expect(value.content.at(-1)).toMatchObject({
      type: "heading",
      attrs: { level: 3 },
    });
    expect(richTextDocumentSchema.safeParse(value).success).toBe(true);
  });
});

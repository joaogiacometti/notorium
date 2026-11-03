import { describe, expect, it } from "vitest";
import {
  inlineNodes,
  plainTextToDocument,
} from "@/lib/ai/plain-text-rich-text";
import {
  documentNodes,
  documentText,
  richTextDocumentSchema,
} from "@/lib/editor/document";

describe("assistant text import", () => {
  it("builds native paragraphs, lists, headings and marks", () => {
    const value = plainTextToDocument(
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
  it("preserves equations with special characters and normalizes overescaping", () => {
    const value = plainTextToDocument(
      "Compare $a < b & c$\n\n$$x^2$$\n\n$\\\\hat y$",
    );
    expect(
      documentNodes(value)
        .filter((node) => node.type?.endsWith("Math"))
        .map((node) => node.attrs?.latex),
    ).toEqual(["a < b & c", "x^2", "\\hat y"]);
    expect(value.content[1].type).toBe("blockMath");
  });
  it("preserves literal code before interpreting math or HTML", () => {
    const value = plainTextToDocument("Use `$x$`\n\n```sh\necho '$x$'\n```");
    expect(
      documentNodes(value).filter((node) => node.type?.endsWith("Math")),
    ).toEqual([]);
    expect(value.content[1]).toEqual({
      type: "codeBlock",
      attrs: { language: "sh" },
      content: [{ type: "text", text: "echo '$x$'" }],
    });
    expect(documentText(plainTextToDocument("<script>alert(1)</script>"))).toBe(
      "<script>alert(1)</script>",
    );
  });
  it("leaves currency as text and accepts numeric math", () => {
    expect(documentText(plainTextToDocument("Costs $100 dollars"))).toBe(
      "Costs $100 dollars",
    );
    expect(
      documentNodes(plainTextToDocument("B) $6$")).find(
        (node) => node.type === "inlineMath",
      )?.attrs?.latex,
    ).toBe("6");
  });
  it("preserves inline whitespace and code contents", () => {
    expect(inlineNodes("  $x$ < limit  ")).toEqual([
      { type: "text", text: "  " },
      { type: "inlineMath", attrs: { latex: "x" } },
      { type: "text", text: " < limit  " },
    ]);
    expect(inlineNodes("<code>\\times</code>")).toEqual([
      { type: "text", text: "\\times", marks: [{ type: "code" }] },
    ]);
  });
});

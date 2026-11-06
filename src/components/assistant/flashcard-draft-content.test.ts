// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { restoreDraftReplacement as importReplacement } from "@/components/assistant/flashcard-draft-content";
import { prepareDraftForAssistant as exportDraft } from "@/features/assistant/utils";
import { testDocument, testDocumentHtml } from "@/test/document";

const restoreDraftReplacement = (replacement: string, original: string) =>
  testDocumentHtml(importReplacement(replacement, testDocument(original)));
const prepareDraftForAssistant = (front: string, back: string) =>
  exportDraft({
    sessionId: "d",
    revision: 0,
    front: testDocument(front),
    back: testDocument(back),
  });

const originalImage =
  '<img src="/api/attachments/blob?pathname=private-image.webp" alt="diagram">';

describe("flashcard draft rich text", () => {
  it("sends Markdown with opaque image placeholders", () => {
    const result = prepareDraftForAssistant(
      "<p><strong>Why?</strong></p>",
      `<ul><li><p>Answer</p></li></ul>${originalImage}`,
    );
    expect(result.front).toBe("**Why?**");
    expect(result.back).toBe("- Answer\n\n{{IMAGE_0}}");
    expect(result.back).not.toContain("private-image");
  });

  it("sends math as dollar-delimited LaTeX and escapes literal dollars", () => {
    const result = prepareDraftForAssistant(
      '<p>Define <span data-type="inline-math" data-latex="\\sigma"></span> for $5</p>',
      '<div data-type="block-math" data-latex="x^2"></div>',
    );
    expect(result.front).toBe("Define $\\sigma$ for \\$5");
    expect(result.back).toBe("$$\nx^2\n$$");
  });

  it("round-trips an unchanged draft", () => {
    const back =
      '<ul><li><p>When <strong>this</strong> holds:</p><div data-type="block-math" data-latex="\\lim_{h\\to 0} f(h)"></div></li><li><p>Costs $5 or $10</p></li></ul>' +
      originalImage;
    expect(
      restoreDraftReplacement(prepareDraftForAssistant("", back).back, back),
    ).toBe(testDocumentHtml(testDocument(back)));
  });

  it("keeps a block equation inside the bullet it follows", () => {
    const result = restoreDraftReplacement(
      "- When this limit exists:\n$$f'(a) = \\lim_{h\\to 0} \\frac{f(a+h)-f(a)}{h}$$\n- Both one-sided limits must agree",
      "",
    );
    expect(result.match(/<li>/g)).toHaveLength(2);
    expect(result).toMatch(
      /^<ul><li><p>When this limit exists:<\/p><div data-latex="[^"]+" data-type="block-math"><\/div><\/li><li>/,
    );
  });

  it("retains existing images even when the model omits them and drops invented images", () => {
    const result = restoreDraftReplacement(
      "New answer\n\n![x](https://evil.example/tracker)",
      originalImage,
    );
    expect(result).toContain("private-image.webp");
    expect(result).not.toContain("evil.example");
    expect(result.match(/<img/g) ?? []).toHaveLength(1);
  });

  it("places a restored image where its placeholder was", () => {
    const result = restoreDraftReplacement(
      "Before {{IMAGE_0}} after",
      originalImage,
    );
    expect(result).toMatch(/^<p>Before <\/p><img [^>]+><p> after<\/p>$/);
    expect(() =>
      restoreDraftReplacement("{{IMAGE_0}} {{IMAGE_0}}", originalImage),
    ).toThrow("duplicate image placeholder");
  });

  it("preserves code, escaped currency, and inline formatting", () => {
    const result = restoreDraftReplacement(
      "**Symbol** $x$ is useful. Price: \\$100.\n\n```\n$x$\n```\n\n`$y$`",
      "",
    );
    expect(result).toContain("<strong>Symbol</strong>");
    expect(result).toContain('data-latex="x"');
    expect(result).toContain("</span> is useful. Price: $100.");
    expect(result).toContain("$x$</code></pre>");
    expect(result).toContain("<code>$y$</code>");
  });

  it("converts a dollar-delimited numeric answer rather than treating it as currency", () => {
    expect(restoreDraftReplacement("$12$", "")).toContain('data-latex="12"');
  });

  it("undoes double-escaped LaTeX commands inside math only", () => {
    const result = restoreDraftReplacement(
      "$$\\\\hat{y} = h_w(x)$$\n\nPath `C:\\\\temp`",
      "",
    );
    expect(result).toContain('data-latex="\\hat{y} = h_w(x)"');
    expect(result).toContain("C:\\\\temp");
  });
});

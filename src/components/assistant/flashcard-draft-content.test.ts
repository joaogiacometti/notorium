// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { restoreDraftReplacement } from "@/components/assistant/flashcard-draft-content";
import { prepareDraftForAssistant } from "@/features/assistant/utils";
import {
  normalizeReviewedRichText,
  parseReviewedRichText,
} from "@/lib/editor/rich-text-review-schema";

const originalImage =
  '<img src="/api/attachments/blob?pathname=private-image.webp" alt="diagram">';

describe("flashcard draft rich text", () => {
  it("sends rich text with opaque image placeholders", () => {
    const result = prepareDraftForAssistant({
      sessionId: "d",
      revision: 0,
      front: "<p><strong>Why?</strong></p>",
      back: `<p>Answer</p>${originalImage}`,
    });
    expect(result.front).toContain("<strong>");
    expect(result.back).toContain("{{IMAGE_0}}");
    expect(result.back).not.toContain("private-image");
  });

  it("sends math as dollar-delimited LaTeX, matching the model's math format", () => {
    const result = prepareDraftForAssistant({
      sessionId: "d",
      revision: 0,
      front:
        '<p>Define <span data-type="inline-math" data-latex="\\sigma"></span></p>',
      back: '<div data-type="block-math" data-latex="x^2"></div>',
    });
    expect(result.front).toBe("<p>Define $\\sigma$</p>");
    expect(result.back).toBe("<p>$$x^2$$</p>");
  });

  it("retains existing images even when the model omits them and rejects invented images", () => {
    const result = restoreDraftReplacement(
      '<p>New answer</p><img src="https://evil.example/tracker">',
      originalImage,
    );
    expect(result).toContain("private-image.webp");
    expect(result).not.toContain("evil.example");
    expect(result.match(/<img/g) ?? []).toHaveLength(1);
  });

  it("strips executable and unsupported HTML", () => {
    const result = restoreDraftReplacement(
      '<p onclick="alert(1)">Safe<script>alert(1)</script></p><iframe src="https://evil.example"></iframe>',
      "",
    );
    expect(result).toBe("<p>Safe</p>");
  });

  it("converts dollar-delimited legend math inside HTML without losing existing content", () => {
    const result = restoreDraftReplacement(
      '<p>Measures the spread.</p><div data-type="block-math" data-latex="v"></div><ul><li><p>$\\sigma^2$: Population variance</p></li><li><p>$N$: Number of values</p></li></ul>',
      "",
    );
    expect(result).toContain('data-latex="\\sigma^2"');
    expect(result).toContain('data-latex="N"');
    expect(result).toContain('data-type="block-math"');
    expect(result).toContain("Measures the spread.");
    expect(result).toContain("<ul>");
    expect(result).not.toContain("$");
  });

  it("supports plain-text legend output with math and bullet points", () => {
    const result = restoreDraftReplacement(
      "Legend:\n\n- $\\sigma$: Standard deviation\n- $N$: Number of values",
      "",
    );
    expect(result).toContain("<ul>");
    expect(result).toContain('data-latex="\\sigma"');
    expect(result).not.toContain("$");
  });

  it("preserves code, currency, existing math nodes, and surrounding inline formatting", () => {
    const result = restoreDraftReplacement(
      '<p><strong>Symbol</strong> $x$ is useful. Price: $100$.</p><pre><code>$x$</code></pre><p><code>$y$</code> <span data-type="inline-math" data-latex="z"></span></p>',
      "",
    );
    expect(result).toContain("<strong>Symbol</strong>");
    expect(result).toContain('data-latex="x"');
    expect(result).toContain("</span> is useful.");
    expect(result).toContain("$100$");
    expect(result).toContain("$x$</code>");
    expect(result).toContain("<code>$y$</code>");
    expect(result.match(/data-latex="z"/g)).toHaveLength(1);
  });

  it("converts a standalone block equation without adding blank paragraphs", () => {
    const result = restoreDraftReplacement("<p>$$x^2$$</p><p>Legend</p>", "");
    expect(result).toContain('data-type="block-math"');
    expect(result).not.toContain("$");
    expect(result).not.toContain("<p></p>");
    expect(result).toContain("<p>Legend</p>");
  });

  it("keeps LaTeX written as math node text instead of producing empty equations", () => {
    const result = restoreDraftReplacement(
      '<div data-type="block-math">$$\\hat{y} = h_w(x)$$</div><p>Where <span data-type="inline-math" data-latex="">w_0</span> is the bias.</p>',
      "",
    );
    expect(result).toContain('data-latex="\\hat{y} = h_w(x)"');
    expect(result).toContain('data-latex="w_0"');
    expect(result).not.toContain('data-latex=""');
  });

  it("drops math nodes that carry no LaTeX at all", () => {
    const result = restoreDraftReplacement(
      '<p>Before</p><div data-type="block-math"></div><p>After</p>',
      "",
    );
    expect(result).not.toContain("block-math");
    expect(result).toContain("<p>Before</p><p>After</p>");
  });

  it("preserves math, lists, tables, code, and formatting through schema normalization", () => {
    const html =
      '<p><strong>Recall</strong> <span data-type="inline-math" data-latex="x^2"></span></p><ul><li><p>Point</p></li></ul><pre><code class="language-sql">SELECT 1;</code></pre><table><tbody><tr><td><p>Value</p></td></tr></tbody></table>';
    const normalized = normalizeReviewedRichText(html);
    const document = parseReviewedRichText(normalized);
    expect(document.textContent).toContain("Recall");
    expect(normalized).toContain('data-latex="x^2"');
    expect(normalized).toContain("<strong>");
    expect(normalized).toContain("<table");
    expect(normalized).toContain("<pre>");
    expect(normalized).toContain("<ul>");
  });
});
